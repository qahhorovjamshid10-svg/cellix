// ============================================================
// CELLIX v2026 — Volumetric 3D Procedural Texture & Arena Renderer
// Generates high-contrast 3D-shaded sprites (radial key lighting,
// Fresnel rim light, metallic bevels, specular crescents, weapons)
// tailored to each skin's model3dType and arena theme.
// ============================================================

import * as Phaser from 'phaser'
import { CELL_SKINS, getArenaThemePalette, type CellSkin } from '../cosmetics'

function toRgba(hexNum: number, alpha = 1): string {
  const r = (hexNum >> 16) & 255
  const g = (hexNum >> 8) & 255
  const b = hexNum & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function shadeColor(hexNum: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((hexNum >> 16) & 255) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((hexNum >> 8) & 255) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((hexNum & 255) * factor)))
  return (r << 16) | (g << 8) | b
}

function addRoundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

export class CharacterRenderer {
  public static generateAllCharacterTextures(scene: Phaser.Scene, arenaMode: string = 'classic') {
    this.generateArenaTextures(scene, arenaMode)
    CELL_SKINS.forEach((skin) => {
      this.generate3DCharacterTexture(scene, skin)
      this.generate3DProjectileTexture(scene, skin)
    })
  }

  /**
   * Backward-compatible alias so MultiplayerScene & PracticeScene continue working.
   */
  public static generate8BitCharacterTexture(scene: Phaser.Scene, skin: CellSkin) {
    return this.generate3DCharacterTexture(scene, skin)
  }

