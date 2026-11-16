'use client'

import { useEffect, useState } from 'react'
import { useInViewOnce } from './Reveal'

/** Counts from 0 to `to` with an ease-out curve once visible. */
export default function CountUp({
  to,
  duration = 1600,
  suffix = '',
  prefix = '',
  className = '',
  pad = 0,
}: {
  to: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
  pad?: number
}) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      setValue(Math.round(to * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])

  const text = pad > 0 ? String(value).padStart(pad, '0') : value.toLocaleString()

  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}
