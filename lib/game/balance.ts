// ============================================================
// CELLIX v2.1 — Central Balance Configuration
// All gameplay constants live here. Never hard-code values in
// Scene files — import from this module instead.
// ============================================================

import type {
  PlayerBaseStats,
  EnemyConfig,
  EnemyTypeId,
  BossConfig,
  ProjectileConfig,
  CollisionDamage,
  ScoringRules,
  ArenaConfig,
  DifficultyConfig,
  WaveConfig,
  ToxicCloudConfig,
  VoidCoreConfig,
  SplitCloneConfig,
} from './types'

// ─── PLAYER ──────────────────────────────────────────────────

export const PLAYER: PlayerBaseStats = {
  hp: 100,
  maxHp: 100,
  speed: 220,
  damage: 25,
  shootCooldown: 180,
  dashCooldown: 3000,
  dashSpeedMult: 3.4,
  dashDuration: 250,
  phaseDashSpeedMult: 4.2,
  phaseDashDuration: 500,
  specialCooldown: 8000,
  specialRange: 220,
  specialDamageMult: 2.5,
  critChance: 0.05,
  critMultiplier: 2.5,
  hpRegenRate: 0,
  damageCooldown: 350,
  hitboxRadius: 14,
}

// ─── ENEMIES ─────────────────────────────────────────────────

export const ENEMIES: Record<EnemyTypeId, EnemyConfig> = {
  eater: {
    textureKey: 'enemy_eater',
    baseHp: 30,
    hpPerLevel: 10,
    speed: 140,
    xpValue: 20,
    weight: 0.2,
  },
  hunter: {
    textureKey: 'enemy_hunter',
    baseHp: 50,
    hpPerLevel: 15,
    speed: 170,
    xpValue: 35,
    weight: 0.2,
  },
  shooter: {
    textureKey: 'enemy_shooter',
    baseHp: 40,
    hpPerLevel: 12,
    speed: 100,
    xpValue: 30,
    weight: 0.15,
  },
  tank: {
    textureKey: 'enemy_tank',
    baseHp: 120,
    hpPerLevel: 30,
    speed: 70,
    xpValue: 60,
    weight: 0.15,
  },
  healer: {
    textureKey: 'enemy_healer',
    baseHp: 65,
    hpPerLevel: 16,
    speed: 110,
    xpValue: 45,
    weight: 0.1,
  },
  teleporter: {
    textureKey: 'enemy_teleporter',
    baseHp: 45,
    hpPerLevel: 14,
    speed: 130,
    xpValue: 40,
    weight: 0.08,
  },
  shielded: {
    textureKey: 'enemy_shielded',
    baseHp: 90,
    hpPerLevel: 24,
    speed: 85,
    xpValue: 50,
    weight: 0.07,
  },
  swarm: {
    textureKey: 'enemy_swarm',
    baseHp: 15,
    hpPerLevel: 6,
    speed: 210,
    xpValue: 12,
    weight: 0.05,
  },
}

/** Shooter AI: tries to maintain this range band from the player. */
export const SHOOTER_RANGE = { min: 220, max: 380 }
/** Shooter AI: ms between shots. */
export const SHOOTER_COOLDOWN = 1600

// ─── BOSS — CLASSIC (The Ancient Cell) ───────────────────────

export const BOSS_CLASSIC: BossConfig = {
  baseHp: 800,
  hpPerLevel: 250,
  speed: 90,
  hitboxRadius: 40,
  xpReward: 500,
  spriteScale: 1.0,
  phases: [0.66, 0.33],
  attackCooldowns: [2200, 1800, 1400],
  burstCounts: [8, 10, 12],
  burstSpeeds: [220, 220, 280],
  minionsEnabled: true,
  minionCount: 4,
  minionHpBase: 70,
  minionHpPerLevel: 12,
  minionXp: 45,
  shockwaveDamage: 30,
  shockwaveInterval: 5000,
  shockwaveRadius: 260,
  deathGemCount: 10,
  deathGemXp: 100,
}

// ─── BOSS — SURVIVAL MINI (Wave 5) ──────────────────────────

