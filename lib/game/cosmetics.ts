// ============================================================
// CELLIX v2026 — Volumetric 3D Arena Skins & Cosmetic Economy
// ============================================================

import type { ArenaAffinity, CellSkin, CellSkinId } from './types'
export type { ArenaAffinity, CellSkin, CellSkinId }

export interface ArenaThemePalette {
  mode: 'classic' | 'survival' | 'daily' | 'biowar'
  floorHex: number
  gridHex: number
  borderHex: number
  borderGlowHex: number
  accentHex: number
  accentCss: string
  label: string
  labelUz: string
}

export const ARENA_THEMES: Record<'classic' | 'survival' | 'daily' | 'biowar', ArenaThemePalette> = {
  classic: {
    mode: 'classic',
    floorHex: 0x070b0a,
    gridHex: 0x132219,
    borderHex: 0xd4ff3a,
    borderGlowHex: 0xa8d11a,
    accentHex: 0xd4ff3a,
    accentCss: '#d4ff3a',
    label: 'CLASSIC // BIO-LAB',
    labelUz: 'KLASSIK // BIO-LAB',
  },
  survival: {
    mode: 'survival',
    floorHex: 0x0d0708,
    gridHex: 0x261215,
    borderHex: 0xff4d2e,
    borderGlowHex: 0xf97316,
    accentHex: 0xff4d2e,
    accentCss: '#ff4d2e',
    label: 'SURVIVAL // RED REACTOR',
    labelUz: 'SURVIVAL // QIZIL REAKTOR',
  },
  daily: {
    mode: 'daily',
    floorHex: 0x0b0907,
    gridHex: 0x241d11,
    borderHex: 0xffc83a,
    borderGlowHex: 0xf59e0b,
    accentHex: 0xffc83a,
    accentCss: '#ffc83a',
    label: 'DAILY // CHRONO VAULT',
    labelUz: 'KUNLIK // XRONO SEYF',
  },
  biowar: {
    mode: 'biowar',
    floorHex: 0x050a0c,
    gridHex: 0x0e2427,
    borderHex: 0xef4444,
    borderGlowHex: 0x3ae0c8,
    accentHex: 0x3ae0c8,
    accentCss: '#3ae0c8',
    label: 'BIO-WAR 30 // ABYSS TRENCH',
    labelUz: 'BIO-WAR 30 // TUBSIZ CHUQUR',
  },
}

export function getArenaThemePalette(mode?: string): ArenaThemePalette {
  if (mode === 'survival') return ARENA_THEMES.survival
  if (mode === 'daily') return ARENA_THEMES.daily
  if (mode === 'biowar') return ARENA_THEMES.biowar
  return ARENA_THEMES.classic
}

