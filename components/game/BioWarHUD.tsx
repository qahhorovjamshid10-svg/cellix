'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Crown,
  Zap,
  Swords,
  Crosshair,
  Trophy,
  RotateCcw,
  ArrowLeft,
  Skull,
  Radio,
  Clock,
  HelpCircle,
  X,
  Sparkles,
  MousePointer,
  Coins,
  ChevronDown,
  ChevronUp,
  Flame,
  Pause,
  Home,
} from 'lucide-react'
import type { BioWarHUDData } from '@/lib/game/engine/BioWarScene'

interface BioWarHUDProps {
  hud: BioWarHUDData
  onRespawn: () => void
  onExit: () => void
  onReturnToHub?: () => void
  onOpenPause?: () => void
  fps?: number | null
  showFps?: boolean
  onSteerAngle?: (angle: number | null) => void
  onBoostChange?: (boosting: boolean) => void
  onShootChange?: (shooting: boolean) => void
  isUz?: boolean
}

function haptic(ms = 25) {
  try {
    navigator?.vibrate?.(ms)
  } catch {
    /* ignore */
  }
}

function processJoystick(
  touch: { clientX: number; clientY: number },
  rect: DOMRect,
  maxRadius: number
): { nx: number; ny: number; px: number; py: number; angle: number } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = touch.clientX - cx
  const dy = touch.clientY - cy
  const dist = Math.min(Math.hypot(dx, dy), maxRadius)
  const angle = Math.atan2(dy, dx)
  const nx = (dist * Math.cos(angle)) / maxRadius
  const ny = (dist * Math.sin(angle)) / maxRadius
  return { nx, ny, px: nx * maxRadius, py: ny * maxRadius, angle }
}

