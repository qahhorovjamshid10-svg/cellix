// ============================================================
// CELLIX v2.1 — Combat Visuals & Telegraphs
// Floating text, hit flashes, attack telegraph lines & warning rings
// ============================================================

export class CombatVisuals {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Floating damage / critical text that pops up and floats upward.
   */
  public showFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    fontSize: number = 14
  ) {
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    })
    txt.setOrigin(0.5, 0.5)

    this.scene.tweens.add({
      targets: txt,
      y: y - 35,
      alpha: 0,
      duration: 750,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    })
  }

  /**
   * White hit flash effect when an enemy takes damage.
   */
  public flashEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!enemy.active) return
    const originalTint = enemy.isTinted ? enemy.tintTopLeft : 0xffffff
    enemy.setTint(0xffffff)
    this.scene.time.delayedCall(80, () => {
      if (enemy.active) {
        if (originalTint !== 0xffffff) {
          enemy.setTint(originalTint)
        } else {
          enemy.clearTint()
        }
      }
    })
  }

  /**
   * Laser beam / direction arrow telegraph for charging/shooting enemies.
   */
  public showLaserTelegraph(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    durationMs: number = 400
  ) {
    const line = this.scene.add.line(0, 0, fromX, fromY, toX, toY, 0xff0055, 0.6)
    line.setLineWidth(2)

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: durationMs,
      onComplete: () => line.destroy(),
    })
  }

  /**
   * Expanding ground warning ring before AoE attacks or hazard spawns.
   */
  public showWarningRing(
    x: number,
    y: number,
    radius: number,
    durationMs: number = 600,
    color: number = 0xef4444
  ) {
    const ring = this.scene.add.circle(x, y, 5, color, 0.5)
    ring.setStrokeStyle(2, color, 0.9)

    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    })
  }
}
