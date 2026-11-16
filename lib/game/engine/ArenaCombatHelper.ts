// ============================================================
// CELLIX 2.0 — Shared Arena Environment, Pool Safety & Mutations
// Unifies Classic, Daily, and Survival arena rendering + all 20 mutations
// so zero mutations or combos are silently unimplemented.
// ============================================================

import Phaser from 'phaser'
import { ARENA, SHIELD_BARRIER, CHAIN_LIGHTNING, FLAME_AURA, FROST_FIELD, HOMING_MISSILES, NANO_SWARM, BOOMERANG_SPORE } from '../balance'
import { getArenaThemePalette } from '../cosmetics'
import { getGameSettings } from '../settings'
import { MutationDefinition } from '../mutations'
import { MutationCombo } from '../combos'
import { CombatVisuals } from './CombatVisuals'

export interface ArenaMutationState {
  hasShieldBarrier: boolean
  shieldBarrierHp: number
  shieldBarrierMaxHp: number
  lastDamageTakenAt: number
  shieldBarrierArc: Phaser.GameObjects.Arc | null

  boomerangStacks: number
  hasChainLightning: boolean
  lastChainLightningAt: number

  lifestealStacks: number
  hasFlameAura: boolean
  lastFlameTickAt: number
  flameAuraCircle: Phaser.GameObjects.Arc | null

  frostStacks: number
  lastFrostTickAt: number
  frostFieldCircle: Phaser.GameObjects.Arc | null

  hasHomingMissiles: boolean
  hasNanoSwarm: boolean
  naniteSprites: Phaser.GameObjects.Arc[]
}

export function createInitialMutationState(): ArenaMutationState {
  return {
    hasShieldBarrier: false,
    shieldBarrierHp: 0,
    shieldBarrierMaxHp: SHIELD_BARRIER.maxShieldHp,
    lastDamageTakenAt: -Infinity,
    shieldBarrierArc: null,

    boomerangStacks: 0,
    hasChainLightning: false,
    lastChainLightningAt: -Infinity,

    lifestealStacks: 0,
    hasFlameAura: false,
    lastFlameTickAt: -Infinity,
    flameAuraCircle: null,

    frostStacks: 0,
    lastFrostTickAt: -Infinity,
    frostFieldCircle: null,

    hasHomingMissiles: false,
    hasNanoSwarm: false,
    naniteSprites: [],
  }
}

/**
 * Draws a crisp, zero-lag static tactical backdrop adapted to each arena's identity.
 */
export function buildArenaBackdrop(
  scene: Phaser.Scene,
  mode: 'classic' | 'survival' | 'daily',
  playerSkinGlowHex?: number
) {
  const palette = getArenaThemePalette(mode)
  const worldSize = ARENA.width

  // Deep matte floor + geometric grid
  scene.add.grid(
    worldSize / 2,
    worldSize / 2,
    worldSize,
    worldSize,
    ARENA.gridSize,
    ARENA.gridSize,
    palette.floorHex,
    1,
    palette.gridHex,
    0.55
  ).setDepth(-10)

  const gfx = scene.add.graphics().setDepth(-9)

  // Tactical sector coordinate rings around arena center
  gfx.lineStyle(1.5, palette.accentHex, 0.14)
  gfx.strokeCircle(worldSize / 2, worldSize / 2, 420)
  gfx.strokeCircle(worldSize / 2, worldSize / 2, 920)
  gfx.lineBetween(worldSize / 2 - 480, worldSize / 2, worldSize / 2 + 480, worldSize / 2)
  gfx.lineBetween(worldSize / 2, worldSize / 2 - 480, worldSize / 2, worldSize / 2 + 480)

  // Containment laser perimeter wall matched to arena + optional player skin tint corner brackets
  gfx.lineStyle(8, palette.borderHex, 0.85)
  gfx.strokeRect(4, 4, worldSize - 8, worldSize - 8)
  gfx.lineStyle(2, playerSkinGlowHex ?? palette.borderGlowHex, 0.65)
  gfx.strokeRect(14, 14, worldSize - 28, worldSize - 28)
}

/**
 * Dynamically centers Arcade Physics circle collider for any procedural texture size.
 */
export function setCenteredCircleHitbox(sprite: Phaser.Physics.Arcade.Sprite, radius: number) {
  const w = sprite.width || 64
  const h = sprite.height || 64
  const offsetX = Math.max(0, w / 2 - radius)
  const offsetY = Math.max(0, h / 2 - radius)
  sprite.setCircle(radius, offsetX, offsetY)
}

/**
 * Safely resets pooled projectile sprites so Heavy / Charged / Sniper overrides
 * never bleed into normal Auto or Spread bullets when recycled.
 */
