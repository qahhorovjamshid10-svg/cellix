'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { Hexagon, Trophy, User, Play, Menu, X, ShoppingBag, LogIn } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import CoinWallet from '@/components/CoinWallet'

function subscribeToPlayerCookie() {
  return () => {}
}

function getPlayerIdFromCookie() {
  if (typeof document === 'undefined') return null
  return document.cookie.match(/virus_player_id=([^;]+)/)?.[1] ?? null
}

export default function Navbar({ coinBalanceOverride }: { coinBalanceOverride?: number }) {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const playerId = useSyncExternalStore(subscribeToPlayerCookie, getPlayerIdFromCookie, () => null)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-400 group-hover:border-purple-400 group-hover:shadow-[0_0_15px_rgba(176,38,255,0.5)] transition-all">
            <Hexagon className="h-6 w-6 animate-pulse text-purple-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xl font-extrabold tracking-wider text-white group-hover:text-purple-400 transition-colors">
              CELLIX<span className="text-purple-400">.</span>
            </span>
          </div>
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Minimal Navigation Links */}
        <nav className={`${menuOpen ? 'flex' : 'hidden'} absolute right-4 top-[calc(100%+0.5rem)] z-50 w-56 flex-col gap-2 rounded-2xl border border-purple-500/30 bg-slate-950/95 p-3 shadow-2xl md:static md:flex md:w-auto md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <Link
            href="/game"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              pathname === '/game'
                ? 'btn-cyber-primary text-slate-950'
                : 'text-purple-400 bg-purple-950/40 border border-purple-500/30 hover:bg-purple-500/20'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>ARENA</span>
          </Link>

          <Link
            href="/leaderboard"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              pathname === '/leaderboard'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>LEADERBOARD</span>
          </Link>

          <Link
            href="/skins"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              pathname === '/skins'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
            <span>ARMORY</span>
          </Link>

          {playerId ? (
            <Link
              href={`/profile/${playerId}`}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                pathname.startsWith('/profile')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>PROFILE</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{lang === 'uz' ? 'KIRISH' : 'LOGIN'}</span>
            </Link>
          )}

          {/* Language Toggle */}
          <div className="flex items-center ml-2 border border-slate-800 rounded-lg p-0.5 bg-slate-950">
            <button
              type="button"
              aria-label="Switch to Uzbek"
              onClick={() => setLang('uz')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                lang === 'uz'
                  ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(176,38,255,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              UZ
            </button>
            <button
              type="button"
              aria-label="Switch to English"
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                lang === 'en'
                  ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(176,38,255,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <CoinWallet compact balanceOverride={coinBalanceOverride} />
        </nav>
      </div>
    </header>
  )
}
