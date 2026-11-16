// ============================================================
// CELLIX v2.1 — Server-Side Anti-Cheat & Run Integrity Engine
// ============================================================

import crypto from 'crypto'
import { XP_TABLE, XP_CONFIG } from './balance'
import { ALL_MUTATIONS } from './mutations'

export type ValidationStatus = 'valid' | 'suspicious' | 'rejected'

export interface ValidationResult {
  status: ValidationStatus
  reason?: string
  flag?: string
}

export interface RunSessionContext {
  id: string
  gameMode: string
  challengeDate?: string | null
  startedAt: Date
  expiresAt: Date
  seed?: string | null
  constraints?: string | null
  playerId?: string | null
}

export interface GameplayEvent {
  type: 'kill' | 'levelup' | 'boss_defeat' | 'mutation' | 'wave_complete' | string
  t: number // timestamp relative to run start in milliseconds
  data?: Record<string, unknown>
}

export interface ScoreSubmissionData {
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: string
  wave: number
  damageDealt: number
  damageTaken: number
  criticalHits: number
  bossDefeated: boolean
  mutations?: string[]
  events?: GameplayEvent[]
}

const VALID_MUTATION_IDS = new Set<string>(ALL_MUTATIONS.map((m) => m.id))

/**
 * Generates a cryptographically secure 128-bit seed or deterministic daily seed.
 */
export function generateRunSeed(gameMode: string, challengeDate?: string | null): string {
  if (gameMode === 'daily' && challengeDate) {
    // Deterministic daily seed derived from date and server HMAC secret
    const secret = process.env.SESSION_SECRET || 'cellix_daily_deterministic_fallback_salt'
    return crypto.createHmac('sha256', secret).update(`daily_seed:${challengeDate}`).digest('hex').substring(0, 32)
  }
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Creates server-enforced run constraints serialized as JSON.
 */
export function generateRunConstraints(gameMode: string, seed: string): string {
  const isDaily = gameMode === 'daily'
  const isBioWar = gameMode === 'biowar'
  const isSurvival = gameMode === 'survival'

  const constraints = {
    seed,
    gameMode,
    maxPointsPerSec: isDaily || isBioWar ? 1400 : 850,
    maxKillsPerSec: isDaily ? 20 : 15,
    maxWave: isSurvival ? 10 : 0,
    bossAllowed: !isBioWar,
    maxLevel: 30,
    version: 1,
  }

  return JSON.stringify(constraints)
}

/**
 * Computes minimum cumulative XP required to achieve a given level.
 */
export function getMinimumXpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let lvl = 2; lvl <= level; lvl++) {
    if (lvl < XP_TABLE.length) {
      total += XP_TABLE[lvl]
    } else {
      total += Math.round(XP_CONFIG.baseXp * Math.pow(XP_CONFIG.growthFactor, lvl - 1))
    }
  }
  return total
}

/**
 * Comprehensive server-side validation of a game run submission.
 */
