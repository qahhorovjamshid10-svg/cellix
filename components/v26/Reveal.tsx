'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'

/** Returns a ref + boolean that flips to true once the element enters the viewport. */
export function useInViewOnce<T extends Element>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setInView(true))
      return () => cancelAnimationFrame(id)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])

  return [ref, inView] as const
}

/** Fades + lifts children in when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
}) {
  const [ref, inView] = useInViewOnce<HTMLElement>()
  return (
    <Tag
      ref={ref}
      data-in={inView}
      className={`v-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  )
}

/** Slides each line of a headline up from behind a mask. */
export function MaskText({
  lines,
  className = '',
  lineClassName = '',
  stagger = 90,
  delay = 0,
}: {
  lines: ReactNode[]
  className?: string
  lineClassName?: string
  stagger?: number
  delay?: number
}) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>()
  return (
    <span ref={ref} className={`block ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className={`v-mask ${lineClassName}`} data-in={inView}>
          <span style={{ transitionDelay: `${delay + i * stagger}ms` }}>{line}</span>
        </span>
      ))}
    </span>
  )
}