export const CELL_SKINS: CellSkin[] = [
  {
    id: 'neon_cyan',
    name: 'CYBER STRIKER 3D',
    nameUz: 'KIBER JANGCHI 3D',
    description: 'Armored 3D sphere chassis with specular cyan visor and twin pulse emitters.',
    descriptionUz: 'Sferik 3D zirhli korpus, porloq kiber-vizor va qo‘sh plazma to‘plari bilan jihozlangan.',
    primaryColor: 0x06b6d4,
    secondaryColor: 0x0e7490,
    accentColor: 0xa855f7,
    projectileColor: 0x38bdf8,
    glowColor: '#06b6d4',
    trailColor: 'rgba(6, 182, 212, 0.4)',
    rarity: 'Common',
    arenaAffinity: 'universal',
    model3dType: 'sphere_visor',
    unlockType: 'default',
    unlockRequirement: 0,
    coinCost: 0,
    badge: '🛡️',
  },
  {
    id: 'classic_prism',
    name: 'ACID HELIX 3D',
    nameUz: 'KISLOTALI SPIRAL 3D',
    description: 'Classic Arena signature: translucent acid-glass 3D shell housing a live double helix.',
    descriptionUz: 'Klassik Arena uchun maxsus: ichida jonli DNK spirali aylanuvchi shaffof kislota-shisha 3D qobiq.',
    primaryColor: 0xd4ff3a,
    secondaryColor: 0x3f6212,
    accentColor: 0x3ae0c8,
    projectileColor: 0xd4ff3a,
    glowColor: '#d4ff3a',
    trailColor: 'rgba(212, 255, 58, 0.45)',
    rarity: 'Rare',
    arenaAffinity: 'classic',
    model3dType: 'helix_crystal',
    isNew3D: true,
    unlockType: 'coins',
    unlockRequirement: 1200,
    coinCost: 1200,
    badge: '🧬',
  },
  {
    id: 'toxic_bio',
    name: 'TOXIC REAPER 3D',
    nameUz: 'BIO-TOKSIK QOTIL 3D',
    description: 'Pressurized emerald exoskeleton with 3D toxin flasks built for wave attrition.',
    descriptionUz: 'To‘lqinli janglar uchun bosimli zumrad ekzoskelet va 3D toksin kapsulalari.',
    primaryColor: 0x10b981,
    secondaryColor: 0x065f46,
    accentColor: 0x84cc16,
    projectileColor: 0x34d399,
    glowColor: '#10b981',
    trailColor: 'rgba(16, 185, 129, 0.4)',
    rarity: 'Rare',
    arenaAffinity: 'survival',
    model3dType: 'bio_hazard',
    unlockType: 'coins',
    unlockRequirement: 500,
    coinCost: 500,
    badge: '☣️',
  },
  {
    id: 'solar_flare',
    name: 'SOLAR JUGGERNAUT 3D',
    nameUz: 'QUYOSH KOMMANDOSI 3D',
    description: 'Layered molten tungsten plating and twin reactor thrusters engineered for siege waves.',
    descriptionUz: 'Erigan volfram qatlamlari va reaktiv dvigatellarga ega og‘ir hujumchi 3D korpus.',
    primaryColor: 0xf59e0b,
    secondaryColor: 0x9a3412,
    accentColor: 0xef4444,
    projectileColor: 0xfb923c,
    glowColor: '#f59e0b',
    trailColor: 'rgba(245, 158, 11, 0.4)',
    rarity: 'Rare',
    arenaAffinity: 'survival',
    model3dType: 'plasma_core',
    unlockType: 'coins',
    unlockRequirement: 800,
    coinCost: 800,
    badge: '🔥',
  },
  {
    id: 'survival_bastion',
    name: 'CRIMSON BASTION 3D',
    nameUz: 'QIZIL QAL’A BASTION 3D',
    description: 'Survival Arena signature: heavy beveled ember titanium carapace with twin siege cannons.',
    descriptionUz: 'Survival Arenasi uchun maxsus: qirrali qizil titan qalqon va ikki og‘ir reaktor to‘piga ega 3D model.',
    primaryColor: 0xff4d2e,
    secondaryColor: 0x7f1d1d,
    accentColor: 0xfbbf24,
    projectileColor: 0xff4d2e,
    glowColor: '#ff4d2e',
    trailColor: 'rgba(255, 77, 46, 0.45)',
    rarity: 'Epic',
    arenaAffinity: 'survival',
    model3dType: 'bastion_mech',
    isNew3D: true,
    unlockType: 'coins',
    unlockRequirement: 2000,
    coinCost: 2000,
    badge: '🛡️',
  },
  {
    id: 'biowar_leviathan',
    name: 'ABYSS LEVIATHAN 3D',
    nameUz: 'TUBSIZ LEVIAFAN 3D',
    description: 'Bio-War 30 signature: sculpted teal chitin plates, 3D predator mandibles & segmented dorsal spine.',
    descriptionUz: 'Bio-War 30 arenasi uchun maxsus: 3D yirtqich jag‘lar, feruza xitin zirh va yaltiroq umurtqa segmentlari.',
    primaryColor: 0x3ae0c8,
    secondaryColor: 0x0f766e,
    accentColor: 0xd4ff3a,
    projectileColor: 0x3ae0c8,
    glowColor: '#3ae0c8',
    trailColor: 'rgba(58, 224, 200, 0.45)',
    rarity: 'Epic',
    arenaAffinity: 'biowar',
    model3dType: 'leviathan_apex',
    isNew3D: true,
    unlockType: 'coins',
    unlockRequirement: 1800,
    coinCost: 1800,
    badge: '🐉',
  },
  {
    id: 'void_purple',
    name: 'VOID SINGULARITY 3D',
    nameUz: 'BO‘SHLIQ SINGULYARLIGI 3D',
    description: 'Dark-matter core orbited by a tilted gravitational ring for silent Bio-War hunts.',
    descriptionUz: 'Qora materiya yadrosi va egilgan gravitatsion halqali Bio-War ovchi 3D hujayrasi.',
    primaryColor: 0xa855f7,
    secondaryColor: 0x581c87,
    accentColor: 0xec4899,
    projectileColor: 0xc084fc,
    glowColor: '#a855f7',
    trailColor: 'rgba(168, 85, 247, 0.4)',
    rarity: 'Epic',
    arenaAffinity: 'biowar',
    model3dType: 'void_orb',
    unlockType: 'coins',
    unlockRequirement: 1500,
    coinCost: 1500,
    badge: '🌌',
  },
  {
    id: 'glitch_matrix',
    name: 'HOLO NINJA 3D',
    nameUz: 'GOLO NINZYA 3D',
    description: 'Refractive cyber prism visor engineered for encrypted Daily Hazard protocols.',
    descriptionUz: 'Kunlik Sinov shifrlangan arenalari uchun ikki rangli refraktiv prizma vizorli 3D kiber-ninzya.',
    primaryColor: 0xec4899,
    secondaryColor: 0x831843,
    accentColor: 0x06b6d4,
    projectileColor: 0xf472b6,
    glowColor: '#ec4899',
    trailColor: 'rgba(236, 72, 153, 0.4)',
    rarity: 'Epic',
    arenaAffinity: 'daily',
    model3dType: 'prism_stealth',
    unlockType: 'coins',
    unlockRequirement: 2200,
    coinCost: 2200,
    badge: '👾',
  },
  {
    id: 'daily_chronos',
    name: 'CHRONO PRISM 3D',
    nameUz: 'XRONO PRIZMA 3D',
    description: 'Daily Hazard signature: sculpted 3D golden octahedron crystal with precision gimbal ring.',
    descriptionUz: 'Kunlik Sinov arenasi uchun maxsus: qirrali oltin oktaedr kristal va giroskop halqali 3D model.',
    primaryColor: 0xffc83a,
    secondaryColor: 0x78350f,
    accentColor: 0xede9e0,
    projectileColor: 0xffc83a,
    glowColor: '#ffc83a',
    trailColor: 'rgba(255, 200, 58, 0.5)',
    rarity: 'Legendary',
    arenaAffinity: 'daily',
    model3dType: 'chrono_octa',
    isNew3D: true,
    unlockType: 'coins',
    unlockRequirement: 2800,
    coinCost: 2800,
    badge: '⏳',
  },
  {
    id: 'golden_prestige',
    name: 'APEX SOVEREIGN 3D',
    nameUz: 'OLTIN HUKMRON 3D',
    description: 'Forged 24K volumetric gold carapace crowned with photonic apex spikes across every arena.',
    descriptionUz: 'Barcha arenalar uchun quyma oltin 3D korpus va fotonli toj qirralariga ega afsonaviy sarkarda.',
    primaryColor: 0xfacc15,
    secondaryColor: 0x854d0e,
    accentColor: 0xffffff,
    projectileColor: 0xfde047,
    glowColor: '#facc15',
    trailColor: 'rgba(250, 204, 21, 0.5)',
    rarity: 'Legendary',
    arenaAffinity: 'universal',
    model3dType: 'crown_sovereign',
    unlockType: 'coins',
    unlockRequirement: 3500,
    coinCost: 3500,
    badge: '👑',
  },
]

export function getArenaMatchedSkins(mode: ArenaAffinity | 'all'): CellSkin[] {
  if (mode === 'all') return CELL_SKINS
  return CELL_SKINS.filter((s) => s.arenaAffinity === mode || s.arenaAffinity === 'universal')
}

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
