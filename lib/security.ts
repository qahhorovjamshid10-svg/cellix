// ============================================================
// CELLIX v2.1 — Security, Anti-Cheat & Token Verification
// ============================================================

import crypto from 'crypto'

export const SESSION_TTL_MS = 30 * 60 * 1000

function getSecretKey(): string {
  return process.env.SESSION_SECRET || 'cellix_v2_secure_game_session_key_2026_prod'
}

export interface SessionData {
  gameMode: string
  startTime: number
  nonce: string
}

/**
 * Generate a signed session token when a run starts.
 */
export function generateSessionToken(gameMode: string): { token: string; startTime: number } {
  const startTime = Date.now()
  const nonce = crypto.randomBytes(8).toString('hex')
  const payload = `${gameMode}:${startTime}:${nonce}`

  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payload)
    .digest('hex')

  const token = Buffer.from(`${payload}:${signature}`).toString('base64url')
  return { token, startTime }
}

/**
 * Verify a signed session token.
 * Returns decoded SessionData if valid, null if tampered or expired.
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 4) return null

    const [gameMode, startTimeStr, nonce, signature] = parts
    const startTime = parseInt(startTimeStr, 10)
    if (isNaN(startTime)) return null

    const payload = `${gameMode}:${startTime}:${nonce}`
    const expectedSignature = crypto
      .createHmac('sha256', getSecretKey())
      .update(payload)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }

    return { gameMode, startTime, nonce }
  } catch {
    return null
  }
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function isSessionExpired(startTime: number, now = Date.now()): boolean {
  return now > startTime + SESSION_TTL_MS
}

/**
 * Validate game score submission for impossible / cheated metrics.
 */
export function validateScoreSubmission(metrics: {
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: string
  startTime?: number
}): { valid: boolean; reason?: string } {
  const { score, level, kills, survivalTime, gameMode, startTime } = metrics

  // Basic sanity bounds
  if (score < 0 || level < 1 || kills < 0 || survivalTime < 0) {
    return { valid: false, reason: 'Negative or invalid numerical values' }
  }

  if (level > 30) {
    return { valid: false, reason: 'Exceeded maximum level cap (30)' }
  }

  // Time elapsed check if token startTime is provided
  if (startTime) {
    const elapsedSec = (Date.now() - startTime) / 1000
    // Survival time reported by client cannot exceed real elapsed time by more than 30 seconds
    if (survivalTime > elapsedSec + 30) {
      return { valid: false, reason: 'Survival time exceeds real session duration' }
    }
  }

  // Anti-cheat density checks (Daily mode modifiers can give 2x score, higher spawn density, etc.)
  if (survivalTime > 0) {
    const pointsPerSec = score / survivalTime
    const maxPointsPerSec = gameMode === 'daily' ? 1500 : 900
    if (pointsPerSec > maxPointsPerSec) {
      return { valid: false, reason: `Impossible score accumulation rate (>${maxPointsPerSec} pts/sec)` }
    }

    const killsPerSec = kills / survivalTime
    const maxKillsPerSec = gameMode === 'daily' ? 25 : 18
    if (killsPerSec > maxKillsPerSec) {
      return { valid: false, reason: `Impossible kill rate (>${maxKillsPerSec} kills/sec)` }
    }
  } else if (score > 2000 || kills > 25) {
    return { valid: false, reason: 'Impossibly high score/kills with 0s survival time' }
  }

  return { valid: true }
}
