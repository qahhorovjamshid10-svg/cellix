// ============================================================
// CELLIX v2.1 — Miniboss Archetypes & Mechanics
// ============================================================

export type MinibossTypeId = 'void_weaver' | 'inferno_cell'

export interface MinibossConfig {
  id: MinibossTypeId
  name: string
  nameUz: string
  baseHp: number
  hpPerLevel: number
  speed: number
  color: number
  spriteScale: number
  hitboxRadius: number
  xpReward: number
  phases: number[] // e.g. [0.5]
  attackCooldowns: number[] // [Phase 1 CD, Phase 2 CD]
}

export const MINIBOSSES: Record<MinibossTypeId, MinibossConfig> = {
  void_weaver: {
    id: 'void_weaver',
    name: 'VOID WEAVER',
    nameUz: 'BO\'SHLIQ TO\'QUVCHISI',
    baseHp: 500,
    hpPerLevel: 180,
    speed: 100,
    color: 0x8b5cf6, // Violet
    spriteScale: 0.85,
    hitboxRadius: 32,
    xpReward: 350,
    phases: [0.5],
    attackCooldowns: [3000, 2000],
  },
  inferno_cell: {
    id: 'inferno_cell',
    name: 'INFERNO CELL',
    nameUz: 'DO\'ZAX HUJAYRASI',
    baseHp: 600,
    hpPerLevel: 200,
    speed: 130,
    color: 0xf97316, // Orange
    spriteScale: 0.9,
    hitboxRadius: 35,
    xpReward: 400,
    phases: [0.5],
    attackCooldowns: [2500, 1500],
  },
}

export function getRandomMinibossConfig(): MinibossConfig {
  const keys: MinibossTypeId[] = ['void_weaver', 'inferno_cell']
  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  return MINIBOSSES[randomKey]
}
