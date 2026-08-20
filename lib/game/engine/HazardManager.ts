// ============================================================
// CELLIX v2.1 — Arena Hazard Manager
// Manages environmental hazards: Acid Pools, Electric Fields, Gravity Zones
// ============================================================

import Phaser from 'phaser'

export type HazardType = 'acid' | 'electric' | 'gravity'

export interface ActiveHazard {
  id: string
  type: HazardType
  x: number
  y: number
  radius: number
  expiresAt: number
  lastTickAt: number
  circleGraphic: Phaser.GameObjects.Arc
  particleGraphics?: Phaser.GameObjects.Arc
}

export class HazardManager {
  private scene: Phaser.Scene
  private random: () => number
  private hazards: ActiveHazard[] = []
  private nextId = 1

  constructor(scene: Phaser.Scene, random: () => number = Math.random) {
    this.scene = scene
    this.random = random
  }

  public clearAll() {
    this.hazards.forEach((h) => {
      h.circleGraphic.destroy()
      h.particleGraphics?.destroy()
    })
    this.hazards = []
  }

  public spawnRandomHazard(x: number, y: number): ActiveHazard {
    const types: HazardType[] = ['acid', 'electric', 'gravity']
    const type = types[Math.floor(this.random() * types.length)]
    return this.spawnHazard(type, x, y)
  }

  public spawnHazard(type: HazardType, x: number, y: number, radius = 90, durationMs = 12000): ActiveHazard {
    let color = 0x22c55e // acid green
    let alpha = 0.25

    if (type === 'electric') {
      color = 0x00f0ff // cyan blue
      alpha = 0.3
    } else if (type === 'gravity') {
      color = 0xa855f7 // purple
      alpha = 0.35
    }

    const graphic = this.scene.add.circle(x, y, radius, color, alpha)
    graphic.setDepth(-2)

    // Pulse animation
    this.scene.tweens.add({
      targets: graphic,
      alpha: alpha * 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    })

    const hazard: ActiveHazard = {
      id: `hazard_${this.nextId++}`,
      type,
      x,
      y,
      radius,
      expiresAt: this.scene.time.now + durationMs,
      lastTickAt: 0,
      circleGraphic: graphic,
    }

    this.hazards.push(hazard)
    return hazard
  }

  public update(
    time: number,
    player: Phaser.Physics.Arcade.Sprite,
    onPlayerDamage: (amount: number) => void,
    onPlayerSpeedMult: (mult: number) => void,
    enemies?: Phaser.Physics.Arcade.Group
  ) {
    let speedMult = 1.0

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]

      // Expiry check
      if (time >= h.expiresAt) {
        h.circleGraphic.destroy()
        h.particleGraphics?.destroy()
        this.hazards.splice(i, 1)
        continue
      }

      const distToPlayer = Phaser.Math.Distance.Between(h.x, h.y, player.x, player.y)

      if (distToPlayer <= h.radius) {
        if (h.type === 'acid') {
          // Slow down player inside acid
          speedMult = Math.min(speedMult, 0.7)
          // Tick damage every 400ms
          if (time - h.lastTickAt >= 400) {
            h.lastTickAt = time
            onPlayerDamage(5)
          }
        } else if (h.type === 'electric') {
          // Shock damage every 800ms
          if (time - h.lastTickAt >= 800) {
            h.lastTickAt = time
            onPlayerDamage(12)
            // Visual shock flash
            const flash = this.scene.add.circle(h.x, h.y, h.radius, 0xffffff, 0.6)
            this.scene.tweens.add({
              targets: flash,
              alpha: 0,
              duration: 150,
              onComplete: () => flash.destroy(),
            })
          }
        } else if (h.type === 'gravity') {
          // Pull player slightly towards center
          const angle = Phaser.Math.Angle.Between(player.x, player.y, h.x, h.y)
          player.x += Math.cos(angle) * 1.8
          player.y += Math.sin(angle) * 1.8

          // Tick damage every 1000ms
          if (time - h.lastTickAt >= 1000) {
            h.lastTickAt = time
            onPlayerDamage(8)
          }
        }
      }

      // Pull enemies into gravity hazard as well
      if (h.type === 'gravity' && enemies) {
        enemies.getChildren().forEach((eObj) => {
          if (!eObj.active) return
          const enemy = eObj as Phaser.Physics.Arcade.Sprite
          const distToEnemy = Phaser.Math.Distance.Between(h.x, h.y, enemy.x, enemy.y)
          if (distToEnemy <= h.radius + 50) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, h.x, h.y)
            enemy.x += Math.cos(angle) * 2.2
            enemy.y += Math.sin(angle) * 2.2
          }
        })
      }
    }

    onPlayerSpeedMult(speedMult)
  }
}
