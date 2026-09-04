import Phaser from 'phaser'
import { soundManager } from './SoundManager'
import { MutationDefinition } from '../mutations'
import {
  PLAYER, ENEMIES, BOSS_MINI, BOSS_MEGA, PLAYER_PROJECTILE, ENEMY_PROJECTILE,
  COLLISION, SCORING, ARENA,
  SURVIVAL_WAVES, SURVIVAL_TOTAL_WAVES, SURVIVAL_INITIAL_DELAY,
  SURVIVAL_INTER_WAVE_PAUSE, SURVIVAL_VICTORY_DELAY,
  getWaveReward,
  TOXIC_CLOUD, VOID_CORE, SPLIT_CLONE, OVERCHARGE, MAGNET,
  SPECIAL_VISUALS, DASH_VISUALS, SPAWN_BOUNDS,
  SHOOTER_RANGE, SHOOTER_COOLDOWN,
  XP_CONFIG,
} from '../balance'
import { computeLevelUps } from '../progression'
import { HazardManager } from './HazardManager'
import { CharacterRenderer } from './CharacterRenderer'
import { getSelectedSkinId, getSkinConfig, type CellSkinId } from '../cosmetics'
import { CombatVisuals } from './CombatVisuals'
import { getRandomEliteModifier, applyEliteModifier } from '../elites'
import type { EliteModifier } from '../types'
import { getActiveCombos, type MutationCombo } from '../combos'
import type { GameHUDData } from '../types'
export type { GameHUDData }

interface EnemyWeights {
  eater: number
  hunter: number
  shooter: number
  tank: number
}

export interface SurvivalSceneConfig {
  onLevelUp: (currentLevel: number) => void
  onGameOver: (metrics: {
    score: number
    level: number
    kills: number
    survivalTime: number
    mutationsCount: number
    damageDealt: number
    damageTaken: number
    criticalHits: number
    bossDefeated: boolean
    wave?: number
  }) => void
  onHUDUpdate: (data: GameHUDData) => void
  onWaveUpdate: (data: { currentWave: number; totalWaves: number; enemiesRemaining: number; waveActive: boolean }) => void
  onVictory: (metrics: { score: number; level: number; kills: number; survivalTime: number; wavesCleared: number; mutationsCount: number; damageDealt: number; damageTaken: number; criticalHits: number; bossDefeated: boolean }) => void
  initialSkin?: CellSkinId
}

export default class SurvivalScene extends Phaser.Scene {
  private configCallbacks!: SurvivalSceneConfig

  // Wave state
  private currentWave: number = 0
  private totalWaves: number = SURVIVAL_TOTAL_WAVES
  private enemiesRemainingInWave: number = 0
  private waveActive: boolean = false
  private waveStarting: boolean = false

  // Player state
  private player!: Phaser.Physics.Arcade.Sprite
  private playerHp: number = PLAYER.hp
  private playerMaxHp: number = PLAYER.maxHp
  private playerSpeed: number = PLAYER.speed
  private playerDamage: number = PLAYER.damage
  private playerLevel: number = 1
  private playerXp: number = 0
  private nextLevelXp: number = XP_CONFIG.baseXp
  private xpMultiplier: number = 1.0
  private critChance: number = PLAYER.critChance
  private hpRegenRate: number = PLAYER.hpRegenRate

  // Active mutation flags
  public activeMutations: MutationDefinition[] = []
  public activeCombos: MutationCombo[] = []
  private hasToxinTrail: boolean = false
  private hasOvercharge: boolean = false
  private hasPhaseDash: boolean = false
  private magnetRadius: number = 0
  private hasSplitClone: boolean = false
  private hasVoidCore: boolean = false
  private isInvulnerable: boolean = false
  private lastPlayerDamageTime: number = -Infinity
  private readonly playerDamageCooldown: number = PLAYER.damageCooldown
  private gameEnded: boolean = false
  private lastMoveDirection = new Phaser.Math.Vector2(0, -1)
  private toxinClouds: Phaser.GameObjects.Arc[] = []
  private levelUpQueue: number[] = []
  private cloneLastShootTime: number = 0

  // Cooldowns
  private lastShootTime: number = 0
  private shootCooldown: number = PLAYER.shootCooldown // ms
  private lastDashTime: number = 0
  private dashCooldown: number = PLAYER.dashCooldown // ms
  private isDashing: boolean = false
  private lastSpecialTime: number = 0
  private specialCooldown: number = PLAYER.specialCooldown // ms
  private lastVoidCoreTime: number = 0

  // Managers
  private hazardManager!: HazardManager
  private combatVisuals!: CombatVisuals
  private hazardSpeedMult: number = 1.0
  private lastHazardSpawnTime: number = 0

  // Game metrics
  private score: number = 0
  private kills: number = 0
  private survivalTime: number = 0 // seconds
  private damageDealt: number = 0
  private damageTaken: number = 0
  private criticalHits: number = 0
  private bossDefeated: boolean = false
  private gameTimerEvent!: Phaser.Time.TimerEvent

  // Groups
  private playerProjectiles!: Phaser.Physics.Arcade.Group
  private enemyProjectiles!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private xpGems!: Phaser.Physics.Arcade.Group
  private cloneSprite: Phaser.Physics.Arcade.Sprite | null = null

