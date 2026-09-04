'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Hexagon,
  Swords,
  Waves,
  ArrowLeft,
  Calendar,
  GraduationCap,
  Users,
  Sparkles,
  Lock,
  Clock,
  X,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { getDailyChallengeModifier, getTodayDateString } from '@/lib/game/daily'

const VirusGameContainer = dynamic(() => import('@/components/game/VirusGameContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#060620] text-white space-y-4 font-mono">
      <Hexagon className="h-12 w-12 text-purple-400 animate-spin" />
      <p className="text-sm text-purple-300 animate-pulse">BOOTING CELLIX v1.2 ENGINE...</p>
    </div>
  ),
})

interface DailyStatusData {
  playedToday: boolean
  remainingMs: number
  result?: { score: number; level: number; kills: number } | null
}

export default function PlayGamePage() {
  const [selectedMode, setSelectedMode] = useState<'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer' | null>(null)
  const [dailyStatus, setDailyStatus] = useState<DailyStatusData | null>(null)
  const [countdownMs, setCountdownMs] = useState<number>(0)
  const [showDailyBlockedModal, setShowDailyBlockedModal] = useState<boolean>(false)

  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'
  const dailyMod = getDailyChallengeModifier()

  // Format milliseconds into HH:MM:SS
  const formatCountdown = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0')
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0')
    const s = (totalSecs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // Fetch daily challenge status and calculate remaining time to midnight
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const initialRemaining = Math.max(0, midnight.getTime() - now.getTime())
    setCountdownMs(initialRemaining)

    const today = getTodayDateString()
    const locallyPlayed = typeof window !== 'undefined' && localStorage.getItem(`cellix_daily_played_${today}`) === 'true'

    if (locallyPlayed) {
      setDailyStatus({
        playedToday: true,
        remainingMs: initialRemaining,
        result: null,
      })
    }

    fetch('/api/game/daily/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.playedToday === 'boolean') {
          const isPlayed = data.playedToday || locallyPlayed
          setDailyStatus({
            playedToday: isPlayed,
            remainingMs: data.remainingMs ?? initialRemaining,
            result: data.result,
          })
          if (typeof data.remainingMs === 'number') {
            setCountdownMs(data.remainingMs)
          }
          if (isPlayed && typeof window !== 'undefined') {
            localStorage.setItem(`cellix_daily_played_${today}`, 'true')
          }
        }
      })
      .catch((err) => console.error('Failed to fetch daily status:', err))
  }, [])

  // 1-second countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownMs((prev) => {
        if (prev <= 1000) {
          const now = new Date()
          const midnight = new Date(now)
          midnight.setHours(24, 0, 0, 0)
          return Math.max(0, midnight.getTime() - now.getTime())
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (selectedMode) {
    return <VirusGameContainer gameMode={selectedMode} />
  }

  const isDailyLocked = Boolean(dailyStatus?.playedToday)

  return (
    <div className="min-h-screen bg-[#040416] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Cyber Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(176,38,255,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-5xl w-full text-center space-y-8 my-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isUz ? 'HUBGA QAYTISH' : 'BACK TO HUB'}</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 font-mono text-xs">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
            <span>CELLIX v1.2 ARENA</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-mono font-black tracking-tight text-white uppercase text-glow-purple">
            {t('selectMode')}
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-lg mx-auto">
            {isUz
              ? 'O‘zingizga mos jangovar maydonni tanlang va 8-bitli personajingiz bilan arenaga kiring.'
              : 'Select your combat simulation and deploy with your 8-bit hero persona.'}
          </p>
        </div>

        {/* 5 Game Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Classic Endless */}
          <button
            onClick={() => setSelectedMode('classic')}
            className="group glass-panel rounded-2xl p-5 border border-purple-500/40 hover:border-purple-400 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_0_35px_rgba(176,38,255,0.4)] text-left cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform w-fit mb-3">
                <Swords className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-mono font-bold text-white group-hover:text-purple-400 transition-colors">
                {t('modeClassic')}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-2">
                {t('modeClassicDesc')}
              </p>
            </div>
            <div className="mt-4 text-[11px] font-mono text-purple-400 font-bold">
              <span>ENDLESS RUN</span>
            </div>
          </button>

          {/* 2. Survival Waves */}
          <button
            onClick={() => setSelectedMode('survival')}
            className="group glass-panel rounded-2xl p-5 border border-blue-500/40 hover:border-blue-400 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_0_35px_rgba(59,130,246,0.3)] text-left cursor-pointer flex flex-col justify-between bg-blue-950/20"
          >
            <div>
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform w-fit mb-3">
                <Waves className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-mono font-bold text-white group-hover:text-blue-400 transition-colors">
                {t('modeSurvival')}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-2">
                {t('modeSurvivalDesc')}
              </p>
            </div>
            <div className="mt-4 text-[11px] font-mono text-blue-400 font-bold">
              <span>10 WAVES</span>
            </div>
          </button>

          {/* 3. Daily Challenge (1 per day limit with live 24h countdown) */}
          <button
            onClick={() => {
              if (isDailyLocked) {
                setShowDailyBlockedModal(true)
                return
              }
              setSelectedMode('daily')
            }}
            className={`group glass-panel rounded-2xl p-5 border transition-all duration-300 text-left flex flex-col justify-between relative overflow-hidden ${
              isDailyLocked
                ? 'border-amber-600/40 bg-amber-950/25 hover:border-amber-400/70 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] cursor-pointer'
                : 'border-amber-500/40 hover:border-amber-400 hover:-translate-y-1.5 hover:shadow-[0_0_35px_rgba(245,158,11,0.3)] bg-amber-950/20 cursor-pointer'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform w-fit">
                  {isDailyLocked ? <Lock className="h-6 w-6 text-amber-400" /> : <Calendar className="h-6 w-6" />}
                </div>

                {isDailyLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold tracking-wider">
                    <Lock className="h-2.5 w-2.5" />
                    {isUz ? "O'YNALGAN" : 'PLAYED'}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-mono font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                <span>{isUz ? 'KUNLIK' : 'DAILY'}</span>
              </h2>

              <p className="text-xs font-mono text-amber-300/80 mt-1 font-bold">
                {dailyMod.badge} {isUz ? dailyMod.nameUz : dailyMod.name}
              </p>

              {/* 24-Hour Countdown Box for Played state */}
              {isDailyLocked ? (
                <div className="mt-3 p-2.5 rounded-xl bg-black/50 border border-amber-500/30">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>{isUz ? 'Keyingi sinov:' : 'Next reset:'}</span>
                  </div>
                  <div className="text-sm font-mono font-black text-amber-300 tracking-widest mt-0.5">
                    {formatCountdown(countdownMs)}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] font-mono text-slate-400 mt-2">
                  {isUz ? "Har kuni maxsus seed va yangi qoidalar." : "Daily unique seed and modifiers."}
                </p>
              )}
            </div>

            <div className="mt-4 text-[11px] font-mono font-bold">
              {isDailyLocked ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>{isUz ? '1 MARTA/KUN' : '1 PLAY/DAY'}</span>
                </span>
              ) : (
                <span className="text-amber-400">DAILY SEED</span>
              )}
            </div>
          </button>

          {/* 4. Practice */}
          <button
            onClick={() => setSelectedMode('practice')}
            className="group glass-panel rounded-2xl p-5 border border-emerald-500/40 hover:border-emerald-400 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] text-left cursor-pointer flex flex-col justify-between bg-emerald-950/15"
          >
            <div>
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform w-fit mb-3">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                {isUz ? 'MASHQ' : 'PRACTICE'}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-2">
                {t('modePracticeDesc')}
              </p>
            </div>
            <div className="mt-4 text-[11px] font-mono text-emerald-400 font-bold">
              <span>DPS & DUMMY</span>
            </div>
          </button>

          {/* 5. Multiplayer */}
          <button
            onClick={() => setSelectedMode('multiplayer')}
            className="group glass-panel rounded-2xl p-5 border border-cyan-500/40 hover:border-cyan-400 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.3)] text-left cursor-pointer flex flex-col justify-between bg-cyan-950/15"
          >
            <div>
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform w-fit mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">
                {isUz ? '2 O‘YINCHI' : '2-PLAYER'}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-2">
                {t('modeMultiplayerDesc')}
              </p>
            </div>
            <div className="mt-4 text-[11px] font-mono text-cyan-400 font-bold">
              <span>LOCAL CO-OP</span>
            </div>
          </button>
        </div>
      </div>

      {/* Daily Challenge Locked Modal */}
      {showDailyBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/40 bg-slate-950/95 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-center space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setShowDailyBlockedModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Lock Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <Lock className="h-8 w-8" />
            </div>

            {/* Modal Title & Warning */}
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-mono font-black text-white uppercase tracking-tight">
                {isUz ? 'KUNLIK SINOV TUGAGAN' : 'DAILY LIMIT REACHED'}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-amber-300 leading-relaxed font-medium">
                {isUz
                  ? "Bugungi kunlik sinovni o'ynab bo'lgansiz! Qoidaga ko'ra, kunlik sinov faqat 1 kunda bir marta o'ynaladi."
                  : "You have already completed today's daily challenge! It can only be played once per day."}
              </p>
            </div>

            {/* Live 24-Hour Countdown Display */}
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 space-y-1 text-center">
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-widest flex items-center justify-center gap-1.5 font-bold">
                <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>{isUz ? 'KEYINGI SINOVGACHA:' : 'NEXT CHALLENGE OPENS IN:'}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-widest">
                {formatCountdown(countdownMs)}
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                {isUz ? 'Har kuni 00:00 da yangi sinov boshlanadi' : 'Resets daily at midnight 00:00'}
              </p>
            </div>

            {/* Today's Saved Result (if available) */}
            {dailyStatus?.result && (
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">{isUz ? 'Ball' : 'Score'}</div>
                  <div className="text-sm font-bold text-amber-400">{dailyStatus.result.score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">{isUz ? 'Daraja' : 'Level'}</div>
                  <div className="text-sm font-bold text-cyan-400">{dailyStatus.result.level}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">{isUz ? 'Kills' : 'Kills'}</div>
                  <div className="text-sm font-bold text-rose-400">{dailyStatus.result.kills}</div>
                </div>
              </div>
            )}

            {/* Friendly guidance */}
            <p className="text-[11px] font-mono text-slate-400">
              {isUz
                ? "Klassik (Endless) yoki Survival (10 Waves) rejimlarini cheklovlarsiz xohlagancha o'ynashingiz mumkin!"
                : 'Classic (Endless) and Survival (10 Waves) modes are unlimited. You can play them anytime!'}
            </p>

            {/* Action buttons */}
            <div className="space-y-2 font-mono">
              <button
                onClick={() => {
                  setShowDailyBlockedModal(false)
                  setSelectedMode('classic')
                }}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider btn-cyber-primary text-slate-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="h-4 w-4" />
                <span>{isUz ? "KLASSIK REJIMNI O'YNASH" : 'PLAY CLASSIC MODE'}</span>
              </button>

              <div className="flex gap-2">
                <Link
                  href="/leaderboard"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-950/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isUz ? 'REYTING' : 'LEADERBOARD'}</span>
                </Link>

                <button
                  onClick={() => setShowDailyBlockedModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900/60 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {isUz ? 'YOPISH' : 'CLOSE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
