// ============================================================
// CELLIX v2.1 — Progression System
// XP thresholds, multi-level-up queue, and permanent progression
// ============================================================

import { XP_TABLE, XP_CONFIG } from './balance'

/**
 * Given the current XP and level, compute how many level-ups
 * should fire and the remaining XP after all level-ups.
 *
 * This solves the "multi-level-up in one frame" bug:
 * if a single XP pickup pushes the player past 2-3 thresholds,
 * all level-ups are queued rather than only the first.
 *
 * Returns:
 *  - levelsGained: number of levels to fire (0 if none)
 *  - newLevel: the player's new level
 *  - newXp: remaining XP after all level-ups
 *  - newNextLevelXp: XP needed for the NEXT level-up
 *  - reachedMaxLevel: true if player hit max level
 */
export function computeLevelUps(
  currentLevel: number,
  currentXp: number,
  nextLevelXp: number,
): {
  levelsGained: number
  newLevel: number
  newXp: number
  newNextLevelXp: number
  reachedMaxLevel: boolean
} {
  let level = currentLevel
  let xp = currentXp
  let threshold = nextLevelXp
  let levelsGained = 0

  while (xp >= threshold && level < XP_CONFIG.maxLevel) {
    xp -= threshold
    level++
    levelsGained++

    // Next threshold from pre-computed table, or fallback to growth formula
    if (level + 1 < XP_TABLE.length) {
      threshold = XP_TABLE[level + 1]
    } else {
      threshold = Math.round(threshold * XP_CONFIG.growthFactor)
    }
  }

  // If at max level, clamp XP overflow
  const reachedMaxLevel = level >= XP_CONFIG.maxLevel
  if (reachedMaxLevel) {
    xp = 0
    threshold = 0
  }

  return {
    levelsGained,
    newLevel: level,
    newXp: xp,
    newNextLevelXp: threshold,
    reachedMaxLevel,
  }
}

/**
 * Get the XP required for a specific level.
 * Level 1 = 0, Level 2 = 100, Level 3 = 135, etc.
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level < XP_TABLE.length) return XP_TABLE[level]
  // Extrapolate beyond pre-computed table
  let xp = XP_TABLE[XP_TABLE.length - 1]
  for (let i = XP_TABLE.length; i <= level; i++) {
    xp = Math.round(xp * XP_CONFIG.growthFactor)
  }
  return xp
}

/**
 * Get XP needed to go FROM level to level+1.
 */
export function getXpToNextLevel(level: number): number {
  if (level >= XP_CONFIG.maxLevel) return 0
  return getXpForLevel(level + 1)
}

/**
 * Permanent progression (Cell Level) — placeholder for Sprint 3.
 * Cell Level accumulates across all runs and unlocks cosmetics.
 */
export interface PermanentProgression {
  cellLevel: number
  totalXp: number
  /** IDs of unlocked items (skins, trails, mutations). */
  unlocks: string[]
}

export function getDefaultProgression(): PermanentProgression {
  return {
    cellLevel: 1,
    totalXp: 0,
    unlocks: [],
  }
}

export function getCellLevelForXp(totalXp: number): number {
  let level = 1
  let remainingXp = Math.max(0, totalXp)
  let threshold = 250

  while (remainingXp >= threshold) {
    remainingXp -= threshold
    level++
    threshold = Math.round(threshold * 1.35)
  }

  return level
}

export function getRunProgressionXp(metrics: { level: number; kills: number; survivalTime: number }): number {
  return Math.max(0, metrics.level * 25 + metrics.kills * 5 + Math.floor(metrics.survivalTime / 10))
}
