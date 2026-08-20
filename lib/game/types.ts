// ============================================================
// CELLIX v1.2 — Shared Gameplay Types & Systems
// ============================================================

import type { DailyChallenge } from './daily'

// --- Enemy ---

export type EnemyTypeId = 'eater' | 'hunter' | 'shooter' | 'tank' | 'healer' | 'teleporter' | 'shielded' | 'swarm'

export interface EnemyConfig {
  textureKey: string
  baseHp: number
  hpPerLevel: number
  speed: number
  xpValue: number
  /** Fraction weight used during spawn randomisation (must sum to 1 within a tier). */
  weight: number
}

export interface EliteModifier {
  id: string
  label: string
  color: number
  hpMult: number
  speedMult: number
  damageMult: number
  /** Extra behaviour flag handled in Scene update loop. */
  behaviour: 'fast' | 'armored' | 'volatile' | 'vampiric' | 'split'
}

// --- Wave ---

export interface WaveConfig {
  waveNumber: number
  enemyCount: [min: number, max: number]
  /** Extra enemies added per wave number. */
  countPerWave: number
  /** Spawn weight overrides per enemy type. */
  weights: Partial<Record<EnemyTypeId, number>> & Record<'eater' | 'hunter' | 'shooter' | 'tank', number>
  /** Whether a boss spawns this wave. */
  boss: false | 'mini' | 'mega'
  /** Special event id (elite pack, hazard intro, etc.) */
  event?: string
}

// --- HUD Data ---

export interface GameHUDData {
  hp: number
  maxHp: number
  xp: number
  nextLevelXp: number
  level: number
  score: number
  kills: number
  survivalTime: number
  dashCooldownPct?: number
  specialCooldownPct?: number
  dashCooldownProgress?: number
  specialCooldownProgress?: number
  bossActive?: boolean
  bossHpPct?: number
  bossName?: string
  gameMode?: string
  dailyChallenge?: DailyChallenge
}

// --- Boss ---

export interface BossConfig {
  baseHp: number
  hpPerLevel: number
  speed: number
  hitboxRadius: number
  xpReward: number
  spriteScale: number
  /** Phase HP thresholds (descending). */
  phases: number[]
  /** Attack cooldown per phase (ms). */
  attackCooldowns: number[]
  /** Projectile count per phase. */
  burstCounts: number[]
  /** Projectile speed per phase. */
  burstSpeeds: number[]
  /** Whether phase-2 minion spawn is enabled. */
  minionsEnabled: boolean
  minionCount: number
  minionHpBase: number
  minionHpPerLevel: number
  minionXp: number
  /** Shockwave damage (phase 3). */
  shockwaveDamage: number
  shockwaveInterval: number
  shockwaveRadius: number
  deathGemCount: number
  deathGemXp: number
}

// --- Projectile ---

export interface ProjectileConfig {
  speed: number
  hitboxRadius: number
  maxCount: number
  lifetime: number
}

// --- Player ---

export interface PlayerBaseStats {
  hp: number
  maxHp: number
  speed: number
  damage: number
  shootCooldown: number
  dashCooldown: number
  dashSpeedMult: number
  dashDuration: number
  phaseDashSpeedMult: number
  phaseDashDuration: number
  specialCooldown: number
  specialRange: number
  specialDamageMult: number
  critChance: number
  critMultiplier: number
  hpRegenRate: number
  damageCooldown: number
  hitboxRadius: number
}

// --- Damage ---

export interface CollisionDamage {
  bossBody: number
  enemyBody: number
  enemyProjectile: number
  knockbackVelocity: number
}

// --- Scoring ---

export interface ScoringRules {
  /** Points added per second survived. */
  perSecond: number
  /** Score multiplier for XP gem pickup. */
  gemPickupMult: number
  /** Score multiplier for enemy kill XP. */
  enemyKillMult: number
}

// --- Arena ---

export interface ArenaConfig {
  width: number
  height: number
  gridSize: number
  spawnPadding: number
  initialGemCount: number
  gemBaseXp: number
}