export function validateRunProgression(
  session: RunSessionContext,
  data: ScoreSubmissionData,
  now: number = Date.now()
): ValidationResult {
  const {
    score,
    level,
    kills,
    survivalTime,
    gameMode,
    wave,
    damageDealt,
    damageTaken,
    criticalHits,
    bossDefeated,
    mutations = [],
    events = [],
  } = data

  // 1. Basic type and numerical sanity
  if (
    !Number.isFinite(score) || score < 0 ||
    !Number.isFinite(level) || level < 1 || level > 30 ||
    !Number.isFinite(kills) || kills < 0 ||
    !Number.isFinite(survivalTime) || survivalTime < 0 ||
    !Number.isFinite(wave) || wave < 0 ||
    !Number.isFinite(damageDealt) || damageDealt < 0 ||
    !Number.isFinite(damageTaken) || damageTaken < 0 ||
    !Number.isFinite(criticalHits) || criticalHits < 0
  ) {
    return { status: 'rejected', reason: 'Invalid numerical metrics', flag: 'INVALID_METRICS' }
  }

  // 2. Mode consistency
  if (gameMode !== session.gameMode) {
    return { status: 'rejected', reason: 'Game mode mismatch with session', flag: 'MODE_MISMATCH' }
  }

  // 3. Real-time elapsed constraint
  const realElapsedSec = Math.max(0, (now - session.startedAt.getTime()) / 1000)
  // Client survival time cannot exceed real clock duration by more than 30s allowance for network/frame lag
  if (survivalTime > realElapsedSec + 30) {
    return {
      status: 'rejected',
      reason: `Reported survival time (${survivalTime}s) exceeds session clock (${Math.round(realElapsedSec)}s)`,
      flag: 'TIME_WARP_EXCEEDED',
    }
  }

  // Instant impossible scores
  if (survivalTime < 5) {
    if (score > 3000 || kills > 10 || level > 2) {
      return { status: 'rejected', reason: 'Instant burst metrics with <5s survival', flag: 'BURST_IMPOSSIBLE' }
    }
  }

  // 4. Mode-specific constraints
  if (gameMode === 'classic' || gameMode === 'daily') {
    if (wave !== 0) {
      return { status: 'rejected', reason: 'Wave count must be 0 for Classic and Daily modes', flag: 'INVALID_WAVE' }
    }
  }

  if (gameMode === 'survival') {
    if (wave < 0 || wave > 10) {
      return { status: 'rejected', reason: 'Survival wave must be between 0 and 10', flag: 'WAVE_OUT_OF_BOUNDS' }
    }
    // Each wave requires minimum real time progression (at least 8s per wave)
    if (wave > 1 && survivalTime < (wave - 1) * 8) {
      return {
        status: 'rejected',
        reason: `Wave ${wave} requires at least ${(wave - 1) * 8}s, reported ${survivalTime}s`,
        flag: 'WAVE_TIME_TOO_SHORT',
      }
    }
    // Wave 5 spawns Mini-Boss and Wave 10 spawns Mega-Boss
    if (bossDefeated && wave < 5) {
      return { status: 'rejected', reason: 'Boss can only be defeated from wave 5 onward in Survival', flag: 'INVALID_BOSS_WAVE' }
    }
  }

  if (gameMode === 'biowar') {
    if (wave !== 0) {
      return { status: 'rejected', reason: 'Waves not supported in Bio-War', flag: 'BIOWAR_INVALID_WAVE' }
    }
    if (bossDefeated) {
      return { status: 'rejected', reason: 'Boss does not exist in Bio-War', flag: 'BIOWAR_NO_BOSS' }
    }
    if (score > 500_000) {
      return { status: 'suspicious', reason: 'Bio-War score exceeds plausible threshold', flag: 'BIOWAR_SCORE_SUSPICIOUS' }
    }
  }

  // 5. Boss defeat constraints in Classic
  if (gameMode === 'classic' && bossDefeated) {
    if (survivalTime < 45 || level < 5) {
      return { status: 'rejected', reason: 'Boss defeat impossible before 45s / level 5', flag: 'PREMATURE_BOSS_DEFEAT' }
    }
  }

  // 6. Level vs XP consistency (Bio-War uses virtual mass tiers instead of Classic XP curves)
  if (gameMode !== 'biowar') {
    const requiredXp = getMinimumXpForLevel(level)
    // XP sources: kills (15-50 XP each, boss 500-1000 XP), ambient orbs (max ~100 XP/sec)
    const maxPossibleXp = kills * 100 + survivalTime * 120 + (bossDefeated ? 2500 : 0) + 150
    if (requiredXp > maxPossibleXp * 1.5) {
      return {
        status: 'rejected',
        reason: `Claimed level ${level} requires ${requiredXp} XP, but maximum reachable in ${survivalTime}s with ${kills} kills is ${maxPossibleXp}`,
        flag: 'IMPOSSIBLE_LEVEL_FOR_XP',
      }
    }
  }

  // 7. Damage vs Kills coherence
  // Smallest enemy HP is ~20. If kills > 5, damage must be at least kills * 15
  if (kills >= 5 && damageDealt < kills * 15) {
    return {
      status: 'rejected',
      reason: `Damage dealt (${damageDealt}) is mathematically insufficient to achieve ${kills} kills`,
      flag: 'DAMAGE_KILLS_MISMATCH',
    }
  }

  // Absurdly high damage with low kills/time
  const maxFeasibleDamage = kills * 6000 + survivalTime * 4000 + (bossDefeated ? 50000 : 0) + 30000
  if (damageDealt > maxFeasibleDamage) {
    return {
      status: 'suspicious',
      reason: `Reported damage (${damageDealt}) is abnormally high for session parameters`,
      flag: 'DAMAGE_ANOMALY',
    }
  }

  // 8. Critical hits vs total attacks
  // Max attack speed is ~15 shots/sec with abilities/spread.
  const maxPossibleAttacks = survivalTime * 25 + 50
  if (criticalHits > maxPossibleAttacks) {
    return {
      status: 'rejected',
      reason: `Critical hits (${criticalHits}) exceed maximum possible attacks (${maxPossibleAttacks})`,
      flag: 'CRIT_EXCEEDS_ATTACKS',
    }
  }

  // 9. Mutation validity
  if (Array.isArray(mutations)) {
    if (mutations.length > Math.max(0, level - 1)) {
      return {
        status: 'rejected',
        reason: `Mutations count (${mutations.length}) exceeds level-1 allowance (${level - 1})`,
        flag: 'MUTATIONS_EXCEED_LEVEL',
      }
    }
    for (const mId of mutations) {
      if (!VALID_MUTATION_IDS.has(mId)) {
        return { status: 'rejected', reason: `Unknown mutation ID: ${mId}`, flag: 'INVALID_MUTATION_ID' }
      }
    }
  }

  // 10. Density checks (points per second & kills per second)
  if (survivalTime > 0) {
    const pps = score / survivalTime
    const maxPps = gameMode === 'daily' || gameMode === 'biowar' ? 1400 : 900
    if (pps > maxPps * 1.5) {
      return { status: 'rejected', reason: `PPS rate ${pps.toFixed(1)} exceeds limit`, flag: 'PPS_REJECTED' }
    } else if (pps > maxPps) {
      return { status: 'suspicious', reason: `PPS rate ${pps.toFixed(1)} is abnormally high`, flag: 'PPS_SUSPICIOUS' }
    }

    const kps = kills / survivalTime
    const maxKps = gameMode === 'daily' ? 22 : 16
    if (kps > maxKps * 1.5) {
      return { status: 'rejected', reason: `KPS rate ${kps.toFixed(1)} exceeds limit`, flag: 'KPS_REJECTED' }
    } else if (kps > maxKps) {
      return { status: 'suspicious', reason: `KPS rate ${kps.toFixed(1)} is abnormally high`, flag: 'KPS_SUSPICIOUS' }
    }
  }

  // 11. Event stream validation (if provided)
  if (Array.isArray(events) && events.length > 0) {
    if (events.length > 1000) {
      return { status: 'suspicious', reason: 'Excessive event count', flag: 'EVENT_COUNT_ANOMALY' }
    }

    let lastTime = 0
    let killEventsCount = 0
    let levelEventsCount = 0

    for (const ev of events) {
      if (typeof ev.t !== 'number' || ev.t < 0) {
        return { status: 'rejected', reason: 'Invalid event timestamp', flag: 'EVENT_TIMESTAMP_INVALID' }
      }
      if (ev.t < lastTime - 100) {
        // Non-monotonic timestamps (allowing 100ms jitter)
        return { status: 'suspicious', reason: 'Non-monotonic event timeline', flag: 'EVENT_TIMELINE_JITTER' }
      }
      if (ev.t > (survivalTime + 10) * 1000) {
        return { status: 'rejected', reason: 'Event timestamp exceeds survival time', flag: 'EVENT_TIME_WARP' }
      }
      lastTime = ev.t

      if (ev.type === 'kill') killEventsCount++
      if (ev.type === 'levelup') levelEventsCount++
      if (ev.type === 'boss_defeat' && !bossDefeated) {
        return { status: 'rejected', reason: 'Boss defeat event mismatch with submission', flag: 'EVENT_BOSS_MISMATCH' }
      }
    }

    if (killEventsCount > kills + 5) {
      return { status: 'suspicious', reason: 'More kill events than reported kills', flag: 'EVENT_KILL_MISMATCH' }
    }
    if (levelEventsCount > level) {
      return { status: 'suspicious', reason: 'More levelup events than level', flag: 'EVENT_LEVEL_MISMATCH' }
    }
  }

  return { status: 'valid' }
}