export function resetPooledProjectile(
  sprite: Phaser.Physics.Arcade.Sprite,
  textureKey: string,
  hitboxRadius: number
) {
  sprite.setTexture(textureKey)
  sprite.setActive(true).setVisible(true)
  sprite.setScale(1)
  sprite.setAlpha(1)
  sprite.setRotation(0)
  sprite.clearTint()
  setCenteredCircleHitbox(sprite, hitboxRadius)
  sprite.setData('damageMult', 1)
  sprite.setData('piercing', false)
  sprite.setData('fromClone', false)
  sprite.setData('boomerang', false)
  sprite.setData('boomerangReturned', false)
  sprite.setData('homing', false)
  sprite.setData('hitSet', null)
}

/**
 * Applies v1.2 expansion mutations cleanly to state.
 */
export function applyExpansionMutation(
  scene: Phaser.Scene,
  state: ArenaMutationState,
  mutation: MutationDefinition,
  player: Phaser.Physics.Arcade.Sprite
) {
  const sb = mutation.statBoost
  if (sb.hasShieldBarrier) {
    state.hasShieldBarrier = true
    state.shieldBarrierHp = state.shieldBarrierMaxHp
    if (!state.shieldBarrierArc) {
      state.shieldBarrierArc = scene.add.circle(player.x, player.y, SHIELD_BARRIER.orbitRadius, SHIELD_BARRIER.color, 0.14)
      state.shieldBarrierArc.setStrokeStyle(2, SHIELD_BARRIER.color, 0.85).setDepth(4)
    }
  }
  if (sb.hasBoomerang) {
    state.boomerangStacks = Math.min(2, state.boomerangStacks + 1)
  }
  if (sb.hasChainLightning) {
    state.hasChainLightning = true
  }
  if (sb.hasLifesteal) {
    state.lifestealStacks = Math.min(2, state.lifestealStacks + 1)
  }
  if (sb.hasFlameAura) {
    state.hasFlameAura = true
    if (!state.flameAuraCircle) {
      state.flameAuraCircle = scene.add.circle(player.x, player.y, FLAME_AURA.radius, FLAME_AURA.auraColor, 0.08)
      state.flameAuraCircle.setStrokeStyle(1.5, FLAME_AURA.auraColor, 0.45).setDepth(-1)
    }
  }
  if (sb.hasFrostField) {
    state.frostStacks = Math.min(2, state.frostStacks + 1)
    if (!state.frostFieldCircle) {
      state.frostFieldCircle = scene.add.circle(player.x, player.y, FROST_FIELD.radius, FROST_FIELD.fieldColor, 0.08)
      state.frostFieldCircle.setStrokeStyle(1.5, FROST_FIELD.fieldColor, 0.45).setDepth(-1)
    }
  }
  if (sb.hasHomingMissiles) {
    state.hasHomingMissiles = true
  }
  if (sb.hasNanoSwarm && !state.hasNanoSwarm) {
    state.hasNanoSwarm = true
    for (let i = 0; i < NANO_SWARM.minionCount; i++) {
      const orb = scene.add.circle(player.x, player.y, 7, NANO_SWARM.tint, 0.95)
      orb.setStrokeStyle(1.5, 0xffffff, 0.8).setDepth(6)
      state.naniteSprites.push(orb)
    }
  }
}

/**
 * Absorbs incoming damage with the regenerating Energy Shield Barrier first.
 */
export function absorbWithShieldBarrier(state: ArenaMutationState, rawAmount: number, time: number): number {
  state.lastDamageTakenAt = time
  if (!state.hasShieldBarrier || state.shieldBarrierHp <= 0) return rawAmount
  if (state.shieldBarrierHp >= rawAmount) {
    state.shieldBarrierHp -= rawAmount
    return 0
  }
  const leftover = rawAmount - state.shieldBarrierHp
  state.shieldBarrierHp = 0
  return leftover
}

/**
 * Updates passive visual + AoE mutation systems every frame (Flame Aura, Frost Field,
 * Shield Barrier regen, Nano Swarm orbit + damage, Homing + Boomerang projectile steering).
 */
