'use client'

import Link from 'next/link'
import { ArrowLeft, Play, Settings } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SettingsPanel from '@/components/SettingsPanel'
import { useLanguage } from '@/components/LanguageContext'
import { Reveal, MaskText } from '@/components/v26/Reveal'
import ScrambleText from '@/components/v26/ScrambleText'
import { soundManager } from '@/lib/game/engine/SoundManager'

export default function SettingsPage() {
  const { lang } = useLanguage()
  const isUz = lang === 'uz'

  return (
    <div className="min-h-screen bg-ink text-bone v-dots">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:py-14">
        {/* Header Bar */}
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="v-tag v-accent-acid">
                  <Settings className="h-3.5 w-3.5" />
                  <ScrambleText text="SYSTEM CONFIG // CELLIX 2.0" />
                </span>
                <span className="v-label">LOCALSTORAGE SYNCED</span>
              </div>
              <h1 className="v-display text-5xl text-bone sm:text-7xl">
                <MaskText lines={[isUz ? 'SOZLAMALAR' : 'SETTINGS']} />
              </h1>
              <p className="max-w-2xl font-sans text-sm text-mute">
                {isUz
                  ? "Dark/Light mavzular, ovoz va ambient miksher, kursor sezgirliki hamda jang boshqaruvini o'zingizga moslang."
                  : 'Customize Dark/Light theme, Web Audio mixer levels, combat controls, and visual performance.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                onClick={() => soundManager.playClick()}
                className="v-btn-ghost !px-4 !py-2.5 !text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isUz ? 'HUBGA QAYTISH' : 'BACK TO HUB'}</span>
              </Link>
              <Link
                href="/game"
                onClick={() => soundManager.playClick()}
                className="v-btn !px-5 !py-2.5 !text-sm"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isUz ? 'ARENAGA KIRISH' : 'ENTER ARENA'}</span>
              </Link>
            </div>
          </div>
        </Reveal>

        <SettingsPanel />
      </main>
    </div>
  )
}
