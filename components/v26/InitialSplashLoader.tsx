'use client'

import { useEffect, useState } from 'react'
import CellixLoader from './CellixLoader'

/**
 * Initial entry boot overlay displaying the CELLIX logo + smooth 1% -> 100%
 * animated progress bar on initial site entry / reload, then smoothly fades out.
 */
export default function InitialSplashLoader() {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading')
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    const start = performance.now()
    const duration = 760
    let rafId = 0
    let fadeTimer = 0
    let doneTimer = 0

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Fast start, smooth ease-out finish to 100%
      const eased = 1 - Math.pow(1 - t, 3)
      const pct = Math.max(1, Math.min(100, Math.round(1 + eased * 99)))
      setProgress(pct)

      if (t < 1) {
        rafId = window.requestAnimationFrame(step)
      } else {
        fadeTimer = window.setTimeout(() => setPhase('fading'), 120)
        doneTimer = window.setTimeout(() => setPhase('done'), 340)
      }
    }

    rafId = window.requestAnimationFrame(step)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-[130] transition-opacity duration-200 ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <CellixLoader
        variant="fullscreen"
        label={progress >= 100 ? 'ARENA TAYYOR // READY' : 'CELLIX // BIOLUMEN CORE'}
        sublabel="INITIALIZING 3D ARENA SYSTEMS"
        progress={progress}
      />
    </div>
  )
}
