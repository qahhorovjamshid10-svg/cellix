'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { getDailyChallengeModifier } from '@/lib/game/daily'

const VirusGameContainer = dynamic(() => import('@/components/game/VirusGameContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#060620] text-white space-y-4 font-mono">
      <Hexagon className="h-12 w-12 text-purple-400 animate-spin" />
      <p className="text-sm text-purple-300 animate-pulse">BOOTING CELLIX v1.2 ENGINE...</p>
    </div>
  ),
})

export default function PlayGamePage() {
  const [selectedMode, setSelectedMode] = useState<'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer' | null>(null)
  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'

  const dailyMod = getDailyChallengeModifier()

  if (selectedMode) {
    return <VirusGameContainer gameMode={selectedMode} />
  }

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

          {/* 3. Daily Challenge */}
          <button
            onClick={() => setSelectedMode('daily')}
            className="group glass-panel rounded-2xl p-5 border border-amber-500/40 hover:border-amber-400 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.3)] text-left cursor-pointer flex flex-col justify-between bg-amber-950/20"
          >
            <div>
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform w-fit mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-mono font-bold text-white group-hover:text-amber-400 transition-colors">
                {isUz ? 'KUNLIK' : 'DAILY'}
              </h2>
              <p className="text-xs font-mono text-amber-300/80 mt-1 font-bold">
                {dailyMod.badge} {isUz ? dailyMod.nameUz : dailyMod.name}
              </p>
            </div>
            <div className="mt-4 text-[11px] font-mono text-amber-400 font-bold">
              <span>DAILY SEED</span>
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
    </div>
  )
}
