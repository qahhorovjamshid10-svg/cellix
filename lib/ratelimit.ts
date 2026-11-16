// ============================================================
// CELLIX v2.1 — Hardened Layered Rate Limiter
// ============================================================

import crypto from 'crypto'
import { prisma } from './prisma'

export interface RateLimitRecord {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSec: number
  headers: Record<string, string>
}

const rateLimitStore = new Map<string, RateLimitRecord>()

const IPV4_REGEX = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
const IPV6_REGEX = /^(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}$/

// Clean up expired in-memory rate limit entries periodically
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now >= record.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
  if (cleanupTimer.unref) cleanupTimer.unref()

  // Clean up expired database records every 5 minutes
  const dbCleanupTimer = setInterval(() => {
    void cleanupExpiredRateLimits().catch(() => {})
  }, 300000)
  if (dbCleanupTimer.unref) dbCleanupTimer.unref()
}

/**
 * Safely extracts client IP address without blindly trusting user headers.
 */
export function getClientIp(req: Request): string {
  const trustedProxy = process.env.TRUSTED_PROXY === 'true'
  if (!trustedProxy) {
    // Untrusted proxy: client-provided forwarded headers are untrusted.
    // This prevents attackers from spoofing arbitrary IPs to bypass rate limits.
    return 'untrusted_gateway'
  }

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim()
    if (IPV4_REGEX.test(firstIp) || IPV6_REGEX.test(firstIp)) {
      return firstIp
    }
  }

  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp && (IPV4_REGEX.test(realIp) || IPV6_REGEX.test(realIp))) {
    return realIp
  }

  return 'trusted_gateway'
}

/**
 * Generates an opaque, pseudonymized rate limit key.
 * Never stores or exposes raw client IPs.
 */
export function getRequestRateLimitKey(req: Request, scope: string, subject = ''): string {
  const clientIp = getClientIp(req)
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16)
  const cleanSubject = subject ? subject.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32) : 'anon'
  return `${scope}:${ipHash}:${cleanSubject}`
}

/**
 * In-memory fast rate limit check.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now >= record.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    })
    const remaining = maxRequests - 1
    return {
      allowed: true,
      remaining,
      resetAt,
      retryAfterSec: 0,
      headers: {
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSec,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(record.resetAt / 1000)),
      },
    }
  }

  record.count += 1
  const remaining = maxRequests - record.count
  return {
    allowed: true,
    remaining,
    resetAt: record.resetAt,
    retryAfterSec: 0,
    headers: {
      'X-RateLimit-Limit': String(maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(record.resetAt / 1000)),
    },
  }
}

/**
 * Dual-layer persistent rate limit check backed by PostgreSQL RateLimitBucket.
 */
export async function checkPersistentRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  // 1. Fast in-memory check
  const memResult = checkRateLimit(key, maxRequests, windowMs)
  if (!memResult.allowed) {
    return memResult
  }

  // 2. Database cluster persistence
  try {
    const now = new Date()
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { key },
    })

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = new Date(Date.now() + windowMs)
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      })
      return memResult
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000))
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt.getTime(),
        retryAfterSec,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(bucket.resetAt.getTime() / 1000)),
        },
      }
    }

    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    })
  } catch (error) {
    // Database failure fallback: soft-fail to in-memory check to prevent outage
    console.error('RateLimit database check failed, falling back to memory:', error)
  }

  return memResult
}

/**
 * Deletes all expired rate limit records from the database.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const result = await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date() } },
    })
    return result.count
  } catch {
    return 0
  }
}

/**
 * Layered rate limit helper checking both IP and Account boundaries.
 */
export async function enforceLayeredRateLimit(
  req: Request,
  options: {
    scope: string
    playerId?: string | null
    maxRequests: number
    windowMs: number
  }
): Promise<RateLimitResult> {
  const { scope, playerId, maxRequests, windowMs } = options

  // Level 1: Network IP limit
  const ipKey = getRequestRateLimitKey(req, scope, 'ip')
  const ipCheck = await checkPersistentRateLimit(ipKey, maxRequests * 2, windowMs)
  if (!ipCheck.allowed) {
    return ipCheck
  }

  // Level 2: Account limit (if authenticated)
  if (playerId) {
    const accountKey = getRequestRateLimitKey(req, scope, playerId)
    const accountCheck = await checkPersistentRateLimit(accountKey, maxRequests, windowMs)
    if (!accountCheck.allowed) {
      return accountCheck
    }
  }

  return ipCheck
}

