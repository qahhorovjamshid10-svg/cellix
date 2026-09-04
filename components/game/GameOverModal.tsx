'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, RotateCcw, Trophy, Check, Award, Download, Swords, Coins } from 'lucide-react'
import Link from 'next/link'
import { checkRunAchievements, saveRunHistory, Achievement } from '@/lib/game/achievements'
import { useLanguage } from '@/components/LanguageContext'
import confetti from 'canvas-confetti'
import { syncCoinBalance } from '@/lib/game/cosmetics'

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
  gameMode: 'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer'
  wave?: number
  isVictory?: boolean
  wavesCleared?: number
  runToken: string | null
  onRestart: () => void
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
}: GameOverModalProps) {
  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'

  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'failed'>(runToken ? 'saving' : 'failed')
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [downloadedCard, setDownloadedCard] = useState(false)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const hasRun = useRef(false)

  // Save run history and check achievements on mount
  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    saveRunHistory({
      score,
      level,
      kills,
      survivalTime,
      gameMode: gameMode === 'practice' || gameMode === 'multiplayer' ? 'classic' : gameMode,
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
      gameMode: gameMode === 'practice' || gameMode === 'multiplayer' ? 'classic' : gameMode,
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

  }, [score, level, kills, survivalTime, gameMode, isVictory, wave, wavesCleared, damageDealt, damageTaken, criticalHits, bossDefeated, combosCount])

  const saveAttempted = useRef(false)

  // Submit the run automatically when the Game Over modal appears.
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
  }, [score, level, kills, survivalTime, mutationsCount, damageDealt, damageTaken, criticalHits, bossDefeated, gameMode, runToken])

  // Generate Cyberpunk Share Card (PNG)
  const handleExportCard = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 450
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 450)
    bgGrad.addColorStop(0, '#040416')
    bgGrad.addColorStop(0.5, '#0d0d2b')
    bgGrad.addColorStop(1, '#06061e')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, 800, 450)

    // Border Glow
    ctx.strokeStyle = '#b026ff'
    ctx.lineWidth = 4
    ctx.strokeRect(12, 12, 776, 426)

    ctx.strokeStyle = '#06b6d4'
    ctx.lineWidth = 1
    ctx.strokeRect(18, 18, 764, 414)

    // Header Branding
    ctx.font = 'bold 28px monospace'
    ctx.fillStyle = '#b026ff'
    ctx.fillText('CELLIX v1.2', 40, 60)

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = '#06b6d4'
    ctx.fillText(`• ${gameMode.toUpperCase()} RUN SUMMARY`, 220, 58)

    // Status Banner
    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = isVictory ? '#10b981' : '#ef4444'
    ctx.fillText(isVictory ? '★ ARENA PURGED / VICTORY ★' : '✖ ENTITY TERMINATED ✖', 40, 105)

    // Score Callout
    ctx.font = 'bold 44px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(score.toLocaleString(), 40, 165)

    ctx.font = '12px monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('FINAL BIO-SCORE', 40, 185)

    // Stats Grid
    const stats = [
      { label: 'LEVEL REACHED', val: `LVL ${level}` },
      { label: 'ENEMIES KILLED', val: `${kills}` },
      { label: 'SURVIVAL TIME', val: formatTime(survivalTime) },
      { label: 'DAMAGE DEALT', val: `${Math.round(damageDealt).toLocaleString()}` },
      { label: 'CRITICAL HITS', val: `${criticalHits}` },
      { label: 'MUTATIONS & COMBOS', val: `${mutationsCount} (${combosCount} Synergies)` },
    ]

    stats.forEach((st, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 40 + col * 240
      const y = 240 + row * 70

      ctx.fillStyle = '#1e1b4b'
      ctx.fillRect(x, y, 220, 52)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, 220, 52)

      ctx.font = '10px monospace'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(st.label, x + 12, y + 20)

      ctx.font = 'bold 16px monospace'
      ctx.fillStyle = '#38bdf8'
      ctx.fillText(st.val, x + 12, y + 42)
    })

    // Footer
    ctx.font = '11px monospace'
    ctx.fillStyle = '#64748b'
    ctx.fillText('CELLIX OS • PLAY ONLINE: @iflxczz', 40, 410)

    // Download PNG
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-default">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-purple-500/50 bg-slate-950/95 max-w-md w-full text-center space-y-5 shadow-[0_0_60px_rgba(176,38,255,0.4)] relative overflow-hidden"
        >
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-2xl border-2 ${
              isVictory
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
            }`}>
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white uppercase text-glow-purple">
              {isVictory ? (isUz ? 'ARENA TOZALANDI!' : 'ARENA PURGED!') : t('entityTerminated')}
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">
              {isVictory ? (isUz ? 'Muvaffaqiyatli g‘alaba' : 'Successful Extermination') : t('cellDestroyed')}
            </p>
          </div>

          {/* Core Score Display */}
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center space-y-1">
            <span className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">{t('finalScore')}</span>
            <div className="text-3xl sm:text-4xl font-mono font-black text-white text-glow-purple">
              {score.toLocaleString()}
            </div>
          </div>

          {coinsEarned > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 font-mono text-sm font-bold text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.16)]">
              <Coins className="h-5 w-5 text-amber-400" />
              <span>+{coinsEarned} {t('coinUnit')}</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400/70">{t('coinReward')}</span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-left font-mono p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{t('levelReached')}</span>
              <span className="text-sm font-bold text-purple-300">Level {level}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{t('enemiesDefeated')}</span>
              <span className="text-sm font-bold text-rose-400">{kills} Kills</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Mutatsiyalar' : 'Mutations'}</span>
              <span className="text-sm font-bold text-amber-300">{mutationsCount} ({combosCount} Synergies)</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Berilgan Zarar' : 'Damage Dealt'}</span>
              <span className="text-sm font-bold text-cyan-300">{Math.round(damageDealt).toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Kritik Zarbalar' : 'Critical Hits'}</span>
              <span className="text-sm font-bold text-amber-300">{criticalHits}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase">{t('survivalTime')}</span>
              <span className="text-sm font-bold text-emerald-400">{formatTime(survivalTime)}</span>
            </div>

            {/* Newly Unlocked Achievements Badge Banner */}
            {newAchievements.length > 0 && (
              <div className="col-span-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-left space-y-1 font-mono">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase">
                  <Award className="h-3.5 w-3.5" />
                  <span>{isUz ? 'Yangi Yutuq Ochildi!' : 'Achievement Unlocked!'}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newAchievements.map((ach) => (
                    <span
                      key={ach.id}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-900/60 border border-amber-500/40 text-amber-200"
                    >
                      <span>{ach.badge}</span>
                      <span>{ach.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Automatic leaderboard save status */}
          <div className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 ${
            saveState === 'saved'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : saveState === 'saving'
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}>
            {saveState === 'saved' && <Check className="h-4 w-4 text-emerald-400" />}
            <span>
              {saveState === 'saved'
                ? t('saved')
                : saveState === 'saving'
                  ? t('saving')
                  : (isUz ? 'Natija saqlanmadi' : 'Score not saved')}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-1 font-mono">
            {/* Export Card PNG */}
            <button
              onClick={handleExportCard}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadedCard ? t('shareSuccess') : t('exportCardBtn')}</span>
            </button>

            {gameMode === 'daily' ? (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/40 text-center space-y-1">
                <p className="text-xs font-mono font-bold text-amber-300">
                  {isUz ? "BUGUNGI KUNLIK SINOV YAKUNLANDI!" : "DAILY CHALLENGE COMPLETED!"}
                </p>
                <p className="text-[11px] font-mono text-slate-400">
                  {isUz ? "Kunlik sinov faqat 1 kunda 1 marta o'ynaladi. Keyingi sinov ertaga 00:00 da ochiladi." : "Daily challenge can only be played once per day. Next challenge opens tomorrow at 00:00."}
                </p>
              </div>
            ) : (
              <button
                onClick={onRestart}
                className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider btn-cyber-primary text-slate-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t('playAgain')}</span>
              </button>
            )}

            {/* Return to Arena Modes Screen */}
            <a
              href="/game"
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-950/40 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(176,38,255,0.2)]"
            >
              <Swords className="h-3.5 w-3.5 text-purple-400" />
              <span>{t('returnToArena')}</span>
            </a>

            <Link
              href="/leaderboard"
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider glass-panel border border-purple-500/40 text-purple-300 hover:bg-purple-950/40 transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{t('viewRankingsBtn')}</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
