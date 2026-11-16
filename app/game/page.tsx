'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Swords,
  ArrowLeft,
  Calendar,
  Lock,
  Clock,
  X,
  Trophy,
  Crown,
  ShieldAlert,
  Zap,
  ArrowUpRight,
  Settings,
  Sun,
  Moon,
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { useSettings } from '@/components/SettingsContext'
import { getDailyChallengeModifier, getTodayDateString } from '@/lib/game/daily'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { Reveal, MaskText } from '@/components/v26/Reveal'
import ScrambleText from '@/components/v26/ScrambleText'
import CellixLoader from '@/components/v26/CellixLoader'

const VirusGameContainer = dynamic(() => import('@/components/game/VirusGameContainer'), {
  ssr: false,
  loading: () => (
    <CellixLoader
      variant="fullscreen"
      label="ARENA MOTORI YUKLANMOQDA..."
      sublabel="CELLIX // PHASER ENGINE"
    />
  ),
})

interface DailyStatusData {
  playedToday: boolean
  remainingMs: number
  result?: { score: number; level: number; kills: number } | null
}

function isDailyLocallyPlayed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`cellix_daily_played_${getTodayDateString()}`) === 'true'
}

function GameSelectorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings, toggleTheme } = useSettings()
  const initialMode = searchParams.get('mode') as 'classic' | 'survival' | 'daily' | 'biowar' | null
  const validInitialMode =
    initialMode && ['classic', 'survival', 'daily', 'biowar'].includes(initialMode) ? initialMode : null
  const blockedOnInit = validInitialMode === 'daily' && isDailyLocallyPlayed()

  const [selectedMode, setSelectedMode] = useState<'classic' | 'survival' | 'daily' | 'biowar' | null>(
    blockedOnInit ? null : validInitialMode
  )

  const [dailyStatus, setDailyStatus] = useState<DailyStatusData | null>(() => {
    if (!isDailyLocallyPlayed()) return null
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return {
      playedToday: true,
      remainingMs: Math.max(0, midnight.getTime() - now.getTime()),
      result: null,
    }
  })

  const [countdownMs, setCountdownMs] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return Math.max(0, midnight.getTime() - now.getTime())
  })
  const [showDailyBlockedModal, setShowDailyBlockedModal] = useState<boolean>(blockedOnInit)

  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'
  const dailyMod = getDailyChallengeModifier()

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  const formatCountdown = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0')
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0')
    const s = (totalSecs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  useEffect(() => {
    const today = getTodayDateString()
    const locallyPlayed =
      typeof window !== 'undefined' && localStorage.getItem(`cellix_daily_played_${today}`) === 'true'

    fetch('/api/game/daily/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.playedToday === 'boolean') {
          const now = new Date()
          const midnight = new Date(now)
          midnight.setHours(24, 0, 0, 0)
          const fallbackRemaining = Math.max(0, midnight.getTime() - now.getTime())
          const isPlayed = data.playedToday || locallyPlayed
          setDailyStatus({
            playedToday: isPlayed,
            remainingMs: data.remainingMs ?? fallbackRemaining,
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

  const handleDailyBlocked = useCallback(() => {
    setSelectedMode(null)
    setShowDailyBlockedModal(true)
    router.replace('/game', { scroll: false })
  }, [router])

  const handleExitToModes = useCallback(() => {
    setSelectedMode(null)
    router.replace('/game', { scroll: false })
  }, [router])

  useEffect(() => {
    // Pause selector countdown ticker while user is inside an active arena
    if (selectedMode) return
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
  }, [selectedMode])

  if (selectedMode) {
    return (
      <VirusGameContainer
        gameMode={selectedMode}
        onDailyBlocked={handleDailyBlocked}
        onExitToModes={handleExitToModes}
      />
    )
  }

  const isDailyLocked = Boolean(dailyStatus?.playedToday)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-clip bg-ink p-4 text-bone sm:p-8 v-dots">
      <div className="relative z-10 my-auto w-full max-w-6xl space-y-10">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <Link
            href="/"
            onMouseEnter={handleHover}
            onClick={handleClick}
            className="v-btn-ghost !px-4 !py-2 !text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isUz ? 'HUBGA QAYTISH' : 'BACK TO HUB'}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="v-chamfer-sm flex items-center gap-1.5 border border-line bg-ink-2 px-3 py-1.5 font-mono text-[10px] font-bold text-bone transition-colors hover:border-acid hover:text-acid"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-gold" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-tide" />
              )}
              <span>{settings.theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
            </button>

            <Link
              href="/settings"
              onMouseEnter={handleHover}
              onClick={handleClick}
              className="v-chamfer-sm flex items-center gap-1.5 border border-line bg-ink-2 px-3 py-1.5 font-mono text-[10px] font-bold text-bone transition-colors hover:border-tide hover:text-tide"
            >
              <Settings className="h-3.5 w-3.5 text-tide" />
              <span>{isUz ? 'SOZLAMALAR' : 'SETTINGS'}</span>
            </Link>

            <span className="v-live" aria-hidden />
            <span className="v-tag v-accent-acid">
              <ScrambleText text="DEPLOYMENT TERMINAL // 2.0" />
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div className="space-y-3">
          <span className="v-label block text-acid">01 // SELECT COMBAT SECTOR</span>
          <h1 className="v-display text-5xl text-bone sm:text-7xl">
            <MaskText lines={[t('selectMode')]} />
          </h1>
          <p className="max-w-xl font-sans text-sm text-mute">
            {isUz
              ? 'O‘zingizga mos jangovar maydonni tanlang va kiber-hujayrangiz bilan arenaga kiring.'
              : 'Select your combat simulation and deploy your specimen.'}
          </p>
        </div>

        {/* 4 Sector Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* 01: Classic Endless */}
          <Reveal delay={0}>
            <button
              type="button"
              onClick={() => {
                handleClick()
                setSelectedMode('classic')
              }}
              onMouseEnter={handleHover}
              className="v-card v-accent-acid group flex min-h-[340px] w-full flex-col justify-between p-6 text-left"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <span className="v-display text-5xl text-dim transition-colors group-hover:text-bone">
                    01
                  </span>
                  <div className="v-chamfer-sm border border-line bg-ink p-2.5 text-acid">
                    <Swords className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="v-tag v-accent-acid">SOLO ARCADE</span>
                  <h2 className="v-display pt-1 text-3xl text-bone transition-colors group-hover:text-acid">
                    {t('modeClassic')}
                  </h2>
                  <p className="font-sans text-xs leading-relaxed text-mute">
                    {t('modeClassicDesc')}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">
                <span className="text-dim">ENDLESS LADDER</span>
                <span className="inline-flex items-center gap-1 text-acid">
                  <span>{isUz ? 'BOSHLASH' : 'DEPLOY'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </Reveal>

          {/* 02: Survival Waves */}
          <Reveal delay={80}>
            <button
              type="button"
              onClick={() => {
                handleClick()
                setSelectedMode('survival')
              }}
              onMouseEnter={handleHover}
              className="v-card v-accent-ember group flex min-h-[340px] w-full flex-col justify-between p-6 text-left"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <span className="v-display text-5xl text-dim transition-colors group-hover:text-bone">
                    02
                  </span>
                  <div className="v-chamfer-sm border border-line bg-ink p-2.5 text-ember">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="v-tag v-accent-ember">10 WAVES // BOSS</span>
                  <h2 className="v-display pt-1 text-3xl text-bone transition-colors group-hover:text-ember">
                    {t('modeSurvival')}
                  </h2>
                  <p className="font-sans text-xs leading-relaxed text-mute">
                    {t('modeSurvivalDesc')}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">
                <span className="text-dim">OVERLORD PROTOCOL</span>
                <span className="inline-flex items-center gap-1 text-ember">
                  <span>{isUz ? 'BOSHLASH' : 'DEPLOY'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </Reveal>

          {/* 03: Daily Challenge */}
          <Reveal delay={160}>
            <button
              type="button"
              onClick={() => {
                handleClick()
                if (isDailyLocked) {
                  setShowDailyBlockedModal(true)
                  return
                }
                setSelectedMode('daily')
              }}
              onMouseEnter={handleHover}
              className="v-card v-accent-gold group flex min-h-[340px] w-full flex-col justify-between p-6 text-left"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <span className="v-display text-5xl text-dim transition-colors group-hover:text-bone">
                    03
                  </span>
                  <div className="v-chamfer-sm border border-line bg-ink p-2.5 text-gold">
                    {isDailyLocked ? <Lock className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="v-tag v-accent-gold">
                      {isDailyLocked ? (isUz ? "O'YNALGAN" : 'PLAYED') : '3X BOUNTY'}
                    </span>
                  </div>
                  <h2 className="v-display pt-1 text-3xl text-bone transition-colors group-hover:text-gold">
                    {isUz ? 'KUNLIK' : 'DAILY'}
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-gold">
                    {dailyMod.badge} {isUz ? dailyMod.nameUz : dailyMod.name}
                  </p>

                  {isDailyLocked ? (
                    <div className="border border-gold/30 bg-ink p-3">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{isUz ? 'Keyingi sinov:' : 'Next reset:'}</span>
                      </div>
                      <div className="v-display mt-1 text-2xl tracking-wider text-bone tabular-nums">
                        {formatCountdown(countdownMs)}
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-xs leading-relaxed text-mute">
                      {isUz
                        ? 'Har kuni maxsus seed va yangi qoidalar.'
                        : 'Daily unique seed and modifiers.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">
                <span className="text-dim">
                  {isDailyLocked ? (isUz ? '1 MARTA/KUN' : '1 PLAY/DAY') : 'DAILY SEED'}
                </span>
                <span className="inline-flex items-center gap-1 text-gold">
                  <span>{isDailyLocked ? (isUz ? 'KO‘RISH' : 'STATUS') : isUz ? 'BOSHLASH' : 'DEPLOY'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </Reveal>

          {/* 04: BIO-WAR 30 */}
          <Reveal delay={240}>
            <button
              type="button"
              onClick={() => {
                handleClick()
                setSelectedMode('biowar')
              }}
              onMouseEnter={handleHover}
              className="v-card v-accent-tide group flex min-h-[340px] w-full flex-col justify-between p-6 text-left"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <span className="v-display text-5xl text-dim transition-colors group-hover:text-bone">
                    04
                  </span>
                  <div className="v-chamfer-sm border border-line bg-ink p-2.5 text-tide">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="v-tag v-accent-tide">
                    <Crown className="h-3 w-3 text-gold" />
                    30 {isUz ? "O'YINCHI" : 'PLAYERS'}
                  </span>
                  <h2 className="v-display pt-1 text-3xl text-bone transition-colors group-hover:text-tide">
                    BIO-WAR 30
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-tide">
                    REAL-TIME // 20 TPS WS
                  </p>
                  <p className="font-sans text-xs leading-relaxed text-mute">
                    {isUz
                      ? "Biomassa yeb o'sing, kiber-dumingiz bilan raqiblarni to'sing va xaritaning 1-raqamli Qiroliga aylaning!"
                      : 'Consume biomass, grow your bio-tail, cut off rival snakes and become the Apex King!'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">
                <span className="text-dim">BATTLE ROYALE</span>
                <span className="inline-flex items-center gap-1 text-tide">
                  <span>{isUz ? 'BOSHLASH' : 'DEPLOY'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </Reveal>
        </div>
      </div>

      {/* Daily Challenge Locked Modal */}
      {showDailyBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4">
          <div className="v-panel v-accent-gold v-enter relative w-full max-w-md space-y-6 p-6 text-center sm:p-8">
            <button
              type="button"
              aria-label={isUz ? 'Yopish' : 'Close'}
              onClick={() => {
                handleClick()
                setShowDailyBlockedModal(false)
              }}
              className="absolute right-4 top-4 border border-line bg-ink p-2 text-mute transition-colors hover:border-gold hover:text-bone"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-gold/40 bg-ink text-gold v-chamfer-sm">
              <Lock className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <span className="v-label !text-gold">DAILY PROTOCOL // LOCKED</span>
              <h3 className="v-display text-3xl text-bone sm:text-4xl">
                {isUz ? 'KUNLIK SINOV TUGAGAN' : 'DAILY LIMIT REACHED'}
              </h3>
              <p className="font-sans text-xs leading-relaxed text-mute sm:text-sm">
                {isUz
                  ? "Bugungi kunlik sinovni o'ynab bo'lgansiz! Qoidaga ko'ra, kunlik sinov faqat 1 kunda bir marta o'ynaladi."
                  : "You have already completed today's daily challenge! It can only be played once per day."}
              </p>
            </div>

            <div className="border border-gold/30 bg-ink p-4">
              <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
                <Clock className="h-3.5 w-3.5" />
                <span>{isUz ? 'KEYINGI SINOVGACHA:' : 'NEXT CHALLENGE OPENS IN:'}</span>
              </div>
              <div className="v-display mt-1 text-4xl tracking-wider text-gold tabular-nums">
                {formatCountdown(countdownMs)}
              </div>
              <p className="mt-1 font-mono text-[10px] text-mute">
                {isUz ? 'Har kuni 00:00 da yangi sinov boshlanadi' : 'Resets daily at midnight 00:00'}
              </p>
            </div>

            {dailyStatus?.result && (
              <div className="grid grid-cols-3 border border-line bg-ink font-mono">
                <div className="p-3">
                  <div className="v-label">{isUz ? 'Ball' : 'Score'}</div>
                  <div className="v-display mt-1 text-xl text-gold">
                    {dailyStatus.result.score.toLocaleString()}
                  </div>
                </div>
                <div className="border-x border-line p-3">
                  <div className="v-label">{isUz ? 'Daraja' : 'Level'}</div>
                  <div className="v-display mt-1 text-xl text-tide">{dailyStatus.result.level}</div>
                </div>
                <div className="p-3">
                  <div className="v-label">Kills</div>
                  <div className="v-display mt-1 text-xl text-ember">{dailyStatus.result.kills}</div>
                </div>
              </div>
            )}

            <p className="font-mono text-[11px] text-mute">
              {isUz
                ? "Klassik (Endless) yoki Survival (10 Waves) rejimlarini cheklovlarsiz xohlagancha o'ynashingiz mumkin!"
                : 'Classic (Endless) and Survival (10 Waves) modes are unlimited. You can play them anytime!'}
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  handleClick()
                  setShowDailyBlockedModal(false)
                  setSelectedMode('classic')
                }}
                className="v-btn w-full"
              >
                <Swords className="h-4 w-4" />
                <span>{isUz ? "KLASSIK REJIMNI O'YNASH" : 'PLAY CLASSIC MODE'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/leaderboard"
                  onMouseEnter={handleHover}
                  onClick={handleClick}
                  className="v-btn-ghost w-full !py-2.5 !text-sm"
                >
                  <Trophy className="h-3.5 w-3.5 text-gold" />
                  <span>{isUz ? 'REYTING' : 'LADDER'}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    handleClick()
                    setShowDailyBlockedModal(false)
                  }}
                  className="v-btn-ghost w-full !py-2.5 !text-sm"
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

export default function PlayGamePage() {
  return (
    <Suspense
      fallback={
        <CellixLoader
          variant="fullscreen"
          label="REJIMLAR YUKLANMOQDA..."
          sublabel="CELLIX // DEPLOYMENT TERMINAL"
        />
      }
    >
      <GameSelectorContent />
    </Suspense>
  )
}