export const BOSS_MINI: BossConfig = {
  baseHp: 400,
  hpPerLevel: 250,
  speed: 120,
  hitboxRadius: 28,
  xpReward: 250,
  spriteScale: 0.7,
  phases: [0.66, 0.33],
  attackCooldowns: [2200, 1800, 1400],
  burstCounts: [8, 10, 12],
  burstSpeeds: [220, 220, 280],
  minionsEnabled: false,
  minionCount: 0,
  minionHpBase: 0,
  minionHpPerLevel: 0,
  minionXp: 0,
  shockwaveDamage: 30,
  shockwaveInterval: 5000,
  shockwaveRadius: 260,
  deathGemCount: 10,
  deathGemXp: 100,
}

// ─── BOSS — SURVIVAL MEGA (Wave 10) ─────────────────────────

export const BOSS_MEGA: BossConfig = {
  baseHp: 1200,
  hpPerLevel: 250,
  speed: 90,
  hitboxRadius: 40,
  xpReward: 1000,
  spriteScale: 1.0,
  phases: [0.66, 0.33],
  attackCooldowns: [2200, 1800, 1400],
  burstCounts: [8, 10, 12],
  burstSpeeds: [220, 220, 280],
  minionsEnabled: true,
  minionCount: 4,
  minionHpBase: 80,
  minionHpPerLevel: 14,
  minionXp: 50,
  shockwaveDamage: 30,
  shockwaveInterval: 5000,
  shockwaveRadius: 260,
  deathGemCount: 10,
  deathGemXp: 100,
}

// ─── PROJECTILES ─────────────────────────────────────────────

export const PLAYER_PROJECTILE: ProjectileConfig = {
  speed: 550,
  hitboxRadius: 5,
  maxCount: 200,
  lifetime: 2000,
}

export const ENEMY_PROJECTILE: ProjectileConfig = {
  speed: 180,
  hitboxRadius: 5,
  maxCount: 200,
  lifetime: 3000,
}

// ─── COLLISION DAMAGE ────────────────────────────────────────

export const COLLISION: CollisionDamage = {
  bossBody: 35,
  enemyBody: 12,
  enemyProjectile: 15,
  knockbackVelocity: 350,
}

// ─── SCORING ─────────────────────────────────────────────────

export const SCORING: ScoringRules = {
  perSecond: 10,
  gemPickupMult: 2,
  enemyKillMult: 5,
}

// ─── ARENA ───────────────────────────────────────────────────

export const ARENA: ArenaConfig = {
  width: 3000,
  height: 3000,
  gridSize: 80,
  spawnPadding: 100,
  initialGemCount: 50,
  gemBaseXp: 20,
}

// ─── CLASSIC DIFFICULTY ──────────────────────────────────────

export const DIFFICULTY_CLASSIC: DifficultyConfig = {
  enemyCap: 60,
  spawnInterval: 2000,
  spawnGroupSize: [2, 4],
  spawnDistance: [500, 700],
  bossMinLevel: 5,
  bossSpawnChance: 0.3,
}

/**
 * Classic difficulty curve: returns adjusted spawn parameters
 * based on elapsed seconds. The first 60–90 seconds are gentle
 * for new players; intensity ramps up every ~30 seconds after.
 */
export function getClassicDifficulty(elapsedSec: number, playerLevel: number) {
  // Phase 0: 0–60s — Intro / tutorial feel
  // Phase 1: 60–120s — Ramping
  // Phase 2: 120–240s — Mid-game pressure
  // Phase 3: 240–480s — Late-game
  // Phase 4: 480s+ — Soft cap / endless plateau

  let spawnInterval = DIFFICULTY_CLASSIC.spawnInterval
  let groupMin = DIFFICULTY_CLASSIC.spawnGroupSize[0]
  let groupMax = DIFFICULTY_CLASSIC.spawnGroupSize[1]
  let enemyCap = DIFFICULTY_CLASSIC.enemyCap
  let eliteChance = 0

  if (elapsedSec < 60) {
    // Gentle intro: slower spawns, fewer enemies
    spawnInterval = 2800
    groupMin = 1
    groupMax = 2
    enemyCap = 25
    eliteChance = 0
  } else if (elapsedSec < 120) {
    // Ramping up
    spawnInterval = 2200
    groupMin = 2
    groupMax = 3
    enemyCap = 35
    eliteChance = 0.02
  } else if (elapsedSec < 240) {
    // Mid-game pressure
    spawnInterval = 1800
    groupMin = 2
    groupMax = 4
    enemyCap = 45
    eliteChance = 0.08
  } else if (elapsedSec < 480) {
    // Late-game
    spawnInterval = 1500
    groupMin = 3
    groupMax = 5
    enemyCap = 55
    eliteChance = 0.15
  } else {
    // Soft cap — endless plateau
    spawnInterval = 1400
    groupMin = 3
    groupMax = 6
    enemyCap = 60
    eliteChance = 0.2
  }

  // Level scaling (minor)
  const levelBonus = Math.min(playerLevel * 0.5, 8)
  groupMax = Math.min(groupMax + Math.floor(levelBonus / 3), 8)

  return { spawnInterval, groupMin, groupMax, enemyCap, eliteChance }
}

