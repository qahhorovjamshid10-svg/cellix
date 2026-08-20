// ============================================================
// CELLIX v2.1 — Daily Challenge & Deterministic Seed System
// ============================================================

export interface DailyModifier {
  id: string
  name: string
  nameUz: string
  description: string
  descriptionUz: string
  badge: string
  color: string
  playerDamageMult?: number
  playerHpMult?: number
  speedMult?: number
  hazardFrequencyMult?: number
  enemyDensityMult?: number
  xpMult?: number
  scoreMult?: number
}

export const DAILY_MODIFIERS: DailyModifier[] = [
  {
    id: 'speed_demon',
    name: 'SPEED DEMON',
    nameUz: 'TEZLIK DEMONI',
    description: 'Movement speed increased by +40% for all entities. +50% XP Gain.',
    descriptionUz: 'Barcha harakat tezligi +40% oshirilgan. +50% ko\'proq XP.',
    badge: '⚡',
    color: '#ffb700',
    speedMult: 1.4,
    xpMult: 1.5,
  },
  {
    id: 'volatile_world',
    name: 'VOLATILE REALM',
    nameUz: 'PORTLOVCHI DUNYO',
    description: 'Enemy density is higher and score multiplier is 2.0x.',
    descriptionUz: 'Dushmanlar ko\'proq va ball ko\'paytirgichi 2.0x.',
    badge: '🔥',
    color: '#ef4444',
    scoreMult: 2.0,
    enemyDensityMult: 1.5,
  },
  {
    id: 'acid_rain',
    name: 'HAZARD SURGE',
    nameUz: 'XAVFLI SOHA',
    description: 'Arena hazards trigger 2x more frequently. +30% Score.',
    descriptionUz: 'Arena hazardlari 2x tezroq paydo bo\'ladi. +30% ball.',
    badge: '☣️',
    color: '#22c55e',
    hazardFrequencyMult: 2.0,
    scoreMult: 1.3,
  },
  {
    id: 'glass_cannon',
    name: 'GLASS CANNON',
    nameUz: 'SHISHA ZARBAGOR',
    description: 'Player damage +100%, but Max HP is reduced by -50%.',
    descriptionUz: 'Hujum kuchi +100%, ammo maks HP -50% kamaytirilgan.',
    badge: '💥',
    color: '#38bdf8',
    playerDamageMult: 2.0,
    playerHpMult: 0.5,
    scoreMult: 1.5,
  },
]

/**
 * Returns today's formatted date string (YYYY-MM-DD).
 */
export function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Deterministically pick today's daily challenge modifier based on date string.
 */
export function getDailyChallengeModifier(dateStr: string = getTodayDateString()): DailyModifier {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % DAILY_MODIFIERS.length
  return DAILY_MODIFIERS[index]
}

export interface DailyChallenge {
  date: string
  seed: string
  modifier: DailyModifier
}

/** Build the complete deterministic challenge payload sent to the game scene. */
export function getDailyChallenge(dateStr: string = getTodayDateString()): DailyChallenge {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = Math.imul(31, hash) + dateStr.charCodeAt(i)
  }

  return {
    date: dateStr,
    seed: `cellix-${dateStr}-${(hash >>> 0).toString(16)}`,
    modifier: getDailyChallengeModifier(dateStr),
  }
}

/** Small deterministic RNG for challenge-specific effects such as hazard selection. */
export function createSeededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(31, state) + seed.charCodeAt(i)
  }

  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return (state >>> 0) / 0x100000000
  }
}
