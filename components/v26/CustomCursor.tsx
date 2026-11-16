'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/components/SettingsContext'

/**
 * Ultra-responsive Tactical Bio-Reticle Cursor (UI pages).
 * - Preserves native OS hardware cursor for 0ms click accuracy
 * - Snaps with 0.72 responsiveness (no muddy trail) and sleeps immediately on settle
 * - Morphs cleanly on interactive cards/buttons and gives click recoil pulse
 * - Pure GPU transform (translate3d + rotate + scale), zero layout thrashing
 */
export default function CustomCursor() {
  const pathname = usePathname()
  const { settings } = useSettings()
  const reticleRef = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    const update = () => setEnabled(mq.matches)
    const id = requestAnimationFrame(update)
    mq.addEventListener('change', update)
    return () => {
      cancelAnimationFrame(id)
      mq.removeEventListener('change', update)
    }
  }, [])

  const active = enabled && settings.customCursor && !pathname?.startsWith('/game')

  useEffect(() => {
    if (!active) return
    const reticle = reticleRef.current
    if (!reticle) return

    let targetX = -100
    let targetY = -100
    let currX = -100
    let currY = -100
    let targetScale = 1
    let currScale = 1
    let targetRot = 0
    let currRot = 0
    let isPressed = false
    let isHoverInteractive = false
    let visible = false
    let rafId: number | null = null
    let lastTargetEl: EventTarget | null = null

    const applyTransform = () => {
      reticle.style.transform = `translate3d(${currX.toFixed(1)}px, ${currY.toFixed(1)}px, 0) rotate(${currRot.toFixed(1)}deg) scale(${currScale.toFixed(2)})`
    }

    const tick = () => {
      currX += (targetX - currX) * 0.72
      currY += (targetY - currY) * 0.72
      currScale += (targetScale - currScale) * 0.45
      currRot += (targetRot - currRot) * 0.4

      applyTransform()

      const settled =
        Math.abs(targetX - currX) < 0.25 &&
        Math.abs(targetY - currY) < 0.25 &&
        Math.abs(targetScale - currScale) < 0.01 &&
        Math.abs(targetRot - currRot) < 0.5

      if (settled) {
        currX = targetX
        currY = targetY
        currScale = targetScale
        currRot = targetRot
        applyTransform()
        rafId = null
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }

    const startLoop = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick)
      }
    }

    const syncState = () => {
      if (isPressed) {
        targetScale = 0.8
        targetRot = isHoverInteractive ? 45 : 15
      } else if (isHoverInteractive) {
        targetScale = 1.25
        targetRot = 45
      } else {
        targetScale = 1
        targetRot = 0
      }
      reticle.dataset.state = isPressed ? 'down' : isHoverInteractive ? 'lock' : 'idle'
    }

    const onMove = (e: PointerEvent) => {
      if (!visible) {
        visible = true
        currX = e.clientX
        currY = e.clientY
        reticle.style.opacity = '1'
      }
      targetX = e.clientX
      targetY = e.clientY

      if (e.target !== lastTargetEl) {
        lastTargetEl = e.target
        const el = e.target as HTMLElement | null
        isHoverInteractive = !!el?.closest(
          'a, button, [role="button"], .v-card, input, select, textarea, label'
        )
        syncState()
      }

      startLoop()
    }

    const onDown = () => {
      isPressed = true
      syncState()
      startLoop()
    }

    const onUp = () => {
      isPressed = false
      syncState()
      startLoop()
    }

    const onLeave = () => {
      visible = false
      reticle.style.opacity = '0'
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [active])

  if (!active) return null

  return (
    <div ref={reticleRef} className="v-cursor-reticle" data-state="idle" aria-hidden="true">
      <span className="v-cr-tl" />
      <span className="v-cr-tr" />
      <span className="v-cr-bl" />
      <span className="v-cr-br" />
      <span className="v-cr-core" />
    </div>
  )
}