// ─── SURVIVAL WAVE TABLE ─────────────────────────────────────

export const SURVIVAL_WAVES: WaveConfig[] = [
  // Wave 1
  { waveNumber: 1, enemyCount: [8, 12], countPerWave: 2, weights: { eater: 0.7, hunter: 0.3, shooter: 0, tank: 0 }, boss: false },
  // Wave 2
  { waveNumber: 2, enemyCount: [8, 12], countPerWave: 2, weights: { eater: 0.7, hunter: 0.3, shooter: 0, tank: 0 }, boss: false },
  // Wave 3 — first shooter introduction
  { waveNumber: 3, enemyCount: [8, 12], countPerWave: 2, weights: { eater: 0.5, hunter: 0.3, shooter: 0.2, tank: 0 }, boss: false, event: 'elite_pack' },
  // Wave 4
  { waveNumber: 4, enemyCount: [12, 16], countPerWave: 2, weights: { eater: 0.4, hunter: 0.3, shooter: 0.2, tank: 0.1 }, boss: false },
  // Wave 5 — Mini Boss
  { waveNumber: 5, enemyCount: [12, 16], countPerWave: 2, weights: { eater: 0.4, hunter: 0.3, shooter: 0.2, tank: 0.1 }, boss: 'mini', event: 'mini_boss' },
  // Wave 6
  { waveNumber: 6, enemyCount: [12, 16], countPerWave: 2, weights: { eater: 0.3, hunter: 0.25, shooter: 0.25, tank: 0.2 }, boss: false },
  // Wave 7 — elite pack event
  { waveNumber: 7, enemyCount: [16, 22], countPerWave: 3, weights: { eater: 0.3, hunter: 0.2, shooter: 0.3, tank: 0.2 }, boss: false, event: 'elite_pack' },
  // Wave 8
  { waveNumber: 8, enemyCount: [16, 22], countPerWave: 3, weights: { eater: 0.25, hunter: 0.25, shooter: 0.25, tank: 0.25 }, boss: false },
  // Wave 9
  { waveNumber: 9, enemyCount: [16, 22], countPerWave: 3, weights: { eater: 0.2, hunter: 0.2, shooter: 0.3, tank: 0.3 }, boss: false, event: 'elite_pack' },
  // Wave 10 — Mega Boss (Final)
  { waveNumber: 10, enemyCount: [15, 15], countPerWave: 0, weights: { eater: 0, hunter: 0.3, shooter: 0.4, tank: 0.3 }, boss: 'mega', event: 'final_wave' },
]

export const SURVIVAL_TOTAL_WAVES = 10
export const SURVIVAL_INITIAL_DELAY = 3000
export const SURVIVAL_INTER_WAVE_PAUSE = 3000
export const SURVIVAL_VICTORY_DELAY = 2000

/**
 * Wave reward: what the player gets between waves.
 * Healing + bonus XP scales with wave number.
 */
export function getWaveReward(waveNumber: number) {
  const healPct = Math.min(0.1 + waveNumber * 0.02, 0.3)   // 12%–30% HP heal
  const bonusXp = 30 + waveNumber * 15                        // 45–180 XP
  const grantMutation = waveNumber === 3 || waveNumber === 7  // Free mutation on wave 3 & 7

  return { healPct, bonusXp, grantMutation }
}

// ─── TOXIC CLOUD ─────────────────────────────────────────────

export const TOXIC_CLOUD: ToxicCloudConfig = {
  radius: 48,
  lifetime: 1400,
  tickInterval: 300,
  damagePerTick: 6,
  expansionScale: 1.25,
}

// ─── VOID CORE ───────────────────────────────────────────────