  /**
   * Generates a 64x64 Volumetric 3D top-down Bio-Mech unit facing RIGHT (angle = 0).
   */
  public static generate3DCharacterTexture(scene: Phaser.Scene, skin: CellSkin): string {
    const key = `char_${skin.id}`
    if (scene.textures.exists(key)) return key

    const size = 64
    const cx = size / 2
    const cy = size / 2
    const canvasTex = scene.textures.createCanvas(key, size, size)
    if (!canvasTex) return 'player_virus'

    const ctx = canvasTex.getContext()
    ctx.clearRect(0, 0, size, size)

    const p = skin.primaryColor
    const s = skin.secondaryColor
    const a = skin.accentColor
    const highlight = shadeColor(p, 1.35)

    // 1. Contact drop shadow (simulates elevation above arena floor)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.ellipse(cx - 2, cy + 4, 21, 18, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Skin-specific 3D outer fins / pauldrons / orbital rings
    if (skin.model3dType === 'bastion_mech' || skin.model3dType === 'plasma_core') {
      // Heavy twin armored cannon shoulders
      ctx.fillStyle = toRgba(s, 1)
      ctx.strokeStyle = toRgba(p, 0.9)
      ctx.lineWidth = 1.6
      ctx.beginPath()
      addRoundedPath(ctx, 14, 7, 22, 10, 3)
      addRoundedPath(ctx, 14, 47, 22, 10, 3)
      ctx.fill()
      ctx.stroke()

      // Cannon muzzles pointing right
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(34, 9, 10, 5)
      ctx.fillRect(34, 50, 10, 5)
      ctx.fillStyle = toRgba(a, 1)
      ctx.fillRect(42, 10, 3, 3)
      ctx.fillRect(42, 51, 3, 3)
    } else if (skin.model3dType === 'leviathan_apex') {
      // Predatory forward-curving 3D chitin mandibles
      ctx.fillStyle = toRgba(s, 1)
      ctx.strokeStyle = toRgba(p, 1)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(28, 13)
      ctx.lineTo(54, 19)
      ctx.lineTo(42, 26)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(28, 51)
      ctx.lineTo(54, 45)
      ctx.lineTo(42, 38)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (skin.model3dType === 'void_orb' || skin.model3dType === 'chrono_octa') {
      // Tilted 3D accretion / gimbal halo
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-0.4)
      ctx.strokeStyle = toRgba(a, 0.78)
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.ellipse(0, 0, 27, 13, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // 3. Forward Blaster Barrel (facing +X so rotation aims cleanly)
    const barrelGrad = ctx.createLinearGradient(cx + 8, cy - 6, cx + 29, cy + 6)
    barrelGrad.addColorStop(0, '#334155')
    barrelGrad.addColorStop(0.5, '#64748b')
    barrelGrad.addColorStop(1, '#0f172a')
    ctx.fillStyle = barrelGrad
    ctx.strokeStyle = '#090c10'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    addRoundedPath(ctx, cx + 10, cy - 5, 19, 10, 2.5)
    ctx.fill()
    ctx.stroke()

    // Glowing muzzle tip
    ctx.fillStyle = toRgba(a, 1)
    ctx.beginPath()
    ctx.arc(cx + 28, cy, 3.2, 0, Math.PI * 2)
    ctx.fill()

    // 4. Volumetric 3D Main Hull (Sphere or Octahedron/Hex)
    const bodyRadius = 18.5
    const bodyGrad = ctx.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, bodyRadius + 2)
    bodyGrad.addColorStop(0, '#ffffff')
    bodyGrad.addColorStop(0.24, toRgba(highlight, 1))
    bodyGrad.addColorStop(0.65, toRgba(p, 1))
    bodyGrad.addColorStop(1, toRgba(shadeColor(s, 0.45), 1))

    ctx.fillStyle = bodyGrad
    ctx.strokeStyle = toRgba(a, 0.85)
    ctx.lineWidth = 1.8

    if (skin.model3dType === 'chrono_octa' || skin.model3dType === 'bastion_mech') {
      // Sculpted hexagonal 3D polyhedron
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3
        const vx = cx + Math.cos(ang) * bodyRadius
        const vy = cy + Math.sin(ang) * bodyRadius
        if (i === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    // 5. Internal 3D Detail (Visor / Helix Core / Reactor / Crown)
    if (skin.model3dType === 'helix_crystal') {
      ctx.fillStyle = 'rgba(10, 12, 11, 0.55)'
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = toRgba(p, 1)
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(cx - 6, cy - 5)
      ctx.bezierCurveTo(cx + 2, cy - 2, cx - 2, cy + 2, cx + 6, cy + 5)
      ctx.stroke()
      ctx.strokeStyle = toRgba(a, 1)
      ctx.beginPath()
      ctx.moveTo(cx - 6, cy + 5)
      ctx.bezierCurveTo(cx + 2, cy + 2, cx - 2, cy - 2, cx + 6, cy - 5)
      ctx.stroke()
    } else if (skin.model3dType === 'crown_sovereign') {
      // Top-down golden crown crest + glowing central jewel
      ctx.fillStyle = toRgba(a, 0.95)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5
        const rx = cx + Math.cos(ang) * 11
        const ry = cy + Math.sin(ang) * 11
        if (i === 0) ctx.moveTo(rx, ry)
        else ctx.lineTo(rx, ry)
      }
      ctx.closePath()
      ctx.fill()
    } else {
      // Sleek forward-facing curved 3D visor arc
      ctx.strokeStyle = '#07090b'
      ctx.lineWidth = 6.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx + 2, cy, 11, -0.85, 0.85)
      ctx.stroke()

      const visorGrad = ctx.createLinearGradient(cx + 6, cy - 9, cx + 14, cy + 9)
      visorGrad.addColorStop(0, '#ffffff')
      visorGrad.addColorStop(0.45, toRgba(a, 1))
      visorGrad.addColorStop(1, toRgba(p, 1))
      ctx.strokeStyle = visorGrad
      ctx.lineWidth = 3.6
      ctx.beginPath()
      ctx.arc(cx + 2, cy, 11, -0.78, 0.78)
      ctx.stroke()
    }

    // 6. Specular 3D key-light crescent glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.beginPath()
    ctx.ellipse(cx - 6, cy - 7, 5.5, 2.8, -0.55, 0, Math.PI * 2)
    ctx.fill()

    canvasTex.refresh()
    return key
  }

  /**
   * Generates skin-matched 3D glowing projectile orb texture (16x16).
   */
  public static generate3DProjectileTexture(scene: Phaser.Scene, skin: CellSkin): string {
    const key = `proj_${skin.id}`
    if (scene.textures.exists(key)) return key

    const size = 16
    const c = size / 2
    const canvasTex = scene.textures.createCanvas(key, size, size)
    if (!canvasTex) return 'spore_p'

    const ctx = canvasTex.getContext()
    const grad = ctx.createRadialGradient(c - 1.5, c - 1.5, 1, c, c, 7)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.42, toRgba(skin.projectileColor, 1))
    grad.addColorStop(0.85, toRgba(skin.primaryColor, 0.85))
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(c, c, 7.5, 0, Math.PI * 2)
    ctx.fill()

    canvasTex.refresh()
    return key
  }