  // Boss
  private boss: Phaser.Physics.Arcade.Sprite | null = null
  private bossHp: number = 0
  private bossMaxHp: number = 0
  private bossPhase: number = 1
  private bossIsMini: boolean = false
  private bossMinionsSpawned: boolean = false
  private lastBossShootTime: number = 0
  private lastBossShockwaveTime: number = 0

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    SPACE: Phaser.Input.Keyboard.Key
    E: Phaser.Input.Keyboard.Key
  }

  // Virtual Joystick input vectors from mobile overlay
  public mobileMoveVector = { x: 0, y: 0 }
  public mobileAttackTarget = { x: 0, y: 0, isAttacking: false }

  constructor() {
    super({ key: 'SurvivalScene' })
  }

  public init(data: { config: SurvivalSceneConfig }) {
    this.configCallbacks = data.config
    this.currentWave = 0
    this.enemiesRemainingInWave = 0
    this.waveActive = false
    this.waveStarting = false
    this.playerHp = PLAYER.hp
    this.playerMaxHp = PLAYER.maxHp
    this.playerSpeed = PLAYER.speed
    this.playerDamage = PLAYER.damage
    this.playerLevel = 1
    this.playerXp = 0
    this.nextLevelXp = XP_CONFIG.baseXp
    this.xpMultiplier = 1
    this.critChance = PLAYER.critChance
    this.hpRegenRate = PLAYER.hpRegenRate
    this.activeMutations = []
    this.activeCombos = []
    this.levelUpQueue = []
    this.hasToxinTrail = false
    this.hasOvercharge = false
    this.hasPhaseDash = false
    this.magnetRadius = 0
    this.hasSplitClone = false
    this.hasVoidCore = false
    this.isInvulnerable = false
    this.lastPlayerDamageTime = -Infinity
    this.gameEnded = false
    this.lastMoveDirection.set(0, -1)
    this.toxinClouds = []
    this.lastShootTime = 0
    this.cloneLastShootTime = 0
    this.lastDashTime = -this.dashCooldown
    this.isDashing = false
    this.lastSpecialTime = -this.specialCooldown
    this.lastVoidCoreTime = 0
    this.score = 0
    this.kills = 0
    this.survivalTime = 0
    this.damageDealt = 0
    this.damageTaken = 0
    this.criticalHits = 0
    this.bossDefeated = false
    this.cloneSprite = null
    this.boss = null
    this.bossHp = 0
    this.bossMaxHp = 0
    this.bossPhase = 1
    this.bossIsMini = false
    this.bossMinionsSpawned = false
    this.lastBossShootTime = 0
    this.lastBossShockwaveTime = 0
  }

  preload() {
    this.createProceduralTextures()
    CharacterRenderer.generateAllCharacterTextures(this)
  }

  private createProceduralTextures() {
    const gfx = this.make.graphics({ x: 0, y: 0 })

    // 1. Player Virus Texture
    gfx.clear()
    gfx.fillStyle(0x00f0ff, 1)
    gfx.fillCircle(16, 16, 14)
    gfx.lineStyle(2, 0xffffff, 1)
    gfx.strokeCircle(16, 16, 14)
    gfx.fillStyle(0xffffff, 0.8)
    gfx.fillCircle(12, 12, 4)
    gfx.generateTexture('player_virus', 32, 32)

    // 2. Player Spore Projectile
    gfx.clear()
    gfx.fillStyle(0x00ffff, 1)
    gfx.fillCircle(6, 6, 5)
    gfx.lineStyle(1.5, 0xffffff, 1)
    gfx.strokeCircle(6, 6, 5)
    gfx.generateTexture('spore_p', 12, 12)

    // 3. Enemy Spore Projectile
    gfx.clear()
    gfx.fillStyle(0xff0055, 1)
    gfx.fillCircle(6, 6, 5)
    gfx.generateTexture('spore_e', 12, 12)

    // 4. Enemy: Cell Eater
    gfx.clear()
    gfx.fillStyle(0x00ff66, 1)
    gfx.fillCircle(10, 10, 8)
    gfx.generateTexture('enemy_eater', 20, 20)

    // 5. Enemy: Hunter
    gfx.clear()
    gfx.fillStyle(0xff0055, 1)
    gfx.fillCircle(14, 14, 12)
    gfx.lineStyle(2, 0xffb700, 1)
    gfx.strokeCircle(14, 14, 12)
    gfx.generateTexture('enemy_hunter', 28, 28)

    // 6. Enemy: Tank
    gfx.clear()
    gfx.fillStyle(0xa3e635, 1)
    gfx.fillCircle(24, 24, 20)
    gfx.lineStyle(3, 0x15803d, 1)
    gfx.strokeCircle(24, 24, 20)
    gfx.generateTexture('enemy_tank', 48, 48)

    // 7. Enemy: Shooter
    gfx.clear()
    gfx.fillStyle(0x38bdf8, 1)
    gfx.fillCircle(14, 14, 11)
    gfx.generateTexture('enemy_shooter', 28, 28)

    // 8. Enemy: Boss Mini
    gfx.clear()
    gfx.fillStyle(0xb026ff, 1)
    gfx.fillCircle(32, 32, 28)
    gfx.lineStyle(3, 0xff0055, 1)
    gfx.strokeCircle(32, 32, 28)
    gfx.fillStyle(0xffffff, 0.9)
    gfx.fillCircle(22, 22, 7)
    gfx.generateTexture('enemy_boss_mini', 64, 64)

    // 9. Enemy: Boss Mega
    gfx.clear()
    gfx.fillStyle(0x9333ea, 1)
    gfx.fillCircle(48, 48, 44)
    gfx.lineStyle(4, 0xec4899, 1)
    gfx.strokeCircle(48, 48, 44)
    gfx.fillStyle(0xffffff, 0.9)
    gfx.fillCircle(32, 32, 10)
    gfx.generateTexture('enemy_boss_mega', 96, 96)

    // 10. XP Bio Gem
    gfx.clear()
    gfx.fillStyle(0x00f0ff, 1)
    gfx.fillCircle(5, 5, 4)
    gfx.generateTexture('xp_gem', 10, 10)

    gfx.destroy()
  }

  create() {
    const worldSize = ARENA.width
    this.physics.world.setBounds(0, 0, worldSize, worldSize)

    // Draw grid background and cell membrane border
    this.add.grid(
      worldSize / 2,
      worldSize / 2,
      worldSize,
      worldSize,
      ARENA.gridSize,
      ARENA.gridSize,
      0x060913,
      1,
      0x0d172a,
      0.4
    )

    // Groups
    this.playerProjectiles = this.physics.add.group({ defaultKey: 'spore_p', maxSize: PLAYER_PROJECTILE.maxCount })
    this.enemyProjectiles = this.physics.add.group({ defaultKey: 'spore_e', maxSize: ENEMY_PROJECTILE.maxCount })
    this.enemies = this.physics.add.group()
    this.xpGems = this.physics.add.group()

    // Managers
    this.hazardManager = new HazardManager(this)
    this.combatVisuals = new CombatVisuals(this)

    // Player Hero Character Sprite
    const activeSkin = getSkinConfig(this.configCallbacks.initialSkin || getSelectedSkinId())
    const charTextureKey = `char_${activeSkin.id}`
    this.player = this.physics.add.sprite(worldSize / 2, worldSize / 2, charTextureKey)
    this.player.setCollideWorldBounds(true)
    this.player.setCircle(PLAYER.hitboxRadius, 10, 10)

    // Camera
    this.cameras.main.setBounds(0, 0, worldSize, worldSize)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Keyboard Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      }
    }

    // Overlaps
    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemies,
      this.handleProjectileEnemyHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.player,
      this.enemyProjectiles,
      this.handlePlayerEnemyProjectileHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.player,
      this.xpGems,
      this.handlePlayerXpGemOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    // Timers
    this.gameTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.survivalTime++
        this.score += SCORING.perSecond
        if (this.hpRegenRate > 0 && this.playerHp < this.playerMaxHp) {
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + this.playerMaxHp * this.hpRegenRate)
        }
      },
      loop: true,
    })

    // Start first wave
    this.time.delayedCall(SURVIVAL_INITIAL_DELAY, () => {
      this.startWave(1)
    })
  }

  update(time: number) {
    if (!this.player || !this.player.active || this.gameEnded) return

    let moveX = 0
    let moveY = 0

    if (this.wasd?.W.isDown) moveY -= 1
    if (this.wasd?.S.isDown) moveY += 1
    if (this.wasd?.A.isDown) moveX -= 1
    if (this.wasd?.D.isDown) moveX += 1

    if (this.mobileMoveVector.x !== 0 || this.mobileMoveVector.y !== 0) {
      moveX = this.mobileMoveVector.x
      moveY = this.mobileMoveVector.y
    }

    const movementVector = new Phaser.Math.Vector2(moveX, moveY)
    if (moveX !== 0 || moveY !== 0) {
      this.lastMoveDirection.copy(movementVector).normalize()
    }

    const currentSpeed = this.playerSpeed * this.hazardSpeedMult
    const vec = movementVector.normalize().scale(currentSpeed)

    if (!this.isDashing) {
      this.player.setVelocity(vec.x, vec.y)
    }

    // Hazard Manager Update
    this.hazardManager.update(
      time,
      this.player,
      (dmg) => this.damagePlayer(dmg),
      (mult) => { this.hazardSpeedMult = mult },
      this.enemies
    )

    if (
      (Phaser.Input.Keyboard.JustDown(this.wasd?.SPACE) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) &&
      time > this.lastDashTime + this.dashCooldown
    ) {
      this.triggerDash(time)
    }

    if (
      (Phaser.Input.Keyboard.JustDown(this.wasd?.E) || Phaser.Input.Keyboard.JustDown(this.cursors.shift)) &&
      time > this.lastSpecialTime + this.specialCooldown
    ) {
      this.triggerSpecialPulse(time)
    }

    // Character Visor & Weapon Aim Rotation
    const pointer = this.input.activePointer
    if (pointer && this.cameras?.main) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y)
      this.player.setRotation(aimAngle)
    }

    if (pointer.isDown || this.mobileAttackTarget.isAttacking) {
      if (time > this.lastShootTime + this.shootCooldown) {
        let targetX = pointer.worldX
        let targetY = pointer.worldY

        if (this.mobileAttackTarget.isAttacking) {
          const closestEnemy = this.getClosestActiveEnemy()
          if (closestEnemy) {
            targetX = closestEnemy.x
            targetY = closestEnemy.y
          } else {
            targetX = this.player.x + this.mobileAttackTarget.x
            targetY = this.player.y + this.mobileAttackTarget.y
          }
          // Rotate player toward aim target on mobile
          const mobileAimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY)
          this.player.setRotation(mobileAimAngle)
        }

        this.firePlayerSpore(targetX, targetY)
        this.lastShootTime = time
      }
    }

    if (this.cursors) {
      let shootDirX = 0
      let shootDirY = 0

      if (this.cursors.up.isDown) shootDirY -= 1
      if (this.cursors.down.isDown) shootDirY += 1
      if (this.cursors.left.isDown) shootDirX -= 1
      if (this.cursors.right.isDown) shootDirX += 1

      if (shootDirX !== 0 || shootDirY !== 0) {
        if (time > this.lastShootTime + this.shootCooldown) {
          this.firePlayerSpore(this.player.x + shootDirX * 100, this.player.y + shootDirY * 100)
          this.lastShootTime = time
        }
      }
    }

    // Magnet Attractor
    if (this.magnetRadius > 0) {
      this.xpGems.getChildren().forEach((gemObj) => {
        const gem = gemObj as Phaser.Physics.Arcade.Sprite
        if (!gem.active) return
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y)
        if (dist < this.magnetRadius) {
          const angle = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y)
          gem.x += Math.cos(angle) * MAGNET.pullSpeed
          gem.y += Math.sin(angle) * MAGNET.pullSpeed
        }
      })
    }

    if (this.hasVoidCore && time > this.lastVoidCoreTime + VOID_CORE.triggerInterval) {
      this.triggerVoidCoreBlackHole()
      this.lastVoidCoreTime = time
    }

    if (this.hasSplitClone && this.cloneSprite) {
      const angle = time * SPLIT_CLONE.orbitSpeedFactor
      this.cloneSprite.x = this.player.x + Math.cos(angle) * SPLIT_CLONE.orbitRadius
      this.cloneSprite.y = this.player.y + Math.sin(angle) * SPLIT_CLONE.orbitRadius

      const cloneFireInterval = this.hasActiveCombo('mitotic_overcharge') && this.playerHp / this.playerMaxHp < 0.4
        ? SPLIT_CLONE.fireInterval / 2
        : SPLIT_CLONE.fireInterval
      if (time > this.cloneLastShootTime + cloneFireInterval && this.enemies.getLength() > 0) {
        const closestEnemy = this.physics.closest(this.cloneSprite, this.enemies.getChildren().filter(e => e.active)) as Phaser.Physics.Arcade.Sprite
        if (closestEnemy) {
          this.firePlayerSpore(closestEnemy.x, closestEnemy.y, this.cloneSprite.x, this.cloneSprite.y)
          this.cloneLastShootTime = time
        }
      }
    }

    if (this.boss && this.boss.active) {
      const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y)
      this.boss.setVelocity(Math.cos(angle) * this.boss.getData('speed'), Math.sin(angle) * this.boss.getData('speed'))

      const bossHpPct = this.bossHp / this.bossMaxHp
      const phases = this.bossIsMini ? BOSS_MINI.phases : BOSS_MEGA.phases
      const nextBossPhase = bossHpPct <= phases[1] ? 3 : bossHpPct <= phases[0] ? 2 : 1
      if (nextBossPhase > this.bossPhase) {
        this.bossPhase = nextBossPhase
        soundManager.playBossSpawn()
        this.cameras.main.shake(250, 0.012)
        if (this.bossPhase === 2 && !this.bossMinionsSpawned && !this.bossIsMini) {
          this.spawnBossMinions()
        }
      }

      const attackCooldowns = this.bossIsMini ? BOSS_MINI.attackCooldowns : BOSS_MEGA.attackCooldowns
      const bossAttackCooldown = this.bossPhase === 3 ? attackCooldowns[2] : this.bossPhase === 2 ? attackCooldowns[1] : attackCooldowns[0]
      if (time > this.lastBossShootTime + bossAttackCooldown) {
        this.fireBossBurstPattern()
        this.lastBossShootTime = time
      }

      const shockwaveInterval = this.bossIsMini ? BOSS_MINI.shockwaveInterval : BOSS_MEGA.shockwaveInterval
      if (this.bossPhase === 3 && time > this.lastBossShockwaveTime + shockwaveInterval) {
        this.triggerBossShockwave()
        this.lastBossShockwaveTime = time
      }
    }

    this.enemies.getChildren().forEach((enemyObj) => {
      if (!enemyObj.active) return
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite

      if (enemy !== this.boss) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
        const speed = enemy.getData('speed') || 100
        const enemyType = enemy.getData('enemyType')

        if (enemyType === 'enemy_shooter') {
          const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
          if (distance > SHOOTER_RANGE.max) {
            enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
          } else if (distance < SHOOTER_RANGE.min) {
            enemy.setVelocity(-Math.cos(angle) * speed, -Math.sin(angle) * speed)
          } else {
            enemy.setVelocity(0, 0)
          }

          const lastShotTime = enemy.getData('lastShotTime') ?? -Infinity
          if (time >= lastShotTime + SHOOTER_COOLDOWN) {
            this.fireEnemySpore(enemy)
            enemy.setData('lastShotTime', time)
          }
        } else {
          enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
        }
      }
    })

    this.playerProjectiles.getChildren().forEach((p) => {
      const sprite = p as Phaser.Physics.Arcade.Sprite
      if (sprite.active && sprite.getData('expiresAt') && this.time.now >= sprite.getData('expiresAt')) {
        sprite.setActive(false).setVisible(false)
        sprite.body?.stop()
      }
    })

    this.updateToxinClouds()

    const now = this.time.now
    const dashCdPct = Math.min(1, (now - this.lastDashTime) / this.dashCooldown)
    const specCdPct = Math.min(1, (now - this.lastSpecialTime) / this.specialCooldown)

    this.configCallbacks.onHUDUpdate({
      hp: Math.max(0, Math.round(this.playerHp)),
      maxHp: Math.round(this.playerMaxHp),
      xp: this.playerXp,
      nextLevelXp: this.nextLevelXp,
      level: this.playerLevel,
      score: this.score,
      kills: this.kills,
      survivalTime: this.survivalTime,
      dashCooldownPct: dashCdPct,
      specialCooldownPct: specCdPct,
      bossActive: Boolean(this.boss && this.boss.active),
      bossHpPct: this.boss && this.boss.active ? Math.max(0, this.bossHp / this.bossMaxHp) : 0,
      bossName: 'THE ANCIENT CELL',
    })
    
    if (this.waveActive || this.waveStarting) {
      this.configCallbacks.onWaveUpdate({
        currentWave: this.currentWave,
        totalWaves: this.totalWaves,
        enemiesRemaining: this.enemiesRemainingInWave,
        waveActive: this.waveActive
      })
    }
  }

  public firePlayerSpore(targetX: number, targetY: number, originX?: number, originY?: number) {
    const startX = originX ?? this.player.x
    const startY = originY ?? this.player.y

    const spore = this.playerProjectiles.get(startX, startY, 'spore_p') as Phaser.Physics.Arcade.Sprite
    if (!spore) return

    spore.setActive(true).setVisible(true)
    spore.setCircle(PLAYER_PROJECTILE.hitboxRadius)

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY)
    const projectileSpeed = PLAYER_PROJECTILE.speed
    spore.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed)

    soundManager.playShoot()

    spore.setData('expiresAt', this.time.now + PLAYER_PROJECTILE.lifetime)
  }

  private getClosestActiveEnemy(): Phaser.Physics.Arcade.Sprite | null {
    let closestEnemy: Phaser.Physics.Arcade.Sprite | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    this.enemies.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (distance < closestDistance) {
        closestDistance = distance
        closestEnemy = enemy
      }
    })

    return closestEnemy
  }

  public triggerDash(time: number) {
    this.lastDashTime = time
    this.isDashing = true
    this.isInvulnerable = true
    const dashSpeed = this.playerSpeed * (this.hasPhaseDash ? PLAYER.phaseDashSpeedMult : PLAYER.dashSpeedMult)
    this.player.setVelocity(this.lastMoveDirection.x * dashSpeed, this.lastMoveDirection.y * dashSpeed)
    soundManager.playDash()

    this.time.addEvent({
      delay: DASH_VISUALS.ghostDelay,
      repeat: DASH_VISUALS.ghostRepeat,
      callback: () => {
        const ghost = this.add.sprite(this.player.x, this.player.y, 'player_virus')
        ghost.setAlpha(0.5).setTint(0x00f0ff)
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: DASH_VISUALS.ghostFadeDuration,
          onComplete: () => ghost.destroy(),
        })
      },
    })

    const duration = this.hasPhaseDash ? PLAYER.phaseDashDuration : PLAYER.dashDuration
    this.time.delayedCall(duration, () => {
      this.isDashing = false
      this.isInvulnerable = false
      this.player.setVelocity(0, 0)
    })
  }

  public triggerSpecialPulse(time: number) {
    this.lastSpecialTime = time
    soundManager.playExplosion()
    this.cameras.main.shake(SPECIAL_VISUALS.shakeDuration, SPECIAL_VISUALS.shakeIntensity)

    const ring = this.add.circle(this.player.x, this.player.y, SPECIAL_VISUALS.ringStartRadius, 0x00f0ff, 0.6)
    this.tweens.add({
      targets: ring,
      radius: SPECIAL_VISUALS.ringEndRadius,
      alpha: 0,
      duration: SPECIAL_VISUALS.ringDuration,
      onComplete: () => ring.destroy(),
    })

    this.enemies.getChildren().forEach((enemyObj) => {
      if (!enemyObj.active) return
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (dist < PLAYER.specialRange) {
        this.damageEnemy(enemy, this.playerDamage * PLAYER.specialDamageMult)
      }
    })
  }

  public triggerVoidCoreBlackHole() {
    soundManager.playBossSpawn()
    if (this.hasActiveCombo('quantum_core')) {
      this.isInvulnerable = true
      this.time.delayedCall(700, () => {
        if (!this.isDashing) this.isInvulnerable = false
      })
    }
    const voidX = this.player.x + Phaser.Math.Between(-VOID_CORE.spawnOffset, VOID_CORE.spawnOffset)
    const voidY = this.player.y + Phaser.Math.Between(-VOID_CORE.spawnOffset, VOID_CORE.spawnOffset)

    const blackHole = this.add.circle(voidX, voidY, VOID_CORE.visualRadius[0], 0xb026ff, 0.7)
    this.tweens.add({
      targets: blackHole,
      radius: VOID_CORE.visualRadius[1],
      alpha: 0.9,
      duration: VOID_CORE.expandDuration,
      yoyo: true,
      onComplete: () => blackHole.destroy(),
    })

    this.time.addEvent({
      delay: VOID_CORE.pullInterval,
      repeat: VOID_CORE.pullRepeat,
      callback: () => {
        this.enemies.getChildren().forEach((enemyObj) => {
          if (!enemyObj.active) return
          const enemy = enemyObj as Phaser.Physics.Arcade.Sprite
          const dist = Phaser.Math.Distance.Between(voidX, voidY, enemy.x, enemy.y)
          if (dist < VOID_CORE.pullRange) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, voidX, voidY)
            enemy.x += Math.cos(angle) * VOID_CORE.pullStrength
            enemy.y += Math.sin(angle) * VOID_CORE.pullStrength
            this.damageEnemy(enemy, VOID_CORE.damagePerTick)
          }
        })
      },
    })
  }

  private startWave(waveNumber: number) {
    this.currentWave = waveNumber
    this.waveStarting = false
    this.waveActive = true
    
    // Calculate enemies to spawn based on wave
    const waveConfig = SURVIVAL_WAVES[waveNumber - 1]
    let enemiesToSpawn = Phaser.Math.Between(waveConfig.enemyCount[0], waveConfig.enemyCount[1])
    const typeWeights = waveConfig.weights
    
    if (waveConfig.boss === 'mini') {
      this.spawnBossAncientCell(true) // Mini boss
      enemiesToSpawn += 1
    } else if (waveConfig.boss === 'mega') {
      this.spawnBossAncientCell(false) // Mega boss
      enemiesToSpawn += 1
    }
    
    this.enemiesRemainingInWave = enemiesToSpawn
    
    // Wave Event Check (Hazards / Elite Pack)
    if (waveConfig.event === 'elite_pack' || waveConfig.event === 'mini_boss') {
      const hx = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-200, 200), SPAWN_BOUNDS.min, SPAWN_BOUNDS.max)
      const hy = Phaser.Math.Clamp(this.player.y + Phaser.Math.Between(-200, 200), SPAWN_BOUNDS.min, SPAWN_BOUNDS.max)
      this.hazardManager.spawnRandomHazard(hx, hy)
    }

    // Spawn them
    for (let i = 0; i < enemiesToSpawn; i++) {
      // Don't spawn boss again in loop
      if ((waveConfig.boss === 'mini' || waveConfig.boss === 'mega') && i === 0) continue;
      
      const isEliteWave = waveConfig.event === 'elite_pack' || (this.currentWave >= 4 && Math.random() < 0.25)
      this.spawnEnemyForWave(typeWeights, isEliteWave && i % 3 === 0)
    }
  }

  private spawnEnemyForWave(weights: EnemyWeights, isElite: boolean = false) {
    const playerX = this.player.x
    const playerY = this.player.y
    const angle = Math.random() * Math.PI * 2
    const dist = Phaser.Math.Between(500, 900)
    const spawnX = Phaser.Math.Clamp(playerX + Math.cos(angle) * dist, SPAWN_BOUNDS.min, SPAWN_BOUNDS.max)
    const spawnY = Phaser.Math.Clamp(playerY + Math.sin(angle) * dist, SPAWN_BOUNDS.min, SPAWN_BOUNDS.max)

    const rand = Math.random()
    let key = ENEMIES.eater.textureKey
    let hp = ENEMIES.eater.baseHp + this.playerLevel * ENEMIES.eater.hpPerLevel
    let speed = ENEMIES.eater.speed
    let xpValue = ENEMIES.eater.xpValue

    if (rand < weights.tank) {
      key = ENEMIES.tank.textureKey
      hp = ENEMIES.tank.baseHp + this.playerLevel * ENEMIES.tank.hpPerLevel
      speed = ENEMIES.tank.speed
      xpValue = ENEMIES.tank.xpValue
    } else if (rand < weights.tank + weights.shooter) {
      key = ENEMIES.shooter.textureKey
      hp = ENEMIES.shooter.baseHp + this.playerLevel * ENEMIES.shooter.hpPerLevel
      speed = ENEMIES.shooter.speed
      xpValue = ENEMIES.shooter.xpValue
    } else if (rand < weights.tank + weights.shooter + weights.hunter) {
      key = ENEMIES.hunter.textureKey
      hp = ENEMIES.hunter.baseHp + this.playerLevel * ENEMIES.hunter.hpPerLevel
      speed = ENEMIES.hunter.speed
      xpValue = ENEMIES.hunter.xpValue
    }

    const enemy = this.enemies.create(spawnX, spawnY, key) as Phaser.Physics.Arcade.Sprite
    enemy.setActive(true).setVisible(true)
    enemy.setData('hp', hp)
    enemy.setData('maxHp', hp)
    enemy.setData('speed', speed)
    enemy.setData('xpValue', xpValue)
    enemy.setData('enemyType', key)

    if (isElite) {
      const eliteMod = getRandomEliteModifier()
      applyEliteModifier(enemy, eliteMod)
      this.combatVisuals.showFloatingText(spawnX, spawnY - 15, `ELITE ${eliteMod.label}!`, '#eab308', 12)
    }
  }

  private spawnBossAncientCell(isMini: boolean = false) {
    soundManager.playBossSpawn()
    this.cameras.main.shake(400, 0.015)

    const spawnX = this.player.x + 400
    const spawnY = this.player.y + 400

    const bossConfig = isMini ? BOSS_MINI : BOSS_MEGA
    this.bossMaxHp = bossConfig.baseHp + this.playerLevel * bossConfig.hpPerLevel
    this.bossHp = this.bossMaxHp
    this.bossPhase = 1
    this.bossIsMini = isMini
    this.bossMinionsSpawned = false
    this.lastBossShockwaveTime = 0

    this.boss = this.enemies.create(spawnX, spawnY, 'enemy_boss') as Phaser.Physics.Arcade.Sprite
    this.boss.setActive(true).setVisible(true)
    this.boss.setScale(bossConfig.spriteScale)
    this.boss.setCircle(bossConfig.hitboxRadius)
    
    this.boss.setData('hp', this.bossHp)
    this.boss.setData('maxHp', this.bossMaxHp)
    this.boss.setData('speed', bossConfig.speed)
    this.boss.setData('xpValue', bossConfig.xpReward)
    this.boss.setData('enemyType', 'boss')
  }

  private fireBossBurstPattern() {
    if (!this.boss || !this.boss.active) return

    const burstCounts = this.bossIsMini ? BOSS_MINI.burstCounts : BOSS_MEGA.burstCounts
    const burstSpeeds = this.bossIsMini ? BOSS_MINI.burstSpeeds : BOSS_MEGA.burstSpeeds
    const projectileCount = this.bossPhase === 3 ? burstCounts[2] : this.bossPhase === 2 ? burstCounts[1] : burstCounts[0]
    const projectileSpeed = this.bossPhase === 3 ? burstSpeeds[2] : this.bossPhase === 2 ? burstSpeeds[1] : burstSpeeds[0]
    for (let i = 0; i < projectileCount; i++) {
      const angle = (i * Math.PI * 2) / projectileCount
      const spore = this.enemyProjectiles.get(this.boss.x, this.boss.y, 'spore_e') as Phaser.Physics.Arcade.Sprite
      if (spore) {
        spore.setActive(true).setVisible(true)
        spore.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed)
        this.time.delayedCall(ENEMY_PROJECTILE.lifetime, () => spore.setActive(false).setVisible(false))
      }
    }
  }

  private spawnBossMinions() {
    if (!this.boss || !this.boss.active) return
    this.bossMinionsSpawned = true
    const bossConfig = this.bossIsMini ? BOSS_MINI : BOSS_MEGA
    const minionCount = bossConfig.minionCount
    this.enemiesRemainingInWave += minionCount

    for (let i = 0; i < minionCount; i++) {
      const angle = (i * Math.PI * 2) / minionCount
      const minion = this.enemies.create(
        this.boss.x + Math.cos(angle) * 120,
        this.boss.y + Math.sin(angle) * 120,
        i % 2 === 0 ? 'enemy_eater' : 'enemy_hunter'
      ) as Phaser.Physics.Arcade.Sprite
      minion.setActive(true).setVisible(true)
      minion.setData('hp', bossConfig.minionHpBase + this.playerLevel * bossConfig.minionHpPerLevel)
      minion.setData('maxHp', bossConfig.minionHpBase + this.playerLevel * bossConfig.minionHpPerLevel)
      minion.setData('speed', i % 2 === 0 ? ENEMIES.eater.speed : ENEMIES.hunter.speed)
      minion.setData('xpValue', bossConfig.minionXp)
      minion.setData('enemyType', i % 2 === 0 ? 'enemy_eater' : 'enemy_hunter')
    }
  }

  private triggerBossShockwave() {
    if (!this.boss || !this.boss.active) return

    const bossConfig = this.bossIsMini ? BOSS_MINI : BOSS_MEGA
    const ring = this.add.circle(this.boss.x, this.boss.y, 24, 0xff0055, 0.35)
    this.tweens.add({
      targets: ring,
      radius: bossConfig.shockwaveRadius,
      alpha: 0,
      duration: 700,
      onComplete: () => ring.destroy(),
    })

    this.time.delayedCall(450, () => {
      if (!this.boss || !this.boss.active) return
      const distance = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y)
      if (distance <= bossConfig.shockwaveRadius) this.damagePlayer(bossConfig.shockwaveDamage)
    })
  }

  private fireEnemySpore(enemy: Phaser.Physics.Arcade.Sprite) {
    const spore = this.enemyProjectiles.get(enemy.x, enemy.y, 'spore_e') as Phaser.Physics.Arcade.Sprite
    if (!spore) return

    spore.setActive(true).setVisible(true)
    spore.setCircle(ENEMY_PROJECTILE.hitboxRadius)
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    spore.setVelocity(Math.cos(angle) * ENEMY_PROJECTILE.speed, Math.sin(angle) * ENEMY_PROJECTILE.speed)

    this.time.delayedCall(ENEMY_PROJECTILE.lifetime, () => {
      if (spore.active) spore.setActive(false).setVisible(false)
    })
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damageAmount: number) {
    const isElite = enemy.getData('isElite') === true
    const eliteMod = enemy.getData('eliteModifier') as EliteModifier | undefined
    
    // Armored elites take 25% reduced damage
    const actualBaseDamage = eliteMod?.behaviour === 'armored' ? damageAmount * 0.75 : damageAmount

    const isCrit = Math.random() < this.critChance
    const finalDamage = isCrit ? Math.round(actualBaseDamage * PLAYER.critMultiplier) : Math.round(actualBaseDamage)
    this.damageDealt += finalDamage
    if (isCrit) this.criticalHits++
    const hp = (enemy.getData('hp') || 50) - finalDamage
    enemy.setData('hp', hp)
    if (enemy === this.boss) {
      this.bossHp = Math.max(0, hp)
    }

    this.combatVisuals.flashEnemy(enemy)
    this.combatVisuals.showFloatingText(enemy.x, enemy.y, isCrit ? `CRIT! -${finalDamage}` : `-${finalDamage}`, isCrit ? '#ff0055' : isElite ? '#eab308' : '#ffffff', isCrit ? 16 : 12)

    soundManager.playHit()

    if (isCrit && this.hasActiveCombo('lethal_magnet')) {
      this.pullXpGems()
    }

    if (hp <= 0) {
      const xpVal = enemy.getData('xpValue') || 25
      this.spawnXpGem(enemy.x, enemy.y, xpVal)
      this.kills++
      this.score += xpVal * SCORING.enemyKillMult

      // Elite On-Death Behaviors
      if (isElite && eliteMod) {
        if (eliteMod.behaviour === 'volatile') {
          // Volatile explosion
          soundManager.playExplosion()
          this.combatVisuals.showWarningRing(enemy.x, enemy.y, 110, 400, 0xef4444)
          const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
          if (distToPlayer <= 110) {
            this.damagePlayer(25)
          }
        } else if (eliteMod.behaviour === 'split') {
          // Split into 2 mini cells
          for (let s = 0; s < 2; s++) {
            const offsetX = (s === 0 ? -15 : 15)
            const miniKey = enemy.getData('enemyType') || 'enemy_eater'
            const mini = this.enemies.create(enemy.x + offsetX, enemy.y, miniKey) as Phaser.Physics.Arcade.Sprite
            mini.setActive(true).setVisible(true)
            mini.setScale(0.7)
            mini.setData('hp', 25)
            mini.setData('maxHp', 25)
            mini.setData('speed', 130)
            mini.setData('xpValue', 15)
          }
          this.enemiesRemainingInWave += 2
        }
      }

      if (enemy === this.boss) {
        this.bossDefeated = true
        soundManager.playExplosion()
        this.cameras.main.shake(500, 0.02)
        this.boss = null
        const bossConfig = this.bossIsMini ? BOSS_MINI : BOSS_MEGA
        for (let j = 0; j < bossConfig.deathGemCount; j++) {
          this.spawnXpGem(enemy.x + Phaser.Math.Between(-40, 40), enemy.y + Phaser.Math.Between(-40, 40), bossConfig.deathGemXp)
        }
      }

      enemy.destroy()
      
      this.enemiesRemainingInWave--
      if (this.enemiesRemainingInWave <= 0 && this.waveActive) {
        this.waveActive = false
        this.waveStarting = true
        
        const reward = getWaveReward(this.currentWave)
        // Heal player
        const healAmount = Math.round(this.playerMaxHp * reward.healPct)
        this.playerHp = Math.min(this.playerHp + healAmount, this.playerMaxHp)
        // Bonus XP
        this.playerXp += reward.bonusXp
        // Check for level-up from bonus XP
        const result = computeLevelUps(this.playerLevel, this.playerXp, this.nextLevelXp)
        if (result.levelsGained > 0) {
          this.playerLevel = result.newLevel
          this.playerXp = result.newXp
          this.nextLevelXp = result.newNextLevelXp
          this.queueLevelUps(result.levelsGained, this.playerLevel - result.levelsGained + 1)
        }

        if (this.currentWave >= this.totalWaves) {
          // Victory
          this.time.delayedCall(SURVIVAL_VICTORY_DELAY, () => {
            this.triggerVictory()
          })
        } else {
          // Next Wave
          this.time.delayedCall(SURVIVAL_INTER_WAVE_PAUSE, () => {
            this.startWave(this.currentWave + 1)
          })
        }
      }
    }
  }

  private showDamageText(x: number, y: number, amount: number, isCrit: boolean) {
    const txt = this.add.text(x, y - 10, isCrit ? `CRIT! -${amount}` : `-${amount}`, {
      fontFamily: 'monospace',
      fontSize: isCrit ? '16px' : '12px',
      color: isCrit ? '#ff0055' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })

    this.tweens.add({
      targets: txt,
      y: y - 35,
      alpha: 0,
      duration: 600,
      onComplete: () => txt.destroy(),
    })
  }

  private handleProjectileEnemyHit(
    sporeObj: Phaser.Physics.Arcade.Sprite,
    enemyObj: Phaser.Physics.Arcade.Sprite
  ) {
    if (!sporeObj.active || !enemyObj.active) return
    sporeObj.setActive(false).setVisible(false)

    let dmg = this.playerDamage
    if (this.hasOvercharge && this.playerHp / this.playerMaxHp < OVERCHARGE.hpThreshold) {
      dmg *= OVERCHARGE.damageMult
    }

    this.damageEnemy(enemyObj, dmg)
    if (this.hasToxinTrail) {
      this.spawnToxinCloud(enemyObj.x, enemyObj.y)
    }
  }

  private handlePlayerEnemyCollision(
    playerObj: Phaser.Physics.Arcade.Sprite,
    enemyObj: Phaser.Physics.Arcade.Sprite
  ) {
    if (this.time.now < this.lastPlayerDamageTime + PLAYER.damageCooldown) return
    if (!enemyObj.active || this.isInvulnerable) return

    const damage = enemyObj === this.boss ? COLLISION.bossBody : COLLISION.enemyBody
    this.damagePlayer(damage)

    // Vampiric Elite heal on hit
    const eliteMod = enemyObj.getData('eliteModifier') as EliteModifier | undefined
    if (eliteMod?.behaviour === 'vampiric') {
      const currHp = (enemyObj.getData('hp') as number) || 50
      const maxHp = (enemyObj.getData('maxHp') as number) || 50
      const healedHp = Math.min(currHp + 20, maxHp)
      enemyObj.setData('hp', healedHp)
      this.combatVisuals.showFloatingText(enemyObj.x, enemyObj.y - 15, '+20 HP HEAL!', '#a855f7', 11)
    }

    const angle = Phaser.Math.Angle.Between(enemyObj.x, enemyObj.y, playerObj.x, playerObj.y)
    this.player.setVelocity(Math.cos(angle) * COLLISION.knockbackVelocity, Math.sin(angle) * COLLISION.knockbackVelocity)
  }

  private handlePlayerEnemyProjectileHit(
    playerObj: Phaser.Physics.Arcade.Sprite,
    sporeObj: Phaser.Physics.Arcade.Sprite
  ) {
    if (!sporeObj.active || this.isInvulnerable) return
    sporeObj.setActive(false).setVisible(false)
    this.damagePlayer(COLLISION.enemyProjectile)
  }

  private handlePlayerXpGemOverlap(
    playerObj: Phaser.Physics.Arcade.Sprite,
    gemObj: Phaser.Physics.Arcade.Sprite
  ) {
    if (!gemObj.active) return
    const val = (gemObj.getData('val') || 20) * this.xpMultiplier
    gemObj.destroy()

    soundManager.playPickup()
    this.playerXp += val
    this.score += val * SCORING.gemPickupMult

    const result = computeLevelUps(this.playerLevel, this.playerXp, this.nextLevelXp)
    if (result.levelsGained > 0) {
      this.playerLevel = result.newLevel
      this.playerXp = result.newXp
      this.nextLevelXp = result.newNextLevelXp
      this.queueLevelUps(result.levelsGained, this.playerLevel - result.levelsGained + 1)
    }
  }

  private spawnXpGem(x: number, y: number, value = 20) {
    const gem = this.xpGems.create(x, y, 'xp_gem') as Phaser.Physics.Arcade.Sprite
    if (gem) {
      gem.setActive(true).setVisible(true)
      gem.setData('val', value)
    }
  }

  private damagePlayer(amount: number) {
    const now = this.time.now
    if (this.gameEnded || this.isInvulnerable || now < this.lastPlayerDamageTime + this.playerDamageCooldown) {
      return
    }

    this.lastPlayerDamageTime = now
    this.playerHp -= amount
    this.damageTaken += amount
    soundManager.playHit()
    this.cameras.main.shake(150, 0.008)

    this.player.setTint(0xff0055)
    this.time.delayedCall(120, () => this.player.clearTint())

    if (this.playerHp <= 0) {
      this.triggerGameOver()
    }
  }

  private queueLevelUps(count: number, firstLevel: number) {
    for (let i = 0; i < count; i++) {
      this.levelUpQueue.push(firstLevel + i)
    }
    soundManager.playLevelUp()
    this.scene.pause()
    const nextLevel = this.levelUpQueue.shift()
    if (nextLevel !== undefined) this.configCallbacks.onLevelUp(nextLevel)
  }

  public applyChosenMutation(mutation: MutationDefinition) {
    this.activeMutations.push(mutation)
    const sb = mutation.statBoost

    if (sb.speedPct) this.playerSpeed *= 1 + sb.speedPct
    if (sb.powerPct) this.playerDamage *= 1 + sb.powerPct
    if (sb.maxHpPct) {
      this.playerMaxHp *= 1 + sb.maxHpPct
      this.playerHp = this.playerMaxHp
    }
    if (sb.xpGainPct) this.xpMultiplier += sb.xpGainPct
    if (sb.critChancePct) this.critChance += sb.critChancePct
    if (sb.hpRegen) this.hpRegenRate += sb.hpRegen
    if (sb.hasToxinTrail) this.hasToxinTrail = true
    if (sb.hasOvercharge) this.hasOvercharge = true
    if (sb.hasPhaseDash) this.hasPhaseDash = true
    if (sb.hasMagnetRadius) this.magnetRadius = sb.hasMagnetRadius
    if (sb.hasVoidCore) this.hasVoidCore = true
    if (sb.hasSplitClone && !this.hasSplitClone) {
      this.hasSplitClone = true
      this.cloneSprite = this.physics.add.sprite(this.player.x + 40, this.player.y, 'player_virus')
      this.cloneSprite.setScale(0.7).setTint(0xec4899)
    }

    this.activeCombos = getActiveCombos(this.activeMutations)

    const nextLevel = this.levelUpQueue.shift()
    if (nextLevel !== undefined) {
      this.configCallbacks.onLevelUp(nextLevel)
    } else {
      this.scene.resume()
    }
  }

  private hasActiveCombo(comboId: string): boolean {
    return this.activeCombos.some((combo) => combo.id === comboId)
  }

  private pullXpGems() {
    this.xpGems.getChildren().forEach((gemObj) => {
      const gem = gemObj as Phaser.Physics.Arcade.Sprite
      if (!gem.active) return
      const angle = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y)
      gem.x += Math.cos(angle) * MAGNET.pullSpeed * 2
      gem.y += Math.sin(angle) * MAGNET.pullSpeed * 2
    })
  }

  private triggerGameOver() {
    if (this.gameEnded) return
    this.gameEnded = true
    soundManager.playExplosion()
    this.gameTimerEvent.remove()
    this.scene.pause()

    this.configCallbacks.onGameOver({
      score: this.score,
      level: this.playerLevel,
      kills: this.kills,
      survivalTime: this.survivalTime,
      mutationsCount: this.activeMutations.length,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      criticalHits: this.criticalHits,
      bossDefeated: this.bossDefeated,
      wave: this.currentWave,
    })
  }

  private triggerVictory() {
    if (this.gameEnded) return
    this.gameEnded = true
    soundManager.playLevelUp()
    this.gameTimerEvent.remove()
    this.scene.pause()

    this.configCallbacks.onVictory({
      score: this.score,
      level: this.playerLevel,
      kills: this.kills,
      survivalTime: this.survivalTime,
      wavesCleared: this.currentWave,
      mutationsCount: this.activeMutations.length,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      criticalHits: this.criticalHits,
      bossDefeated: this.bossDefeated,
    })
  }

  private spawnToxinCloud(x: number, y: number) {
    const hasToxicTempest = this.hasActiveCombo('toxic_tempest')
    const cloudRadius = hasToxicTempest ? TOXIC_CLOUD.radius * 1.3 : TOXIC_CLOUD.radius
    const cloud = this.add.circle(x, y, cloudRadius, 0xa3e635, 0.28)
    cloud.setDepth(-1)
    cloud.setData('expiresAt', this.time.now + TOXIC_CLOUD.lifetime)
    cloud.setData('lastDamageAt', -Infinity)
    cloud.setData('radius', cloudRadius)
    this.toxinClouds.push(cloud)

    this.tweens.add({
      targets: cloud,
      alpha: 0,
      scale: TOXIC_CLOUD.expansionScale,
      duration: hasToxicTempest ? TOXIC_CLOUD.lifetime / 1.3 : TOXIC_CLOUD.lifetime,
    })
  }

  private updateToxinClouds() {
    if (this.toxinClouds.length === 0) return

    const now = this.time.now
    this.toxinClouds = this.toxinClouds.filter((cloud) => {
      if (!cloud.active || now >= (cloud.getData('expiresAt') as number)) {
        cloud.destroy()
        return false
      }

      const lastDamageAt = cloud.getData('lastDamageAt') as number
      const cloudRadius = (cloud.getData('radius') as number | undefined) ?? TOXIC_CLOUD.radius
      const isMovingFast = this.player.body ? this.player.body.velocity.length() > this.playerSpeed * 0.5 : false
      const tickDamage = this.hasActiveCombo('toxic_tempest') && isMovingFast
        ? TOXIC_CLOUD.damagePerTick * 1.25
        : TOXIC_CLOUD.damagePerTick
      if (now >= lastDamageAt + TOXIC_CLOUD.tickInterval) {
        this.enemies.getChildren().forEach((enemyObj) => {
          if (!enemyObj.active) return
          const enemy = enemyObj as Phaser.Physics.Arcade.Sprite
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, enemy.x, enemy.y) <= cloudRadius) {
            this.damageEnemy(enemy, tickDamage)
          }
        })
        cloud.setData('lastDamageAt', now)
      }

      return true
    })
  }
}
