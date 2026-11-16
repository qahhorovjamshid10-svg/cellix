'use client'

import React, { useId } from 'react'
import type { CellSkin } from '@/lib/game/cosmetics'

interface PixelCharacterAvatarProps {
  skin: CellSkin
  size?: number
  className?: string
  animated?: boolean
}

function toHex(num: number): string {
  return '#' + num.toString(16).padStart(6, '0')
}

/**
 * Volumetric 3D Bio-Mech Specimen Avatar Renderer (HiDPI SVG with multi-stop
 * off-center lighting gradients, Fresnel rim glow, specular lens reflections,
 * and unique 3D chassis structures per model3dType).
 */
export default function PixelCharacterAvatar({
  skin,
  size = 64,
  className = '',
  animated = false,
}: PixelCharacterAvatarProps) {
  const uid = useId().replace(/:/g, '')
  const pHex = toHex(skin.primaryColor)
  const sHex = toHex(skin.secondaryColor)
  const aHex = toHex(skin.accentColor)

  const bodyGradId = `c3d-body-${uid}`
  const coreGradId = `c3d-core-${uid}`
  const rimGradId = `c3d-rim-${uid}`
  const visorGradId = `c3d-visor-${uid}`

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${
        animated ? 'transition-transform duration-300 group-hover:scale-110' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={bodyGradId} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="22%" stopColor={pHex} stopOpacity="1" />
            <stop offset="68%" stopColor={sHex} stopOpacity="1" />
            <stop offset="100%" stopColor="#07090b" stopOpacity="1" />
          </radialGradient>

          <radialGradient id={coreGradId} cx="36%" cy="34%" r="68%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="42%" stopColor={aHex} />
            <stop offset="88%" stopColor={pHex} />
            <stop offset="100%" stopColor="#0a0c0b" />
          </radialGradient>

          <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="45%" stopColor={pHex} stopOpacity="0.9" />
            <stop offset="100%" stopColor={aHex} stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id={visorGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="35%" stopColor={aHex} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#090d10" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Ground contact ambient shadow */}
        <ellipse cx="62" cy="106" rx="34" ry="8" fill="#000000" opacity="0.55" />

        {/* Model-specific outer 3D attachments (wings, rings, spines, cannons) */}
        {(skin.model3dType === 'bastion_mech' || skin.model3dType === 'plasma_core') && (
          <>
            {/* Twin 3D shoulder armor pods */}
            <polygon
              points="12,48 28,36 32,76 14,82"
              fill={sHex}
              stroke={pHex}
              strokeWidth="2"
            />
            <polygon
              points="108,48 92,36 88,76 106,82"
              fill={sHex}
              stroke={pHex}
              strokeWidth="2"
            />
            <circle cx="22" cy="58" r="5" fill={`url(#${coreGradId})`} />
            <circle cx="98" cy="58" r="5" fill={`url(#${coreGradId})`} />
          </>
        )}

        {skin.model3dType === 'leviathan_apex' && (
          <>
            {/* 3D predatory cyber mandibles & dorsal fins */}
            <polygon points="20,26 42,40 28,62 12,44" fill={sHex} stroke={pHex} strokeWidth="2" />
            <polygon points="100,26 78,40 92,62 108,44" fill={sHex} stroke={pHex} strokeWidth="2" />
            <polygon points="60,8 68,26 52,26" fill={aHex} />
          </>
        )}

        {(skin.model3dType === 'void_orb' || skin.model3dType === 'chrono_octa') && (
          /* Tilted 3D equatorial accretion/gimbal ring (back half) */
          <ellipse
            cx="60"
            cy="60"
            rx="52"
            ry="18"
            transform="rotate(-22 60 60)"
            fill="none"
            stroke={`url(#${rimGradId})`}
            strokeWidth="3.5"
            opacity="0.7"
          />
        )}

        {/* Base 3D Sphere / Faceted Carapace */}
        {skin.model3dType === 'chrono_octa' || skin.model3dType === 'bastion_mech' ? (
          <>
            {/* Sculpted faceted 3D polyhedral hull */}
            <polygon
              points="60,18 96,38 96,78 60,98 24,78 24,38"
              fill={`url(#${bodyGradId})`}
              stroke={`url(#${rimGradId})`}
              strokeWidth="2.5"
            />
            {/* Top-left bright facet highlight */}
            <polygon points="60,18 96,38 60,56 24,38" fill="#ffffff" opacity="0.22" />
            {/* Bottom-right shadow facet */}
            <polygon points="60,56 96,78 60,98" fill="#000000" opacity="0.28" />
          </>
        ) : (
          /* Volumetric 3D sphere chassis */
          <circle
            cx="60"
            cy="59"
            r="36"
            fill={`url(#${bodyGradId})`}
            stroke={`url(#${rimGradId})`}
            strokeWidth="2.4"
          />
        )}

        {/* Fresnel specular crescent (top-left studio key light) */}
        <ellipse
          cx="46"
          cy="41"
          rx="14"
          ry="7.5"
          transform="rotate(-28 46 41)"
          fill="#ffffff"
          opacity="0.48"
        />
        <circle cx="38" cy="36" r="3" fill="#ffffff" opacity="0.85" />

        {/* Model-specific 3D Visors / Cores / Crowns */}
        {skin.model3dType === 'helix_crystal' && (
          <>
            {/* Inner suspended DNA bio-nucleus */}
            <circle cx="60" cy="59" r="19" fill="#0a0c0b" fillOpacity="0.45" stroke={pHex} strokeWidth="1.5" />
            <path
              d="M 48 47 C 66 53, 54 65, 72 71"
              fill="none"
              stroke={pHex}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 72 47 C 54 53, 66 65, 48 71"
              fill="none"
              stroke={aHex}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="60" cy="59" r="5" fill={`url(#${coreGradId})`} />
          </>
        )}

        {(skin.model3dType === 'sphere_visor' || skin.model3dType === 'prism_stealth') && (
          <>
            {/* Wraparound 3D curved tactical visor */}
            <path
              d="M 32 52 Q 60 44 88 52 L 84 68 Q 60 63 36 68 Z"
              fill="#05080c"
              stroke={`url(#${rimGradId})`}
              strokeWidth="2"
            />
            <path
              d="M 38 55 Q 60 49 82 55 L 79 64 Q 60 60 41 64 Z"
              fill={`url(#${visorGradId})`}
            />
            {skin.model3dType === 'prism_stealth' && (
              <polygon points="44,54 60,52 54,64 41,63" fill={pHex} opacity="0.85" />
            )}
            <line x1="44" y1="56" x2="56" y2="54" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </>
        )}

        {skin.model3dType === 'bio_hazard' && (
          <>
            {/* Dual pressurized glowing ocular lenses + respirator */}
            <circle cx="46" cy="54" r="9" fill="#060c09" stroke={aHex} strokeWidth="2" />
            <circle cx="74" cy="54" r="9" fill="#060c09" stroke={aHex} strokeWidth="2" />
            <circle cx="46" cy="54" r="5" fill={`url(#${coreGradId})`} />
            <circle cx="74" cy="54" r="5" fill={`url(#${coreGradId})`} />
            <polygon points="52,66 68,66 64,82 56,82" fill="#090f0c" stroke={pHex} strokeWidth="1.8" />
          </>
        )}

        {(skin.model3dType === 'plasma_core' || skin.model3dType === 'bastion_mech') && (
          <>
            {/* Armored furnace chest core + optical slit */}
            <rect x="38" y="45" width="44" height="10" rx="2" fill="#090606" stroke={aHex} strokeWidth="1.8" />
            <rect x="44" y="48" width="32" height="4" fill={aHex} />
            <circle cx="60" cy="72" r="10" fill={`url(#${coreGradId})`} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" />
          </>
        )}

        {skin.model3dType === 'void_orb' && (
          <>
            <circle cx="60" cy="59" r="14" fill="#05020a" stroke={aHex} strokeWidth="2" />
            <circle cx="60" cy="59" r="6" fill={`url(#${coreGradId})`} />
          </>
        )}

        {skin.model3dType === 'chrono_octa' && (
          <>
            {/* Glowing diamond chrono core */}
            <polygon points="60,36 77,58 60,80 43,58" fill={`url(#${coreGradId})`} stroke="#ffffff" strokeWidth="1.6" />
            <polygon points="60,36 77,58 60,58" fill="#ffffff" opacity="0.4" />
          </>
        )}

        {skin.model3dType === 'leviathan_apex' && (
          <>
            {/* Predator optic crest + energy gills */}
            <polygon points="44,50 60,42 76,50 60,64" fill="#041214" stroke={pHex} strokeWidth="2" />
            <polygon points="51,51 60,46 69,51 60,58" fill={`url(#${coreGradId})`} />
            <path d="M 42 72 L 54 68 M 78 72 L 66 68" stroke={aHex} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {skin.model3dType === 'crown_sovereign' && (
          <>
            {/* Forged 3D holographic crown spikes */}
            <polygon
              points="36,34 44,14 54,28 60,10 66,28 76,14 84,34"
              fill={`url(#${coreGradId})`}
              stroke="#ffffff"
              strokeWidth="1.8"
            />
            <path
              d="M 38 55 Q 60 48 82 55 L 78 65 Q 60 61 42 65 Z"
              fill="#140c02"
              stroke={pHex}
              strokeWidth="2"
            />
            <circle cx="60" cy="57" r="6" fill={`url(#${coreGradId})`} />
          </>
        )}

        {(skin.model3dType === 'void_orb' || skin.model3dType === 'chrono_octa') && (
          /* Tilted 3D equatorial accretion/gimbal ring (front half occlusion) */
          <path
            d="M 12 79 A 52 18 -22 0 0 108 41"
            fill="none"
            stroke={`url(#${rimGradId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  )
}
