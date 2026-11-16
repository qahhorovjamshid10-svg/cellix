// ============================================================
// Rate Limiting Hardening Automated Test Suite (#9)
// ============================================================

const assert = require('assert')
const {
  checkRateLimit,
  checkPersistentRateLimit,
  getClientIp,
  getRequestRateLimitKey,
  cleanupExpiredRateLimits,
  enforceLayeredRateLimit,
} = require('../lib/ratelimit')

async function runTests() {
  console.log('--- Starting Rate Limiting Hardening Tests ---')

  // Test 1: In-memory burst protection
  {
    const key = `test_burst_${Date.now()}`
    const limit = 5
    for (let i = 0; i < limit; i++) {
      const res = checkRateLimit(key, limit, 10000)
      assert.strictEqual(res.allowed, true, `Request ${i + 1} should be allowed`)
      assert.strictEqual(res.remaining, limit - (i + 1))
    }

    // 6th request must be blocked with Retry-After
    const blockedRes = checkRateLimit(key, limit, 10000)
    assert.strictEqual(blockedRes.allowed, false, 'Request exceeding limit must be blocked')
    assert.strictEqual(blockedRes.remaining, 0)
    assert.ok(blockedRes.retryAfterSec > 0, 'Retry-After must be greater than 0')
    assert.ok(blockedRes.headers['Retry-After'], 'Retry-After header must be set')
    console.log('[PASS] Test 1: In-memory burst rate limiting enforced with HTTP headers')
  }

  // Test 2: Proxy header spoofing defense (TRUSTED_PROXY = false)
  {
    delete process.env.TRUSTED_PROXY
    const spoofedReq1 = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '198.51.100.1' },
    })
    const spoofedReq2 = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '198.51.100.2' },
    })

    const ip1 = getClientIp(spoofedReq1)
    const ip2 = getClientIp(spoofedReq2)
    assert.strictEqual(ip1, 'untrusted_gateway', 'Spoofed header must be ignored when TRUSTED_PROXY is unset')
    assert.strictEqual(ip2, 'untrusted_gateway')

    const key1 = getRequestRateLimitKey(spoofedReq1, 'login')
    const key2 = getRequestRateLimitKey(spoofedReq2, 'login')
    assert.strictEqual(key1, key2, 'Spoofed IPs must NOT create separate buckets')
    console.log('[PASS] Test 2: Spoofed proxy headers cannot bypass rate limit (untrusted proxy defense verified)')
  }

  // Test 3: Trusted proxy configuration
  {
    process.env.TRUSTED_PROXY = 'true'
    const trustedReq = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
    })
    const clientIp = getClientIp(trustedReq)
    assert.strictEqual(clientIp, '203.0.113.42', 'Trusted proxy should extract first client IP')

    const key = getRequestRateLimitKey(trustedReq, 'login')
    assert.ok(!key.includes('203.0.113.42'), 'Key must hash or pseudonymize IP (zero IP leakage)')
    console.log('[PASS] Test 3: Trusted proxy header parsing and pseudonymization verified')
    delete process.env.TRUSTED_PROXY
  }

  // Test 4: Persistent database rate limit check
  {
    const dbKey = `db_test_${Date.now()}`
    const res1 = await checkPersistentRateLimit(dbKey, 3, 60000)
    assert.strictEqual(res1.allowed, true)
    const res2 = await checkPersistentRateLimit(dbKey, 3, 60000)
    assert.strictEqual(res2.allowed, true)
    const res3 = await checkPersistentRateLimit(dbKey, 3, 60000)
    assert.strictEqual(res3.allowed, true)
    const res4 = await checkPersistentRateLimit(dbKey, 3, 60000)
    assert.strictEqual(res4.allowed, false, '4th call must be blocked in database bucket')
    console.log('[PASS] Test 4: Database-backed cluster rate limiting verified')
  }

  // Test 5: Layered rate limiting (IP + Account boundaries)
  {
    const req = new Request('http://localhost/api/test')
    const layeredRes = await enforceLayeredRateLimit(req, {
      scope: 'payment_initiate',
      playerId: 'player_layered_1',
      maxRequests: 5,
      windowMs: 60000,
    })
    assert.strictEqual(layeredRes.allowed, true)
    console.log('[PASS] Test 5: Layered rate limit (IP + Account) evaluated successfully')
  }

  // Test 6: Database cleanup of expired records
  {
    const cleaned = await cleanupExpiredRateLimits()
    assert.ok(typeof cleaned === 'number', 'Cleanup should return count of deleted expired records')
    console.log(`[PASS] Test 6: Expired rate-limit records cleaned up (${cleaned} records removed)`)
  }

  console.log('=== ALL 6 RATE LIMITING VERIFICATION TESTS PASSED ===')
}

runTests().catch((err) => {
  console.error('Test failure:', err)
  process.exit(1)
})
