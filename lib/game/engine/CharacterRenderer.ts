// ============================================================
// CELLIX v1.2 — 8-Bit Pixel People Character Generator
// Creates authentic retro 8-bit pixel art humanoid character sprites
// inspired by classic video game pixel people sprite sheets.
// ============================================================

import * as Phaser from 'phaser'
import { CELL_SKINS, type CellSkin } from '../cosmetics'

export class CharacterRenderer {
  /**
   * Generates 8-bit pixel art character textures for all skins in a Phaser Scene.
   */
  public static generateAllCharacterTextures(scene: Phaser.Scene) {
    CELL_SKINS.forEach((skin) => {
      this.generate8BitCharacterTexture(scene, skin)
    })
  }

  /**
   * Generates an authentic 8-bit retro pixel character texture (48x48 px).
   */
  public static generate8BitCharacterTexture(scene: Phaser.Scene, skin: CellSkin) {
    const key = `char_${skin.id}`
    if (scene.textures.exists(key)) return key

    const gfx = scene.make.graphics({ x: 0, y: 0 })
    const size = 48
    const px = 3 // Each 8-bit pixel is 3x3 screen pixels (16x16 logical grid)

    // Helper: Draw a single 8-bit pixel on the 16x16 grid
    const drawPx = (gx: number, gy: number, color: number, alpha: number = 1) => {
      gfx.fillStyle(color, alpha)
      gfx.fillRect(gx * px, gy * px, px, px)
    }

    // Helper: Draw a horizontal row of 8-bit pixels
    const drawHLine = (gx: number, gy: number, len: number, color: number, alpha: number = 1) => {
      gfx.fillStyle(color, alpha)
      gfx.fillRect(gx * px, gy * px, len * px, px)
    }

    // Helper: Draw a filled rect on the pixel grid
    const drawRect = (gx: number, gy: number, gw: number, gh: number, color: number, alpha: number = 1) => {
      gfx.fillStyle(color, alpha)
      gfx.fillRect(gx * px, gy * px, gw * px, gh * px)
    }

    // Outer faint aura glow (subtle cyberpunk lighting behind 8-bit sprite)
    gfx.fillStyle(skin.primaryColor, 0.2)
    gfx.fillCircle(size / 2, size / 2, 22)

    // ==========================================
    // 8-BIT RETRO PIXEL PERSON SPRITE (16x16 grid)
    // Facing Direction: Top-down / slight 3/4 view facing Right/Down
    // ==========================================

    const P = skin.primaryColor
    const S = skin.secondaryColor
    const A = skin.accentColor
    const OUTLINE = 0x090a0f // Dark 8-bit outline
    const SKIN_TONE = 0xffdfba // Retro pixel flesh tone for visible face/hands
    const DARK_SKIN = 0xd49b6a // Shading flesh

    // --- 1. BLACK OUTLINE SILHOUETTE ---
    // Head outline (gx: 4..11, gy: 2..8)
    drawRect(5, 1, 6, 8, OUTLINE)
    drawRect(4, 2, 8, 6, OUTLINE)

    // Torso outline (gx: 4..11, gy: 8..13)
    drawRect(3, 8, 10, 5, OUTLINE)

    // Legs/Feet outline (gx: 4..6, 9..11, gy: 13..15)
    drawRect(4, 13, 3, 3, OUTLINE)
    drawRect(9, 13, 3, 3, OUTLINE)

    // Weapon/Right Hand outline (gx: 11..15, gy: 7..10)
    drawRect(11, 7, 5, 4, OUTLINE)

    // --- 2. LEGS & SHOES / BOOTS (gy: 13..15) ---
    // Pants / Greaves
    drawRect(4, 12, 3, 2, S)
    drawRect(9, 12, 3, 2, S)
    // Boots
    drawRect(4, 14, 3, 1, OUTLINE)
    drawRect(9, 14, 3, 1, OUTLINE)
    drawPx(4, 14, P) // Boot highlight
    drawPx(9, 14, P)

    // --- 3. TORSO / BODY CLOTHING & ARMOR (gy: 8..12) ---
    // Base shirt / armor
    drawRect(4, 8, 8, 4, S)
    // Chestplate / Pattern
    drawRect(5, 8, 6, 3, P)
    // Chest emblem / tie / insignia
    drawRect(7, 8, 2, 3, A)
    // Belt with buckle
    drawHLine(4, 11, 8, OUTLINE)
    drawPx(7, 11, 0xffffff) // Belt buckle shine
    drawPx(8, 11, A)

    // --- 4. LEFT ARM & SHOULDER (gx: 3..4, gy: 8..11) ---
    drawRect(3, 8, 2, 3, S)
    drawPx(3, 10, P) // Shoulder pad
    drawPx(3, 11, SKIN_TONE) // Left hand

    // --- 5. RIGHT ARM & WEAPON / BLASTER (gx: 10..15, gy: 7..10) ---
    // Right arm
    drawRect(10, 8, 2, 3, S)
    drawPx(11, 9, SKIN_TONE) // Right hand holding weapon

    // 8-bit Pixel Blaster / Weapon
    drawRect(12, 8, 3, 2, 0x334155) // Gun body
    drawHLine(13, 8, 2, 0x64748b) // Gun barrel top highlight
    drawPx(14, 8, P) // Muzzle glow
    drawPx(15, 8, 0xffffff) // Muzzle tip / laser charge
    drawPx(12, 9, A) // Power cell

    // --- 6. HEAD, HELMET / HAIR, FACE & VISOR (gy: 2..7) ---
    // Base Face / Skin
    drawRect(5, 4, 6, 3, SKIN_TONE)
    drawPx(5, 6, DARK_SKIN) // Chin shade
    drawPx(10, 6, DARK_SKIN)

    // Skin-Specific Themed Headwear & Details
    switch (skin.id) {
      case 'neon_cyan':
        // Cyber Helmet with Neon Visor
        drawRect(5, 2, 6, 2, S)
        drawRect(4, 3, 2, 3, S) // Ear covers
        drawRect(10, 3, 2, 3, S)
        drawHLine(6, 4, 4, 0x0f172a) // Visor housing
        drawHLine(6, 5, 4, P) // Glowing Cyan Visor
        drawPx(7, 5, 0xffffff) // Glint
        drawPx(7, 2, A) // Helmet crest
        break

      case 'toxic_bio':
        // Hazard Gasmask & Emerald Hood
        drawRect(5, 2, 6, 2, S)
        drawRect(4, 3, 2, 3, S)
        drawRect(10, 3, 2, 3, S)
        // Dual glowing toxic eye lenses
        drawPx(6, 4, P)
        drawPx(9, 4, P)
        drawPx(6, 4, 0xffffff, 0.7)
        // Gas respirator filter
        drawRect(7, 5, 2, 2, 0x1f2937)
        drawPx(7, 6, A)
        drawPx(8, 6, A)
        break

      case 'solar_flare':
        // Fire Bandana / Flame Hair & Sunglasses
        drawHLine(5, 2, 6, A) // Red bandana top
        drawHLine(4, 3, 8, A)
        drawPx(4, 2, P) // Flame tips
        drawPx(9, 2, P)
        // Pixel sunglasses
        drawHLine(6, 4, 4, 0x020617)
        drawPx(6, 4, P) // Sun reflection
        drawPx(9, 4, P)
        break

      case 'void_purple':
        // Mystic Void Hood & Glowing Eyes
        drawRect(5, 2, 6, 2, S) // Deep purple hood
        drawRect(4, 2, 2, 4, S)
        drawRect(10, 2, 2, 4, S)
        // Dark shadow face
        drawRect(5, 4, 6, 3, 0x0f051d)
        // Magenta glowing eyes
        drawPx(6, 4, P)
        drawPx(9, 4, P)
        drawPx(6, 4, A, 0.8)
        drawPx(9, 4, A, 0.8)
        break

      case 'glitch_matrix':
        // Cyber Shinobi Mask & Glitch Visor
        drawRect(5, 2, 6, 2, 0x020617)
        drawHLine(4, 3, 8, P) // Neon pink headband
        // Split Glitch Visor (Half cyan, half pink)
        drawHLine(6, 4, 2, 0x06b6d4) // Cyan eye
        drawHLine(8, 4, 2, P) // Pink eye
        drawPx(6, 4, 0xffffff)
        // Ninja mouth guard
        drawHLine(6, 6, 4, 0x1e1b4b)
        break

      case 'golden_prestige':
      default:
        // Royal Golden Crown & Champion Hair
        drawHLine(5, 2, 6, P) // Gold crown base
        drawPx(5, 1, P) // Crown peak 1
        drawPx(7, 1, 0xffffff) // Crown center gem (Diamond)
        drawPx(8, 1, 0xffffff)
        drawPx(10, 1, P) // Crown peak 3
        // Golden eyes & heroic brow
        drawPx(6, 4, 0x0f172a)
        drawPx(7, 4, P)
        drawPx(9, 4, 0x0f172a)
        drawPx(8, 4, P)
        break
    }

    gfx.generateTexture(key, size, size)
    gfx.destroy()

    return key
  }
}
