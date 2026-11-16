'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MutationDefinition } from '@/lib/game/mutations'
import { MutationCombo } from '@/lib/game/combos'
import { Dna, RefreshCw, Ban, Lock, Zap, ArrowUpRight } from 'lucide-react'
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

  const getRarityAccent = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return { cls: 'v-accent-gold', text: 'text-gold' }
      case 'Epic':
        return { cls: 'v-accent-acid', text: 'text-acid' }
      case 'Rare':
        return { cls: 'v-accent-tide', text: 'text-tide' }
      case 'Common':
      default:
        return { cls: 'v-accent-bone', text: 'text-bone' }
    }
  }

  const getRarityLabel = (rarity: string) => {
    if (!isUz) return rarity
    switch (rarity) {
      case 'Legendary':
        return 'Afsonaviy'
      case 'Epic':
        return 'Epik'
      case 'Rare':
        return 'Kam'
      case 'Common':
        return 'Oddiy'
      default:
        return rarity
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
    <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-ink/90 p-4">
      <div className="relative max-h-[92dvh] w-full max-w-5xl space-y-5 overflow-y-auto text-center">
        {/* Header */}
        <div className="space-y-2">
          <div className="v-tag v-accent-acid">
            <Dna className="h-3.5 w-3.5" />
            <span>
              {isUz ? `${level}-DARAJA MUTATSIYA OCHILDI` : `LEVEL ${level} MUTATION UNLOCKED`}
            </span>
          </div>
          <h2 className="v-display text-4xl text-bone sm:text-6xl">
            {isUz ? 'MUTATSIYANGIZNI TANLANG' : 'CHOOSE EVOLUTION'}
          </h2>
          <p className="font-sans text-xs text-mute sm:text-sm">
            {isUz
              ? 'Patogeningiz qobiliyatini oshirish uchun bitta evolyutsion yangilanmani tanlang.'
              : 'Select one evolutionary upgrade to enhance your pathogen capabilities.'}
          </p>
        </div>

        {/* Active Combos Bar */}
        {activeCombos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 py-1">
            {activeCombos.map((c) => (
              <div key={c.id} className="v-tag v-accent-tide">
                <Zap className="h-3 w-3" />
                <span>
                  {c.badge} {isUz ? c.nameUz : c.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Reroll & Banishes Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {onReroll && (
            <button
              type="button"
              onClick={handleReroll}
              disabled={localRerolls <= 0}
              className="v-btn-ghost !py-2 !px-4 !text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {isUz ? 'QAYTA ALISHTIRISH' : 'REROLL'} ({localRerolls})
              </span>
            </button>
          )}

          <span className="v-label">
            {isUz ? `TAQIQLAR: ${localBanishes}` : `BANISHES: ${localBanishes}`}
          </span>
        </div>

        {/* 3 Mutation Cards */}
        <div className="grid grid-cols-1 gap-4 pt-1 landscape:grid-cols-3 md:grid-cols-3 md:gap-5">
          {displayedOptions.map((mutation, idx) => {
            const accent = getRarityAccent(mutation.rarity)
            const statTip = getStatTooltip(mutation)
            const isLocked = lockedId === mutation.id

            return (
              <motion.div
                key={mutation.id + '-' + idx}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.25 }}
                onClick={() => onSelectMutation(mutation)}
                className={`v-card ${isLocked ? 'v-accent-gold bg-ink-3' : accent.cls} group flex cursor-pointer flex-col justify-between space-y-4 p-5 text-left sm:p-6`}
              >
                <div className="space-y-4">
                  {/* Index + Actions + Rarity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="v-display text-3xl text-dim group-hover:text-bone">
                        0{idx + 1}
                      </span>
                      <span className="text-2xl">{mutation.badge}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {localBanishes > 0 && (
                        <button
                          type="button"
                          aria-label={isUz ? `${mutation.nameUz} ni taqiqlash` : `Banish ${mutation.name}`}
                          onClick={(e) => handleBanish(e, mutation.id)}
                          title={isUz ? 'Taqiqlash (Run davomida o‘chiradi)' : 'Banish from run'}
                          className="border border-line bg-ink p-1.5 text-ember transition-colors hover:border-ember"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={isLocked ? `${mutation.nameUz} qulfini ochish` : `${mutation.name} ni qulflash`}
                        onClick={(e) => handleToggleLock(e, mutation.id)}
                        title={isUz ? 'Qulflash' : 'Lock card'}
                        className={`border p-1.5 transition-colors ${
                          isLocked
                            ? 'border-gold bg-gold/15 text-gold'
                            : 'border-line bg-ink text-mute hover:border-line-strong hover:text-bone'
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      <span className={`v-tag ${accent.cls}`}>
                        {getRarityLabel(mutation.rarity)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className={`v-display text-2xl text-bone group-hover:${accent.text}`}>
                      {isUz ? mutation.nameUz || mutation.name : mutation.name}
                    </h3>
                    <p className="font-sans text-xs leading-relaxed text-mute">
                      {isUz ? mutation.descriptionUz || mutation.description : mutation.description}
                    </p>
                    {statTip && (
                      <p className={`pt-1 font-mono text-[10px] font-semibold ${accent.text}`}>
                        {statTip}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t border-line pt-3">
                  {mutation.maxStack > 1 && (
                    <div className="v-label">
                      {isUz ? `maks ${mutation.maxStack}x stak` : `max ${mutation.maxStack}x stack`}
                    </div>
                  )}

                  <div className="v-btn w-full !py-2.5 !text-sm">
                    <Dna className="h-4 w-4" />
                    <span>{isUz ? 'TANLASH' : 'SELECT EVOLUTION'}</span>
                    <ArrowUpRight className="v-arrow h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
