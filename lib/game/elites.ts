// ============================================================
// CELLIX v2.1 — Elite Enemy Modifiers & Behaviors
// ============================================================

import type { EliteModifier } from './types'

export const ELITE_MODIFIERS: Record<string, EliteModifier> = {
  fast: {
    id: 'fast',
    label: 'FAST',
    color: 0x00f0ff, // Cyan
    hpMult: 1.2,
    speedMult: 1.5,
    damageMult: 1.1,
    behaviour: 'fast',
  },
  armored: {
    id: 'armored',
    label: 'ARMORED',
    color: 0xeab308, // Gold
    hpMult: 2.2,
    speedMult: 0.8,
    damageMult: 1.2,
    behaviour: 'armored',
  },
  volatile: {
    id: 'volatile',
    label: 'VOLATILE',
    color: 0xef4444, // Red
    hpMult: 1.3,
    speedMult: 1.1,
    damageMult: 1.3,
    behaviour: 'volatile',
  },
  vampiric: {
    id: 'vampiric',
    label: 'VAMPIRIC',
    color: 0xa855f7, // Purple
    hpMult: 1.5,
    speedMult: 1.1,
    damageMult: 1.2,
    behaviour: 'vampiric',
  },
  split: {
    id: 'split',
    label: 'MITOTIC',
    color: 0x22c55e, // Green
    hpMult: 1.4,
    speedMult: 1.0,
    damageMult: 1.0,
    behaviour: 'split',
  },
}

export const ALL_ELITE_TYPES = Object.keys(ELITE_MODIFIERS)

/**
 * Pick a random elite modifier.
 */
export function getRandomEliteModifier(): EliteModifier {
  const keys = ALL_ELITE_TYPES
  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  return ELITE_MODIFIERS[randomKey]
}

/**
 * Apply elite status to a Phaser physics sprite.
 */
export function applyEliteModifier(
  enemy: Phaser.Physics.Arcade.Sprite,
  modifier: EliteModifier
) {
  const baseHp = (enemy.getData('hp') as number) || 30
  const baseSpeed = (enemy.getData('speed') as number) || 100
  const baseXp = (enemy.getData('xpValue') as number) || 20

  const newHp = Math.round(baseHp * modifier.hpMult)
  const newSpeed = Math.round(baseSpeed * modifier.speedMult)
  const newXp = Math.round(baseXp * 2.5) // Elites yield 2.5x XP

  enemy.setData('isElite', true)
  enemy.setData('eliteModifier', modifier)
  enemy.setData('hp', newHp)
  enemy.setData('maxHp', newHp)
  enemy.setData('speed', newSpeed)
  enemy.setData('xpValue', newXp)

  // Visual distinction: tint, scale boost
  enemy.setTint(modifier.color)
  enemy.setScale(1.25)
}
