'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, RotateCcw, Trophy, Check, Award, Download, Swords, Coins, Home } from 'lucide-react'
import Link from 'next/link'
import { checkRunAchievements, saveRunHistory, Achievement } from '@/lib/game/achievements'
import { useLanguage } from '@/components/LanguageContext'
import confetti from 'canvas-confetti'
import { syncCoinBalance } from '@/lib/game/cosmetics'
import CountUp from '@/components/v26/CountUp'
import CellixLoader from '@/components/v26/CellixLoader'

interface GameOverModalProps {
  score: number
  level: number
  kills: number
  survivalTime: number
  mutationsCount: number
  damageDealt: number
  damageTaken: number
  criticalHits: number
  bossDefeated: boolean
  combosCount: number
  gameMode: 'classic' | 'survival' | 'daily'
  wave?: number
  isVictory?: boolean
  wavesCleared?: number
  runToken: string | null
  onRestart: () => void
  onExitToModes?: () => void
  onReturnToHub?: () => void
}

export default function GameOverModal({
  score,
  level,
  kills,
  survivalTime,
  mutationsCount,
  damageDealt,
  damageTaken,
  criticalHits,
  bossDefeated,
  combosCount,
  gameMode,
  wave,
  isVictory = false,
  wavesCleared,
  runToken,
  onRestart,
  onExitToModes,
  onReturnToHub,
}: GameOverModalProps) {
  const router = useRouter()
  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'

  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'failed'>(
    runToken ? 'saving' : 'failed'
  )
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [downloadedCard, setDownloadedCard] = useState(false)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    saveRunHistory({
      score,
      level,
      kills,
      survivalTime,
      gameMode,
      isVictory,
      wave: wave ?? wavesCleared ?? 0,
      damageDealt,
      damageTaken,
      criticalHits,
      bossDefeated,
      combosCount,
    })

    const unlocked = checkRunAchievements({
      score,
      level,
      kills,
      survivalTime,
      gameMode,
      isVictory,
      bossDefeated,
      combosCount,
    })
    setNewAchievements(unlocked)

    if (unlocked.length > 0) {
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } })
      } catch {
        // ignore
      }
    }
  }, [
    score,
    level,
    kills,
    survivalTime,
    gameMode,
    isVictory,
    wave,
    wavesCleared,
    damageDealt,
    damageTaken,
    criticalHits,
    bossDefeated,
    combosCount,
  ])

  const saveAttempted = useRef(false)

  useEffect(() => {
    if (!runToken || saveAttempted.current) return

    saveAttempted.current = true
    setSaveState('saving')

    const saveRun = async () => {
      try {
        const response = await fetch('/api/game/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score,
            level,
            kills,
            survivalTime,
            mutationsCount,
            damageDealt,
            damageTaken,
            criticalHits,
            bossDefeated,
            gameMode,
            wave: gameMode === 'survival' ? (wave ?? wavesCleared ?? 0) : 0,
            token: runToken,
          }),
        })

        const data = (await response.json().catch(() => ({}))) as {
          coinReward?: unknown
          coinBalance?: unknown
          error?: string
        }

        if (!response.ok) {
          console.error('Score submission failed from server:', data.error || response.statusText)
          setSaveState('failed')
          return
        }

        if (typeof data.coinBalance === 'number') syncCoinBalance(data.coinBalance)
        setCoinsEarned(typeof data.coinReward === 'number' ? data.coinReward : 0)
        setSaveState('saved')

        if (gameMode === 'daily' && typeof window !== 'undefined') {
          const d = new Date()
          const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
          localStorage.setItem(`cellix_daily_played_${today}`, 'true')
        }
      } catch (error) {
        console.error('Failed to submit score:', error)
        setSaveState('failed')
      }
    }

    void saveRun()
  }, [
    score,
    level,
    kills,
    survivalTime,
    mutationsCount,
    damageDealt,
    damageTaken,
    criticalHits,
    bossDefeated,
    wave,
    wavesCleared,
    gameMode,
    runToken,
  ])

  // Generate 2026 BIOLUMEN Share Card (PNG)
  const handleExportCard = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 450
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0c0b'
    ctx.fillRect(0, 0, 800, 450)

    ctx.strokeStyle = isVictory ? '#d4ff3a' : '#ff4d2e'
    ctx.lineWidth = 3
    ctx.strokeRect(14, 14, 772, 422)

    ctx.strokeStyle = 'rgba(237, 233, 224, 0.16)'
    ctx.lineWidth = 1
    ctx.strokeRect(22, 22, 756, 406)

    ctx.font = 'bold 28px monospace'
    ctx.fillStyle = '#d4ff3a'
    ctx.fillText('CELLIX // 2.0', 40, 62)

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = '#8b9088'
    ctx.fillText(`${gameMode.toUpperCase()} RUN DOSSIER`, 280, 60)

    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = isVictory ? '#d4ff3a' : '#ff4d2e'
    ctx.fillText(isVictory ? '★ ARENA PURGED / VICTORY' : '✖ SPECIMEN TERMINATED', 40, 105)

    ctx.font = 'bold 48px monospace'
    ctx.fillStyle = '#ede9e0'
    ctx.fillText(score.toLocaleString(), 40, 165)

    ctx.font = '12px monospace'
    ctx.fillStyle = '#8b9088'
    ctx.fillText('FINAL BIO-SCORE', 40, 186)

    const stats = [
      { label: 'LEVEL REACHED', val: `LV.${level}` },
      { label: 'ENEMIES KILLED', val: `${kills}` },
      { label: 'SURVIVAL TIME', val: formatTime(survivalTime) },
      { label: 'DAMAGE DEALT', val: `${Math.round(damageDealt).toLocaleString()}` },
      { label: 'CRITICAL HITS', val: `${criticalHits}` },
      { label: 'MUTATIONS', val: `${mutationsCount} (${combosCount} SYN)` },
    ]

    stats.forEach((st, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 40 + col * 240
      const y = 235 + row * 72

      ctx.fillStyle = '#111513'
      ctx.fillRect(x, y, 224, 54)
      ctx.strokeStyle = 'rgba(237, 233, 224, 0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, 224, 54)

      ctx.font = '10px monospace'
      ctx.fillStyle = '#8b9088'
      ctx.fillText(st.label, x + 12, y + 20)

      ctx.font = 'bold 17px monospace'
      ctx.fillStyle = '#d4ff3a'
      ctx.fillText(st.val, x + 12, y + 43)
    })

    ctx.font = '11px monospace'
    ctx.fillStyle = '#565b55'
    ctx.fillText('CELLIX BIOLUMEN // @iflxczz', 40, 410)

    const link = document.createElement('a')
    link.download = `cellix_run_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setDownloadedCard(true)
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } })
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-ink/90 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`v-panel ${isVictory ? 'v-accent-acid' : 'v-accent-ember'} relative max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto p-6 text-center text-bone sm:p-8`}
        >
          {/* Header */}
          <div className="space-y-2 border-b border-line pb-4">
            <div
              className={`v-chamfer-sm mx-auto flex h-12 w-12 items-center justify-center border ${
                isVictory
                  ? 'border-acid/50 bg-ink text-acid'
                  : 'border-ember/50 bg-ink text-ember'
              }`}
            >
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2
              className={`v-display text-4xl sm:text-5xl ${
                isVictory ? 'text-acid' : 'text-ember'
              }`}
            >
              {isVictory ? (isUz ? 'ARENA TOZALANDI!' : 'ARENA PURGED!') : t('entityTerminated')}
            </h2>
            <p className="v-label">
              {isVictory ? (isUz ? 'Muvaffaqiyatli g‘alaba' : 'Successful Extermination') : t('cellDestroyed')}
            </p>
          </div>

          {/* Core Score Display */}
          <div className="border border-line bg-ink p-4">
            <span className="v-label block">{t('finalScore')}</span>
            <div className="v-display mt-1 text-5xl text-bone tabular-nums">
              <CountUp to={score} />
            </div>
          </div>

          {coinsEarned > 0 && (
            <div className="flex items-center justify-center gap-2 border border-gold/40 bg-gold/10 px-4 py-2.5 font-mono text-xs font-bold text-gold">
              <Coins className="h-4 w-4" />
              <span>
                +{coinsEarned} {t('coinUnit')}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold/75">
                {t('coinReward')}
              </span>
            </div>
          )}

          {/* Hairline Metrics Grid */}
          <div className="grid grid-cols-2 border border-line bg-ink text-left font-mono">
            <div className="border-b border-r border-line p-3">
              <span className="v-label block">{t('levelReached')}</span>
              <span className="mt-1 block text-sm font-bold text-acid">LV.{level}</span>
            </div>

            <div className="border-b border-line p-3">
              <span className="v-label block">{t('enemiesDefeated')}</span>
              <span className="mt-1 block text-sm font-bold text-ember">{kills} KILLS</span>
            </div>

            <div className="border-b border-r border-line p-3">
              <span className="v-label block">{isUz ? 'Mutatsiyalar' : 'Mutations'}</span>
              <span className="mt-1 block text-sm font-bold text-gold">
                {mutationsCount} ({combosCount} SYN)
              </span>
            </div>

            <div className="border-b border-line p-3">
              <span className="v-label block">{isUz ? 'Berilgan Zarar' : 'Damage Dealt'}</span>
              <span className="mt-1 block text-sm font-bold text-tide">
                {Math.round(damageDealt).toLocaleString()}
              </span>
            </div>

            <div className="border-r border-line p-3">
              <span className="v-label block">{isUz ? 'Kritik Zarbalar' : 'Critical Hits'}</span>
              <span className="mt-1 block text-sm font-bold text-gold">{criticalHits}</span>
            </div>

            <div className="p-3">
              <span className="v-label block">{t('survivalTime')}</span>
              <span className="mt-1 block text-sm font-bold text-bone">
                {formatTime(survivalTime)}
              </span>
            </div>

            {newAchievements.length > 0 && (
              <div className="col-span-2 space-y-1.5 border-t border-line bg-gold/10 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-gold">
                  <Award className="h-3.5 w-3.5" />
                  <span>{isUz ? 'Yangi Yutuq Ochildi!' : 'Achievement Unlocked!'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {newAchievements.map((ach) => (
                    <span key={ach.id} className="v-tag v-accent-gold !py-0.5">
                      <span>{ach.badge}</span>
                      <span>{ach.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Save Status */}
          <div
            className={`flex items-center justify-center gap-2 border px-3 py-2 font-mono text-xs ${
              saveState === 'saved'
                ? 'border-acid/40 bg-acid/10 text-acid'
                : saveState === 'saving'
                  ? 'border-tide/40 bg-tide/10 text-tide'
                  : 'border-ember/40 bg-ember/10 text-ember'
            }`}
          >
            {saveState === 'saved' && <Check className="h-4 w-4" />}
            {saveState === 'saving' ? (
              <CellixLoader variant="compact" label={t('saving')} />
            ) : (
              <span>
                {saveState === 'saved'
                  ? t('saved')
                  : isUz
                    ? 'Natija saqlanmadi'
                    : 'Score not saved'}
              </span>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportCard}
              className="v-btn-ghost w-full !py-2.5 !text-sm"
            >
              <Download className="h-3.5 w-3.5 text-tide" />
              <span>{downloadedCard ? t('shareSuccess') : t('exportCardBtn')}</span>
            </button>

            {gameMode === 'daily' ? (
              <div className="space-y-1 border border-gold/40 bg-ink p-3 text-center">
                <p className="font-mono text-xs font-bold text-gold">
                  {isUz ? 'BUGUNGI KUNLIK SINOV YAKUNLANDI!' : 'DAILY CHALLENGE COMPLETED!'}
                </p>
                <p className="font-sans text-[11px] text-mute">
                  {isUz
                    ? "Kunlik sinov faqat 1 kunda 1 marta o'ynaladi. Keyingi sinov ertaga 00:00 da ochiladi."
                    : 'Daily challenge can only be played once per day. Next challenge opens tomorrow at 00:00.'}
                </p>
              </div>
            ) : (
              <button type="button" onClick={onRestart} className="v-btn w-full">
                <RotateCcw className="h-4 w-4" />
                <span>{t('playAgain')}</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onReturnToHub) onReturnToHub()
                  else router.push('/')
                }}
                className="v-btn-ghost w-full !px-2 !py-2.5 !text-xs"
              >
                <Home className="h-3.5 w-3.5 text-acid" />
                <span>HUB</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onExitToModes) onExitToModes()
                  else router.push('/game')
                }}
                className="v-btn-ghost w-full !px-2 !py-2.5 !text-xs"
              >
                <Swords className="h-3.5 w-3.5 text-tide" />
                <span>{isUz ? 'REJIMLAR' : 'MODES'}</span>
              </button>

              <Link href="/leaderboard" className="v-btn-ghost w-full !px-2 !py-2.5 !text-xs">
                <Trophy className="h-3.5 w-3.5 text-gold" />
                <span>{isUz ? 'REYTING' : 'LADDER'}</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
