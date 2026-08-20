// ============================================================
// CELLIX v2.1 — Mutation Definitions & Weighted Selection
// ============================================================

import type { MutationDefinition, MutationRarity, MutationStatBoosts } from './types'
export type { MutationDefinition, MutationRarity, MutationStatBoosts }

// ─── RARITY WEIGHTS ──────────────────────────────────────────
// Higher weight = more likely to appear in selection pool.
// Total doesn't need to sum to 1 — it's normalized during selection.
export const RARITY_WEIGHTS: Record<MutationRarity, number> = {
  Common: 50,
  Rare: 30,
  Epic: 15,
  Legendary: 5,
}

// ─── ALL MUTATIONS ───────────────────────────────────────────

export const ALL_MUTATIONS: MutationDefinition[] = [
  // --- COMMON (stackable) ---
  {
    id: 'speed_boost',
    name: 'HYPER SPEED',
    nameUz: 'GIPERTEZLIK',
    rarity: 'Common',
    badge: '⚡',
    description: 'Increases movement speed by +15%',
    descriptionUz: 'Harakat tezligini +15% oshiradi',
    statBoost: { speedPct: 0.15 },
    color: '#ffb700',
    maxStack: 3,
  },
  {
    id: 'power_boost',
    name: 'MUTANT POWER',
    nameUz: 'MUTANT KUCHI',
    rarity: 'Common',
    badge: '💥',
    description: 'Increases attack damage by +20%',
    descriptionUz: 'Hujum kuchini +20% oshiradi',
    statBoost: { powerPct: 0.2 },
    color: '#ff0055',
    maxStack: 3,
  },
  {
    id: 'armor_boost',
    name: 'CHITIN ARMOR',
    nameUz: 'XITIN QALQON',
    rarity: 'Common',
    badge: '🛡️',
    description: 'Increases maximum HP by +25% and heals player',
    descriptionUz: 'Maksimal HPni +25% oshiradi va o\'yinchini davolaydi',
    statBoost: { maxHpPct: 0.25 },
    color: '#00ff66',
    maxStack: 3,
  },
  {
    id: 'intelligence_boost',
    name: 'COGNITIVE MEMBRANE',
    nameUz: 'KOGNITIV MEMBRANA',
    rarity: 'Common',
    badge: '🧠',
    description: 'Increases XP and resource gain by +20%',
    descriptionUz: 'XP va resurs olishni +20% oshiradi',
    statBoost: { xpGainPct: 0.2 },
    color: '#00f0ff',
    maxStack: 3,
  },

  // --- RARE (limited stack) ---
  {
    id: 'magnet_boost',
    name: 'BIO-MAGNET',
    nameUz: 'BIO-MAGNIT',
    rarity: 'Rare',
    badge: '🌀',
    description: 'Automatically attracts nearby DNA & XP gems from double distance',
    descriptionUz: 'Yaqin atrofdagi DNK va XP gemlarini avtomatik tortadi',
    statBoost: { hasMagnetRadius: 250 },
    color: '#b026ff',
    maxStack: 1,
  },
  {
    id: 'regeneration_boost',
    name: 'CELL REGENERATION',
    nameUz: 'HUJAYRA REGENERATSIYASI',
    rarity: 'Rare',
    badge: '🧪',
    description: 'Slowly regenerates 2% maximum HP per second',
    descriptionUz: 'Sekundiga 2% maksimal HP tiklanadi',
    statBoost: { hpRegen: 0.02 },
    color: '#00ff66',
    maxStack: 2,
  },
  {
    id: 'critical_boost',
    name: 'LETHAL SPIKE',
    nameUz: 'O\'LDIRUVCHI TIKON',
    rarity: 'Rare',
    badge: '⚔️',
    description: 'Gives +25% chance to land critical hits dealing 2.5x damage',
    descriptionUz: 'Kritik zarba ehtimolini +25% oshiradi (2.5x zarar)',
    statBoost: { critChancePct: 0.25 },
    color: '#ff8800',
    maxStack: 2,
  },

  // --- EPIC (unique toggle abilities) ---
  {
    id: 'toxin_boost',
    name: 'TOXIC RESIDUE',
    nameUz: 'TOKSIK QOLDIQ',
    rarity: 'Epic',
    badge: '☠️',
    description: 'Attacks leave lingering acid clouds that damage enemies',
    descriptionUz: 'Hujumlar dushmanlarga zarar beruvchi kislota bulutlari qoldiradi',
    statBoost: { hasToxinTrail: true },
    color: '#a3e635',
    maxStack: 0,
  },
  {
    id: 'overcharge_boost',
    name: 'ADRENAL OVERCHARGE',
    nameUz: 'ADRENAL ZARYADKA',
    rarity: 'Epic',
    badge: '🔥',
    description: 'Deals +60% additional damage when HP drops below 35%',
    descriptionUz: 'HP 35% dan pastga tushganda +60% qo\'shimcha zarar beradi',
    statBoost: { hasOvercharge: true },
    color: '#f97316',
    maxStack: 0,
  },
  {
    id: 'phase_dash',
    name: 'QUANTUM PHASE',
    nameUz: 'KVANT FAZA',
    rarity: 'Epic',
    badge: '👻',
    description: 'Dash is twice as long and grants invulnerability',
    descriptionUz: 'Dash ikki baravar uzoq va daxlsizlik beradi',
    statBoost: { hasPhaseDash: true },
    color: '#38bdf8',
    maxStack: 0,
  },

  // --- LEGENDARY (unique powerful abilities) ---
  {
    id: 'split_clone',
    name: 'VIRAL MITOSIS',
    nameUz: 'VIRAL MITOZ',
    rarity: 'Legendary',
    badge: '🧬',
    description: 'Spawns an orbiting mini-virus clone that auto-fires at nearby enemies',
    descriptionUz: 'Aylanadigan mini-virus klon yaratadi, u dushmanlarga avtomatik o\'q uzadi',
    statBoost: { hasSplitClone: true },
    color: '#ec4899',
    maxStack: 0,
  },
  {
    id: 'void_core',
    name: 'VOID CORE',
    nameUz: 'BO\'SHLIQ YADROSI',
    rarity: 'Legendary',
    badge: '🌌',
    description: 'Periodically spawns a gravitational black hole pulling and crushing all enemies',
    descriptionUz: 'Vaqti-vaqti bilan gravitatsion qora tuynuk yaratadi',
    statBoost: { hasVoidCore: true },
    color: '#8b5cf6',
    maxStack: 0,
  },

  // --- v1.2 EXPANSION MUTATIONS ---
  {
    id: 'shield_barrier',
    name: 'SHIELD BARRIER',
    nameUz: 'QALQON TO\'SIG\'I',
    rarity: 'Epic',
    badge: '🛡️',
    description: 'Deploys an energy barrier absorbing up to 40 damage with rapid regeneration',
    descriptionUz: '40 gacha zararni yutib oluvchi va tez tiklanuvchi energetik qalqon beradi',
    statBoost: { hasShieldBarrier: true },
    color: '#06b6d4',
    maxStack: 0,
  },
  {
    id: 'boomerang_shot',
    name: 'BOOMERANG SPORES',
    nameUz: 'QAYTUVCHI SPORA',
    rarity: 'Rare',
    badge: '🔄',
    description: 'Spores curve back towards you, piercing through enemies twice',
    descriptionUz: 'O\'qlar dushmanlarni teshib o\'tib, orqaga siz tomon qaytadi',
    statBoost: { hasBoomerang: true, powerPct: 0.1 },
    color: '#10b981',
    maxStack: 2,
  },
  {
    id: 'chain_lightning',
    name: 'CHAIN LIGHTNING',
    nameUz: 'ZANJIRLI CHAQMOQ',
    rarity: 'Epic',
    badge: '⚡',
    description: 'Spores discharge high-voltage electrical arcs leaping between 3 nearby enemies',
    descriptionUz: 'Spora urilganda 3 tagacha yaqin dushmanga zanjirli chaqmoq uradi',
    statBoost: { hasChainLightning: true },
    color: '#38bdf8',
    maxStack: 0,
  },
  {
    id: 'lifesteal_spore',
    name: 'LIFESTEAL SPORES',
    nameUz: 'HUJAYRA VAMPIRIZMI',
    rarity: 'Rare',
    badge: '🩸',
    description: 'Defeating enemies directly restores +5 HP to your cellular membrane',
    descriptionUz: 'Dushmanlarni yo\'q qilish sizga +5 HP jon qaytaradi',
    statBoost: { hasLifesteal: true },
    color: '#ef4444',
    maxStack: 2,
  },
  {
    id: 'flame_aura',
    name: 'PLASMA FLAME AURA',
    nameUz: 'PLAZMA ALANGASI',
    rarity: 'Epic',
    badge: '🔥',
    description: 'Surrounds your cell with an infernal thermal aura incinerating nearby foes',
    descriptionUz: 'Hujayrangiz atrofida yaqin dushmanlarni yondiruvchi plazma halqasi yaratadi',
    statBoost: { hasFlameAura: true },
    color: '#f97316',
    maxStack: 0,
  },
  {
    id: 'frost_field',
    name: 'CRYO FROST FIELD',
    nameUz: 'KRIOGEN MUZ MAYDONI',
    rarity: 'Rare',
    badge: '❄️',
    description: 'Generates a sub-zero cryo-field slowing nearby enemies by 45%',
    descriptionUz: 'Yaqin atrofdagi dushmanlarni 45% sekinlashtiruvchi muz maydoni hosil qiladi',
    statBoost: { hasFrostField: true },
    color: '#67e8f9',
    maxStack: 2,
  },
  {
    id: 'homing_missiles',
    name: 'HOMING SPORES',
    nameUz: 'AVTO-NISHONCHI SPORA',
    rarity: 'Epic',
    badge: '🎯',
    description: 'All spore projectiles automatically home in and curve towards the nearest targets',
    descriptionUz: 'Barcha otilgan sporalar avtomatik ravishda eng yaqin dushman tomon buriladi',
    statBoost: { hasHomingMissiles: true, powerPct: 0.15 },
    color: '#a855f7',
    maxStack: 0,
  },
  {
    id: 'nano_swarm',
    name: 'NANITE SWARM',
    nameUz: 'NANITLAR TO\'DASI',
    rarity: 'Legendary',
    badge: '🦠',
    description: 'Deploys a defensive swarm of 3 micro-nanites disintegrating any enemy on contact',
    descriptionUz: 'Tegishi bilanoq dushmanga katta zarar beruvchi 3 ta aylanuvchi nanit chiqaradi',
    statBoost: { hasNanoSwarm: true },
    color: '#c084fc',
    maxStack: 0,
  },
]