// --- Difficulty ---

export interface DifficultyConfig {
  /** Maximum active enemies on field. */
  enemyCap: number
  /** ms between spawn waves. */
  spawnInterval: number
  /** Enemies spawned per wave. */
  spawnGroupSize: [min: number, max: number]
  /** Distance from player to spawn. */
  spawnDistance: [min: number, max: number]
  /** Boss becomes possible at this player level. */
  bossMinLevel: number
  /** Chance boss spawns when eligible. */
  bossSpawnChance: number
}

// --- Mutation ---

export type MutationRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

export interface MutationStatBoosts {
  speedPct?: number
  powerPct?: number
  maxHpPct?: number
  xpGainPct?: number
  hasMagnetRadius?: number
  hpRegen?: number
  critChancePct?: number
  hasToxinTrail?: boolean
  hasOvercharge?: boolean
  hasPhaseDash?: boolean
  hasSplitClone?: boolean
  hasVoidCore?: boolean
  // v1.2 Additions
  hasShieldBarrier?: boolean
  hasBoomerang?: boolean
  hasChainLightning?: boolean
  hasLifesteal?: boolean
  hasFlameAura?: boolean
  hasFrostField?: boolean
  hasHomingMissiles?: boolean
  hasNanoSwarm?: boolean
}

export interface MutationDefinition {
  id: string
  name: string
  nameUz: string
  description: string
  descriptionUz: string
  rarity: MutationRarity
  badge: string
  color: string
  statBoost: MutationStatBoosts
  /** Max times this mutation can stack. 0 = unique (cannot re-pick). */
  maxStack: number
}

// --- Cell Skins & Cosmetics ---

export type CellSkinId =
  | 'neon_cyan'
  | 'toxic_bio'
  | 'solar_flare'
  | 'void_purple'
  | 'glitch_matrix'
  | 'golden_prestige'

export interface CellSkin {
  id: CellSkinId
  name: string
  nameUz: string
  description: string
  descriptionUz: string
  primaryColor: number
  secondaryColor: number
  accentColor: number
  glowColor: string
  trailColor: string
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'
  unlockType: 'default' | 'coins'
  unlockRequirement: number
  coinCost: number
  badge: string
}

// --- Run Telemetry & Analytics ---

export interface DamageSourceBreakdown {
  spores: number
  dashShockwave: number
  toxicClouds: number
  voidCore: number
  chainLightning: number
  flameAura: number
  nanoSwarm: number
  splitClone: number
  other: number
}

export interface DeathCoordinate {
  x: number
  y: number
  level: number
  time: number
  killedBy: string
}

export interface RunTelemetry {
  dps: number
  peakDps: number
  damageBreakdown: DamageSourceBreakdown
  deathLocation?: DeathCoordinate
  accuracyPct?: number
  healsReceived?: number
  shieldsAbsorbed?: number
}

// --- XP / Level ---

export interface LevelThreshold {
  level: number
  xpRequired: number
}

// --- Run Metrics ---

export interface RunMetrics {
  score: number
  level: number
  kills: number
  survivalTime: number
  mutationsCount: number
  damageDealt?: number
  damageTaken?: number
  criticalHits?: number
  bossDefeated?: boolean
  wave?: number
  gameMode: 'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer'
  telemetry?: RunTelemetry
  chosenSkin?: CellSkinId
}

// --- Toxic Cloud ---

export interface ToxicCloudConfig {
  radius: number
  lifetime: number
  tickInterval: number
  damagePerTick: number
  expansionScale: number
}

// --- Void Core ---

export interface VoidCoreConfig {
  triggerInterval: number
  spawnOffset: number
  visualRadius: [start: number, end: number]
  expandDuration: number
  pullInterval: number
  pullRepeat: number
  pullRange: number
  pullStrength: number
  damagePerTick: number
}

// --- Split Clone ---

export interface SplitCloneConfig {
  orbitRadius: number
  orbitSpeedFactor: number
  scale: number
  tint: number
  fireInterval: number
}