  /**
   * Generates Volumetric 3D shaded projectiles, enemies, bosses, and crystal XP gems.
   */
  public static generateArenaTextures(scene: Phaser.Scene, arenaMode: string = 'classic') {
    const palette = getArenaThemePalette(arenaMode)

    const createRadialSprite = (
      key: string,
      size: number,
      coreColor: number,
      rimColor: number,
      strokeColor?: number,
      spiky = false,
      faceted = false
    ) => {
      if (scene.textures.exists(key)) return
      const canvasTex = scene.textures.createCanvas(key, size, size)
      if (!canvasTex) return
      const ctx = canvasTex.getContext()
      const c = size / 2
      const r = c - 3

      // Subtle ambient ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.arc(c - 1, c + 2, r, 0, Math.PI * 2)
      ctx.fill()

      const grad = ctx.createRadialGradient(c - r * 0.35, c - r * 0.35, Math.max(1, r * 0.12), c, c, r)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.32, toRgba(coreColor, 1))
      grad.addColorStop(0.82, toRgba(rimColor, 1))
      grad.addColorStop(1, toRgba(shadeColor(rimColor, 0.35), 1))

      ctx.fillStyle = grad
      ctx.strokeStyle = strokeColor ? toRgba(strokeColor, 0.95) : 'rgba(255,255,255,0.45)'
      ctx.lineWidth = Math.max(1.5, size * 0.04)

      if (spiky) {
        const spikes = 8
        ctx.beginPath()
        for (let i = 0; i < spikes * 2; i++) {
          const rad = i % 2 === 0 ? r : r * 0.72
          const a = (i * Math.PI) / spikes
          const x = c + Math.cos(a) * rad
          const y = c + Math.sin(a) * rad
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (faceted) {
        const sides = 6
        ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const a = (i * Math.PI * 2) / sides
          const x = c + Math.cos(a) * r
          const y = c + Math.sin(a) * r
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(c, c, r, 0, Math.PI * 2)
        ctx.fill()
        if (strokeColor) ctx.stroke()
      }

      // Specular crescent highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.ellipse(c - r * 0.32, c - r * 0.32, Math.max(1.5, r * 0.28), Math.max(1, r * 0.14), -0.6, 0, Math.PI * 2)
      ctx.fill()

      canvasTex.refresh()
    }

    // Default player fallback + projectiles
    createRadialSprite('player_virus', 40, palette.accentHex, 0x0e7490, 0xffffff)
    createRadialSprite('spore_p', 16, palette.accentHex, 0x06b6d4, 0xffffff)
    createRadialSprite('spore_e', 16, 0xff4d2e, 0x991b1b, 0xffc83a)

    // 3D Enemies
    createRadialSprite('enemy_eater', 24, 0x4ade80, 0x15803d)
    createRadialSprite('enemy_hunter', 32, 0xff4d2e, 0x881337, 0xffc83a, true)
    createRadialSprite('enemy_shooter', 32, 0x3ae0c8, 0x0f766e, 0xe0f2fe)
    createRadialSprite('enemy_tank', 52, 0xa3e635, 0x14532d, 0x365314, false, true)

    // 3D Bosses (Classical Ancient Cell + Survival Mini Overlord + Survival Mega Overlord)
    createRadialSprite('enemy_boss', 96, 0xc084fc, 0x4c1d95, 0xff4d2e, true)
    createRadialSprite('enemy_boss_mini', 68, 0xf97316, 0x7c2d12, 0xffc83a, true)
    createRadialSprite('enemy_boss_mega', 104, 0xec4899, 0x581c87, 0xff4d2e, true)

    // Faceted 3D XP Bio-Crystal
    createRadialSprite('xp_gem', 14, palette.accentHex, 0x0891b2, 0xffffff, false, true)
  }
}