export const VOID_CORE: VoidCoreConfig = {
  triggerInterval: 18000,
  spawnOffset: 150,
  visualRadius: [20, 140],
  expandDuration: 3000,
  pullInterval: 100,
  pullRepeat: 30,
  pullRange: 250,
  pullStrength: 12,
  damagePerTick: 15,
}

// ─── SPLIT CLONE ─────────────────────────────────────────────

export const SPLIT_CLONE: SplitCloneConfig = {
  orbitRadius: 60,
  orbitSpeedFactor: 0.003,
  scale: 0.7,
  tint: 0xec4899,
  fireInterval: 400,
}

// ─── ADRENAL OVERCHARGE ──────────────────────────────────────

export const OVERCHARGE = {
  /** HP percentage threshold to activate. */
  hpThreshold: 0.35,
  /** Damage multiplier when active. */
  damageMult: 1.6,
}

// ─── BIO-MAGNET ──────────────────────────────────────────────

export const MAGNET = {
  defaultRadius: 250,
  pullSpeed: 7,
}

// ─── XP & LEVELING ───────────────────────────────────────────

export const XP_CONFIG = {
  /** Base XP needed for level 2. */
  baseXp: 100,
  /** Multiplicative growth per level. */
  growthFactor: 1.35,
  /** Hard max level (mutations stop). */
  maxLevel: 30,
}

/**
 * Build the full XP threshold table.
 * Returns array where index = level, value = cumulative XP needed.
 */
export function buildXpTable(): number[] {
  const table: number[] = [0, 0] // index 0 unused, level 1 = 0 XP
  let xp = XP_CONFIG.baseXp
  for (let lvl = 2; lvl <= XP_CONFIG.maxLevel + 1; lvl++) {
    table.push(Math.round(xp))
    xp *= XP_CONFIG.growthFactor
  }
  return table
}

// Pre-computed table
export const XP_TABLE = buildXpTable()

// ─── SPECIAL ABILITY VISUALS ─────────────────────────────────

export const SPECIAL_VISUALS = {
  shakeIntensity: 0.01,
  shakeDuration: 200,
  ringStartRadius: 10,
  ringEndRadius: 200,
  ringDuration: 400,
}

// ─── DASH VISUALS ────────────────────────────────────────────

export const DASH_VISUALS = {
  ghostDelay: 40,
  ghostRepeat: 6,
  ghostFadeDuration: 250,
}

// ─── SPAWN BOUNDARY ──────────────────────────────────────────

export const SPAWN_BOUNDS = {
  min: 100,
  max: 2900, // ARENA.width - ARENA.spawnPadding
}

// ─── v1.2 NEW MUTATIONS BALANCE CONSTANTS ────────────────────

export const SHIELD_BARRIER = {
  maxShieldHp: 40,
  regenDelay: 4000,
  regenRate: 10,
  orbitRadius: 36,
  color: 0x06b6d4,
}

export const BOOMERANG_SPORE = {
  returnDelay: 320,
  returnSpeedMult: 1.6,
  maxPierce: 3,
}

export const CHAIN_LIGHTNING = {
  maxTargets: 3,
  jumpRadius: 190,
  damageMult: 0.8,
  cooldown: 1100,
  arcColor: 0x38bdf8,
}

export const LIFESTEAL = {
  healPctOfDamage: 0.15,
  flatHealOnKill: 5,
}

export const FLAME_AURA = {
  radius: 140,
  tickInterval: 200,
  damagePerTick: 12,
  auraColor: 0xf97316,
}

export const FROST_FIELD = {
  radius: 160,
  slowPct: 0.45,
  tickInterval: 250,
  damagePerTick: 6,
  fieldColor: 0x38bdf8,
}

export const HOMING_MISSILES = {
  turnSpeed: 0.14,
  targetScanRadius: 360,
  speedBoost: 1.25,
}

export const NANO_SWARM = {
  minionCount: 3,
  orbitRadius: 48,
  orbitSpeed: 0.0035,
  contactDamage: 20,
  tint: 0xa855f7,
}

// ─── PRACTICE & TUTORIAL CONSTANTS ───────────────────────────

export const PRACTICE_CONFIG = {
  dummyHp: 99999,
  dummyCount: 4,
  infiniteHp: true,
  dpsWindowMs: 3000,
}

