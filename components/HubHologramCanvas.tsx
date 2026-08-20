'use client'

import { useEffect, useRef } from 'react'

interface CellParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  pulse: number
  pulseSpeed: number
}

export default function HubHologramCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Mouse tracker
    const mouse = { x: width / 2, y: height / 2, active: false }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Generate floating cells
    const colors = ['#b026ff', '#8b5cf6', '#3b82f6', '#ec4899', '#00f0ff']
    const particles: CellParticle[] = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: 3 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    }))

    // Hologram central ring angle
    let angle1 = 0
    let angle2 = 0

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw central holographic orb & rotating rings
      const centerX = width / 2
      const centerY = height * 0.38
      const coreRadius = Math.min(width, height) * 0.12

      // Core radial glow
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coreRadius * 2.5)
      grad.addColorStop(0, 'rgba(176, 38, 255, 0.25)')
      grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(centerX, centerY, coreRadius * 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Outer rotating ring 1
      angle1 += 0.008
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(angle1)
      ctx.strokeStyle = 'rgba(176, 38, 255, 0.35)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([12, 18])
      ctx.beginPath()
      ctx.arc(0, 0, coreRadius * 1.4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Outer rotating ring 2
      angle2 -= 0.012
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(angle2)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 12])
      ctx.beginPath()
      ctx.arc(0, 0, coreRadius * 1.7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // 2. Connect floating particles with energy filaments
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.hypot(dx, dy)
          const maxDist = 130

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.25
            ctx.strokeStyle = `rgba(176, 38, 255, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }

      // 3. Update & render particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed

        // Wrap around bounds
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        // Mouse attraction/repulsion
        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < 150) {
            p.x += (dx / dist) * 0.6
            p.y += (dy / dist) * 0.6
          }
        }

        const currentRadius = p.radius + Math.sin(p.pulse) * 1.5

        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(1, currentRadius), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none w-full h-full opacity-80"
    />
  )
}
