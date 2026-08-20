// ============================================================
// CELLIX v2.1 — Mutation Combos & Synergies
// Special passive effects when specific mutation pairs are owned
// ============================================================

import type { MutationDefinition } from './mutations'

export interface MutationCombo {
  id: string
  name: string
  nameUz: string
  requiredIds: [string, string]
  description: string
  descriptionUz: string
  badge: string
  color: string
}

export const ALL_COMBOS: MutationCombo[] = [
  {
    id: 'toxic_tempest',
    name: 'TOXIC TEMPEST',
    nameUz: 'TOKSIK BO\'RON',
    requiredIds: ['toxin_boost', 'speed_boost'],
    description: 'Toxic clouds expand 30% faster and deal +25% tick damage while moving at high speed.',
    descriptionUz: 'Harakatlanayotganda toksik bulutlar +25% ko\'proq zarar beradi va 30% tezroq kengayadi.',
    badge: '🌀☠️',
    color: '#a3e635',
  },
  {
    id: 'quantum_core',
    name: 'QUANTUM CORE',
    nameUz: 'KVANT YADRO',
    requiredIds: ['void_core', 'phase_dash'],
    description: 'Black hole pulses create a brief invulnerability field around the player.',
    descriptionUz: 'Qora tuynuk hosil bo\'lganda o\'yinchiga qisqa daxlsizlik qalqoni beriladi.',
    badge: '🌌👻',
    color: '#8b5cf6',
  },
  {
    id: 'mitotic_overcharge',
    name: 'MITOTIC OVERCHARGE',
    nameUz: 'MITOTIK ZARYADKA',
    requiredIds: ['split_clone', 'overcharge_boost'],
    description: 'Viral Mitosis clone fires 2x faster when player HP drops below 40%.',
    descriptionUz: 'HP 40% dan past bo\'lganda Viral Klon 2x tezroq otadi.',
    badge: '🧬🔥',
    color: '#ec4899',
  },
  {
    id: 'lethal_magnet',
    name: 'LETHAL MAGNET',
    nameUz: 'O\'LDIRUVCHI MAGNIT',
    requiredIds: ['magnet_boost', 'critical_boost'],
    description: 'Landing a critical hit instantly pulls all visible XP gems toward you.',
    descriptionUz: 'Kritik zarba berganda atrofdagi barcha XP gemlar tezda tortiladi.',
    badge: '⚔️🌀',
    color: '#ff8800',
  },
  {
    id: 'plasma_overload',
    name: 'PLASMA OVERLOAD',
    nameUz: 'PLAZMA TO\'FONI',
    requiredIds: ['flame_aura', 'chain_lightning'],
    description: 'Chain lightning strikes trigger fiery plasma detonations on all hit targets.',
    descriptionUz: 'Zanjirli chaqmoq urilgan barcha dushmanlarda olovli plazma portlashlari yuz beradi.',
    badge: '🔥⚡',
    color: '#f97316',
  },
  {
    id: 'cryo_toxic_blizzard',
    name: 'CRYO-TOXIC BLIZZARD',
    nameUz: 'KRIOGEN TOKSIK BO\'RON',
    requiredIds: ['frost_field', 'toxin_boost'],
    description: 'Slowed enemies inside the cryo field take +50% amplified damage from toxin clouds.',
    descriptionUz: 'Muz maydonida sekinlashgan dushmanlar zaharli bulutlardan +50% ko\'proq zarar oladi.',
    badge: '❄️☠️',
    color: '#06b6d4',
  },
  {
    id: 'vampire_tempest',
    name: 'VAMPIRE TEMPEST',
    nameUz: 'VAMPIRIK MITOZ',
    requiredIds: ['lifesteal_spore', 'split_clone'],
    description: 'Viral clone hits also trigger lifesteal healing directly to the host cell.',
    descriptionUz: 'Viral klon urgan o\'qlar ham asosiy hujayraga jon (HP) qaytaradi.',
    badge: '🧬🩸',
    color: '#ef4444',
  },
  {
    id: 'nanite_singularity',
    name: 'NANITE SINGULARITY',
    nameUz: 'NANIT SINGULYARLIGI',
    requiredIds: ['nano_swarm', 'void_core'],
    description: 'Nanite swarm orbits at 2x speed and range while a black hole singularity is active.',
    descriptionUz: 'Qora tuynuk faol bo\'lganda nanitlar 2x tezlikda aylanib, katta maydonda zarba beradi.',
    badge: '🦠🌌',
    color: '#c084fc',
  },
]

/**
 * Check which combos are currently active based on owned mutation IDs.
 */
export function getActiveCombos(activeMutations: MutationDefinition[]): MutationCombo[] {
  const ownedSet = new Set(activeMutations.map((m) => m.id))
  return ALL_COMBOS.filter((combo) =>
    combo.requiredIds.every((reqId) => ownedSet.has(reqId))
  )
}
