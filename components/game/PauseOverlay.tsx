'use client'

import { motion } from 'framer-motion'
import { Play, RotateCcw, Volume2, VolumeX, Home, Settings } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'

interface PauseOverlayProps {
  onResume: () => void
  onRestart: () => void
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: 'classic' | 'survival' | 'daily'
  isMuted: boolean
  onToggleSound: () => void
}

export default function PauseOverlay({
  onResume,
  onRestart,
  score,
  level,
  kills,
  survivalTime,
  gameMode,
  isMuted,
  onToggleSound,
}: PauseOverlayProps) {
  const { lang } = useLanguage()
  const isUz = lang === 'uz'

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-default">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md glass-panel p-4 sm:p-8 rounded-3xl border border-cyan-500/40 bg-slate-950/95 text-white space-y-4 sm:space-y-6 text-center shadow-[0_0_50px_rgba(0,240,255,0.2)] max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Settings className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
            {isUz ? 'PAUZA MENYUSI' : 'PAUSE MENU'}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {gameMode} protocol
          </div>
          <h2 className="text-3xl font-mono font-extrabold text-white text-glow-cyan">
            {isUz ? 'O\'YIN TO\'XTATILDI' : 'GAME PAUSED'}
          </h2>
        </div>

        {/* Current Run Snapshot */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 grid grid-cols-2 gap-3 text-left font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Joriy Ball' : 'Current Score'}</span>
            <span className="text-xl font-bold text-cyan-300">{score}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Daraja' : 'Level'}</span>
            <span className="text-xl font-bold text-purple-300">Level {level}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'O\'ldirildi' : 'Kills'}</span>
            <span className="text-sm font-bold text-rose-400">{kills}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{isUz ? 'Vaqt' : 'Time'}</span>
            <span className="text-sm font-bold text-slate-300">{formatTime(survivalTime)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl font-mono text-sm font-extrabold uppercase tracking-wider btn-cyber-primary flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            <span>{isUz ? 'DAVOM ETTIRISH' : 'RESUME SIMULATION'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{isUz ? 'QAYTA' : 'RESTART'}</span>
            </button>

            <button
              onClick={onToggleSound}
              className="w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
              <span>{isMuted ? (isUz ? 'O\'CHIRILGAN' : 'MUTED') : (isUz ? 'OVOZ BOR' : 'SOUND ON')}</span>
            </button>
          </div>

          <Link
            href="/"
            className="w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center gap-1.5"
          >
            <Home className="h-4 w-4" />
            <span>{isUz ? 'HUBGA QAYTISH' : 'RETURN TO HUB'}</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
