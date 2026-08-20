'use client'

import React from 'react'
import type { CellSkin } from '@/lib/game/cosmetics'

interface PixelCharacterAvatarProps {
  skin: CellSkin
  size?: number
  className?: string
  animated?: boolean
}

/**
 * Renders an authentic 8-bit retro pixel person character matching the Shutterstock 8-bit style.
 */
export default function PixelCharacterAvatar({
  skin,
  size = 48,
  className = '',
  animated = false,
}: PixelCharacterAvatarProps) {
  const pHex = '#' + skin.primaryColor.toString(16).padStart(6, '0')
  const sHex = '#' + skin.secondaryColor.toString(16).padStart(6, '0')
  const aHex = '#' + skin.accentColor.toString(16).padStart(6, '0')
  const OUTLINE = '#090a0f'
  const SKIN_TONE = '#ffdfba'
  const DARK_SKIN = '#d49b6a'

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className} ${
        animated ? 'hover:scale-110 transition-transform duration-200' : ''
      }`}
      style={{ width: size, height: size }}
    >
      {/* 8-Bit Pixel Character SVG (16x16 Grid) */}
      <svg
        viewBox="0 0 16 16"
        className="w-full h-full"
        style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      >
        {/* Glow behind */}
        <circle cx="8" cy="8" r="7.5" fill={pHex} fillOpacity="0.2" />

        {/* 1. OUTLINE SILHOUETTE */}
        {/* Head Outline */}
        <rect x="5" y="1" width="6" height="8" fill={OUTLINE} />
        <rect x="4" y="2" width="8" height="6" fill={OUTLINE} />

        {/* Torso Outline */}
        <rect x="3" y="8" width="10" height="5" fill={OUTLINE} />

        {/* Legs Outline */}
        <rect x="4" y="13" width="3" height="3" fill={OUTLINE} />
        <rect x="9" y="13" width="3" height="3" fill={OUTLINE} />

        {/* Right Hand & Weapon Outline */}
        <rect x="11" y="7" width="5" height="4" fill={OUTLINE} />

        {/* 2. LEGS & SHOES */}
        {/* Pants */}
        <rect x="4" y="12" width="3" height="2" fill={sHex} />
        <rect x="9" y="12" width="3" height="2" fill={sHex} />
        {/* Boots */}
        <rect x="4" y="14" width="3" height="1" fill={OUTLINE} />
        <rect x="9" y="14" width="3" height="1" fill={OUTLINE} />
        <rect x="4" y="14" width="1" height="1" fill={pHex} />
        <rect x="9" y="14" width="1" height="1" fill={pHex} />

        {/* 3. TORSO CLOTHING */}
        <rect x="4" y="8" width="8" height="4" fill={sHex} />
        <rect x="5" y="8" width="6" height="3" fill={pHex} />
        <rect x="7" y="8" width="2" height="3" fill={aHex} />
        {/* Belt & Buckle */}
        <rect x="4" y="11" width="8" height="1" fill={OUTLINE} />
        <rect x="7" y="11" width="1" height="1" fill="#ffffff" />
        <rect x="8" y="11" width="1" height="1" fill={aHex} />

        {/* 4. LEFT ARM & SHOULDER */}
        <rect x="3" y="8" width="2" height="3" fill={sHex} />
        <rect x="3" y="10" width="1" height="1" fill={pHex} />
        <rect x="3" y="11" width="1" height="1" fill={SKIN_TONE} />

        {/* 5. RIGHT ARM & BLASTER */}
        <rect x="10" y="8" width="2" height="3" fill={sHex} />
        <rect x="11" y="9" width="1" height="1" fill={SKIN_TONE} />
        {/* Pixel Gun */}
        <rect x="12" y="8" width="3" height="2" fill="#334155" />
        <rect x="13" y="8" width="2" height="1" fill="#64748b" />
        <rect x="14" y="8" width="1" height="1" fill={pHex} />
        <rect x="15" y="8" width="1" height="1" fill="#ffffff" />
        <rect x="12" y="9" width="1" height="1" fill={aHex} />

        {/* 6. FACE BASE */}
        <rect x="5" y="4" width="6" height="3" fill={SKIN_TONE} />
        <rect x="5" y="6" width="1" height="1" fill={DARK_SKIN} />
        <rect x="10" y="6" width="1" height="1" fill={DARK_SKIN} />

        {/* 7. SKIN-SPECIFIC HEADWEAR */}
        {skin.id === 'neon_cyan' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill={sHex} />
            <rect x="4" y="3" width="2" height="3" fill={sHex} />
            <rect x="10" y="3" width="2" height="3" fill={sHex} />
            <rect x="6" y="4" width="4" height="1" fill="#0f172a" />
            <rect x="6" y="5" width="4" height="1" fill={pHex} />
            <rect x="7" y="5" width="1" height="1" fill="#ffffff" />
            <rect x="7" y="2" width="1" height="1" fill={aHex} />
          </>
        )}

        {skin.id === 'toxic_bio' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill={sHex} />
            <rect x="4" y="3" width="2" height="3" fill={sHex} />
            <rect x="10" y="3" width="2" height="3" fill={sHex} />
            <rect x="6" y="4" width="1" height="1" fill={pHex} />
            <rect x="9" y="4" width="1" height="1" fill={pHex} />
            <rect x="6" y="4" width="1" height="1" fill="#ffffff" fillOpacity="0.7" />
            <rect x="7" y="5" width="2" height="2" fill="#1f2937" />
            <rect x="7" y="6" width="1" height="1" fill={aHex} />
            <rect x="8" y="6" width="1" height="1" fill={aHex} />
          </>
        )}

        {skin.id === 'solar_flare' && (
          <>
            <rect x="5" y="2" width="6" height="1" fill={aHex} />
            <rect x="4" y="3" width="8" height="1" fill={aHex} />
            <rect x="4" y="2" width="1" height="1" fill={pHex} />
            <rect x="9" y="2" width="1" height="1" fill={pHex} />
            {/* Sunglasses */}
            <rect x="6" y="4" width="4" height="1" fill="#020617" />
            <rect x="6" y="4" width="1" height="1" fill={pHex} />
            <rect x="9" y="4" width="1" height="1" fill={pHex} />
          </>
        )}

        {skin.id === 'void_purple' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill={sHex} />
            <rect x="4" y="2" width="2" height="4" fill={sHex} />
            <rect x="10" y="2" width="2" height="4" fill={sHex} />
            <rect x="5" y="4" width="6" height="3" fill="#0f051d" />
            <rect x="6" y="4" width="1" height="1" fill={pHex} />
            <rect x="9" y="4" width="1" height="1" fill={pHex} />
          </>
        )}

        {skin.id === 'glitch_matrix' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill="#020617" />
            <rect x="4" y="3" width="8" height="1" fill={pHex} />
            <rect x="6" y="4" width="2" height="1" fill="#06b6d4" />
            <rect x="8" y="4" width="2" height="1" fill={pHex} />
            <rect x="6" y="4" width="1" height="1" fill="#ffffff" />
            <rect x="6" y="6" width="4" height="1" fill="#1e1b4b" />
          </>
        )}

        {skin.id === 'golden_prestige' && (
          <>
            <rect x="5" y="2" width="6" height="1" fill={pHex} />
            <rect x="5" y="1" width="1" height="1" fill={pHex} />
            <rect x="7" y="1" width="2" height="1" fill="#ffffff" />
            <rect x="10" y="1" width="1" height="1" fill={pHex} />
            <rect x="6" y="4" width="1" height="1" fill="#0f172a" />
            <rect x="7" y="4" width="1" height="1" fill={pHex} />
            <rect x="9" y="4" width="1" height="1" fill="#0f172a" />
            <rect x="8" y="4" width="1" height="1" fill={pHex} />
          </>
        )}
      </svg>
    </div>
  )
}
