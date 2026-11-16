'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Play,
  Menu,
  X,
  Volume2,
  VolumeX,
  Trophy,
  ShoppingBag,
  User,
  LogIn,
  ArrowUpRight,
  Settings,
  Sun,
  Moon,
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { useSettings } from '@/components/SettingsContext'
import CoinWallet from '@/components/CoinWallet'
import { soundManager } from '@/lib/game/engine/SoundManager'
import ScrambleText from '@/components/v26/ScrambleText'

export default function Navbar({ coinBalanceOverride }: { coinBalanceOverride?: number }) {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const { settings, toggleTheme, updateSettings } = useSettings()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMuted = settings.masterMuted

  useEffect(() => {
    const checkAuth = () => {
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data.player?.id) {
            setPlayerId(data.player.id)
          } else {
            setPlayerId(null)
          }
        })
        .catch(() => {})
    }
    checkAuth()
  }, [pathname])

  const toggleSound = () => {
    const nextMuted = !isMuted
    soundManager.setMuted(nextMuted)
    updateSettings({ masterMuted: nextMuted })
    if (!nextMuted) soundManager.playClick()
  }

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-ink/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Left: Brand Lockup & Live Server Telemetry */}
        <div className="flex items-center gap-5">
          <Link
            href="/"
            onMouseEnter={handleHover}
            onClick={handleClick}
            className="group flex items-center gap-3"
          >
            <div className="v-chamfer-sm flex h-9 w-9 items-center justify-center bg-acid text-ink transition-transform duration-300 group-hover:scale-105">
              <span className="v-display text-lg font-normal">C</span>
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-baseline gap-2">
                <span className="v-display text-2xl tracking-wide text-bone transition-colors group-hover:text-acid">
                  CELLIX
                </span>
                <span className="font-mono text-[10px] font-bold text-acid">2.0</span>
              </div>
              <span className="v-label hidden sm:block !text-[9px] !tracking-[0.2em]">
                <ScrambleText text="BIOLUMEN 2.0 ARENA" playOnMount={false} />
              </span>
            </div>
          </Link>

          <div className="hidden h-5 w-px bg-line lg:block" />

          <div className="hidden items-center gap-2 lg:flex">
            <span className="v-live" aria-hidden />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">
              20 TPS <span className="text-acid">SYNC</span>
            </span>
          </div>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => {
            handleClick()
            setMenuOpen((open) => !open)
          }}
          className="v-chamfer-sm border border-line-strong bg-ink-2 p-2 text-bone transition-colors hover:border-acid hover:text-acid md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Right: Editorial Links + Audio + Lang + Wallet */}
        <nav
          className={`${
            menuOpen ? 'flex' : 'hidden'
          } v-panel v-accent-acid absolute right-4 top-[calc(100%+0.5rem)] z-50 w-64 flex-col gap-3 p-4 md:static md:flex md:w-auto md:flex-row md:items-center md:gap-5 md:bg-transparent md:p-0 md:shadow-none md:[clip-path:none] md:before:hidden`}
        >
          <Link
            href="/skins"
            onMouseEnter={handleHover}
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            data-active={pathname === '/skins'}
            className={`v-link flex items-center gap-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              pathname === '/skins' ? 'text-gold' : 'text-mute hover:text-bone'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-gold" />
            <span>ARMORY</span>
          </Link>

          <Link
            href="/leaderboard"
            onMouseEnter={handleHover}
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            data-active={pathname === '/leaderboard'}
            className={`v-link flex items-center gap-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              pathname === '/leaderboard' ? 'text-acid' : 'text-mute hover:text-bone'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-acid" />
            <span>LADDER</span>
          </Link>

          <Link
            href="/settings"
            onMouseEnter={handleHover}
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            data-active={pathname === '/settings'}
            className={`v-link flex items-center gap-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              pathname === '/settings' ? 'text-tide' : 'text-mute hover:text-bone'
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-tide" />
            <span>{lang === 'uz' ? 'SOZLAMA' : 'SETTINGS'}</span>
          </Link>

          {playerId ? (
            <Link
              href="/profile/me"
              onMouseEnter={handleHover}
              onClick={() => {
                handleClick()
                setMenuOpen(false)
              }}
              data-active={pathname.startsWith('/profile')}
              className={`v-link flex items-center gap-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                pathname.startsWith('/profile') ? 'text-tide' : 'text-mute hover:text-bone'
              }`}
            >
              <User className="h-3.5 w-3.5 text-tide" />
              <span>DOSSIER</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              onMouseEnter={handleHover}
              onClick={() => {
                handleClick()
                setMenuOpen(false)
              }}
              data-active={pathname === '/auth'}
              className={`v-link flex items-center gap-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                pathname === '/auth' ? 'text-acid' : 'text-bone hover:text-acid'
              }`}
            >
              <LogIn className="h-3.5 w-3.5 text-acid" />
              <span>{lang === 'uz' ? 'KIRISH' : 'LOGIN'}</span>
            </Link>
          )}

          <div className="hidden h-4 w-px bg-line md:block" />

          {/* Theme Mode Switch (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="v-chamfer-sm flex items-center justify-center gap-1.5 border border-line bg-ink-2 px-2.5 py-1.5 font-mono text-[10px] text-bone transition-colors hover:border-acid hover:text-acid"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-gold" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-tide" />
            )}
          </button>

          {/* Sound Equalizer Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            title={isMuted ? 'Audio: Muted' : 'Audio: Active'}
            className="v-chamfer-sm flex items-center justify-center gap-1.5 border border-line bg-ink-2 px-2.5 py-1.5 font-mono text-[10px] text-bone transition-colors hover:border-acid hover:text-acid"
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-ember" />
            ) : (
              <div className="flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-acid" />
                <span className="flex h-3 items-end gap-0.5">
                  <span className="v-eq-bar h-3 w-0.5 bg-acid" />
                  <span className="v-eq-bar h-3 w-0.5 bg-acid" style={{ animationDelay: '0.2s' }} />
                  <span className="v-eq-bar h-3 w-0.5 bg-acid" style={{ animationDelay: '0.4s' }} />
                </span>
              </div>
            )}
          </button>

          {/* Language Switcher */}
          <div className="v-chamfer-sm flex items-center border border-line bg-ink-2 p-0.5 font-mono text-[10px] font-bold">
            <button
              type="button"
              aria-label="Switch to Uzbek"
              onClick={() => {
                handleClick()
                setLang('uz')
              }}
              className={`px-2 py-1 transition-colors ${
                lang === 'uz' ? 'bg-acid text-ink' : 'text-mute hover:text-bone'
              }`}
            >
              UZ
            </button>
            <button
              type="button"
              aria-label="Switch to English"
              onClick={() => {
                handleClick()
                setLang('en')
              }}
              className={`px-2 py-1 transition-colors ${
                lang === 'en' ? 'bg-acid text-ink' : 'text-mute hover:text-bone'
              }`}
            >
              EN
            </button>
          </div>

          <CoinWallet compact balanceOverride={coinBalanceOverride} />

          {/* Primary Play Trigger */}
          <Link
            href="/game"
            onMouseEnter={handleHover}
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            className={`v-btn !px-4 !py-2 !text-sm ${
              pathname === '/game' ? 'ring-1 ring-acid' : ''
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>ARENA</span>
            <ArrowUpRight className="v-arrow h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  )
}
