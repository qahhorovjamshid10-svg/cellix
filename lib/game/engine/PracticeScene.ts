// ============================================================
// CELLIX v1.2 — Practice Arena & Interactive Tutorial Scene
// ============================================================

import * as Phaser from 'phaser'
import {
  ARENA,
  PLAYER,
  PRACTICE_CONFIG,
  PLAYER_PROJECTILE,
} from '../balance'
import { ALL_MUTATIONS, MutationDefinition } from '../mutations'
import { CharacterRenderer } from './CharacterRenderer'
import { soundManager } from './SoundManager'
import { CombatVisuals } from './CombatVisuals'
import { CellSkinId, GameHUDData } from '../types'
import { getSkinConfig } from '../cosmetics'

export interface PracticeSceneConfig {
  onHUDUpdate?: (data: GameHUDData) => void
  onGameOver?: (metrics: unknown) => void
  onLevelUp?: (level: number) => void
  onWaveComplete?: (wave: number) => void
  initialSkin?: CellSkinId
}

interface TargetDummy {
  sprite: Phaser.Physics.Arcade.Sprite
  hp: number
  maxHp: number
  totalDamageTaken: number
  dps: number
  damageHistory: { time: number; damage: number }[]
  hpBar: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
}

export class PracticeScene extends Phaser.Scene {
  private configCallbacks!: PracticeSceneConfig
  private player!: Phaser.Physics.Arcade.Sprite
  private playerProjectiles!: Phaser.Physics.Arcade.Group
  private dummies: TargetDummy[] = []
  private combatVisuals!: CombatVisuals
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    SPACE: Phaser.Input.Keyboard.Key
    E: Phaser.Input.Keyboard.Key
  }

  // Tutorial progression state
  public tutorialStep = 1 // 1: Move, 2: Shoot, 3: Dash, 4: Pulse, 5: Sandbox Complete
  private tutorialCompleted = false
  public activeMutations: MutationDefinition[] = []

  // Player telemetry & cooldowns
  private playerSpeed = PLAYER.speed
  private playerDamage = PLAYER.damage
  private lastShootTime = 0
  private lastDashTime = 0
  private lastSpecialTime = 0
  private dashCooldown = PLAYER.dashCooldown
  private specialCooldown = PLAYER.specialCooldown
  private isDashing = false
  private selectedSkinId: CellSkinId = 'neon_cyan'
  private totalDamageDealt = 0
  private recentDamageWindow: { time: number; damage: number }[] = []
  private currentDps = 0
  private peakDps = 0

  constructor() {
    super({ key: 'PracticeScene' })
  }

  init(data: PracticeSceneConfig) {
    this.configCallbacks = data || {}
    this.selectedSkinId = data?.initialSkin || 'neon_cyan'
    this.tutorialStep = 1
    this.tutorialCompleted = false
    this.dummies = []
    this.totalDamageDealt = 0
    this.currentDps = 0
    this.peakDps = 0
    this.activeMutations = []
  }

  preload() {
    // Generate procedural textures
    this.generateTextures()
    CharacterRenderer.generateAllCharacterTextures(this)
  }

  create() {
    this.physics.world.setBounds(0, 0, ARENA.width, ARENA.height)
    this.combatVisuals = new CombatVisuals(this)

    // Background Grid
    this.drawBackgroundGrid()

    // Create Projectiles Group
    this.playerProjectiles = this.physics.add.group({
      defaultKey: 'spore',
      maxSize: 100,
    })

    // Create Player Hero Character
    const skin = getSkinConfig(this.selectedSkinId)
    this.player = this.physics.add.sprite(ARENA.width / 2, ARENA.height / 2, `char_${skin.id}`)
    this.player.setCollideWorldBounds(true)
    this.player.setCircle(PLAYER.hitboxRadius, 10, 10)

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height)

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }

    // Spawn 4 Target Dummies in a semicircle around player
    this.spawnTargetDummies()

    // Physics Overlaps
    this.physics.add.overlap(
      this.playerProjectiles,
      this.dummies.map((d) => d.sprite),
      this.handleSporeDummyHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
  }

  private generateTextures() {
    // Spore
    const g = this.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0x06b6d4, 1)
    g.fillCircle(8, 8, 7)
    g.fillStyle(0xffffff, 0.8)
    g.fillCircle(6, 6, 3)
    g.generateTexture('spore', 16, 16)
    g.clear()

    // Player Cell
    g.fillStyle(0xa855f7, 0.4)
    g.fillCircle(24, 24, 24)
    g.fillStyle(0x06b6d4, 0.9)
    g.fillCircle(24, 24, 18)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(20, 20, 7)
    g.generateTexture('player_cell', 48, 48)
    g.clear()

    // Dummy Target
    g.fillStyle(0x475569, 0.6)
    g.fillCircle(28, 28, 28)
    g.lineStyle(3, 0xf59e0b, 1)
    g.strokeCircle(28, 28, 26)
    g.fillStyle(0xef4444, 0.9)
    g.fillCircle(28, 28, 14)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(28, 28, 5)
    g.generateTexture('target_dummy', 56, 56)
    g.destroy()
  }

  private drawBackgroundGrid() {
    const bg = this.add.graphics()
    bg.fillStyle(0x040416, 1)
    bg.fillRect(0, 0, ARENA.width, ARENA.height)

    bg.lineStyle(1, 0x1e1b4b, 0.3)
    for (let x = 0; x < ARENA.width; x += ARENA.gridSize) {
      bg.moveTo(x, 0)
      bg.lineTo(x, ARENA.height)
    }
    for (let y = 0; y < ARENA.height; y += ARENA.gridSize) {
      bg.moveTo(0, y)
      bg.lineTo(ARENA.width, y)
    }
    bg.strokePath()

    // Arena boundary glow
    bg.lineStyle(4, 0xa855f7, 0.8)
    bg.strokeRect(4, 4, ARENA.width - 8, ARENA.height - 8)
  }

  private spawnTargetDummies() {
    const center = { x: ARENA.width / 2, y: ARENA.height / 2 }
    const positions = [
      { x: center.x - 220, y: center.y - 120, label: 'DUMMY ALPHA' },
      { x: center.x + 220, y: center.y - 120, label: 'DUMMY BETA' },
      { x: center.x - 220, y: center.y + 120, label: 'DUMMY GAMMA' },
      { x: center.x + 220, y: center.y + 120, label: 'DUMMY DELTA' },
    ]

    positions.forEach((pos) => {
      const sprite = this.physics.add.sprite(pos.x, pos.y, 'target_dummy')
      sprite.setImmovable(true)
      sprite.setCircle(26)

      const hpBar = this.add.graphics()
      const label = this.add.text(pos.x, pos.y - 42, `${pos.label} [DPS: 0]`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f59e0b',
        align: 'center',
      }).setOrigin(0.5)

      this.dummies.push({
        sprite,
        hp: PRACTICE_CONFIG.dummyHp,
        maxHp: PRACTICE_CONFIG.dummyHp,
        totalDamageTaken: 0,
        dps: 0,
        damageHistory: [],
        hpBar,
        label,
      })
    })
  }

  update(time: number) {
    if (!this.player || !this.player.active) return

    // 1. Movement
    let moveX = 0
    let moveY = 0

    if (this.wasd.W.isDown || this.cursors.up.isDown) moveY -= 1
    if (this.wasd.S.isDown || this.cursors.down.isDown) moveY += 1
    if (this.wasd.A.isDown || this.cursors.left.isDown) moveX -= 1
    if (this.wasd.D.isDown || this.cursors.right.isDown) moveX += 1

    const moveVector = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(this.playerSpeed)
    if (!this.isDashing) {
      this.player.setVelocity(moveVector.x, moveVector.y)
    }

    if ((moveX !== 0 || moveY !== 0) && this.tutorialStep === 1) {
      this.tutorialStep = 2
    }

    // 2. Aim Rotation & Shooting
    const pointer = this.input.activePointer
    if (pointer && this.cameras?.main) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y)
      this.player.setRotation(aimAngle)
    }

    if (pointer.isDown && time > this.lastShootTime + PLAYER.shootCooldown) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.fireSpore(worldPoint.x, worldPoint.y)
      this.lastShootTime = time

      if (this.tutorialStep === 2) {
        this.tutorialStep = 3
      }
    }

    // 3. Dash (Space)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) && time > this.lastDashTime + this.dashCooldown) {
      this.triggerDash(time)
      if (this.tutorialStep === 3) {
        this.tutorialStep = 4
      }
    }

    // 4. Radial Pulse (E)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.E) && time > this.lastSpecialTime + this.specialCooldown) {
      this.triggerRadialPulse(time)
      if (this.tutorialStep === 4) {
        this.tutorialStep = 5
        this.tutorialCompleted = true
      }
    }

    // 5. Expired projectiles cleanup
    this.playerProjectiles.getChildren().forEach((p) => {
      const sprite = p as Phaser.Physics.Arcade.Sprite
      if (sprite.active && sprite.getData('expiresAt') && time >= sprite.getData('expiresAt')) {
        sprite.setActive(false).setVisible(false)
        sprite.body?.stop()
      }
    })

    // 6. Compute DPS over 3s sliding window
    this.updateDpsCalculations(time)

    // 7. Update Dummy HP bars & text
    this.updateDummyVisuals()

    // 8. Emit HUD updates
    this.emitHUD(time)
  }

  private fireSpore(targetX: number, targetY: number) {
    const spore = this.playerProjectiles.get(this.player.x, this.player.y) as Phaser.Physics.Arcade.Sprite | null
    if (!spore) return

    spore.setActive(true).setVisible(true)
    spore.setData('expiresAt', this.time.now + PLAYER_PROJECTILE.lifetime)

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY)
    spore.setVelocity(
      Math.cos(angle) * PLAYER_PROJECTILE.speed,
      Math.sin(angle) * PLAYER_PROJECTILE.speed
    )

    soundManager.playShoot()
  }

  public triggerDash(time?: number) {
    const t = time ?? this.time.now
    this.lastDashTime = t
    this.isDashing = true

    const vel = this.player.body!.velocity.clone()
    const speed = vel.length() > 10 ? vel.normalize() : new Phaser.Math.Vector2(1, 0)

    this.player.setVelocity(speed.x * this.playerSpeed * PLAYER.dashSpeedMult, speed.y * this.playerSpeed * PLAYER.dashSpeedMult)
    soundManager.playDash()

    this.time.delayedCall(PLAYER.dashDuration, () => {
      this.isDashing = false
    })
  }

  public triggerSpecialPulse(time?: number) {
    this.triggerRadialPulse(time ?? this.time.now)
  }

  private triggerRadialPulse(time: number) {
    this.lastSpecialTime = time
    soundManager.playExplosion()
    this.cameras.main.shake(150, 0.006)

    // Damage all dummies within pulse range
    this.dummies.forEach((d) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.sprite.x, d.sprite.y)
      if (dist <= PLAYER.specialRange) {
        const pulseDamage = Math.round(this.playerDamage * PLAYER.specialDamageMult)
        this.applyDamageToDummy(d, pulseDamage, true)
      }
    })
  }

  private handleSporeDummyHit(
    sporeObj: Phaser.Physics.Arcade.Sprite,
    dummyObj: Phaser.Physics.Arcade.Sprite
  ) {
    if (!sporeObj.active || !dummyObj.active) return

    sporeObj.setActive(false).setVisible(false)
    sporeObj.body?.stop()

    const dummy = this.dummies.find((d) => d.sprite === dummyObj)
    if (!dummy) return

    const isCrit = Math.random() < PLAYER.critChance
    const damage = Math.round(this.playerDamage * (isCrit ? PLAYER.critMultiplier : 1))
    this.applyDamageToDummy(dummy, damage, isCrit)
  }

  private applyDamageToDummy(dummy: TargetDummy, damage: number, isCrit: boolean) {
    dummy.totalDamageTaken += damage
    this.totalDamageDealt += damage

    const now = this.time.now
    dummy.damageHistory.push({ time: now, damage })
    this.recentDamageWindow.push({ time: now, damage })

    this.combatVisuals.showFloatingText(
      dummy.sprite.x + (Math.random() * 20 - 10),
      dummy.sprite.y - 20,
      `${damage}${isCrit ? ' CRIT!' : ''}`,
      isCrit ? '#f59e0b' : '#38bdf8',
      isCrit ? 14 : 11
    )

    this.combatVisuals.flashEnemy(dummy.sprite)
    soundManager.playHit()
  }

  // Mobile Controls & Scene Bridge
  public mobileMoveVector = new Phaser.Math.Vector2(0, 0)
  public mobileAttackTarget = new Phaser.Math.Vector2(0, 0)

  public applyChosenMutation(mutation: MutationDefinition) {
    this.addMutationSandbox(mutation.id)
    this.scene.resume()
  }

  private updateDpsCalculations(time: number) {
    const windowMs = PRACTICE_CONFIG.dpsWindowMs
    const cutoff = time - windowMs

    // Prune overall window
    this.recentDamageWindow = this.recentDamageWindow.filter((entry) => entry.time >= cutoff)
    const windowDmg = this.recentDamageWindow.reduce((acc, curr) => acc + curr.damage, 0)
    this.currentDps = Math.round((windowDmg / (windowMs / 1000)))

    if (this.currentDps > this.peakDps) {
      this.peakDps = this.currentDps
    }

    // Per-dummy DPS
    this.dummies.forEach((d) => {
      d.damageHistory = d.damageHistory.filter((entry) => entry.time >= cutoff)
      const dmg = d.damageHistory.reduce((acc, curr) => acc + curr.damage, 0)
      d.dps = Math.round((dmg / (windowMs / 1000)))
    })
  }

  private updateDummyVisuals() {
    this.dummies.forEach((d) => {
      d.label.setText(`TARGET [DPS: ${d.dps}]`)
      d.hpBar.clear()

      // Visual pulse on dummy
      const hasRecentHits = d.damageHistory.length > 0
      d.hpBar.fillStyle(hasRecentHits ? 0x06b6d4 : 0x475569, 0.8)
      d.hpBar.fillRect(d.sprite.x - 30, d.sprite.y - 32, 60, 4)
    })
  }

  public addMutationSandbox(mutationId: string) {
    const mut = ALL_MUTATIONS.find((m) => m.id === mutationId)
    if (!mut) return
    this.activeMutations.push(mut)

    // Apply stat boosts
    if (mut.statBoost.speedPct) this.playerSpeed *= 1 + mut.statBoost.speedPct
    if (mut.statBoost.powerPct) this.playerDamage *= 1 + mut.statBoost.powerPct

    this.combatVisuals.showFloatingText(
      this.player.x,
      this.player.y - 30,
      `+ ${mut.name}`,
      mut.color,
      13
    )
    soundManager.playLevelUp()
  }

  private emitHUD(time: number) {
    if (!this.configCallbacks.onHUDUpdate) return

    this.configCallbacks.onHUDUpdate({
      hp: 100,
      maxHp: 100,
      xp: Math.min(this.totalDamageDealt % 500, 500),
      nextLevelXp: 500,
      level: Math.floor(this.totalDamageDealt / 500) + 1,
      score: this.totalDamageDealt,
      kills: Math.floor(this.totalDamageDealt / 200),
      survivalTime: Math.floor(time / 1000),
      bossActive: false,
      gameMode: 'practice',
      dashCooldownProgress: Math.min((time - this.lastDashTime) / this.dashCooldown, 1),
      specialCooldownProgress: Math.min((time - this.lastSpecialTime) / this.specialCooldown, 1),
    })
  }
}