export function updateExpansionMutations(params: {
  scene: Phaser.Scene
  state: ArenaMutationState
  time: number
  deltaMs: number
  player: Phaser.Physics.Arcade.Sprite
  enemies: Phaser.Physics.Arcade.Group
  projectiles: Phaser.Physics.Arcade.Group
  activeCombos: MutationCombo[]
  damageEnemy: (enemy: Phaser.Physics.Arcade.Sprite, amount: number, fromClone?: boolean) => void
}) {
  const { scene, state, time, deltaMs, player, enemies, projectiles, activeCombos, damageEnemy } = params
  const hasNaniteSingularity = activeCombos.some((c) => c.id === 'nanite_singularity')
  const dtSec = Math.min(deltaMs / 1000, 0.05)

  // 1. Shield Barrier regen + orbit visual
  if (state.hasShieldBarrier) {
    if (time - state.lastDamageTakenAt >= SHIELD_BARRIER.regenDelay && state.shieldBarrierHp < state.shieldBarrierMaxHp) {
      state.shieldBarrierHp = Math.min(state.shieldBarrierMaxHp, state.shieldBarrierHp + SHIELD_BARRIER.regenRate * dtSec)
    }
    if (state.shieldBarrierArc) {
      state.shieldBarrierArc.setPosition(player.x, player.y)
      const pct = state.shieldBarrierHp / state.shieldBarrierMaxHp
      state.shieldBarrierArc.setVisible(pct > 0.05)
      state.shieldBarrierArc.setAlpha(0.18 + pct * 0.45)
    }
  }

  // 2. Flame Aura AoE ticks
  if (state.hasFlameAura && state.flameAuraCircle) {
    state.flameAuraCircle.setPosition(player.x, player.y)
    if (time >= state.lastFlameTickAt + FLAME_AURA.tickInterval) {
      state.lastFlameTickAt = time
      enemies.getChildren().forEach((eObj) => {
        if (!eObj.active) return
        const enemy = eObj as Phaser.Physics.Arcade.Sprite
        if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) <= FLAME_AURA.radius) {
          damageEnemy(enemy, FLAME_AURA.damagePerTick)
        }
      })
    }
  }

  // 3. Cryo Frost Field slow + damage ticks
  if (state.frostStacks > 0 && state.frostFieldCircle) {
    state.frostFieldCircle.setPosition(player.x, player.y)
    if (time >= state.lastFrostTickAt + FROST_FIELD.tickInterval) {
      state.lastFrostTickAt = time
      enemies.getChildren().forEach((eObj) => {
        if (!eObj.active) return
        const enemy = eObj as Phaser.Physics.Arcade.Sprite
        if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) <= FROST_FIELD.radius) {
          enemy.setData('frostedUntil', time + 350)
          damageEnemy(enemy, FROST_FIELD.damagePerTick * state.frostStacks)
        }
      })
    }
  }

  // 4. Nanite Swarm orbiting blades
  if (state.hasNanoSwarm && state.naniteSprites.length > 0) {
    const orbitSpeed = hasNaniteSingularity ? NANO_SWARM.orbitSpeed * 2 : NANO_SWARM.orbitSpeed
    const orbitRadius = hasNaniteSingularity ? NANO_SWARM.orbitRadius * 1.4 : NANO_SWARM.orbitRadius

    state.naniteSprites.forEach((orb, idx) => {
      const ang = time * orbitSpeed + (idx * Math.PI * 2) / state.naniteSprites.length
      const ox = player.x + Math.cos(ang) * orbitRadius
      const oy = player.y + Math.sin(ang) * orbitRadius
      orb.setPosition(ox, oy)

      enemies.getChildren().forEach((eObj) => {
        if (!eObj.active) return
        const enemy = eObj as Phaser.Physics.Arcade.Sprite
        const lastHitAt = (enemy.getData('naniteHitAt') as number | undefined) ?? -Infinity
        if (time - lastHitAt >= 450 && Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 28) {
          enemy.setData('naniteHitAt', time)
          damageEnemy(enemy, NANO_SWARM.contactDamage)
        }
      })
    })
  }

  // 5. Homing & Boomerang projectile steering
  const activeEnemies = enemies.getChildren().filter((e) => e.active) as Phaser.Physics.Arcade.Sprite[]
  projectiles.getChildren().forEach((pObj) => {
    const spore = pObj as Phaser.Physics.Arcade.Sprite
    if (!spore.active) return

    const body = spore.body as Phaser.Physics.Arcade.Body | undefined
    if (!body) return

    // Boomerang curve back to player after delay
    if (spore.getData('boomerang')) {
      const firedAt = (spore.getData('firedAt') as number | undefined) ?? time
      const returned = Boolean(spore.getData('boomerangReturned'))
      if (!returned && time - firedAt >= BOOMERANG_SPORE.returnDelay) {
        spore.setData('boomerangReturned', true)
        spore.setData('hitSet', new Set())
      }
      if (spore.getData('boomerangReturned')) {
        const currentSpeed = Math.max(body.velocity.length(), 420 * BOOMERANG_SPORE.returnSpeedMult)
        const backAng = Phaser.Math.Angle.Between(spore.x, spore.y, player.x, player.y)
        spore.setVelocity(Math.cos(backAng) * currentSpeed, Math.sin(backAng) * currentSpeed)
        if (Phaser.Math.Distance.Between(spore.x, spore.y, player.x, player.y) < 18) {
          spore.setActive(false).setVisible(false)
          body.stop()
          return
        }
      }
    }

    // Homing missiles steering
    if (spore.getData('homing') && activeEnemies.length > 0 && !spore.getData('boomerangReturned')) {
      let nearest: Phaser.Physics.Arcade.Sprite | null = null
      let minDist = HOMING_MISSILES.targetScanRadius
      for (const e of activeEnemies) {
        const d = Phaser.Math.Distance.Between(spore.x, spore.y, e.x, e.y)
        if (d < minDist) {
          minDist = d
          nearest = e
        }
      }
      if (nearest) {
        const spd = Math.max(body.velocity.length(), 300)
        const currentAng = Math.atan2(body.velocity.y, body.velocity.x)
        const targetAng = Phaser.Math.Angle.Between(spore.x, spore.y, nearest.x, nearest.y)
        const nextAng = Phaser.Math.Angle.RotateTo(currentAng, targetAng, HOMING_MISSILES.turnSpeed)
        spore.setVelocity(Math.cos(nextAng) * spd, Math.sin(nextAng) * spd)
      }
    }
  })

  // Keep reference to scene so no unused param lint
  void scene
}

