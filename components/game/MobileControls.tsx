'use client'

import { useState, useRef, useCallback } from 'react'
import { Zap, Sparkles, Crosshair } from 'lucide-react'

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void
  onAttack: (target: { x: number; y: number; isAttacking: boolean }) => void
  onDash: () => void
  onSpecial: () => void
  dashCdPct: number
  specCdPct: number
}

function haptic(ms = 30) {
  try { navigator?.vibrate?.(ms) } catch { /* ignore */ }
}

export default function MobileControls({
  onMove,
  onAttack,
  onDash,
  onSpecial,
  dashCdPct,
  specCdPct,
}: MobileControlsProps) {
  // ─── Left Joystick (Movement) ─────────────────────────────
  const moveJoystickRef = useRef<HTMLDivElement | null>(null)
  const [moveKnob, setMoveKnob] = useState({ x: 0, y: 0 })
  const moveIdRef = useRef<number | null>(null)

  const handleMoveStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (touch) moveIdRef.current = touch.identifier
    handleMoveUpdate(e)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMoveUpdate = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!moveJoystickRef.current) return
    const touch = Array.from(e.touches).find(t => t.identifier === moveIdRef.current) || e.touches[0]
    if (!touch) return

    const rect = moveJoystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = touch.clientX - centerX
    const dy = touch.clientY - centerY
    const dist = Math.hypot(dx, dy)
    const maxRadius = 40
    const clampedDist = Math.min(dist, maxRadius)
    const angle = Math.atan2(dy, dx)
    const moveX = (clampedDist * Math.cos(angle)) / maxRadius
    const moveY = (clampedDist * Math.sin(angle)) / maxRadius

    setMoveKnob({ x: moveX * maxRadius, y: moveY * maxRadius })
    onMove({ x: moveX, y: moveY })
  }, [onMove])

  const handleMoveEnd = useCallback(() => {
    moveIdRef.current = null
    setMoveKnob({ x: 0, y: 0 })
    onMove({ x: 0, y: 0 })
  }, [onMove])

  // ─── Right Joystick (Aim & Shoot) ─────────────────────────
  const aimJoystickRef = useRef<HTMLDivElement | null>(null)
  const [aimKnob, setAimKnob] = useState({ x: 0, y: 0 })
  const [isAiming, setIsAiming] = useState(false)
  const aimIdRef = useRef<number | null>(null)

  const handleAimStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (touch) aimIdRef.current = touch.identifier
    setIsAiming(true)
    haptic(15)
    handleAimUpdate(e)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAimUpdate = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!aimJoystickRef.current) return
    const touch = Array.from(e.touches).find(t => t.identifier === aimIdRef.current) || e.touches[0]
    if (!touch) return

    const rect = aimJoystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = touch.clientX - centerX
    const dy = touch.clientY - centerY
    const dist = Math.hypot(dx, dy)
    const maxRadius = 40
    const clampedDist = Math.min(dist, maxRadius)
    const angle = Math.atan2(dy, dx)
    const aimX = (clampedDist * Math.cos(angle)) / maxRadius
    const aimY = (clampedDist * Math.sin(angle)) / maxRadius

    setAimKnob({ x: aimX * maxRadius, y: aimY * maxRadius })
    // Send aim direction scaled up for the game engine
    onAttack({ x: aimX * 200, y: aimY * 200, isAttacking: true })
  }, [onAttack])

  const handleAimEnd = useCallback(() => {
    aimIdRef.current = null
    setAimKnob({ x: 0, y: 0 })
    setIsAiming(false)
    onAttack({ x: 0, y: 0, isAttacking: false })
  }, [onAttack])

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none sm:hidden" style={{ touchAction: 'none' }}>

      {/* ═══ Left: Movement Joystick ═══ */}
      <div className="absolute left-4 bottom-6 pointer-events-auto">
        {/* Label */}
        <div className="text-center mb-1.5">
          <span className="text-[9px] font-mono font-bold text-cyan-400/70 uppercase tracking-widest">YURISH</span>
        </div>
        <div
          ref={moveJoystickRef}
          onTouchStart={handleMoveStart}
          onTouchMove={handleMoveUpdate}
          onTouchEnd={handleMoveEnd}
          onTouchCancel={handleMoveEnd}
          className="h-28 w-28 rounded-full border-2 border-cyan-500/40 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center relative touch-none shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        >
          {/* Direction indicators */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-2 text-cyan-500/30 text-[8px] font-mono">▲</div>
            <div className="absolute bottom-2 text-cyan-500/30 text-[8px] font-mono">▼</div>
            <div className="absolute left-2 text-cyan-500/30 text-[8px] font-mono">◄</div>
            <div className="absolute right-2 text-cyan-500/30 text-[8px] font-mono">►</div>
          </div>
          <div
            className="h-12 w-12 rounded-full bg-cyan-400/70 shadow-[0_0_12px_rgba(0,240,255,0.7)] transition-transform duration-75"
            style={{ transform: `translate(${moveKnob.x}px, ${moveKnob.y}px)` }}
          />
        </div>
      </div>

      {/* ═══ Right Side: Aim Joystick + Action Buttons ═══ */}
      <div className="absolute right-4 bottom-6 pointer-events-auto flex flex-col items-center gap-2.5">

        {/* Action Buttons Row */}
        <div className="flex gap-2.5 mb-1">
          {/* Dash Button */}
          <button
            type="button"
            aria-label="Dash"
            disabled={dashCdPct < 1}
            onTouchStart={(e) => {
              e.stopPropagation()
              haptic(40)
              onDash()
            }}
            className={`h-14 w-14 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all active:scale-90 ${
              dashCdPct >= 1
                ? 'bg-cyan-500/90 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                : 'bg-slate-900/80 text-slate-600 border-slate-700'
            }`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-[7px] font-bold mt-0.5 leading-none">DASH</span>
          </button>

          {/* Special Ability Button */}
          <button
            type="button"
            aria-label="Special ability"
            disabled={specCdPct < 1}
            onTouchStart={(e) => {
              e.stopPropagation()
              haptic(40)
              onSpecial()
            }}
            className={`h-14 w-14 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all active:scale-90 ${
              specCdPct >= 1
                ? 'bg-purple-500/90 text-white border-purple-300 shadow-[0_0_15px_rgba(176,38,255,0.5)]'
                : 'bg-slate-900/80 text-slate-600 border-slate-700'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[7px] font-bold mt-0.5 leading-none">MAXSUS</span>
          </button>
        </div>

        {/* Aim & Shoot Joystick */}
        <div className="text-center mb-1">
          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${isAiming ? 'text-rose-400' : 'text-rose-400/70'}`}>
            {isAiming ? '🔥 OTILMOQDA' : 'NISHON & OTISH'}
          </span>
        </div>
        <div
          ref={aimJoystickRef}
          onTouchStart={handleAimStart}
          onTouchMove={handleAimUpdate}
          onTouchEnd={handleAimEnd}
          onTouchCancel={handleAimEnd}
          className={`h-28 w-28 rounded-full border-2 backdrop-blur-sm flex items-center justify-center relative touch-none transition-all duration-150 ${
            isAiming
              ? 'border-rose-400 bg-rose-950/50 shadow-[0_0_25px_rgba(255,0,85,0.4)]'
              : 'border-rose-500/40 bg-slate-950/50 shadow-[0_0_20px_rgba(255,0,85,0.15)]'
          }`}
        >
          {/* Crosshair overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Crosshair className={`h-8 w-8 transition-all duration-150 ${isAiming ? 'text-rose-400/60 scale-125' : 'text-rose-500/25'}`} />
          </div>
          {/* Aim direction indicators */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute top-2 text-rose-500/30 text-[8px] font-mono">▲</div>
            <div className="absolute bottom-2 text-rose-500/30 text-[8px] font-mono">▼</div>
            <div className="absolute left-2 text-rose-500/30 text-[8px] font-mono">◄</div>
            <div className="absolute right-2 text-rose-500/30 text-[8px] font-mono">►</div>
          </div>
          {/* Aim knob */}
          <div
            className={`h-12 w-12 rounded-full transition-transform duration-75 ${
              isAiming
                ? 'bg-rose-500 shadow-[0_0_18px_rgba(255,0,85,0.8)]'
                : 'bg-rose-500/70 shadow-[0_0_12px_rgba(255,0,85,0.5)]'
            }`}
            style={{ transform: `translate(${aimKnob.x}px, ${aimKnob.y}px)` }}
          />
        </div>
      </div>

    </div>
  )
}
