'use client'

import { useState, useRef } from 'react'
import { Zap, Sparkles, Target } from 'lucide-react'

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void
  onAttack: (target: { x: number; y: number; isAttacking: boolean }) => void
  onDash: () => void
  onSpecial: () => void
  dashCdPct: number
  specCdPct: number
}

export default function MobileControls({
  onMove,
  onAttack,
  onDash,
  onSpecial,
  dashCdPct,
  specCdPct,
}: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement | null>(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })

  const handleJoystickTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = touch.clientX - centerX
    const dy = touch.clientY - centerY
    const dist = Math.hypot(dx, dy)
    const maxRadius = 45

    const clampedDist = Math.min(dist, maxRadius)
    const angle = Math.atan2(dy, dx)

    const moveX = (clampedDist * Math.cos(angle)) / maxRadius
    const moveY = (clampedDist * Math.sin(angle)) / maxRadius

    setKnobPos({ x: moveX * maxRadius, y: moveY * maxRadius })
    onMove({ x: moveX, y: moveY })
  }

  const handleJoystickEnd = () => {
    setKnobPos({ x: 0, y: 0 })
    onMove({ x: 0, y: 0 })
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex justify-between items-end p-6 select-none sm:hidden">
      {/* Left Touch Virtual Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoystickTouch}
        onTouchMove={handleJoystickTouch}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        className="pointer-events-auto h-32 w-32 rounded-full border-2 border-cyan-500/40 bg-slate-950/60 backdrop-blur-md flex items-center justify-center relative touch-none shadow-[0_0_20px_rgba(0,240,255,0.2)]"
      >
        <div
          className="h-14 w-14 rounded-full bg-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.8)] transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Right Touch Action Buttons */}
      <div className="pointer-events-auto flex flex-col gap-3 items-end">
        <div className="flex gap-3">
          {/* Dash Button */}
          <button
            type="button"
            aria-label={`Dash${dashCdPct < 1 ? `, cooldown ${Math.round(dashCdPct * 100)} percent` : ''}`}
            disabled={dashCdPct < 1}
            onClick={onDash}
            className={`h-14 w-14 rounded-full border flex items-center justify-center font-mono font-bold transition-all ${
              dashCdPct >= 1
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.6)]'
                : 'bg-slate-900/80 text-slate-600 border-slate-800'
            }`}
          >
            <Zap className="h-6 w-6" />
          </button>

          {/* Special Ability Button */}
          <button
            type="button"
            aria-label={`Special ability${specCdPct < 1 ? `, cooldown ${Math.round(specCdPct * 100)} percent` : ''}`}
            disabled={specCdPct < 1}
            onClick={onSpecial}
            className={`h-14 w-14 rounded-full border flex items-center justify-center font-mono font-bold transition-all ${
              specCdPct >= 1
                ? 'bg-purple-500 text-white border-purple-300 shadow-[0_0_15px_rgba(176,38,255,0.6)]'
                : 'bg-slate-900/80 text-slate-600 border-slate-800'
            }`}
          >
            <Sparkles className="h-6 w-6" />
          </button>
        </div>

        {/* Auto-Attack Touch Trigger Button */}
        <button
          type="button"
          aria-label="Auto aim and fire"
          onTouchStart={() => onAttack({ x: 0, y: -100, isAttacking: true })}
          onTouchEnd={() => onAttack({ x: 0, y: 0, isAttacking: false })}
          onTouchCancel={() => onAttack({ x: 0, y: 0, isAttacking: false })}
          className="h-16 w-16 rounded-full bg-rose-500 border-2 border-rose-300 text-white font-mono font-bold flex items-center justify-center shadow-[0_0_20px_rgba(255,0,85,0.6)]"
        >
          <Target className="h-7 w-7" />
        </button>
      </div>
    </div>
  )
}
