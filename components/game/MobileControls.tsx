'use client'

import { useRef, useState, useCallback } from 'react'
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

function processJoystick(
  touch: { clientX: number; clientY: number },
  rect: DOMRect,
  maxRadius: number
): { nx: number; ny: number; px: number; py: number } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = touch.clientX - cx
  const dy = touch.clientY - cy
  const dist = Math.min(Math.hypot(dx, dy), maxRadius)
  const angle = Math.atan2(dy, dx)
  const nx = (dist * Math.cos(angle)) / maxRadius
  const ny = (dist * Math.sin(angle)) / maxRadius
  return { nx, ny, px: nx * maxRadius, py: ny * maxRadius }
}

export default function MobileControls({
  onMove,
  onAttack,
  onDash,
  onSpecial,
  dashCdPct,
  specCdPct,
}: MobileControlsProps) {
  // ─── Move Joystick State ──────────────────────────────────
  const moveRef = useRef<HTMLDivElement | null>(null)
  const moveIdRef = useRef<number | null>(null)
  const [moveKnob, setMoveKnob] = useState({ x: 0, y: 0 })

  // ─── Aim Joystick State ───────────────────────────────────
  const aimRef = useRef<HTMLDivElement | null>(null)
  const aimIdRef = useRef<number | null>(null)
  const [aimKnob, setAimKnob] = useState({ x: 0, y: 0 })
  const [isAiming, setIsAiming] = useState(false)

  // ═══════════════════════════════════════════════════════════
  // MOVE JOYSTICK — changedTouches bilan faqat shu elementning touch'ini oladi
  // ═══════════════════════════════════════════════════════════
  const onMoveStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (moveIdRef.current !== null) return // already tracking a touch
    const t = e.changedTouches[0]
    if (!t || !moveRef.current) return
    moveIdRef.current = t.identifier
    const { nx, ny, px, py } = processJoystick(t, moveRef.current.getBoundingClientRect(), 40)
    setMoveKnob({ x: px, y: py })
    onMove({ x: nx, y: ny })
  }, [onMove])

  const onMoveMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (moveIdRef.current === null || !moveRef.current) return
    const t = Array.from(e.touches).find(t => t.identifier === moveIdRef.current)
    if (!t) return
    const { nx, ny, px, py } = processJoystick(t, moveRef.current.getBoundingClientRect(), 40)
    setMoveKnob({ x: px, y: py })
    onMove({ x: nx, y: ny })
  }, [onMove])

  const onMoveEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Only reset if OUR tracked touch ended
    const ended = Array.from(e.changedTouches).find(t => t.identifier === moveIdRef.current)
    if (!ended) return
    moveIdRef.current = null
    setMoveKnob({ x: 0, y: 0 })
    onMove({ x: 0, y: 0 })
  }, [onMove])

  // ═══════════════════════════════════════════════════════════
  // AIM JOYSTICK
  // ═══════════════════════════════════════════════════════════
  const onAimStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (aimIdRef.current !== null) return
    const t = e.changedTouches[0]
    if (!t || !aimRef.current) return
    aimIdRef.current = t.identifier
    setIsAiming(true)
    haptic(15)
    const { nx, ny, px, py } = processJoystick(t, aimRef.current.getBoundingClientRect(), 40)
    setAimKnob({ x: px, y: py })
    onAttack({ x: nx * 200, y: ny * 200, isAttacking: true })
  }, [onAttack])

  const onAimMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (aimIdRef.current === null || !aimRef.current) return
    const t = Array.from(e.touches).find(t => t.identifier === aimIdRef.current)
    if (!t) return
    const { nx, ny, px, py } = processJoystick(t, aimRef.current.getBoundingClientRect(), 40)
    setAimKnob({ x: px, y: py })
    onAttack({ x: nx * 200, y: ny * 200, isAttacking: true })
  }, [onAttack])

  const onAimEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const ended = Array.from(e.changedTouches).find(t => t.identifier === aimIdRef.current)
    if (!ended) return
    aimIdRef.current = null
    setAimKnob({ x: 0, y: 0 })
    setIsAiming(false)
    onAttack({ x: 0, y: 0, isAttacking: false })
  }, [onAttack])

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none sm:hidden" style={{ touchAction: 'none' }}>

      {/* ═══ Left: Movement Joystick ═══ */}
      <div className="absolute left-4 bottom-6 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div className="text-center mb-1.5">
          <span className="text-[9px] font-mono font-bold text-cyan-400/70 uppercase tracking-widest">YURISH</span>
        </div>
        <div
          ref={moveRef}
          onTouchStart={onMoveStart}
          onTouchMove={onMoveMove}
          onTouchEnd={onMoveEnd}
          onTouchCancel={onMoveEnd}
          className="h-28 w-28 rounded-full border-2 border-cyan-500/40 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center relative"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute top-2 text-cyan-500/30 text-[8px] font-mono">▲</div>
            <div className="absolute bottom-2 text-cyan-500/30 text-[8px] font-mono">▼</div>
            <div className="absolute left-2.5 text-cyan-500/30 text-[8px] font-mono">◄</div>
            <div className="absolute right-2.5 text-cyan-500/30 text-[8px] font-mono">►</div>
          </div>
          <div
            className="h-12 w-12 rounded-full bg-cyan-400/70 shadow-[0_0_12px_rgba(0,240,255,0.7)] transition-transform duration-75"
            style={{ transform: `translate(${moveKnob.x}px, ${moveKnob.y}px)` }}
          />
        </div>
      </div>

      {/* ═══ Right: Aim Joystick + Action Buttons ═══ */}
      <div className="absolute right-4 bottom-6 pointer-events-auto flex flex-col items-center gap-2" style={{ touchAction: 'none' }}>

        {/* Action Buttons Row */}
        <div className="flex gap-2.5 mb-1">
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
            style={{ touchAction: 'manipulation' }}
          >
            <Zap className="h-5 w-5" />
            <span className="text-[7px] font-bold mt-0.5 leading-none">DASH</span>
          </button>

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
            style={{ touchAction: 'manipulation' }}
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
          ref={aimRef}
          onTouchStart={onAimStart}
          onTouchMove={onAimMove}
          onTouchEnd={onAimEnd}
          onTouchCancel={onAimEnd}
          className={`h-28 w-28 rounded-full border-2 backdrop-blur-sm flex items-center justify-center relative transition-all duration-150 ${
            isAiming
              ? 'border-rose-400 bg-rose-950/50 shadow-[0_0_25px_rgba(255,0,85,0.4)]'
              : 'border-rose-500/40 bg-slate-950/50 shadow-[0_0_20px_rgba(255,0,85,0.15)]'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Crosshair className={`h-8 w-8 transition-all duration-150 ${isAiming ? 'text-rose-400/60 scale-125' : 'text-rose-500/25'}`} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute top-2 text-rose-500/30 text-[8px] font-mono">▲</div>
            <div className="absolute bottom-2 text-rose-500/30 text-[8px] font-mono">▼</div>
            <div className="absolute left-2.5 text-rose-500/30 text-[8px] font-mono">◄</div>
            <div className="absolute right-2.5 text-rose-500/30 text-[8px] font-mono">►</div>
          </div>
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
