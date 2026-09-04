// ============================================================
// CELLIX v2.2 — Cyber Soldier Characters, Coins & Cosmetic Economy
// ============================================================

import type { CellSkin, CellSkinId } from './types'
export type { CellSkin, CellSkinId }

export const CELL_SKINS: CellSkin[] = [
  {
    id: 'neon_cyan',
    name: 'CYBER STRIKER',
    nameUz: 'KIBER JANGCHI',
    description: 'Elite frontline cyber-trooper equipped with a high-voltage plasma visor and carbine blaster.',
    descriptionUz: 'Yuqori voltli plazma vizor va lazer miltig‘iga ega elita kiber-jangchi personaji.',
    primaryColor: 0x06b6d4, // Cyan-500
    secondaryColor: 0x0e7490, // Cyan-700
    accentColor: 0xa855f7, // Purple-500
    glowColor: '#06b6d4',
    trailColor: 'rgba(6, 182, 212, 0.4)',
    rarity: 'Common',
    unlockType: 'default',
    unlockRequirement: 0,
    coinCost: 0,
    badge: '🤖',
  },
  {
    id: 'toxic_bio',
    name: 'BIO-TOXIC ASSASSIN',
    nameUz: 'BIO-TOKSIK QOTIL',
    description: 'Armored stealth operative wearing an emerald acid respirator and venomous exoskeleton.',
    descriptionUz: 'Zumrad kislotali respirator va zaharli ekzoskelet kiygan maxfiy qotil personaji.',
    primaryColor: 0x10b981, // Emerald-500
    secondaryColor: 0x065f46, // Emerald-800
    accentColor: 0x84cc16, // Lime-500
    glowColor: '#10b981',
    trailColor: 'rgba(16, 185, 129, 0.4)',
    rarity: 'Rare',
    unlockType: 'coins',
    unlockRequirement: 500,
    coinCost: 500,
    badge: '☣️',
  },
  {
    id: 'solar_flare',
    name: 'SOLAR COMMANDO',
    nameUz: 'QUYOSH KOMMANDOSI',
    description: 'Heavy assault juggernaut armed with thermonuclear blast cannons and jetpack thrusters.',
    descriptionUz: 'Termoyadroviy plazma to‘plari va reaktiv raketa kiygan og‘ir hujumchi personaji.',
    primaryColor: 0xf59e0b, // Amber-500
    secondaryColor: 0x9a3412, // Orange-800
    accentColor: 0xef4444, // Red-500
    glowColor: '#f59e0b',
    trailColor: 'rgba(245, 158, 11, 0.4)',
    rarity: 'Rare',
    unlockType: 'coins',
    unlockRequirement: 800,
    coinCost: 800,
    badge: '🔥',
  },
  {
    id: 'void_purple',
    name: 'VOID PHANTOM',
    nameUz: 'BO‘SHLIQ SHARPASI',
    description: 'Mysterious spacetime warden cloaked in gravitational dark-matter shroud and pulse armor.',
    descriptionUz: 'Gravitatsion qora materiya plashi va fazoviy impuls zirhiga ega sirli sharpaviy jangchi.',
    primaryColor: 0xa855f7, // Purple-500
    secondaryColor: 0x581c87, // Purple-900
    accentColor: 0xec4899, // Pink-500
    glowColor: '#a855f7',
    trailColor: 'rgba(168, 85, 247, 0.4)',
    rarity: 'Epic',
    unlockType: 'coins',
    unlockRequirement: 1500,
    coinCost: 1500,
    badge: '🌌',
  },
  {
    id: 'glitch_matrix',
    name: 'MATRIX NINJA',
    nameUz: 'GLITCH NINZYA',
    description: 'Cybernetic shinobi shifting between digital realities with holographic glitching visors.',
    descriptionUz: 'Golografik vizor va raqamli glitch effektlari bilan fazolararo harakatlanuvchi kiber ninzya.',
    primaryColor: 0xec4899, // Pink-500
    secondaryColor: 0x831843, // Pink-900
    accentColor: 0x06b6d4, // Cyan-500
    glowColor: '#ec4899',
    trailColor: 'rgba(236, 72, 153, 0.4)',
    rarity: 'Epic',
    unlockType: 'coins',
    unlockRequirement: 2200,
    coinCost: 2200,
    badge: '👾',
  },
  {
    id: 'golden_prestige',
    name: 'GOLDEN WARLORD',
    nameUz: 'OLTIN HUKMRON SARKARDA',
    description: 'Supreme golden gladiator crowned in celestial aura, wielding pristine photonic rifles.',
    descriptionUz: 'Samoviy aura va sof foton miltig‘iga ega oliy darajadagi afsonaviy oltin sarkarda personaji.',
    primaryColor: 0xfacc15, // Yellow-400
    secondaryColor: 0x854d0e, // Yellow-800
    accentColor: 0xffffff, // White
    glowColor: '#facc15',
    trailColor: 'rgba(250, 204, 21, 0.5)',
    rarity: 'Legendary',
    unlockType: 'coins',
    unlockRequirement: 3500,
    coinCost: 3500,
    badge: '👑',
  },
]

const ACTIVE_SKIN_STORAGE_KEY = 'cellix_active_skin_v1'
const OWNED_SKINS_STORAGE_KEY = 'cellix_owned_skins_v1'
const COIN_BALANCE_STORAGE_KEY = 'cellix_coin_balance_v1'
export const COINS_CHANGED_EVENT = 'cellix-coins-changed'