/**
 * Rarity-weighted mutation selection.
 *
 * Algorithm:
 * 1. Filter out mutations that are already at maxStack in the player's active list.
 * 2. Assign each remaining mutation a weight from RARITY_WEIGHTS.
 * 3. Pick `count` mutations using weighted random without replacement.
 *
 * This ensures Commons appear often, Legendaries rarely, and
 * maxed-out mutations are never re-offered.
 */
export function getRandomMutationOptions(
  count = 3,
  activeMutations: MutationDefinition[] = [],
  banishedIds: string[] = []
): MutationDefinition[] {
  // Count how many times each mutation has been picked
  const pickCounts = new Map<string, number>()
  for (const m of activeMutations) {
    pickCounts.set(m.id, (pickCounts.get(m.id) || 0) + 1)
  }

  const banishedSet = new Set(banishedIds)

  // Filter available mutations (respect maxStack & banishedIds)
  const available = ALL_MUTATIONS.filter((m) => {
    if (banishedSet.has(m.id)) return false
    if (m.maxStack === 0) {
      // Unique abilities: can only be picked once
      return !pickCounts.has(m.id)
    }
    return (pickCounts.get(m.id) || 0) < m.maxStack
  })

  if (available.length === 0) return []
  if (available.length <= count) return [...available]

  // Weighted random selection without replacement
  const result: MutationDefinition[] = []
  const pool = available.map((m) => ({
    mutation: m,
    weight: RARITY_WEIGHTS[m.rarity],
  }))

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0)
    let roll = Math.random() * totalWeight
    let picked = 0

    for (let j = 0; j < pool.length; j++) {
      roll -= pool[j].weight
      if (roll <= 0) {
        picked = j
        break
      }
    }

    result.push(pool[picked].mutation)
    pool.splice(picked, 1) // Remove to prevent duplicates in same selection
  }

  return result
}
