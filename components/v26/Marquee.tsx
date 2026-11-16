import type { ReactNode } from 'react'

/** Infinite horizontal ticker. Content is duplicated for a seamless loop. */
export default function Marquee({
  children,
  reverse = false,
  className = '',
}: {
  children: ReactNode
  reverse?: boolean
  className?: string
}) {
  const anim = reverse ? 'animate-marquee-reverse' : 'animate-marquee'
  return (
    <div className={`v-marquee ${className}`}>
      <div className={anim}>{children}</div>
      <div className={anim} aria-hidden>
        {children}
      </div>
    </div>
  )
}
