// ============================================================
// CELLIX v1.2 — 2-Player Local Co-Op & PvP Duel Scene
// ============================================================

import * as Phaser from 'phaser'
import {
  ARENA,
  PLAYER,
  ENEMIES,
  PLAYER_PROJECTILE,
} from '../balance'
import { CharacterRenderer } from './CharacterRenderer'
import { soundManager } from './SoundManager'
import { CombatVisuals } from './CombatVisuals'
import { CellSkinId, GameHUDData } from '../types'
import { getSkinConfig } from '../cosmetics'
import type { MutationDefinition } from '../mutations'

export interface MultiplayerSceneConfig {
  onHUDUpdate?: (data: GameHUDData) => void
  onGameOver?: (metrics: unknown) => void
  onLevelUp?: (level: number) => void
  initialSkinP1?: CellSkinId
  initialSkinP2?: CellSkinId
}

export class MultiplayerScene extends Phaser.Scene {
  private configCallbacks!: MultiplayerSceneConfig
  private p1!: Phaser.Physics.Arcade.Sprite
  private p2!: Phaser.Physics.Arcade.Sprite
  private p1Projectiles!: Phaser.Physics.Arcade.Group
  private p2Projectiles!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private combatVisuals!: CombatVisuals

  // Keybindings
  private p1Keys!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    SPACE: Phaser.Input.Keyboard.Key
    E: Phaser.Input.Keyboard.Key
  }

  // P2 Controls (Arrows + Enter + Shift)
  private p2Keys!: {
    UP: Phaser.Input.Keyboard.Key
    LEFT: Phaser.Input.Keyboard.Key
    DOWN: Phaser.Input.Keyboard.Key
    RIGHT: Phaser.Input.Keyboard.Key
    ENTER: Phaser.Input.Keyboard.Key
    SHIFT: Phaser.Input.Keyboard.Key
  }

  // Stats
  private p1Hp = 100
  private p2Hp = 100
  private p1Score = 0
  private p2Score = 0
  private p1LastShootTime = 0
  private p2LastShootTime = 0
  private p1LastDashTime = 0
  private p2LastDashTime = 0
  private nextEnemySpawn = 0

  constructor() {
    super({ key: 'MultiplayerScene' })
  }

  init(data: MultiplayerSceneConfig) {
    this.configCallbacks = data || {}
    this.p1Hp = 100
    this.p2Hp = 100
    this.p1Score = 0
    this.p2Score = 0
  }

  preload() {
    CharacterRenderer.generateAllCharacterTextures(this)
  }

  create() {
    this.physics.world.setBounds(0, 0, ARENA.width, ARENA.height)
    this.combatVisuals = new CombatVisuals(this)

    // Background Grid
    this.drawBackgroundGrid()

    // Projectile pools
    this.p1Projectiles = this.physics.add.group({ defaultKey: 'p1_spore', maxSize: 80 })
    this.p2Projectiles = this.physics.add.group({ defaultKey: 'p2_spore', maxSize: 80 })
    this.enemies = this.physics.add.group({ maxSize: 100 })

    this.generateTextures()

    // Spawn P1 Hero Character & P2 Hero Character
    const p1Skin = getSkinConfig(this.configCallbacks.initialSkinP1 || 'neon_cyan')
    const p2Skin = getSkinConfig(this.configCallbacks.initialSkinP2 || 'solar_flare')

    this.p1 = this.physics.add.sprite(ARENA.width / 2 - 140, ARENA.height / 2, `char_${p1Skin.id}`)
    this.p1.setCollideWorldBounds(true)
    this.p1.setCircle(PLAYER.hitboxRadius, 10, 10)

    this.p2 = this.physics.add.sprite(ARENA.width / 2 + 140, ARENA.height / 2, `char_${p2Skin.id}`)
    this.p2.setCollideWorldBounds(true)
    this.p2.setCircle(PLAYER.hitboxRadius, 10, 10)

    // Camera centered on midpoint between P1 and P2
    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height)

    // Setup Keyboard Bindings
    this.p1Keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }

    this.p2Keys = {
      UP: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      LEFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      DOWN: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      RIGHT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    }

    // Overlaps
    this.physics.add.overlap(
      this.p1Projectiles,
      this.enemies,
      this.handleP1HitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.p2Projectiles,
      this.enemies,
      this.handleP2HitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
  }

  private generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0 })

    // P1 spore (Cyan)
    g.fillStyle(0x06b6d4, 1)
    g.fillCircle(8, 8, 7)
    g.generateTexture('p1_spore', 16, 16)
    g.clear()

    // P2 spore (Amber/Red)
    g.fillStyle(0xf59e0b, 1)
    g.fillCircle(8, 8, 7)
    g.generateTexture('p2_spore', 16, 16)
    g.clear()

    // Cells
    g.fillStyle(0x06b6d4, 0.9)
    g.fillCircle(24, 24, 20)
    g.generateTexture('p1_cell', 48, 48)
    g.clear()

    g.fillStyle(0xf59e0b, 0.9)
    g.fillCircle(24, 24, 20)
    g.generateTexture('p2_cell', 48, 48)
    g.clear()

    // Swarm enemy
    g.fillStyle(0xef4444, 0.9)
    g.fillCircle(14, 14, 12)
    g.generateTexture('enemy_mp', 28, 28)
    g.destroy()
  }

  private drawBackgroundGrid() {
    const bg = this.add.graphics()
    bg.fillStyle(0x040416, 1)
    bg.fillRect(0, 0, ARENA.width, ARENA.height)

    bg.lineStyle(1, 0x312e81, 0.3)
    for (let x = 0; x < ARENA.width; x += ARENA.gridSize) {
      bg.moveTo(x, 0)
      bg.lineTo(x, ARENA.height)
    }
    for (let y = 0; y < ARENA.height; y += ARENA.gridSize) {
      bg.moveTo(0, y)
      bg.lineTo(ARENA.width, y)
    }
    bg.strokePath()
  }

  update(time: number) {
    if (!this.p1.active && !this.p2.active) return

    // 1. P1 Movement & Fire
    this.updatePlayerOne(time)

    // 2. P2 Movement & Fire
    this.updatePlayerTwo(time)

    // 3. Spawning
    if (time > this.nextEnemySpawn) {
      this.spawnEnemy()
      this.nextEnemySpawn = time + 1400
    }

    // 4. Enemy AI chase closest player
    this.enemies.getChildren().forEach((eObj) => {
      const enemy = eObj as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return

      const distP1 = this.p1.active ? Phaser.Math.Distance.Between(enemy.x, enemy.y, this.p1.x, this.p1.y) : Infinity
      const distP2 = this.p2.active ? Phaser.Math.Distance.Between(enemy.x, enemy.y, this.p2.x, this.p2.y) : Infinity
      const target = distP1 < distP2 ? this.p1 : this.p2

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y)
      enemy.setVelocity(Math.cos(angle) * ENEMIES.eater.speed, Math.sin(angle) * ENEMIES.eater.speed)
    })

    // 5. Cleanup expired projectiles
    this.cleanupProjectiles(time)

    // 6. Camera follows midpoint
    const midX = (this.p1.x + this.p2.x) / 2
    const midY = (this.p1.y + this.p2.y) / 2
    this.cameras.main.centerOn(midX, midY)

    // 7. HUD update
    this.emitHUD(time)
  }

  private updatePlayerOne(time: number) {
    if (!this.p1.active) return
    let moveX = 0
    let moveY = 0
    if (this.p1Keys.W.isDown) moveY -= 1
    if (this.p1Keys.S.isDown) moveY += 1
    if (this.p1Keys.A.isDown) moveX -= 1
    if (this.p1Keys.D.isDown) moveX += 1

    const vec = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(PLAYER.speed)
    this.p1.setVelocity(vec.x, vec.y)
    if (moveX !== 0 || moveY !== 0) {
      this.p1.setRotation(Math.atan2(moveY, moveX))
    }

    // Auto-fire at closest enemy
    if (time > this.p1LastShootTime + PLAYER.shootCooldown) {
      const closest = this.getClosestEnemy(this.p1.x, this.p1.y)
      if (closest) {
        this.p1.setRotation(Phaser.Math.Angle.Between(this.p1.x, this.p1.y, closest.x, closest.y))
        this.fireSporeP1(closest.x, closest.y)
        this.p1LastShootTime = time
      }
    }
  }

  private updatePlayerTwo(time: number) {
    if (!this.p2.active) return
    let moveX = 0
    let moveY = 0
    if (this.p2Keys.UP.isDown) moveY -= 1
    if (this.p2Keys.DOWN.isDown) moveY += 1
    if (this.p2Keys.LEFT.isDown) moveX -= 1
    if (this.p2Keys.RIGHT.isDown) moveX += 1

    const vec = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(PLAYER.speed)
    this.p2.setVelocity(vec.x, vec.y)
    if (moveX !== 0 || moveY !== 0) {
      this.p2.setRotation(Math.atan2(moveY, moveX))
    }

    // Auto-fire at closest enemy
    if (time > this.p2LastShootTime + PLAYER.shootCooldown) {
      const closest = this.getClosestEnemy(this.p2.x, this.p2.y)
      if (closest) {
        this.p2.setRotation(Phaser.Math.Angle.Between(this.p2.x, this.p2.y, closest.x, closest.y))
        this.fireSporeP2(closest.x, closest.y)
        this.p2LastShootTime = time
      }
    }
  }

  private fireSporeP1(tx: number, ty: number) {
    const spore = this.p1Projectiles.get(this.p1.x, this.p1.y) as Phaser.Physics.Arcade.Sprite | null
    if (!spore) return
    spore.setActive(true).setVisible(true)
    spore.setData('expiresAt', this.time.now + PLAYER_PROJECTILE.lifetime)
    const angle = Phaser.Math.Angle.Between(this.p1.x, this.p1.y, tx, ty)
    spore.setVelocity(Math.cos(angle) * PLAYER_PROJECTILE.speed, Math.sin(angle) * PLAYER_PROJECTILE.speed)
    soundManager.playShoot()
  }

  private fireSporeP2(tx: number, ty: number) {
    const spore = this.p2Projectiles.get(this.p2.x, this.p2.y) as Phaser.Physics.Arcade.Sprite | null
    if (!spore) return
    spore.setActive(true).setVisible(true)
    spore.setData('expiresAt', this.time.now + PLAYER_PROJECTILE.lifetime)
    const angle = Phaser.Math.Angle.Between(this.p2.x, this.p2.y, tx, ty)
    spore.setVelocity(Math.cos(angle) * PLAYER_PROJECTILE.speed, Math.sin(angle) * PLAYER_PROJECTILE.speed)
    soundManager.playShoot()
  }

  private spawnEnemy() {
    const angle = Math.random() * Math.PI * 2
    const dist = 400 + Math.random() * 200
    const x = Phaser.Math.Clamp(this.p1.x + Math.cos(angle) * dist, 50, ARENA.width - 50)
    const y = Phaser.Math.Clamp(this.p1.y + Math.sin(angle) * dist, 50, ARENA.height - 50)

    const enemy = this.enemies.create(x, y, 'enemy_mp') as Phaser.Physics.Arcade.Sprite
    if (enemy) {
      enemy.setActive(true).setVisible(true)
      enemy.setData('hp', 30)
      enemy.setCircle(12)
    }
  }

  private handleP1HitEnemy(spore: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    spore.setActive(false).setVisible(false).body?.stop()
    const hp = (enemy.getData('hp') as number) - 25
    if (hp <= 0) {
      enemy.destroy()
      this.p1Score += 100
      this.combatVisuals.showFloatingText(enemy.x, enemy.y, '+100 P1', '#06b6d4', 12)
    } else {
      enemy.setData('hp', hp)
    }
    soundManager.playHit()
  }

  private handleP2HitEnemy(spore: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    spore.setActive(false).setVisible(false).body?.stop()
    const hp = (enemy.getData('hp') as number) - 25
    if (hp <= 0) {
      enemy.destroy()
      this.p2Score += 100
      this.combatVisuals.showFloatingText(enemy.x, enemy.y, '+100 P2', '#f59e0b', 12)
    } else {
      enemy.setData('hp', hp)
    }
    soundManager.playHit()
  }

  private getClosestEnemy(x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
    let closest: Phaser.Physics.Arcade.Sprite | null = null
    let minDist = Infinity
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y)
      if (d < minDist) {
        minDist = d
        closest = enemy
      }
    })
    return closest
  }

  private cleanupProjectiles(time: number) {
    const checkPool = (pool: Phaser.Physics.Arcade.Group) => {
      pool.getChildren().forEach((p) => {
        const sprite = p as Phaser.Physics.Arcade.Sprite
        if (sprite.active && sprite.getData('expiresAt') && time >= sprite.getData('expiresAt')) {
          sprite.setActive(false).setVisible(false).body?.stop()
        }
      })
    }
    checkPool(this.p1Projectiles)
    checkPool(this.p2Projectiles)
  }

  // Mobile Controls & Scene Bridge
  public mobileMoveVector = new Phaser.Math.Vector2(0, 0)
  public mobileAttackTarget = new Phaser.Math.Vector2(0, 0)

  public triggerDash() {}
  public triggerSpecialPulse() {}

  public applyChosenMutation(mutation: MutationDefinition) {
    void mutation
    this.scene.resume()
  }

  private emitHUD(time: number) {
    if (!this.configCallbacks.onHUDUpdate) return
    this.configCallbacks.onHUDUpdate({
      hp: Math.max(this.p1Hp, this.p2Hp),
      maxHp: 100,
      xp: (this.p1Score + this.p2Score) % 500,
      nextLevelXp: 500,
      level: Math.floor((this.p1Score + this.p2Score) / 500) + 1,
      score: this.p1Score + this.p2Score,
      kills: Math.floor((this.p1Score + this.p2Score) / 100),
      survivalTime: Math.floor(time / 1000),
      bossActive: false,
      gameMode: 'multiplayer',
    })
  }
}
