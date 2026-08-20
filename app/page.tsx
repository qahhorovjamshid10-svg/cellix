'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import HubHologramCanvas from '@/components/HubHologramCanvas'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { Play, User, Trophy, Hexagon, Crosshair, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

export default function HubLandingPage() {
  const { t, lang } = useLanguage()
  const isUz = lang === 'uz'
  const currentYear = new Date().getFullYear()

  const handleHover = () => {
    soundManager.playHover()
  }

  return (
    <div className="min-h-screen bg-[#040416] overflow-hidden relative flex flex-col text-white selection:bg-purple-500/30 selection:text-white">
      {/* Interactive 3D/Canvas Hologram Layer */}
      <HubHologramCanvas />

      {/* Cyberpunk Scanlines & Vignette */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(176, 38, 255, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(176, 38, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,4,22,0.85)_100%)]" />

      {/* Main UI Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto w-full">

          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-3xl mx-auto pt-2">

            {/* System Live Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/50 backdrop-blur-md text-purple-300 text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_25px_rgba(176,38,255,0.3)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{t('hubLive')}</span>
            </div>

            {/* Glowing Holographic Title Header */}
            <div className="flex flex-col items-center justify-center space-y-2 relative">

              {/* Holographic Glowing Badge */}
              <div className="relative flex items-center justify-center h-20 w-20 rounded-3xl bg-purple-950/80 border-2 border-purple-400/80 text-purple-300 shadow-[0_0_50px_rgba(176,38,255,0.5)] animate-virus-pulse">
                <Hexagon className="h-10 w-10 text-purple-300 animate-pulse" />
                <Sparkles className="h-4 w-4 text-blue-400 absolute top-2 right-2 animate-ping" />
              </div>

              <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-violet-400 to-blue-400 text-glow-purple drop-shadow-[0_0_50px_rgba(176,38,255,0.6)]">
                {t('brand')}
              </h1>
            </div>

            {/* Tagline & Description */}
            <div className="space-y-2">
              <p className="text-lg sm:text-2xl font-mono font-extrabold tracking-[0.25em] text-white uppercase text-glow-purple">
                {t('tagline')}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm font-mono max-w-md mx-auto">
                {t('subtitle')} — {t('hubDescription')}
              </p>
            </div>

            {/* Quick Play CTA */}
            <div className="pt-2">
              <Link
                href="/game"
                onMouseEnter={handleHover}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl btn-cyber-primary text-slate-950 font-mono text-sm font-black uppercase tracking-wider shadow-[0_0_30px_rgba(176,38,255,0.5)] hover:scale-105 transition-transform"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>{t('hubEnter')}</span>
              </Link>
            </div>
          </div>

          {/* Module Selection 3-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full pt-12">

            {/* 1. Host Profile Dossier Module */}
            <Link
              href="/profile/me"
              onMouseEnter={handleHover}
              className="group glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 hover:border-purple-400 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_40px_rgba(176,38,255,0.3)] flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <User className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{t('dossierLabel')}</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-mono font-bold text-white group-hover:text-purple-400 transition-colors">
                    {t('navProfile')}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    {t('cardProfileDesc')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                {t('viewProfileBtn')} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* 2. Main Arena Dispatch Module */}
            <Link
              href="/game"
              onMouseEnter={handleHover}
              className="group glass-panel p-6 sm:p-8 rounded-3xl border border-blue-500/40 hover:border-blue-400 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] flex flex-col justify-between bg-blue-950/20"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Crosshair className="h-7 w-7 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">{t('modesLabel')}</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-mono font-bold text-white group-hover:text-blue-400 transition-colors">
                    {t('navArena')}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    {t('cardArenaDesc')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                {t('launchArenaBtn')} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* 3. Global Leaderboard Rankings Module */}
            <Link
              href="/leaderboard"
              onMouseEnter={handleHover}
              className="group glass-panel p-6 sm:p-8 rounded-3xl border border-violet-500/30 hover:border-violet-400 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-2xl bg-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                    <Trophy className="h-7 w-7 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{t('rankingsLabel')}</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-mono font-bold text-white group-hover:text-violet-400 transition-colors">
                    {t('navLeaderboard')}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    {t('cardRankingsDesc')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-violet-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                {t('viewRankingsBtn')} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* 4. Cyber Armory Module */}
            <Link
              href="/skins"
              onMouseEnter={handleHover}
              className="group glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 hover:border-amber-400 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] flex flex-col justify-between bg-amber-950/10"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">ARMORY</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-mono font-bold text-white group-hover:text-amber-400 transition-colors">
                    {t('navArmory')}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    {t('cardArmoryDesc')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                {isUz ? 'BOZORNI OCHISH' : 'OPEN ARMORY'} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

          </div>
        </main>

        {/* Social Links & Copyright Footer */}
        <footer className="py-6 border-t border-purple-500/20 bg-[#040416]/90 backdrop-blur-md mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/iflxczz"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={handleHover}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel border border-slate-700 hover:border-purple-400 hover:bg-purple-500/10 text-slate-400 hover:text-purple-300 transition-all group"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span className="font-mono text-xs font-bold">@iflxczz</span>
              </a>

              <a
                href="https://tiktok.com/@iflxczz"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={handleHover}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel border border-slate-700 hover:border-purple-400 hover:bg-purple-500/10 text-slate-400 hover:text-purple-300 transition-all group"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.96-1.72 5.39-1.21 1.46-3.08 2.29-4.98 2.32-1.92.03-3.88-.5-5.32-1.84-1.39-1.33-2.12-3.31-1.95-5.26.17-1.92 1.25-3.66 2.84-4.66 1.44-.91 3.23-1.16 4.84-.74v4.22c-1.12-.26-2.42-.03-3.23.8-.75.82-.94 2-.62 3.08.33 1.11 1.34 1.9 2.5 2.06 1.17.15 2.45-.19 3.28-1.02.82-.82 1.21-2 1.19-3.16V0h-1.22z" />
                </svg>
                <span className="font-mono text-xs font-bold">@iflxczz</span>
              </a>
            </div>

            {/* Copyright & Year */}
            <div className="text-slate-400 font-mono text-xs flex items-center gap-1.5">
              <span>CELLIX Arena &copy; {currentYear}</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-300 font-semibold">{t('createdBy')}</span>
            </div>

          </div>
        </footer>
      </div>
    </div>
  )
}