/**
 * Triggers Chain Lightning arcs (plus optional Plasma Overload combo) on hit.
 */
export function triggerChainLightningOnHit(params: {
  scene: Phaser.Scene
  state: ArenaMutationState
  time: number
  originEnemy: Phaser.Physics.Arcade.Sprite
  baseDamage: number
  enemies: Phaser.Physics.Arcade.Group
  activeCombos: MutationCombo[]
  combatVisuals: CombatVisuals
  damageEnemy: (enemy: Phaser.Physics.Arcade.Sprite, amount: number) => void
}) {
  const { scene, state, time, originEnemy, baseDamage, enemies, activeCombos, combatVisuals, damageEnemy } = params
  if (!state.hasChainLightning || time - state.lastChainLightningAt < CHAIN_LIGHTNING.cooldown) return
  state.lastChainLightningAt = time

  const hasPlasmaOverload = activeCombos.some((c) => c.id === 'plasma_overload')
  const hitTargets = new Set<Phaser.Physics.Arcade.Sprite>([originEnemy])
  let current = originEnemy

  for (let jump = 0; jump < CHAIN_LIGHTNING.maxTargets; jump++) {
    let closest: Phaser.Physics.Arcade.Sprite | null = null
    let minDist = CHAIN_LIGHTNING.jumpRadius

    enemies.getChildren().forEach((eObj) => {
      if (!eObj.active) return
      const candidate = eObj as Phaser.Physics.Arcade.Sprite
      if (hitTargets.has(candidate)) return
      const d = Phaser.Math.Distance.Between(current.x, current.y, candidate.x, candidate.y)
      if (d < minDist) {
        minDist = d
        closest = candidate
      }
    })

    if (!closest) break
    const target: Phaser.Physics.Arcade.Sprite = closest
    hitTargets.add(target)

    const arcLine = scene.add.line(0, 0, current.x, current.y, target.x, target.y, CHAIN_LIGHTNING.arcColor, 0.9)
    arcLine.setOrigin(0, 0).setLineWidth(2.5)
    scene.tweens.add({
      targets: arcLine,
      alpha: 0,
      duration: 180,
      onComplete: () => arcLine.destroy(),
    })

    const arcDmg = baseDamage * CHAIN_LIGHTNING.damageMult
    damageEnemy(target, arcDmg)

    if (hasPlasmaOverload && target.active) {
      combatVisuals.showWarningRing(target.x, target.y, 65, 220, 0xf97316)
      damageEnemy(target, arcDmg * 0.45)
    }

    current = target
  }
}

export function destroyMutationVisuals(state: ArenaMutationState) {
  state.shieldBarrierArc?.destroy()
  state.shieldBarrierArc = null
  state.flameAuraCircle?.destroy()
  state.flameAuraCircle = null
  state.frostFieldCircle?.destroy()
  state.frostFieldCircle = null
  state.naniteSprites.forEach((orb) => orb.destroy())
  state.naniteSprites = []
}

export function getEnemyFrostMultiplier(enemy: Phaser.Physics.Arcade.Sprite, frostStacks: number, time: number): number {
  const frostedUntil = (enemy.getData('frostedUntil') as number | undefined) ?? -Infinity
  if (time <= frostedUntil && frostStacks > 0) {
    return frostStacks >= 2 ? 0.35 : 1 - FROST_FIELD.slowPct
  }
  return 1
}

export function safeCameraShake(
  scene: Phaser.Scene | null | undefined,
  durationMs: number,
  intensity: number
) {
  if (!scene?.cameras?.main) return
  if (!getGameSettings().cameraShake) return
  scene.cameras.main.shake(durationMs, intensity)
}