export default function BioWarHUD({
  hud,
  onRespawn,
  onExit,
  onReturnToHub,
  onOpenPause,
  fps,
  showFps = false,
  onSteerAngle,
  onBoostChange,
  onShootChange,
  isUz = true,
}: BioWarHUDProps) {
  const [showGuide, setShowGuide] = useState(true)
  const [guideTimer, setGuideTimer] = useState(5)
  const [mobileLeaderboardOpen, setMobileLeaderboardOpen] = useState(false)
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

  // ─── Mobile Virtual Joystick State ─────────────────────────
  const joystickRef = useRef<HTMLDivElement | null>(null)
  const joystickTouchIdRef = useRef<number | null>(null)
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 })
  const [isSteering, setIsSteering] = useState(false)

  // ─── Mobile Button Pressed States ─────────────────────────
  const [isBoostingTouch, setIsBoostingTouch] = useState(false)
  const [isShootingTouch, setIsShootingTouch] = useState(false)

  // ─── Kill Streak Banner State ─────────────────────────────
  const [activeKillBanner, setActiveKillBanner] = useState<{
    id: string
    victim: string
    mass: number
    combo: number
  } | null>(null)
  const lastKillIdRef = useRef<string | null>(null)

  // Trigger Kill Banner when player gets a kill
  useEffect(() => {
    if (hud.recentKillEvent && hud.recentKillEvent.id !== lastKillIdRef.current) {
      lastKillIdRef.current = hud.recentKillEvent.id
      setActiveKillBanner({
        id: hud.recentKillEvent.id,
        victim: hud.recentKillEvent.victimName,
        mass: hud.recentKillEvent.massGained,
        combo: hud.recentKillEvent.comboCount,
      })
      const timer = setTimeout(() => {
        setActiveKillBanner(null)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [hud.recentKillEvent])

  // Listen for SPACE key when dead to trigger instant respawn
  useEffect(() => {
    if (!hud.isDead) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        onRespawn()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hud.isDead, onRespawn])

  // Listen for [H] key to toggle instructions HUD cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        e.preventDefault()
        setShowGuide((prev) => {
          const next = !prev
          if (next) setGuideTimer(5)
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-fade instructions HUD countdown cleanly without nested setState in updater
  useEffect(() => {
    if (!showGuide) return
    const interval = setInterval(() => {
      setGuideTimer((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [showGuide])

  useEffect(() => {
    if (showGuide && guideTimer === 0) {
      const id = requestAnimationFrame(() => setShowGuide(false))
      return () => cancelAnimationFrame(id)
    }
  }, [showGuide, guideTimer])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ─── Virtual Joystick Touch Handlers ───────────────────────
  const onJoystickStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (joystickTouchIdRef.current !== null) return
      const t = e.changedTouches[0]
      if (!t || !joystickRef.current) return
      joystickTouchIdRef.current = t.identifier
      setIsSteering(true)
      haptic(15)
      const { px, py, angle } = processJoystick(t, joystickRef.current.getBoundingClientRect(), 40)
      setJoystickKnob({ x: px, y: py })
      onSteerAngle?.(angle)
    },
    [onSteerAngle]
  )

  const onJoystickMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (joystickTouchIdRef.current === null || !joystickRef.current) return
      const t = Array.from(e.touches).find((touch) => touch.identifier === joystickTouchIdRef.current)
      if (!t) return
      const { px, py, angle } = processJoystick(t, joystickRef.current.getBoundingClientRect(), 40)
      setJoystickKnob({ x: px, y: py })
      onSteerAngle?.(angle)
    },
    [onSteerAngle]
  )

  const onJoystickEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const ended = Array.from(e.changedTouches).find(
        (touch) => touch.identifier === joystickTouchIdRef.current
      )
      if (!ended) return
      joystickTouchIdRef.current = null
      setJoystickKnob({ x: 0, y: 0 })
      setIsSteering(false)
      onSteerAngle?.(null)
    },
    [onSteerAngle]
  )

  const humanCount = hud.humanPlayers ?? 1
  const botCount = hud.botPlayers ?? Math.max(0, hud.totalPlayers - humanCount)

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden font-mono" style={{ touchAction: 'none' }}>
      {/* ─── Top-Center: 3-Minute Round Countdown & Winner ─── */}
      <div className="pointer-events-auto absolute left-1/2 z-20 flex -translate-x-1/2 select-none flex-col items-center" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="v-chamfer-sm flex items-center gap-2 border border-tide/45 bg-ink/85 px-3 py-1.5 sm:gap-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-gold sm:text-xs">
            <Trophy className="h-3.5 w-3.5" />
            <span>{isUz ? `RAUND ${hud.roundNumber}` : `ROUND ${hud.roundNumber}`}</span>
          </div>
          <div className="h-3.5 w-px bg-line" />
          <div
            className={`flex items-center gap-1.5 font-mono text-[11px] font-bold sm:text-xs tabular-nums ${
              hud.roundTimeRemaining <= 60 ? 'text-ember' : 'text-tide'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(hud.roundTimeRemaining)}</span>
          </div>
        </div>

        {hud.lastWinnerName && (
          <div className="mt-1 border border-gold/50 bg-ink/85 px-2.5 py-0.5 text-[9px] font-bold text-gold sm:text-[10px]">
            👑 {isUz ? `Oldingi g‘olib: ${hud.lastWinnerName}` : `Prev: ${hud.lastWinnerName}`}
          </div>
        )}
      </div>

      {/* ─── Kill Streak Banner ─── */}
      {activeKillBanner && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 flex -translate-x-1/2 flex-col items-center">
          <div className="v-panel v-accent-ember flex items-center gap-2.5 !bg-ink/90 px-4 py-2">
            <Flame className="h-5 w-5 text-gold" />
            <div className="flex flex-col text-center">
              <span className="v-display text-lg tracking-wider text-bone sm:text-xl">
                {isUz ? `+1 QATL! [${activeKillBanner.victim}]` : `+1 KILL! [${activeKillBanner.victim}]`}
              </span>
              <span className="text-[10px] font-bold text-gold">
                +{activeKillBanner.mass} MASSA YUTILDI {activeKillBanner.combo > 1 ? `// ${activeKillBanner.combo}X COMBO` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top-Left: Live Kill-Feed & ESC Menu Trigger ─── */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[190px] flex-col gap-1.5 sm:max-w-xs">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {onOpenPause && (
            <button
              type="button"
              onClick={onOpenPause}
              aria-label="Pause or Open Menu"
              className="v-chamfer-sm flex cursor-pointer items-center gap-1.5 border border-line-strong bg-ink/90 px-2.5 py-1 text-[10px] font-bold text-bone transition-colors hover:border-tide hover:text-tide"
            >
              <Pause className="h-3 w-3 text-tide" />
              <span>[ESC] MENYU</span>
            </button>
          )}
          {showFps && typeof fps === 'number' && (
            <span className="border border-acid/40 bg-ink/90 px-2 py-1 text-[10px] font-bold text-acid tabular-nums">
              {fps} FPS
            </span>
          )}
        </div>

        <div className="mb-0.5 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-ember" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-ember sm:text-[10px]">
            {isUz ? 'JANG' : 'KILLS'}
          </span>
        </div>

        {hud.killFeed.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-1 truncate border border-line bg-ink/80 px-2 py-0.5 text-[10px] text-bone sm:text-[11px]"
          >
            <span className="max-w-[65px] truncate font-bold text-gold sm:max-w-[90px]">{event.killer}</span>
            <span className="text-[9px] text-dim">{event.method === 'shot' ? '💥' : '⚡'}</span>
            <span className="max-w-[65px] truncate font-bold text-ember sm:max-w-[90px]">{event.victim}</span>
          </div>
        ))}
      </div>

      {/* ─── Top-Right: Mobile Collapsible Toggle Pill ─── */}
      <div className={`pointer-events-auto absolute right-3 top-3 z-30 ${isMobileDevice ? 'block' : 'hidden'}`}>
        <button
          type="button"
          onClick={() => setMobileLeaderboardOpen((prev) => !prev)}
          className="v-chamfer-sm flex items-center gap-1.5 border border-gold/45 bg-ink/85 px-3 py-1 text-xs font-bold text-gold active:scale-95"
        >
          <Crown className="h-3.5 w-3.5 text-gold" />
          <span>TOP 10</span>
          <span className="bg-tide/20 px-1 text-[10px] text-tide">#{hud.myRank}</span>
          {mobileLeaderboardOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* ─── Desktop Top-Right / Mobile Dropdown: Apex Live Leaderboard ─── */}
      <div
        className={`v-panel v-accent-tide absolute right-3 top-12 z-20 w-60 !bg-ink/85 p-3 transition-all duration-300 sm:right-4 sm:top-4 sm:w-68 sm:p-3.5 ${
          isMobileDevice
            ? mobileLeaderboardOpen
              ? 'pointer-events-auto block'
              : 'pointer-events-none hidden'
            : 'pointer-events-auto block'
        }`}
      >
        <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold sm:text-xs">
              {isUz ? 'APEX REYTING' : 'LEADERBOARD'}
            </span>
          </div>
          <span
            className={`text-[9px] font-bold ${hud.isOnlineMultiplayer ? 'text-acid' : 'text-mute'}`}
            title={hud.isOnlineMultiplayer ? 'Connected to 20 TPS server' : 'Local Arena Simulation'}
          >
            {hud.isOnlineMultiplayer ? '●' : '○'} {humanCount} {isUz ? 'Odam' : 'Humans'} · {botCount} Bot
          </span>
        </div>

        <div className="max-h-[35vh] space-y-1 overflow-y-auto sm:max-h-none">
          {hud.leaderboard.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between border px-2 py-1 text-[11px] sm:text-xs ${
                entry.isPlayer
                  ? 'border-tide bg-tide/15 font-bold text-tide'
                  : idx === 0
                    ? 'border-gold/50 bg-gold/10 font-bold text-gold'
                    : 'border-transparent text-bone hover:border-line'
              }`}
            >
              <div className="flex max-w-[148px] items-center gap-1.5 truncate">
                <span className="w-4 font-mono text-[10px] text-mute">
                  {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </span>
                <span className="truncate">{entry.name}</span>
                {entry.isPlayer ? (
                  <span className="bg-tide px-1 text-[8px] font-black text-ink">
                    {isUz ? 'SIZ' : 'YOU'}
                  </span>
                ) : (
                  <span className="border border-line px-1 text-[8px] font-bold text-dim">BOT</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-tight text-tide sm:text-[11px] tabular-nums">
                  {entry.mass.toLocaleString()}
                </span>
                {entry.kills > 0 && (
                  <span className="border border-ember/40 bg-ember/15 px-1 text-[9px] font-bold text-ember">
                    ⚔️{entry.kills}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Radar (Bottom-left above joystick) ─── */}
      <div className="pointer-events-none absolute z-20" style={{ bottom: 'max(7rem, calc(env(safe-area-inset-bottom) + 7rem))', left: 'max(0.75rem, env(safe-area-inset-left))' }}>
        <div className="v-chamfer-sm relative h-20 w-20 overflow-hidden border border-tide/50 bg-ink/85 sm:h-36 sm:w-36">
          <div className="absolute left-1.5 top-1 flex items-center gap-1 text-[8px] font-bold tracking-wider text-tide sm:text-[9px]">
            <Radio className="h-2.5 w-2.5" />
            <span>RADAR</span>
          </div>

          {hud.radar.map((blip, i) => (
            <div
              key={i}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                blip.isPlayer
                  ? 'z-20 h-2.5 w-2.5 border border-bone bg-tide sm:h-3 sm:w-3'
                  : blip.isKing
                    ? 'z-10 h-2 w-2 border border-bone bg-gold sm:h-2.5 sm:w-2.5'
                    : 'h-1 w-1 bg-ember opacity-85 sm:h-1.5 sm:w-1.5'
              }`}
              style={{
                left: `${blip.x * 100}%`,
                top: `${blip.y * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── Bottom-Center: Mass & Nitro Speedometer Bar ─── */}
      <div className="pointer-events-auto absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 sm:gap-2" style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="v-panel v-accent-tide flex items-center gap-2 !bg-ink/85 px-3 py-1.5 sm:gap-6 sm:px-6 sm:py-2.5">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-mute sm:text-[10px]">
              {isUz ? 'MASSA' : 'MASS'}
            </span>
            <span className="v-display text-lg text-tide sm:text-2xl tabular-nums">
              {hud.myMass.toLocaleString()}
            </span>
          </div>

          <div className="h-6 w-px bg-line sm:h-8" />

          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-mute sm:text-[10px]">
              {isUz ? 'O‘RIN' : 'RANK'}
            </span>
            <span className="v-display text-lg text-gold sm:text-2xl tabular-nums">
              #{hud.myRank} <span className="font-mono text-[9px] text-dim sm:text-xs">/ {hud.totalPlayers}</span>
            </span>
          </div>

          <div className="h-6 w-px bg-line sm:h-8" />

          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-mute sm:text-[10px]">
              KILLS
            </span>
            <span className="v-display text-lg text-ember sm:text-2xl tabular-nums">
              {hud.myKills}
            </span>
          </div>

          <div className="h-6 w-px bg-line sm:h-8" />

          <div className="flex w-20 flex-col gap-1 sm:w-32">
            <div className="flex items-center justify-between text-[8px] font-bold text-mute sm:text-[10px]">
              <span className="flex items-center gap-1 text-tide">
                <Zap className="h-3 w-3" /> NITRO
              </span>
              <span>{Math.round(hud.boostPct * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden border border-tide/30 bg-ink">
              <div
                className="h-full bg-tide transition-all duration-100"
                style={{ width: `${hud.boostPct * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Controls Pill (Desktop) & [H] Guide Toggle */}
        <div className={`items-center gap-2 ${isMobileDevice ? 'hidden' : 'hidden sm:flex'}`}>
          <div className="flex items-center gap-2 border border-line bg-ink/85 px-3 py-1 font-mono text-[10px] text-mute">
            <span><strong className="text-tide">[LMB]</strong> {isUz ? 'OTISH' : 'SHOOT'}</span>
            <span>•</span>
            <span><strong className="text-ember">[ENTER]</strong> AUTO-AIM</span>
            <span>•</span>
            <span><strong className="text-acid">[↑↓←→]</strong> {isUz ? 'YO‘NALISH' : 'AIM'}</span>
            <span>•</span>
            <span><strong className="text-tide">[SPACE/RMB]</strong> {isUz ? 'TEZLANISH' : 'BOOST'}</span>
            <span>•</span>
            <span><strong className="text-tide">[WASD]</strong> {isUz ? 'BURILISH' : 'STEER'}</span>
            <span>•</span>
            <span><strong className="text-gold">[ESC]</strong> {isUz ? 'MENYU' : 'MENU'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="pointer-events-auto flex cursor-pointer items-center gap-1.5 border border-tide/45 bg-ink/85 px-3 py-1 text-[10px] font-bold text-tide transition-colors hover:border-tide hover:text-bone"
          >
            <HelpCircle className="h-3 w-3 text-tide" />
            <span>[H] {isUz ? 'QO‘LLANMA' : 'GUIDE'}</span>
          </button>
        </div>
      </div>

      {/* ═══ MOBILE TOUCH CONTROLS ═══ */}
      <div className={`${isMobileDevice ? 'block' : 'hidden'} pointer-events-auto`}>
        <div className="absolute pointer-events-auto" style={{ touchAction: 'none', left: 'max(0.75rem, env(safe-area-inset-left))', bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="mb-1 text-center">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-tide/80">
              {isSteering ? 'BURILISH' : 'BOSHQARUV'}
            </span>
          </div>
          <div
            ref={joystickRef}
            onTouchStart={onJoystickStart}
            onTouchMove={onJoystickMove}
            onTouchEnd={onJoystickEnd}
            onTouchCancel={onJoystickEnd}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border transition-colors ${
              isSteering ? 'border-tide bg-tide/15' : 'border-tide/45 bg-ink/80'
            }`}
            style={{ touchAction: 'none' }}
          >
            <div className="absolute top-1 text-[7px] text-tide/40">▲</div>
            <div className="absolute bottom-1 text-[7px] text-tide/40">▼</div>
            <div className="absolute left-1.5 text-[7px] text-tide/40">◄</div>
            <div className="absolute right-1.5 text-[7px] text-tide/40">►</div>

            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-tide transition-transform duration-75 ${
                isSteering ? 'scale-105 bg-tide' : 'bg-tide/70'
              }`}
              style={{ transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)` }}
            >
              <div className="h-4 w-4 rounded-full bg-ink/60" />
            </div>
          </div>
        </div>

        <div className="absolute pointer-events-auto flex items-end gap-2 sm:gap-3" style={{ touchAction: 'none', right: 'max(0.75rem, env(safe-area-inset-right))', bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex flex-col items-center">
            <span className="mb-1 border border-ember/40 bg-ink/85 px-1.5 text-[7px] font-bold uppercase tracking-wider text-ember">
              AUTO-AIM
            </span>
            <button
              type="button"
              aria-label="Laser Fire (Auto-Aim)"
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsShootingTouch(true)
                haptic(20)
                onShootChange?.(true)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsShootingTouch(false)
                onShootChange?.(false)
              }}
              onTouchCancel={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsShootingTouch(false)
                onShootChange?.(false)
              }}
              className={`v-chamfer-sm flex h-16 w-16 flex-col items-center justify-center border font-mono transition-transform active:scale-90 ${
                isShootingTouch
                  ? 'scale-95 border-ember bg-ember text-ink'
                  : 'border-ember/60 bg-ink/85 text-ember'
              }`}
              style={{ touchAction: 'none' }}
            >
              <Crosshair className={`h-6 w-6 ${isShootingTouch ? 'animate-spin' : ''}`} />
              <span className="mt-0.5 text-[8px] font-black leading-none tracking-tighter">LAZER</span>
            </button>
          </div>

          <div className="flex flex-col items-center">
            <span className="mb-1 text-[7px] font-bold uppercase tracking-wider text-tide">
              TEZLIK
            </span>
            <button
              type="button"
              aria-label="Nitro Boost"
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsBoostingTouch(true)
                haptic(25)
                onBoostChange?.(true)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsBoostingTouch(false)
                onBoostChange?.(false)
              }}
              onTouchCancel={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsBoostingTouch(false)
                onBoostChange?.(false)
              }}
              className={`v-chamfer flex h-20 w-20 flex-col items-center justify-center border font-mono transition-transform active:scale-95 ${
                isBoostingTouch
                  ? 'scale-95 border-bone bg-tide text-ink'
                  : 'border-tide bg-tide/90 text-ink'
              }`}
              style={{ touchAction: 'none' }}
            >
              <Zap className="h-8 w-8 fill-ink" />
              <span className="text-[9px] font-black leading-none tracking-wider">NITRO</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 10-Second Auto-Fading Arena Guide & Controls Modal [H] ─── */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center bg-ink/85 p-4 transition-opacity duration-500 ${
          showGuide ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className={`v-panel v-accent-tide relative w-full max-w-xl space-y-5 p-6 text-left transition-transform duration-500 sm:p-7 ${
            showGuide ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
          }`}
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2.5">
              <div className="v-chamfer-sm flex h-9 w-9 items-center justify-center border border-tide/50 bg-ink text-tide">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <h3 className="v-display flex items-center gap-2 text-2xl text-bone">
                  <span>BIO-WAR 30</span>
                  <span className="v-tag v-accent-tide">ARENA</span>
                </h3>
                <p className="font-sans text-[11px] text-mute">
                  {isUz ? '30 nafar yirtqich orasida Apex King bo‘ling!' : 'Become the Apex Predator among 30 rivals!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {guideTimer > 0 && (
                <span className="v-tag v-accent-gold">{guideTimer}s</span>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-line bg-ink text-mute transition-colors hover:border-tide hover:text-bone"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-2.5 border border-line bg-ink p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-tide">
                <MousePointer className="h-3.5 w-3.5" />
                {isUz ? 'BOSHQARUV TUGMALARI' : 'CONTROLS'}
              </span>
              <ul className="space-y-1.5 text-xs text-bone">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-tide">[KURSOR/WASD]:</span>
                  <span className="text-mute">{isUz ? 'Harakatlanish va burilish' : 'Steer & Direction'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-tide">[LMB / ↑↓←→]:</span>
                  <span className="text-mute">{isUz ? 'Lazer otish (yoki strelkalar bilan)' : 'Laser fire (or Arrow keys)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-ember">[ENTER]:</span>
                  <span className="text-mute">{isUz ? 'Avto-nishonga lazer otish (Auto-Aim)' : 'Auto-Aim Laser Fire'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-tide">[SPACE/RMB]:</span>
                  <span className="text-mute">{isUz ? 'Nitro Tezlanish (massa sarflanadi)' : 'Nitro Boost (burns mass)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-gold">[H]:</span>
                  <span className="text-mute">{isUz ? 'Ushbu qo‘llanmani ochish / yopish' : 'Toggle this guide'}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 border border-line bg-ink p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                {isUz ? 'JANG TAKTIKASI VA QOIDALAR' : 'TACTICS & RULES'}
              </span>
              <ul className="space-y-1.5 text-xs text-bone">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-tide">1.</span>
                  <span className="text-mute">
                    {isUz ? 'Kichik boshlaysiz. Biomassalarni yeb sekin va barqaror o‘sing.' : 'Start small. Eat scattered biomass to grow gradually.'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-tide">2.</span>
                  <span className="text-mute">
                    {isUz ? 'Dushman boshi sizning dumingizga tegsa — portlaydi va butun massasi tushadi!' : 'If an enemy head hits your tail, they crash and explode!'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-tide">3.</span>
                  <span className="text-mute">
                    {isUz ? 'Lazer o‘qi dushmanga tekkanda 10% massasi tortib olinadi (XP Siphon)!' : 'Laser hits siphon 10% enemy mass directly to you!'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-tide">4.</span>
                  <span className="text-mute">
                    {isUz ? 'Har 3 minutda yangi raund yangilanadi. Eng yuqori massali o‘yinchi g‘olib!' : 'Rounds reset every 3 mins. Apex worm wins!'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="h-1.5 w-full overflow-hidden border border-line bg-ink">
              <div
                className="h-full bg-tide transition-all duration-1000 ease-linear"
                style={{ width: `${(guideTimer / 5) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-mute">
              <span>{isUz ? `${guideTimer}s ichida avtomatik yopiladi (yoki istalgan vaqt [H] bosing)` : `Auto-closing in ${guideTimer}s (press [H] anytime)`}</span>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="v-btn !bg-tide !text-ink !py-1.5 !px-4 !text-xs"
              >
                {isUz ? 'TUSHUNDIM [H]' : 'GOT IT [H]'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Instant Respawn Death Modal ─── */}
      {hud.isDead && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4">
          <div className="v-panel v-accent-ember v-enter relative w-full max-w-md space-y-5 p-6 text-center sm:p-8">
            <div className="v-chamfer-sm mx-auto flex h-14 w-14 items-center justify-center border border-ember/50 bg-ink text-ember">
              <Skull className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="v-display text-4xl text-ember sm:text-5xl">
                {isUz ? 'SIZ YO‘Q QILINDINGIZ!' : 'DEFEATED'}
              </h3>
              <p className="font-mono text-xs text-mute">
                {hud.killerName
                  ? (isUz ? `Sizni ${hud.killerName} dumi yoki o‘qi bilan yo‘q qildi!` : `Eliminated by ${hud.killerName}!`)
                  : (isUz ? 'Raqib dumi bilan to‘qnashuvda portladingiz!' : 'Collided with rival bio-tail!')}
              </p>
            </div>

            <div className="grid grid-cols-2 border border-line bg-ink font-mono sm:grid-cols-4">
              <div className="border-b border-r border-line p-2.5 sm:border-b-0">
                <div className="v-label">{isUz ? 'Massa' : 'Mass'}</div>
                <div className="v-display mt-1 text-xl text-tide">{(hud.peakMass || hud.myMass).toLocaleString()}</div>
              </div>
              <div className="border-b border-line p-2.5 sm:border-b-0 sm:border-r">
                <div className="v-label">{isUz ? 'O‘rin' : 'Rank'}</div>
                <div className="v-display mt-1 text-xl text-gold">#{hud.myRank}</div>
              </div>
              <div className="border-r border-line p-2.5">
                <div className="v-label">Kills</div>
                <div className="v-display mt-1 text-xl text-ember">{hud.myKills}</div>
              </div>
              <div className="bg-acid/10 p-2.5">
                <div className="v-label !text-acid flex items-center justify-center gap-0.5">
                  <Coins className="h-2.5 w-2.5" />
                  <span>Coins</span>
                </div>
                <div className="v-display mt-1 text-xl text-acid">+{hud.coinsEarned ?? 0}</div>
              </div>
            </div>

            <div className="v-tag v-accent-acid">
              <span>{isUz ? 'Natijangiz va tangalaringiz profilingizga saqlandi!' : 'Score & coins saved to your profile!'}</span>
            </div>

            <div className="space-y-1.5 border border-line bg-ink p-3 text-left font-mono">
              <div className="flex items-center justify-between border-b border-line pb-1 text-[10px] font-bold uppercase text-gold">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-gold" />
                  {isUz ? 'TOP ILONLAR JANG REYTINGI' : 'TOP WORMS STANDINGS'}
                </span>
                <span className="text-dim">{isUz ? 'MASSA / KILLS' : 'MASS / KILLS'}</span>
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {hud.leaderboard.slice(0, 6).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between border px-2 py-1 text-xs ${
                      entry.isPlayer
                        ? 'border-tide bg-tide/15 font-bold text-tide'
                        : idx === 0
                          ? 'border-gold/40 bg-gold/10 text-gold'
                          : 'border-transparent text-bone'
                    }`}
                  >
                    <div className="flex max-w-[180px] items-center gap-1.5 truncate">
                      <span className="w-4 text-[10px] font-bold text-gold">
                        {idx === 0 ? '👑' : `#${idx + 1}`}
                      </span>
                      <span className="truncate">{entry.name}</span>
                      {entry.isPlayer ? (
                        <span className="bg-tide px-1 text-[8px] font-black text-ink">
                          {isUz ? 'SIZ' : 'YOU'}
                        </span>
                      ) : (
                        <span className="border border-line px-1 text-[8px] text-dim">BOT</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold">
                      <span className="text-tide">{entry.mass.toLocaleString()} M</span>
                      {entry.kills > 0 && (
                        <span className="border border-ember/40 bg-ember/15 px-1 text-[9px] text-ember">
                          ⚔️{entry.kills}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onRespawn}
                className="v-btn w-full"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{isUz ? 'DARHOL QAYTA JANGGA KIRISH [SPACE]' : 'INSTANT RESPAWN [SPACE]'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onReturnToHub) onReturnToHub()
                    else onExit()
                  }}
                  className="v-btn-ghost w-full !py-2.5 !text-xs"
                >
                  <Home className="h-3.5 w-3.5 text-acid" />
                  <span>{isUz ? 'HUBGA QAYTISH' : 'RETURN TO HUB'}</span>
                </button>

                <button
                  type="button"
                  onClick={onExit}
                  className="v-btn-ghost w-full !py-2.5 !text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-tide" />
                  <span>{isUz ? 'ARENA REJIMLARI' : 'GAME MODES'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
