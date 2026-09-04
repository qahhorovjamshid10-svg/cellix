// ============================================================
// CELLIX v2.1 — Persistent Rate Limiter for API Endpoints
// ============================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}


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
  return checkRateLimit(key, maxRequests, windowMs)
}
