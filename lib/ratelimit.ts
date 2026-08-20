// ============================================================
// CELLIX v2.1 — Persistent Rate Limiter for API Endpoints
// ============================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}

import { prisma } from '@/lib/prisma'

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Clean up expired rate limit entries periodically.
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

/**
 * Rate limit check function.
 * Returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now >= record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count += 1
  return { allowed: true, remaining: maxRequests - record.count }
}

export function getRequestRateLimitKey(req: Request, scope: string, subject = ''): string {
  const trustedProxy = process.env.TRUSTED_PROXY === 'true'
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  const networkId = trustedProxy ? (forwardedFor || realIp || 'unknown') : 'unknown'
  return `${scope}:${networkId}:${subject}`
}

export async function checkPersistentRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  // Retry compare-and-set collisions so concurrent requests do not become
  // false 429 responses. The limit is still enforced once the fresh count
  // reaches maxRequests.
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date()
    const resetAt = new Date(now.getTime() + windowMs)
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } })

    if (!existing || existing.resetAt <= now) {
      try {
        await prisma.rateLimitBucket.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        })
        return { allowed: true, remaining: maxRequests - 1 }
      } catch {
        continue
      }
    }

    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0 }
    }

    const updated = await prisma.rateLimitBucket.updateMany({
      where: { key, count: existing.count, resetAt: existing.resetAt },
      data: { count: { increment: 1 } },
    })
    if (updated.count === 1) {
      return { allowed: true, remaining: Math.max(0, maxRequests - existing.count - 1) }
    }
  }

  return { allowed: false, remaining: 0 }
}
