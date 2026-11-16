'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Zap, Sparkles, Crosshair } from 'lucide-react'

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void
  onAttack: (target: { x: number; y: number; isAttacking: boolean }) => void
  onDash: () => void
  onSpecial: (dir?: { x: number; y: number }) => void
  dashCdPct: number
  specCdPct: number
  forceShow?: boolean
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
  forceShow = false,
}: MobileControlsProps) {
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Universal touch-capable device detection (works on all phones, tablets, iPad Pro, Samsung Tab, etc.)
  useEffect(() => {
    const checkMobile = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      const isIPad = (navigator.platform === 'MacIntel' || navigator.platform === 'iPad') && navigator.maxTouchPoints > 1
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
      setIsMobileDevice(isMobileUA || isIPad || (hasTouchScreen && isCoarsePointer))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    <div
      className={`absolute inset-0 pointer-events-none z-30 select-none ${(forceShow || isMobileDevice) ? 'block' : 'hidden'}`}
      style={{ touchAction: 'none' }}
    >

      {/* ═══ Left: Movement Joystick ═══ */}
      <div className="absolute pointer-events-auto" style={{ touchAction: 'none', left: 'max(1rem, env(safe-area-inset-left))', bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="mb-1 text-center">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-acid/80">YURISH</span>
        </div>
        <div
          ref={moveRef}
          onTouchStart={onMoveStart}
          onTouchMove={onMoveMove}
          onTouchEnd={onMoveEnd}
          onTouchCancel={onMoveEnd}
          className="relative flex h-28 w-28 items-center justify-center rounded-full border border-acid/50 bg-ink/80"
          style={{ touchAction: 'none' }}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[8px] text-acid/40">
            <div className="absolute top-2">▲</div>
            <div className="absolute bottom-2">▼</div>
            <div className="absolute left-2.5">◄</div>
            <div className="absolute right-2.5">►</div>
          </div>
          <div
            className="h-12 w-12 rounded-full border border-acid bg-acid/80 transition-transform duration-75"
            style={{ transform: `translate(${moveKnob.x}px, ${moveKnob.y}px)` }}
          />
        </div>
      </div>

      {/* ═══ Right: Aim Joystick + Action Buttons ═══ */}
      <div className="absolute pointer-events-auto flex flex-col items-center gap-2" style={{ touchAction: 'none', right: 'max(1rem, env(safe-area-inset-right))', bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>

        {/* Action Buttons Row */}
        <div className="mb-1 flex items-center gap-3">
          {/* DASH BUTTON */}
          <button
            type="button"
            aria-label="Dash"
            disabled={dashCdPct < 1}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              haptic(40)
              onDash()
            }}
            className={`v-chamfer-sm flex h-14 w-14 flex-col items-center justify-center border font-mono transition-transform active:scale-90 ${
              dashCdPct >= 1
                ? 'border-acid bg-acid text-ink'
                : 'border-line bg-ink/80 text-dim'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <Zap className="h-5 w-5" />
            <span className="mt-0.5 text-[7px] font-bold leading-none">DASH</span>
          </button>

          {/* 4-WAY & DIRECTIONAL SPECIAL ABILITY BUTTON */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            <button
              type="button"
              aria-label="Special ability (4-Way Cross or Aim Direction)"
              disabled={specCdPct < 1}
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                haptic(45)
                if (isAiming && (aimKnob.x !== 0 || aimKnob.y !== 0)) {
                  onSpecial({ x: aimKnob.x, y: aimKnob.y })
                } else {
                  onSpecial()
                }
              }}
              className={`v-chamfer-sm relative flex h-full w-full flex-col items-center justify-center overflow-hidden border font-mono transition-transform active:scale-90 ${
                specCdPct >= 1
                  ? 'border-tide bg-tide text-ink'
                  : 'border-line bg-ink/80 text-dim'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="mt-0.5 text-[6.5px] font-bold leading-none">4-WAY</span>
            </button>

            {specCdPct >= 1 && (
              <>
                <button
                  type="button"
                  aria-label="Tepa"
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    haptic(35)
                    onSpecial({ x: 0, y: -1 })
                  }}
                  className="absolute -top-2.5 left-1/2 flex h-3.5 w-6 -translate-x-1/2 items-center justify-center border border-ink bg-tide text-[7px] font-bold text-ink active:scale-90"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Past"
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    haptic(35)
                    onSpecial({ x: 0, y: 1 })
                  }}
                  className="absolute -bottom-2.5 left-1/2 flex h-3.5 w-6 -translate-x-1/2 items-center justify-center border border-ink bg-tide text-[7px] font-bold text-ink active:scale-90"
                >
                  ▼
                </button>
                <button
                  type="button"
                  aria-label="Chap"
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    haptic(35)
                    onSpecial({ x: -1, y: 0 })
                  }}
                  className="absolute left-[-10px] top-1/2 flex h-6 w-3.5 -translate-y-1/2 items-center justify-center border border-ink bg-tide text-[7px] font-bold text-ink active:scale-90"
                >
                  ◄
                </button>
                <button
                  type="button"
                  aria-label="O'ng"
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    haptic(35)
                    onSpecial({ x: 1, y: 0 })
                  }}
                  className="absolute right-[-10px] top-1/2 flex h-6 w-3.5 -translate-y-1/2 items-center justify-center border border-ink bg-tide text-[7px] font-bold text-ink active:scale-90"
                >
                  ►
                </button>
              </>
            )}
          </div>
        </div>

        {/* Aim & Shoot Joystick */}
        <div className="mb-1 text-center">
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${isAiming ? 'text-ember' : 'text-ember/75'}`}>
            {isAiming ? 'OTILMOQDA' : 'NISHON & OTISH'}
          </span>
        </div>
        <div
          ref={aimRef}
          onTouchStart={onAimStart}
          onTouchMove={onAimMove}
          onTouchEnd={onAimEnd}
          onTouchCancel={onAimEnd}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full border transition-colors duration-150 ${
            isAiming
              ? 'border-ember bg-ember/20'
              : 'border-ember/50 bg-ink/80'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Crosshair className={`h-8 w-8 transition-transform duration-150 ${isAiming ? 'scale-125 text-ember/80' : 'text-ember/30'}`} />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[8px] text-ember/40">
            <div className="absolute top-2">▲</div>
            <div className="absolute bottom-2">▼</div>
            <div className="absolute left-2.5">◄</div>
            <div className="absolute right-2.5">►</div>
          </div>
          <div
            className={`h-12 w-12 rounded-full border border-ember transition-transform duration-75 ${
              isAiming ? 'bg-ember' : 'bg-ember/75'
            }`}
            style={{ transform: `translate(${aimKnob.x}px, ${aimKnob.y}px)` }}
          />
        </div>
      </div>

    </div>
  )
}