function isCellSkinId(value: unknown): value is CellSkinId {
  return typeof value === 'string' && CELL_SKINS.some((skin) => skin.id === value)
}

function notifyEconomyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COINS_CHANGED_EVENT))
  }
}

function writeCoinBalance(balance: number) {
  window.localStorage.setItem(COIN_BALANCE_STORAGE_KEY, String(Math.max(0, Math.floor(balance))))
}

export function syncCoinBalance(balance: number): number {
  if (typeof window === 'undefined') return 0
  try {
    const safeBalance = Math.max(0, Math.floor(Number.isFinite(balance) ? balance : 0))
    writeCoinBalance(safeBalance)
    notifyEconomyChanged()
    return safeBalance
  } catch {
    return getCoinBalance()
  }
}

export function getCoinBalance(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = Number(window.localStorage.getItem(COIN_BALANCE_STORAGE_KEY) || 0)
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  } catch {
    return 0
  }
}

export function addCoins(amount: number): number {
  if (typeof window === 'undefined') return 0
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0
  try {
    const nextBalance = getCoinBalance() + safeAmount
    writeCoinBalance(nextBalance)
    notifyEconomyChanged()
    return nextBalance
  } catch {
    return getCoinBalance()
  }
}

export function getOwnedSkinIds(): CellSkinId[] {
  if (typeof window === 'undefined') return ['neon_cyan']
  try {
    const raw = window.localStorage.getItem(OWNED_SKINS_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const owned = Array.isArray(parsed) ? parsed.filter(isCellSkinId) : []
    return Array.from(new Set<CellSkinId>(['neon_cyan', ...owned]))
  } catch {
    return ['neon_cyan']
  }
}

export function syncOwnedSkinIds(skinIds: CellSkinId[]): CellSkinId[] {
  if (typeof window === 'undefined') return ['neon_cyan']
  const ownedSkinIds = Array.from(new Set<CellSkinId>(['neon_cyan', ...skinIds.filter(isCellSkinId)]))
  try {
    window.localStorage.setItem(OWNED_SKINS_STORAGE_KEY, JSON.stringify(ownedSkinIds))
    notifyEconomyChanged()
  } catch {
    // ignore
  }
  return ownedSkinIds
}

export function isSkinOwned(skinId: CellSkinId): boolean {
  return getOwnedSkinIds().includes(skinId)
}

export function purchaseSkin(skinId: CellSkinId): {
  ok: boolean
  balance: number
  ownedSkinIds: CellSkinId[]
} {
  if (typeof window === 'undefined') {
    return { ok: false, balance: 0, ownedSkinIds: ['neon_cyan'] }
  }

  const ownedSkinIds = getOwnedSkinIds()
  const skin = CELL_SKINS.find((item) => item.id === skinId)
  if (!skin || skin.unlockType === 'default' || ownedSkinIds.includes(skinId)) {
    return { ok: ownedSkinIds.includes(skinId), balance: getCoinBalance(), ownedSkinIds }
  }

  const balance = getCoinBalance()
  if (balance < skin.coinCost) {
    return { ok: false, balance, ownedSkinIds }
  }

  const nextOwnedSkinIds = [...ownedSkinIds, skinId]
  try {
    window.localStorage.setItem(OWNED_SKINS_STORAGE_KEY, JSON.stringify(nextOwnedSkinIds))
    writeCoinBalance(balance - skin.coinCost)
    notifyEconomyChanged()
    return { ok: true, balance: balance - skin.coinCost, ownedSkinIds: nextOwnedSkinIds }
  } catch {
    return { ok: false, balance, ownedSkinIds }
  }
}

export function calculateRunCoinReward(metrics: {
  score: number
  kills: number
  survivalTime: number
  gameMode: 'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer' | 'biowar'
}): number {
  if (metrics.gameMode === 'practice') return 0

  const baseReward = 15
  const scoreReward = Math.min(100, Math.floor(Math.max(0, metrics.score) / 500))
  const killReward = Math.min(80, Math.floor(Math.max(0, metrics.kills) / 2))
  const survivalReward = Math.min(80, Math.floor(Math.max(0, metrics.survivalTime) / 30))
  const modeBonus = metrics.gameMode === 'survival' ? 15 : metrics.gameMode === 'daily' ? 10 : metrics.gameMode === 'biowar' ? 20 : 0

  return baseReward + scoreReward + killReward + survivalReward + modeBonus
}

export function getSelectedSkinId(): CellSkinId {
  if (typeof window === 'undefined') return 'neon_cyan'
  try {
    const raw = window.localStorage.getItem(ACTIVE_SKIN_STORAGE_KEY) as CellSkinId | null
    if (raw && isCellSkinId(raw) && isSkinOwned(raw)) return raw
    return 'neon_cyan'
  } catch {
    return 'neon_cyan'
  }
}

export function setSelectedSkinId(skinId: CellSkinId): void {
  if (typeof window === 'undefined') return
  if (!isSkinOwned(skinId)) return
  try {
    window.localStorage.setItem(ACTIVE_SKIN_STORAGE_KEY, skinId)
  } catch {
    // ignore
  }
}

export function getSkinConfig(skinId?: CellSkinId): CellSkin {
  const targetId = skinId || 'neon_cyan'
  return CELL_SKINS.find((s) => s.id === targetId) || CELL_SKINS[0]
}

export function isSkinUnlocked(skin: CellSkin): boolean {
  return isSkinOwned(skin.id)
}
