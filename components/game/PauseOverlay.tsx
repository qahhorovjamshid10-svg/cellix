'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, RotateCcw, Volume2, VolumeX, Home, Settings, Swords } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import SettingsPanel from '@/components/SettingsPanel'

interface PauseOverlayProps {
  onResume: () => void
  onRestart: () => void
  onExitToModes?: () => void
  onReturnToHub?: () => void
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: 'classic' | 'survival' | 'daily' | 'biowar'
  isMuted: boolean
  onToggleSound: () => void
}

export default function PauseOverlay({
  onResume,
  onRestart,
  onExitToModes,
  onReturnToHub,
  score,
  level,
  kills,
  survivalTime,
  gameMode,
  isMuted,
  onToggleSound,
}: PauseOverlayProps) {
  const router = useRouter()
  const { lang } = useLanguage()
  const isUz = lang === 'uz'
  const [tab, setTab] = useState<'menu' | 'settings'>('menu')

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[90] flex cursor-default items-center justify-center bg-ink/90 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className={`v-panel ${gameMode === 'biowar' ? 'v-accent-tide' : 'v-accent-acid'} relative max-h-[92dvh] w-full max-w-md space-y-5 overflow-y-auto p-6 text-center text-bone sm:p-7`}
      >
        {/* Header + Tab Switch */}
        <div className="space-y-3 border-b border-line pb-4">
          <div className="flex items-center justify-between gap-2">
            <span className={`v-tag ${gameMode === 'biowar' ? 'v-accent-tide' : 'v-accent-acid'}`}>
              {`${gameMode.toUpperCase()} // ESC`}
            </span>
            <div className="flex border border-line bg-ink font-mono text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setTab('menu')}
                className={`px-2.5 py-1 transition-colors ${
                  tab === 'menu' ? 'bg-acid text-ink' : 'text-mute hover:text-bone'
                }`}
              >
                {isUz ? 'PAUZA' : 'PAUSE'}
              </button>
              <button
                type="button"
                onClick={() => setTab('settings')}
                className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                  tab === 'settings' ? 'bg-tide text-ink' : 'text-mute hover:text-bone'
                }`}
              >
                <Settings className="h-3 w-3" />
                <span>{isUz ? 'SOZLAMA' : 'SETTINGS'}</span>
              </button>
            </div>
          </div>

          <h2 className="v-display text-4xl text-bone sm:text-5xl">
            {tab === 'settings'
              ? isUz
                ? 'SOZLAMALAR'
                : 'SETTINGS'
              : isUz
                ? 'PAUZA'
                : 'PAUSED'}
          </h2>
        </div>

        {tab === 'settings' ? (
          <div className="space-y-4">
            <SettingsPanel compact />
            <button type="button" onClick={onResume} className="v-btn w-full">
              <Play className="h-4 w-4 fill-current" />
              <span>{isUz ? 'ARENAGA QAYTISH' : 'RESUME MATCH'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Current Run Snapshot */}
            <div className="grid grid-cols-2 border border-line bg-ink text-left font-mono">
              <div className="border-b border-r border-line p-3.5">
                <span className="v-label block">
                  {gameMode === 'biowar' ? (isUz ? 'Massa' : 'Biomass') : isUz ? 'Joriy Ball' : 'Score'}
                </span>
                <span className="v-display mt-1 block text-2xl text-acid tabular-nums">
                  {score.toLocaleString()}
                </span>
              </div>

              <div className="border-b border-line p-3.5">
                <span className="v-label block">
                  {gameMode === 'biowar' ? (isUz ? 'Reyting' : 'Rank') : isUz ? 'Daraja' : 'Level'}
                </span>
                <span className="v-display mt-1 block text-2xl text-tide">
                  {gameMode === 'biowar' ? `#${level}` : `LV.${level}`}
                </span>
              </div>

              <div className="border-r border-line p-3.5">
                <span className="v-label block">{isUz ? "O'ldirildi" : 'Kills'}</span>
                <span className="v-display mt-1 block text-2xl text-ember">{kills}</span>
              </div>

              <div className="p-3.5">
                <span className="v-label block">{isUz ? 'Vaqt' : 'Time'}</span>
                <span className="v-display mt-1 block text-2xl text-bone tabular-nums">
                  {formatTime(survivalTime)}
                </span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-3 pt-1">
              <button type="button" onClick={onResume} className="v-btn w-full">
                <Play className="h-4 w-4 fill-current" />
                <span>{isUz ? 'DAVOM ETTIRISH [ESC]' : 'RESUME [ESC]'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onRestart} className="v-btn-ghost w-full !py-2.5 !text-sm">
                  <RotateCcw className="h-4 w-4" />
                  <span>{isUz ? 'QAYTA' : 'RESTART'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleSound}
                  className="v-btn-ghost w-full !py-2.5 !text-sm"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-ember" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-acid" />
                  )}
                  <span>
                    {isMuted ? (isUz ? "O'CHIK" : 'MUTED') : isUz ? 'OVOZ BOR' : 'SOUND ON'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onExitToModes) onExitToModes()
                    else router.push('/game')
                  }}
                  className="v-btn-ghost w-full !py-2.5 !text-xs"
                >
                  <Swords className="h-4 w-4 text-tide" />
                  <span>{isUz ? 'REJIMLAR' : 'MODES'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onReturnToHub) onReturnToHub()
                    else router.push('/')
                  }}
                  className="v-btn-ghost w-full !py-2.5 !text-xs"
                >
                  <Home className="h-4 w-4 text-acid" />
                  <span>{isUz ? 'HUBGA QAYTISH' : 'TO HUB'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
