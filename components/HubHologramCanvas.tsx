'use client'

import { useEffect, useRef } from 'react'

interface SpecimenNode {
  x: number
  y: number
  vx: number
  vy: number
  baseRadius: number
  color: string
  phase: number
  speed: number
}

/**
 * Interactive 2026 BIOLUMEN specimen telemetry canvas.
 * Palette: acid (#d4ff3a), tide (#3ae0c8), ember (#ff4d2e), bone (#ede9e0).
 */
export default function HubHologramCanvas({
  centerBiasX = 0.68,
  centerBiasY = 0.45,
}: {
  centerBiasX?: number
  centerBiasY?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrameId = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const mouse = { x: width * centerBiasX, y: height * centerBiasY, active: false }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    const handleMouseLeave = () => {
      mouse.active = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    const palette = ['#d4ff3a', '#d4ff3a', '#3ae0c8', '#ede9e0', '#ff4d2e']
    const count = width < 640 ? 28 : 44
    const nodes: SpecimenNode[] = Array.from({ length: count }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      baseRadius: i % 7 === 0 ? 4.5 : 2 + Math.random() * 2.5,
      color: palette[i % palette.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.025,
    }))

    let t = 0

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      if (!reducedMotion) t += 0.012

      const cx = width < 900 ? width * 0.5 : width * centerBiasX
      const cy = width < 900 ? height * 0.34 : height * centerBiasY
      const baseR = Math.min(width, height) * (width < 640 ? 0.24 : 0.2)

      // 1. Subtle radial biological warmth behind specimen
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseR * 2.2)
      glow.addColorStop(0, 'rgba(212, 255, 58, 0.12)')
      glow.addColorStop(0.45, 'rgba(58, 224, 200, 0.05)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 2.2, 0, Math.PI * 2)
      ctx.fill()

      // 2. Organic wobbling bio-membrane contour
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(212, 255, 58, 0.38)'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      const pts = 64
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2
        const wobble =
          Math.sin(a * 4 + t * 1.6) * 8 +
          Math.cos(a * 7 - t * 2.1) * 4 +
          Math.sin(a * 2 + t) * 5
        const r = baseR * 0.64 + wobble
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      // Inner nucleus wave
      ctx.strokeStyle = 'rgba(58, 224, 200, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2
        const r = baseR * 0.32 + Math.cos(a * 3 - t * 2.4) * 5
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()

      // 3. Calibration reticle rings & rotating radar sweep
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.45)
      ctx.strokeStyle = 'rgba(237, 233, 224, 0.14)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 10])
      ctx.beginPath()
      ctx.arc(0, 0, baseR * 1.1, 0, Math.PI * 2)
      ctx.stroke()

      // Tick notches around telemetry ring
      ctx.setLineDash([])
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        const r1 = baseR * 1.06
        const r2 = i % 3 === 0 ? baseR * 1.18 : baseR * 1.12
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(212, 255, 58, 0.6)' : 'rgba(237, 233, 224, 0.22)'
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
        ctx.stroke()
      }
      ctx.restore()

      // Radar sweep arm
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 1.1)
      const sweepGrad = ctx.createLinearGradient(0, 0, baseR * 1.1, 0)
      sweepGrad.addColorStop(0, 'rgba(212, 255, 58, 0.4)')
      sweepGrad.addColorStop(1, 'transparent')
      ctx.strokeStyle = sweepGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(baseR * 1.1, 0)
      ctx.stroke()
      ctx.restore()

      // Counter-rotating hexagonal containment cage
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-t * 0.3)
      ctx.strokeStyle = 'rgba(237, 233, 224, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        const r = baseR * 1.38
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()

      // 4. Synaptic hairline filaments between specimen spores
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dSq = dx * dx + dy * dy
          if (dSq < 140 * 140) {
            const alpha = (1 - Math.sqrt(dSq) / 140) * 0.14
            ctx.strokeStyle = `rgba(237, 233, 224, ${alpha})`
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        if (mouse.active) {
          const mdx = mouse.x - a.x
          const mdy = mouse.y - a.y
          const mdSq = mdx * mdx + mdy * mdy
          if (mdSq < 180 * 180) {
            const alpha = (1 - Math.sqrt(mdSq) / 180) * 0.35
            ctx.strokeStyle = `rgba(212, 255, 58, ${alpha})`
            ctx.lineWidth = 0.9
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.stroke()
          }
        }
      }

      // 5. Update & draw spore nodes
      for (const n of nodes) {
        if (!reducedMotion) {
          n.x += n.vx
          n.y += n.vy
          n.phase += n.speed
          if (n.x < -16) n.x = width + 16
          if (n.x > width + 16) n.x = -16
          if (n.y < -16) n.y = height + 16
          if (n.y > height + 16) n.y = -16

          if (mouse.active) {
            const dx = mouse.x - n.x
            const dy = mouse.y - n.y
            const dist = Math.hypot(dx, dy)
            if (dist < 170 && dist > 12) {
              n.x += (dx / dist) * 0.35
              n.y += (dy / dist) * 0.35
            }
          }
        }

        const r = Math.max(1.2, n.baseRadius + Math.sin(n.phase) * 0.9)
        ctx.fillStyle = n.color
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [centerBiasX, centerBiasY])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-85"
    />
  )
}
