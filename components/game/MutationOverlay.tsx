'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MutationDefinition } from '@/lib/game/mutations'
import { MutationCombo } from '@/lib/game/combos'
import { Sparkles, Dna, RefreshCw, Ban, Lock, Zap } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

interface MutationOverlayProps {
  level: number
  options: MutationDefinition[]
  onSelectMutation: (mutation: MutationDefinition) => void
  onReroll?: () => void
  onBanish?: (mutationId: string) => void
  rerollsLeft?: number
  banishesLeft?: number
  activeCombos?: MutationCombo[]
}

export default function MutationOverlay({
  level,
  options,
  onSelectMutation,
  onReroll,
  onBanish,
  rerollsLeft = 2,
  banishesLeft = 1,
  activeCombos = [],
}: MutationOverlayProps) {
  const { lang } = useLanguage()
  const isUz = lang === 'uz'

  const [lockedId, setLockedId] = useState<string | null>(null)
  const [localRerolls, setLocalRerolls] = useState(rerollsLeft)
  const [localBanishes, setLocalBanishes] = useState(banishesLeft)
  const [banishedSet, setBanishedSet] = useState<Set<string>>(new Set())

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return 'bg-pink-950/80 border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
      case 'Epic':
        return 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
      case 'Rare':
        return 'bg-sky-950/80 border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
      case 'Common':
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300'
    }
  }

  const getRarityLabel = (rarity: string) => {
    if (!isUz) return rarity
    switch (rarity) {
      case 'Legendary': return 'Afsonaviy'
      case 'Epic': return 'Epik'
      case 'Rare': return 'Kam'
      case 'Common': return 'Oddiy'
      default: return rarity
    }
  }

  const getStatTooltip = (m: MutationDefinition) => {
    const parts: string[] = []
    const s = m.statBoost
    if (s.speedPct) parts.push(`+${Math.round(s.speedPct * 100)}% ${isUz ? 'tezlik' : 'speed'}`)
    if (s.powerPct) parts.push(`+${Math.round(s.powerPct * 100)}% ${isUz ? 'kuch' : 'damage'}`)
    if (s.maxHpPct) parts.push(`+${Math.round(s.maxHpPct * 100)}% ${isUz ? 'maks HP' : 'max HP'}`)
    if (s.xpGainPct) parts.push(`+${Math.round(s.xpGainPct * 100)}% XP`)
    if (s.critChancePct) parts.push(`+${Math.round(s.critChancePct * 100)}% ${isUz ? 'krit' : 'crit'}`)
    if (s.hpRegen) parts.push(`${Math.round(s.hpRegen * 100)}%/s ${isUz ? 'tiklanish' : 'regen'}`)
    if (s.hasMagnetRadius) parts.push(`${s.hasMagnetRadius}px ${isUz ? 'radius' : 'range'}`)
    return parts.join(' · ')
  }

  const handleReroll = () => {
    if (localRerolls <= 0 || !onReroll) return
    setLocalRerolls((prev) => prev - 1)
    onReroll()
  }

  const handleBanish = (e: React.MouseEvent, mId: string) => {
    e.stopPropagation()
    if (localBanishes <= 0) return
    setLocalBanishes((prev) => prev - 1)
    setBanishedSet((prev) => new Set(prev).add(mId))
    if (onBanish) onBanish(mId)
  }

  const handleToggleLock = (e: React.MouseEvent, mId: string) => {
    e.stopPropagation()
    setLockedId((prev) => (prev === mId ? null : mId))
  }

  const displayedOptions = options.filter((m) => !banishedSet.has(m.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-default">
      <div className="relative w-full max-w-4xl space-y-6 text-center">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
            {isUz
              ? `${level}-DARAJA MUTATSIYA OCHILDI`
              : `LEVEL ${level} MUTATION UNLOCKED`}
          </div>
          <h2 className="text-3xl sm:text-5xl font-mono font-extrabold tracking-tight text-white text-glow-cyan">
            {isUz ? 'MUTATSIYANGIZNI TANLANG' : 'CHOOSE YOUR MUTATION'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            {isUz
              ? 'Patogeningiz qobiliyatini oshirish uchun bitta evolyutsion yangilanmani tanlang.'
              : 'Select one evolutionary upgrade to enhance your pathogen capabilities.'}
          </p>
        </div>

        {/* Active Combos Bar */}
        {activeCombos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 py-1">
            {activeCombos.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold"
              >
                <Zap className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                <span>{c.badge} {isUz ? c.nameUz : c.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reroll & Utility Bar */}
        <div className="flex items-center justify-center gap-3">
          {onReroll && (
            <button
              onClick={handleReroll}
              disabled={localRerolls <= 0}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 border ${
                localRerolls > 0
                  ? 'bg-slate-900 border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/50 hover:border-cyan-400 cursor-pointer'
                  : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${localRerolls > 0 ? 'animate-spin-slow' : ''}`} />
              <span>{isUz ? 'QAYTA ALISHTIRISH' : 'REROLL'} ({localRerolls})</span>
            </button>
          )}

          <div className="text-xs font-mono text-slate-500">
            {isUz ? `Taqiqlar: ${localBanishes}` : `Banishes: ${localBanishes}`}
          </div>
        </div>

        {/* 3 Interactive Mutation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
          {displayedOptions.map((mutation, idx) => {
            const rarityStyle = getRarityBadgeColor(mutation.rarity)
            const statTip = getStatTooltip(mutation)
            const isLocked = lockedId === mutation.id

            return (
              <motion.div
                key={mutation.id + '-' + idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                onClick={() => onSelectMutation(mutation)}
                className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden text-left cursor-pointer ${
                  isLocked
                    ? 'border-yellow-500/80 bg-yellow-950/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                    : 'border-slate-800 hover:border-cyan-400 hover:bg-slate-900/80'
                }`}
              >
                {/* Top Actions & Rarity Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{mutation.badge}</span>
                  <div className="flex items-center gap-1.5">
                    {/* Banish Button */}
                    {localBanishes > 0 && (
                      <button
                        type="button"
                        aria-label={isUz ? `${mutation.nameUz} ni taqiqlash` : `Banish ${mutation.name}`}
                        onClick={(e) => handleBanish(e, mutation.id)}
                        title={isUz ? 'Taqiqlash (Run davomida o\'chiradi)' : 'Banish from run'}
                        className="p-1 rounded-md bg-slate-900 border border-slate-700 text-rose-400 hover:bg-rose-950 hover:border-rose-500 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* Lock Button */}
                    <button
                      type="button"
                      aria-label={isLocked ? `${mutation.nameUz} qulfini ochish` : `${mutation.name} ni qulflash`}
                      onClick={(e) => handleToggleLock(e, mutation.id)}
                      title={isUz ? 'Qulflash' : 'Lock card'}
                      className={`p-1 rounded-md border transition-colors ${
                        isLocked
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </button>

                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${rarityStyle}`}
                    >
                      {getRarityLabel(mutation.rarity)}
                    </span>
                  </div>
                </div>

                {/* Mutation Info */}
                <div className="space-y-1">
                  <h3 className="text-lg font-mono font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {isUz ? (mutation.nameUz || mutation.name) : mutation.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    {isUz ? (mutation.descriptionUz || mutation.description) : mutation.description}
                  </p>
                  {/* Stat tooltip */}
                  {statTip && (
                    <p className="text-[10px] font-mono text-cyan-500/70 mt-1">
                      {statTip}
                    </p>
                  )}
                </div>

                {/* Stack indicator */}
                {mutation.maxStack > 1 && (
                  <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                    {isUz ? `maks ${mutation.maxStack}x stak` : `max ${mutation.maxStack}x stack`}
                  </div>
                )}

                {/* Select Button */}
                <button type="button" className="w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-300 group-hover:btn-cyber-primary group-hover:text-slate-950 transition-all flex items-center justify-center gap-1.5">
                  <Dna className="h-4 w-4" />
                  <span>{isUz ? 'TANLASH' : 'SELECT EVOLUTION'}</span>
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
