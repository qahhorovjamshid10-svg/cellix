'use client'

import React, { useEffect, useState } from 'react'

interface CellixLogoMarkProps {
  size?: number
  spinning?: boolean
  className?: string
}

/**
 * Animated hexagonal bio-core emblem for CELLIX with counter-rotating
 * orbital telemetry rings and pulsing bio-nucleus.
 */
export function CellixLogoMark({
  size = 64,
  spinning = true,
  className = '',
}: CellixLogoMarkProps) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id="cellixCoreGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#f6ff99" />
            <stop offset="45%" stopColor="#d4ff3a" />
            <stop offset="85%" stopColor="#3ae0c8" />
            <stop offset="100%" stopColor="#0a0c0b" />
          </radialGradient>
          <linearGradient id="cellixRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4ff3a" />
            <stop offset="50%" stopColor="#ede9e0" />
            <stop offset="100%" stopColor="#3ae0c8" />
          </linearGradient>
        </defs>

        {/* Outer rotating precision telemetry arc */}
        <g className={spinning ? 'cellix-loader-spin origin-center' : 'origin-center'}>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="url(#cellixRimGrad)"
            strokeWidth="2.2"
            strokeDasharray="52 22 16 22"
            strokeLinecap="square"
            opacity="0.95"
          />
          <polygon points="50,1 54,9 46,9" fill="#d4ff3a" />
          <polygon points="50,99 54,91 46,91" fill="#3ae0c8" />
        </g>

        {/* Secondary counter-rotating dashed arc */}
        <g className={spinning ? 'cellix-loader-spin-reverse origin-center' : 'origin-center'}>
          <circle
            cx="50"
            cy="50"
            r="39"
            fill="none"
            stroke="#3ae0c8"
            strokeWidth="1.2"
            strokeDasharray="10 14"
            opacity="0.55"
          />
        </g>

        {/* Chamfered bio-cell hexagonal hull */}
        <polygon
          points="50,14 81,32 81,68 50,86 19,68 19,32"
          fill="#111513"
          stroke="url(#cellixRimGrad)"
          strokeWidth="2.4"
        />

        {/* Inner structural lattice */}
        <polygon
          points="50,22 74,36 74,64 50,78 26,64 26,36"
          fill="none"
          stroke="#d4ff3a"
          strokeOpacity="0.3"
          strokeWidth="1.2"
        />

        {/* Volumetric pulsing 3D bio-nucleus sphere */}
        <g className={spinning ? 'cellix-loader-pulse origin-center' : 'origin-center'}>
          <circle cx="50" cy="50" r="19" fill="url(#cellixCoreGrad)" />
          <ellipse
            cx="43"
            cy="42"
            rx="6.5"
            ry="4"
            transform="rotate(-24 43 42)"
            fill="#ffffff"
            opacity="0.65"
          />
          <path
            d="M 56 42 A 10 10 0 1 0 56 58"
            fill="none"
            stroke="#0a0c0b"
            strokeWidth="3.6"
            strokeLinecap="square"
          />
        </g>
      </svg>
    </div>
  )
}

interface CellixLoaderProps {
  variant?: 'fullscreen' | 'section' | 'compact'
  label?: string
  sublabel?: string
  progress?: number
  className?: string
}

/**
 * Unified CELLIX Logo Loader with animated 1% -> 100% progress counter,
 * glowing hex emblem, and progress bar across all loading states.
 */
export default function CellixLoader({
  variant = 'section',
  label,
  sublabel,
  progress,
  className = '',
}: CellixLoaderProps) {
  const [autoPct, setAutoPct] = useState(1)

  useEffect(() => {
    if (typeof progress === 'number') return
    let val = 1
    const timer = window.setInterval(() => {
      val = val < 65 ? val + 7 : val < 90 ? val + 3 : val < 98 ? val + 1 : 98
      setAutoPct(val)
    }, 55)
    return () => window.clearInterval(timer)
  }, [progress])

  const pct = typeof progress === 'number'
    ? Math.min(100, Math.max(1, Math.round(progress)))
    : autoPct

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2 font-mono text-xs ${className}`}>
        <CellixLogoMark size={20} spinning />
        {label && <span>{label}</span>}
        {typeof progress === 'number' && (
          <span className="font-bold tabular-nums">{pct}%</span>
        )}
      </span>
    )
  }

  const isFullscreen = variant === 'fullscreen'

  return (
    <div
      className={
        isFullscreen
          ? `fixed inset-0 z-[120] flex flex-col items-center justify-center bg-ink px-6 text-bone v-dots ${className}`
          : `flex min-h-[260px] w-full flex-col items-center justify-center py-16 text-bone ${className}`
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <div className="v-chamfer relative flex items-center justify-center border border-acid/40 bg-ink-2 p-6 shadow-[0_0_40px_rgba(212,255,58,0.12)]">
          <CellixLogoMark size={isFullscreen ? 92 : 72} spinning />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-center gap-2">
            <span className="v-display text-4xl tracking-wider text-bone sm:text-5xl">
              CELLIX
            </span>
            <span className="font-mono text-xs font-bold text-acid">2.0</span>
          </div>

          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-acid">
            {label || 'YUKLANMOQDA // LOADING'}
          </p>

          {sublabel && (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
              {sublabel}
            </p>
          )}
        </div>

        {/* 1% -> 100% animated progress meter */}
        <div className="w-full space-y-2">
          <div className="flex items-end justify-between font-mono text-[10px] uppercase tracking-widest">
            <span className="text-mute">SYSTEM SYNC</span>
            <span className="v-display text-2xl leading-none text-acid tabular-nums">
              {String(pct).padStart(2, '0')}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden border border-line-strong bg-ink-2 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-tide via-acid to-acid transition-[width] duration-100 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
