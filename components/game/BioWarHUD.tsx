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
} from 'lucide-react'
import type { BioWarHUDData } from '@/lib/game/engine/BioWarScene'

interface BioWarHUDProps {
  hud: BioWarHUDData
  onRespawn: () => void
  onExit: () => void
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
  onSteerAngle,
  onBoostChange,
  onShootChange,
  isUz = true,
}: BioWarHUDProps) {
  const [showGuide, setShowGuide] = useState(true)
  const [guideTimer, setGuideTimer] = useState(5)
  const [mobileLeaderboardOpen, setMobileLeaderboardOpen] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Strictly detect mobile devices (never show joysticks on PC/desktop!)
  useEffect(() => {
    const checkMobile = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
      const isTouchOnly =
        window.matchMedia('(pointer: coarse)').matches &&
        !window.matchMedia('(pointer: fine)').matches &&
        window.innerWidth <= 1024
      setIsMobileDevice(isMobileUA || isIPad || isTouchOnly)
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

  // Listen for [H] key to toggle instructions HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        e.preventDefault()
        setShowGuide((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-fade instructions HUD after 10 seconds upon entering the arena
  useEffect(() => {
    if (!showGuide) return
    const interval = setInterval(() => {
      setGuideTimer((prev) => {
        if (prev <= 1) {
          setShowGuide(false)
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showGuide])

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

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono overflow-hidden select-none" style={{ touchAction: 'none' }}>
      {/* ─── Top-Center: 3-Minute Round Countdown & Winner ─── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto select-none">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.25)]">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black text-amber-400">
            <Trophy className="h-3 sm:h-3.5 w-3 sm:w-3.5 animate-pulse" />
            <span>{isUz ? `RAUND ${hud.roundNumber}` : `ROUND ${hud.roundNumber}`}</span>
          </div>
          <div className="w-px h-3 sm:h-3.5 bg-slate-800" />
          <div
            className={`flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-mono font-bold ${
              hud.roundTimeRemaining <= 60 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
            }`}
          >
            <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span>{formatTime(hud.roundTimeRemaining)}</span>
          </div>
        </div>

        {hud.lastWinnerName && (
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[9px] sm:text-[10px] font-bold animate-bounce shadow-md">
            👑 {isUz ? `Oldingi g‘olib: ${hud.lastWinnerName}` : `Prev: ${hud.lastWinnerName}`}
          </div>
        )}
      </div>

      {/* ─── Kill Streak Cyber Popup Banner ─── */}
      {activeKillBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce flex flex-col items-center">
          <div className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-amber-950/90 to-rose-950/90 border-2 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.6)] backdrop-blur-md flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400 animate-pulse" />
            <div className="flex flex-col text-center">
              <span className="text-xs sm:text-sm font-black text-white tracking-wider text-glow-rose">
                {isUz ? `+1 QATL! [${activeKillBanner.victim}]` : `+1 KILL! [${activeKillBanner.victim}]`}
              </span>
              <span className="text-[10px] font-bold text-amber-300">
                +{activeKillBanner.mass} MASSA YUTILDI {activeKillBanner.combo > 1 ? `• 🔥 ${activeKillBanner.combo}X COMBO!` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top-Left: Live Kill-Feed (Compact on mobile) ─── */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 max-w-[150px] sm:max-w-xs z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-rose-400">
            {isUz ? 'JANG' : 'KILLS'}
          </span>
        </div>

        {hud.killFeed.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 shadow-sm backdrop-blur-sm truncate"
          >
            <span className="font-bold text-amber-400 truncate max-w-[65px] sm:max-w-[90px]">{event.killer}</span>
            <span className="text-[9px] text-slate-500">
              {event.method === 'shot' ? '💥' : '⚡'}
            </span>
            <span className="font-bold text-rose-400 truncate max-w-[65px] sm:max-w-[90px]">{event.victim}</span>
          </div>
        ))}
      </div>

      {/* ─── Top-Right: Mobile Collapsible Toggle Pill ─── */}
      <div className={`absolute top-3 right-3 z-30 pointer-events-auto ${isMobileDevice ? 'block' : 'hidden'}`}>
        <button
          type="button"
          onClick={() => setMobileLeaderboardOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg backdrop-blur-md active:scale-95 transition-all"
        >
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          <span>TOP 10</span>
          <span className="text-[10px] text-cyan-400 px-1 rounded bg-cyan-950">#{hud.myRank}</span>
          {mobileLeaderboardOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* ─── Desktop Top-Right / Mobile Dropdown: Apex Live Leaderboard ─── */}
      <div
        className={`absolute top-12 right-3 sm:top-4 sm:right-4 w-60 sm:w-64 glass-panel p-3 sm:p-3.5 rounded-2xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.15)] z-20 transition-all duration-300 ${
          isMobileDevice
            ? mobileLeaderboardOpen ? 'block pointer-events-auto' : 'hidden pointer-events-none'
            : 'block pointer-events-auto'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-amber-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300">
              {isUz ? 'APEX REYTING' : 'LEADERBOARD'}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">
            {hud.totalPlayers}/30 {isUz ? 'YIRTQICH' : 'PLAYERS'}
          </span>
        </div>

        <div className="space-y-0.5 sm:space-y-1 max-h-[35vh] sm:max-h-none overflow-y-auto">
          {hud.leaderboard.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between text-[11px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg transition-all ${
                entry.isPlayer
                  ? 'bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : idx === 0
                    ? 'bg-amber-950/50 border border-amber-500/40 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate max-w-[130px] sm:max-w-[140px]">
                <span className="text-[10px] text-slate-500 w-4 font-mono">
                  {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </span>
                <span className="truncate">{entry.name}</span>
                {entry.isPlayer && (
                  <span className="text-[8px] sm:text-[9px] px-1 rounded bg-cyan-500/30 text-cyan-300 font-black">
                    {isUz ? 'SIZ' : 'YOU'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-cyan-300">
                  {entry.mass.toLocaleString()}
                </span>
                {entry.kills > 0 && (
                  <span className="text-[9px] font-bold px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ⚔️{entry.kills}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Radar (Positioned comfortably on left side above joystick) ─── */}
      <div className="absolute bottom-28 sm:bottom-5 left-3 sm:left-5 z-20 pointer-events-none">
        <div className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-2xl border-2 border-cyan-500/40 bg-slate-950/90 backdrop-blur-md overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.25)]">
          {/* Radar Scanner Line */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
          <div className="absolute inset-0 border border-cyan-500/10 rounded-2xl" />

          {/* Radar Header */}
          <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-cyan-400 tracking-wider">
            <Radio className="h-2 w-2 animate-pulse" />
            <span>RADAR</span>
          </div>

          {/* Radar Blips */}
          {hud.radar.map((blip, i) => (
            <div
              key={i}
              className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                blip.isPlayer
                  ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-cyan-400 border border-white shadow-[0_0_10px_#06b6d4] z-20 animate-ping-slow'
                  : blip.isKing
                    ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-400 border border-amber-200 shadow-[0_0_8px_#f59e0b] z-10'
                    : 'w-1 h-1 sm:w-1.5 sm:h-1.5 bg-rose-500 opacity-80'
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
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 sm:gap-2 pointer-events-auto">
        <div className="glass-panel px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-2xl border border-cyan-500/40 bg-slate-950/90 backdrop-blur-md flex items-center gap-3 sm:gap-6 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          {/* Mass */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              {isUz ? 'MASSA' : 'MASS'}
            </span>
            <span className="text-base sm:text-2xl font-black text-cyan-400 tracking-tight">
              {hud.myMass.toLocaleString()}
            </span>
          </div>

          <div className="w-px h-6 sm:h-8 bg-slate-800" />

          {/* Rank */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              {isUz ? 'O‘RIN' : 'RANK'}
            </span>
            <span className="text-base sm:text-2xl font-black text-amber-400">
              #{hud.myRank} <span className="text-[9px] sm:text-xs text-slate-500">/ {hud.totalPlayers}</span>
            </span>
          </div>

          <div className="w-px h-6 sm:h-8 bg-slate-800" />

          {/* Kills */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              KILLS
            </span>
            <span className="text-base sm:text-2xl font-black text-rose-400">
              {hud.myKills}
            </span>
          </div>

          <div className="w-px h-6 sm:h-8 bg-slate-800" />

          {/* Nitro Boost Energy Bar */}
          <div className="flex flex-col gap-0.5 sm:gap-1 w-20 sm:w-32">
            <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold">
              <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-400">
                <Zap className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> NITRO
              </span>
              <span>{Math.round(hud.boostPct * 100)}%</span>
            </div>
            <div className="w-full h-2 sm:h-2.5 rounded-full bg-slate-900 border border-cyan-500/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
                style={{ width: `${hud.boostPct * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Controls Pill (Desktop only) & [H] Guide Toggle Button */}
        <div className={`items-center gap-2 ${isMobileDevice ? 'hidden' : 'hidden sm:flex'}`}>
          <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-2 shadow-sm">
            <span><strong className="text-cyan-400">[LMB]</strong> {isUz ? 'OTISH' : 'SHOOT'}</span>
            <span>•</span>
            <span><strong className="text-rose-400">[ENTER]</strong> AUTO-AIM</span>
            <span>•</span>
            <span><strong className="text-purple-400">[↑↓←→]</strong> {isUz ? 'YO‘NALISH' : 'AIM'}</span>
            <span>•</span>
            <span><strong className="text-cyan-400">[SPACE/RMB]</strong> {isUz ? 'TEZLANISH' : 'BOOST'}</span>
            <span>•</span>
            <span><strong className="text-cyan-400">[WASD]</strong> {isUz ? 'BURILISH' : 'STEER'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="pointer-events-auto cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-300 transition-all shadow-sm"
          >
            <HelpCircle className="h-3 w-3 text-cyan-400" />
            <span>[H] {isUz ? 'QO‘LLANMA' : 'GUIDE'}</span>
          </button>
        </div>
      </div>

      {/* ═══ MOBILE TOUCH CONTROLS (Joystik va Sensorli Tugmalar) ═══ */}
      <div className={`${isMobileDevice ? 'block' : 'hidden'} pointer-events-auto`}>
        {/* 1. Left Side: Virtual Movement Joystick */}
        <div className="absolute left-3 bottom-4 pointer-events-auto" style={{ touchAction: 'none' }}>
          <div className="text-center mb-1">
            <span className="text-[8px] font-mono font-bold text-cyan-400/70 uppercase tracking-widest">
              {isSteering ? 'BURILISH' : 'BOSHQARUV'}
            </span>
          </div>
          <div
            ref={joystickRef}
            onTouchStart={onJoystickStart}
            onTouchMove={onJoystickMove}
            onTouchEnd={onJoystickEnd}
            onTouchCancel={onJoystickEnd}
            className={`h-24 w-24 rounded-full border-2 backdrop-blur-sm flex items-center justify-center relative transition-colors ${
              isSteering ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'border-cyan-500/30 bg-slate-950/50'
            }`}
            style={{ touchAction: 'none' }}
          >
            {/* Cardinal compass hints */}
            <div className="absolute top-1 text-cyan-500/30 text-[7px]">▲</div>
            <div className="absolute bottom-1 text-cyan-500/30 text-[7px]">▼</div>
            <div className="absolute left-1.5 text-cyan-500/30 text-[7px]">◄</div>
            <div className="absolute right-1.5 text-cyan-500/30 text-[7px]">►</div>

            {/* Joystick Knob */}
            <div
              className={`h-11 w-11 rounded-full transition-transform duration-75 flex items-center justify-center ${
                isSteering
                  ? 'bg-cyan-400 shadow-[0_0_18px_#06b6d4] scale-105'
                  : 'bg-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
              }`}
              style={{ transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)` }}
            >
              <div className="w-4 h-4 rounded-full bg-slate-950/60" />
            </div>
          </div>
        </div>

        {/* 2. Right Side: Action Buttons (NITRO + LAZER AUTO-AIM) */}
        <div className="absolute right-3 bottom-4 pointer-events-auto flex items-end gap-3" style={{ touchAction: 'none' }}>
          {/* LAZER (AUTO-AIM) BUTTON */}
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-bold text-rose-400 uppercase tracking-wider mb-1 bg-rose-950/70 px-1.5 py-0.2 rounded border border-rose-500/30 animate-pulse">
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
              className={`h-16 w-16 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all active:scale-90 ${
                isShootingTouch
                  ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.8)] scale-95'
                  : 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              }`}
              style={{ touchAction: 'none' }}
            >
              <Crosshair className={`h-6 w-6 ${isShootingTouch ? 'animate-spin' : ''}`} />
              <span className="text-[8px] font-black mt-0.5 leading-none tracking-tighter">LAZER</span>
            </button>
          </div>

          {/* NITRO BOOST BUTTON */}
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
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
              className={`h-20 w-20 rounded-3xl border-2 flex flex-col items-center justify-center font-mono transition-all active:scale-95 ${
                isBoostingTouch
                  ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_30px_#06b6d4] scale-95'
                  : 'bg-cyan-500/85 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
              style={{ touchAction: 'none' }}
            >
              <Zap className={`h-8 w-8 fill-slate-950 ${isBoostingTouch ? 'animate-bounce' : ''}`} />
              <span className="text-[9px] font-black leading-none tracking-wider">NITRO</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 10-Second Auto-Fading Arena Guide & Controls Modal [H] ─── */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-700 ${
          showGuide
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`relative max-w-xl w-full glass-panel rounded-3xl p-6 sm:p-7 border border-cyan-500/50 bg-slate-950/95 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-left space-y-5 transition-all duration-500 transform ${
            showGuide ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>BIO-WAR 30</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                    ARENA
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isUz ? '30 nafar yirtqich orasida Apex King bo‘ling!' : 'Become the Apex Predator among 30 rivals!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {guideTimer > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  {guideTimer}s
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grid: Controls & Mechanics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Controls */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <MousePointer className="h-3.5 w-3.5" />
                {isUz ? 'BOSHQARUV TUGMALARI' : 'CONTROLS'}
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400 shrink-0">[KURSOR/WASD]:</span>
                  <span className="text-slate-400">{isUz ? 'Harakatlanish va burilish' : 'Steer & Direction'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400 shrink-0">[LMB / ↑↓←→]:</span>
                  <span className="text-slate-400">{isUz ? 'Lazer otish (yoki strelkalar bilan)' : 'Laser fire (or Arrow keys)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-400 shrink-0">[ENTER]:</span>
                  <span className="text-slate-400">{isUz ? 'Avto-nishonga lazer otish (Auto-Aim)' : 'Auto-Aim Laser Fire'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400 shrink-0">[SPACE/RMB]:</span>
                  <span className="text-slate-400">{isUz ? 'Nitro Tezlanish (massa sarflanadi)' : 'Nitro Boost (burns mass)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-400 shrink-0">[H]:</span>
                  <span className="text-slate-400">{isUz ? 'Ushbu qo‘llanmani ochish / yopish' : 'Toggle this guide'}</span>
                </li>
              </ul>
            </div>

            {/* Mechanics & Objectives */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {isUz ? 'JANG TAKTIKASI VA QOIDALAR' : 'TACTICS & RULES'}
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span className="text-slate-400">
                    {isUz ? 'Kichik boshlaysiz. Biomassalarni yeb sekin va barqaror o‘sing.' : 'Start small. Eat scattered biomass to grow gradually.'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span className="text-slate-400">
                    {isUz ? 'Dushman boshi sizning dumingizga tegsa — portlaydi va butun massasi tushadi!' : 'If an enemy head hits your tail, they crash and explode!'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span className="text-slate-400">
                    {isUz ? 'Lazer o‘qi dushmanga tekkanda 10% massasi tortib olinadi (XP Siphon)!' : 'Laser hits siphon 10% enemy mass directly to you!'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <span className="text-slate-400">
                    {isUz ? 'Har 3 minutda yangi raund yangilanadi. Eng yuqori massali o‘yinchi g‘olib!' : 'Rounds reset every 3 mins. Apex worm wins!'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Auto-fade Progress Bar & Close Button */}
          <div className="space-y-2 pt-1">
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(guideTimer / 5) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{isUz ? `${guideTimer}s ichida avtomatik yopiladi (yoki istalgan vaqt [H] bosing)` : `Auto-closing in ${guideTimer}s (press [H] anytime)`}</span>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
              >
                {isUz ? 'TUSHUNDIM [H]' : 'GOT IT [H]'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Instant Respawn Death Modal ─── */}
      {hud.isDead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto animate-fade-in">
          <div className="relative max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/50 bg-slate-950/95 shadow-[0_0_60px_rgba(244,63,94,0.3)] text-center space-y-5">
            {/* Skull Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.4)]">
              <Skull className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight text-glow-rose">
                {isUz ? 'SIZ YO‘Q QILINDINGIZ!' : 'YOU WERE DEFEATED!'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {hud.killerName
                  ? (isUz ? `Sizni ${hud.killerName} dumi yoki o‘qi bilan yo‘q qildi!` : `Eliminated by ${hud.killerName}!`)
                  : (isUz ? 'Raqib dumi bilan to‘qnashuvda portladingiz!' : 'Collided with rival bio-tail!')}
              </p>
            </div>

            {/* Run Stats Grid (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center font-mono">
              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">{isUz ? 'Massa' : 'Mass'}</div>
                <div className="text-sm font-black text-cyan-400">{(hud.peakMass || hud.myMass).toLocaleString()}</div>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">{isUz ? 'O‘rin' : 'Rank'}</div>
                <div className="text-sm font-black text-amber-400">#{hud.myRank}</div>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">Kills</div>
                <div className="text-sm font-black text-rose-400">{hud.myKills}</div>
              </div>
              <div className="p-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <div className="text-[9px] text-emerald-400 uppercase flex items-center justify-center gap-0.5">
                  <Coins className="h-2.5 w-2.5" />
                  <span>Coins</span>
                </div>
                <div className="text-sm font-black text-emerald-400">+{hud.coinsEarned || 15}</div>
              </div>
            </div>

            {/* Persistence Confirmation Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold font-mono">
              <span>✅ {isUz ? 'Natijangiz va tangalaringiz profilingizga saqlandi!' : 'Score & coins saved to your profile!'}</span>
            </div>

            {/* Top Snakes Match Standings (Top ilonlar natijalari) */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1.5 font-mono text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  {isUz ? 'TOP ILONLAR JANG REYTINGI' : 'TOP WORMS STANDINGS'}
                </span>
                <span className="text-slate-500">{isUz ? 'MASSA / KILLS' : 'MASS / KILLS'}</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {hud.leaderboard.slice(0, 6).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg ${
                      entry.isPlayer
                        ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : idx === 0
                          ? 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                          : 'text-slate-300 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="text-[10px] text-amber-400 font-bold w-4">
                        {idx === 0 ? '👑' : `#${idx + 1}`}
                      </span>
                      <span className="truncate">{entry.name}</span>
                      {entry.isPlayer && (
                        <span className="text-[8px] px-1 rounded bg-cyan-500/30 text-cyan-300 font-black">
                          {isUz ? 'SIZ' : 'YOU'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold">
                      <span className="text-cyan-400">{entry.mass.toLocaleString()} M</span>
                      {entry.kills > 0 && (
                        <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ⚔️{entry.kills}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onRespawn}
                className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider btn-cyber-primary text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{isUz ? 'DARHOL QAYTA JANGGA KIRISH [SPACE]' : 'INSTANT RESPAWN [SPACE]'}</span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900/60 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{isUz ? 'ARENADAN CHIQISH' : 'EXIT TO MODES'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
