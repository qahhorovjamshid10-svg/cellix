'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>=_'

/**
 * Decodes text from random glyphs into the final string.
 * Throttled to ~45ms steps to avoid unnecessary 60fps React re-renders.
 */
export default function ScrambleText({
  text,
  className = '',
  duration = 550,
  playOnMount = true,
}: {
  text: string
  className?: string
  duration?: number
  playOnMount?: boolean
}) {
  const [output, setOutput] = useState(text)
  const frame = useRef<number | null>(null)
  const lastStep = useRef(0)

  const play = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current)
    const start = performance.now()
    lastStep.current = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      if (progress < 1 && now - lastStep.current < 45) {
        frame.current = requestAnimationFrame(tick)
        return
      }
      lastStep.current = now
      const revealed = Math.floor(progress * text.length)
      let next = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (i < revealed || ch === ' ') next += ch
        else next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      setOutput(next)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [text, duration])

  useEffect(() => {
    if (!playOnMount) return
    const id = requestAnimationFrame(() => play())
    return () => {
      cancelAnimationFrame(id)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [play, playOnMount])

  return (
    <span className={className} onMouseEnter={play} aria-label={text}>
      <span aria-hidden>{output}</span>
    </span>
  )
}
