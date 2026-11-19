'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import {
  Play,
  Menu,
  X,
  Trophy,
  ShoppingBag,
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
import {
  getPlayerSessionSnapshot,
  getServerPlayerSessionSnapshot,
  refreshPlayerSession,
  subscribePlayerSession,
} from '@/lib/game/playerSession'

export default function Navbar({ coinBalanceOverride }: { coinBalanceOverride?: number }) {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const { settings, toggleTheme } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)

  const session = useSyncExternalStore(
    subscribePlayerSession,
    getPlayerSessionSnapshot,
    getServerPlayerSessionSnapshot
  )

  useEffect(() => {
    void refreshPlayerSession(false)
  }, [pathname])

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  const activePlayer = session.authenticated ? session.player : null
  const isProfileActive = pathname.startsWith('/profile')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-ink/88 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Left: Refined Brand Lockup */}
        <Link
          href="/"
          onMouseEnter={handleHover}
          onClick={handleClick}
          className="group flex shrink-0 items-center gap-3"
        >
          <div className="v-chamfer-sm flex h-9 w-9 items-center justify-center bg-acid text-ink transition-transform duration-300 group-hover:scale-105">
            <span className="v-display text-lg font-normal">C</span>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <span className="v-display text-2xl tracking-wide text-bone transition-colors group-hover:text-acid">
                CELLIX
              </span>
              <span className="border border-acid/45 bg-acid/12 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-acid">
                2.0
              </span>
            </div>
            <div className="mt-0.5 hidden items-center gap-1.5 sm:flex">
              <span className="v-live" aria-hidden />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-mute">
                BIOLUMEN ARENA
              </span>
            </div>
          </div>
        </Link>

        {/* Center: Primary Navigation Capsule (Desktop) */}
        <nav
          aria-label="Primary Navigation"
          className="v-chamfer-sm hidden items-center gap-1 border border-line bg-ink-2/95 p-1 md:flex"
        >
          <Link
            href="/skins"
            onMouseEnter={handleHover}
            onClick={handleClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
              pathname === '/skins'
                ? 'bg-gold/15 text-gold shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-gold)_45%,transparent)]'
                : 'text-mute hover:bg-ink-3/70 hover:text-bone'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-gold" />
            <span>ARMORY</span>
          </Link>

          <Link
            href="/leaderboard"
            onMouseEnter={handleHover}
            onClick={handleClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
              pathname === '/leaderboard'
                ? 'bg-acid/15 text-acid shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-acid)_45%,transparent)]'
                : 'text-mute hover:bg-ink-3/70 hover:text-bone'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-acid" />
            <span>LADDER</span>
          </Link>

          <div className="mx-0.5 h-4 w-px bg-line" />

          {activePlayer ? (
            <Link
              href="/profile/me"
              onMouseEnter={handleHover}
              onClick={handleClick}
              title={activePlayer.username}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.06em] transition-all ${
                isProfileActive
                  ? 'bg-tide/15 text-tide shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-tide)_45%,transparent)]'
                  : 'text-bone hover:bg-ink-3/70 hover:text-tide'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-bone/40"
                style={{ backgroundColor: activePlayer.avatarColor || 'var(--color-tide)' }}
                aria-hidden
              />
              <span className="max-w-[120px] truncate uppercase">{activePlayer.username}</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              onMouseEnter={handleHover}
              onClick={handleClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
                pathname === '/auth'
                  ? 'bg-acid/15 text-acid shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-acid)_45%,transparent)]'
                  : 'text-bone hover:bg-ink-3/70 hover:text-acid'
              }`}
            >
              <LogIn className="h-3.5 w-3.5 text-acid" />
              <span>{lang === 'uz' ? 'KIRISH' : 'LOGIN'}</span>
            </Link>
          )}
        </nav>

        {/* Right: Utilities + Settings Icon + Theme + Wallet + Play (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Dark/Light Theme Icon Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="v-chamfer-sm flex h-9 w-9 items-center justify-center border border-line bg-ink-2 text-bone transition-all hover:-translate-y-[1px] hover:border-acid hover:text-acid"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4 text-gold" />
            ) : (
              <Moon className="h-4 w-4 text-tide" />
            )}
          </button>

          {/* Icon-Only Settings Trigger */}
          <Link
            href="/settings"
            onMouseEnter={handleHover}
            onClick={handleClick}
            aria-label={lang === 'uz' ? 'Sozlamalar' : 'Settings'}
            title={lang === 'uz' ? 'Sozlamalar' : 'Settings'}
            className={`v-chamfer-sm group flex h-9 w-9 items-center justify-center border transition-all hover:-translate-y-[1px] ${
              pathname === '/settings'
                ? 'border-tide bg-tide/15 text-tide'
                : 'border-line bg-ink-2 text-mute hover:border-tide hover:text-tide'
            }`}
          >
            <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
          </Link>

          {/* Language Switcher */}
          <div className="v-chamfer-sm flex h-9 items-center border border-line bg-ink-2 p-0.5 font-mono text-[10px] font-bold">
            <button
              type="button"
              aria-label="Switch to Uzbek"
              onClick={() => {
                handleClick()
                setLang('uz')
              }}
              className={`h-full px-2 transition-colors ${
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
              className={`h-full px-2 transition-colors ${
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
            onClick={handleClick}
            className={`v-btn !px-4 !py-2.5 !text-sm ${
              pathname === '/game' ? 'ring-1 ring-acid' : ''
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>ARENA</span>
            <ArrowUpRight className="v-arrow h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Quick Cluster + Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="v-chamfer-sm flex h-9 w-9 items-center justify-center border border-line bg-ink-2 text-bone"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4 text-gold" />
            ) : (
              <Moon className="h-4 w-4 text-tide" />
            )}
          </button>

          <Link
            href="/settings"
            onClick={handleClick}
            aria-label={lang === 'uz' ? 'Sozlamalar' : 'Settings'}
            className={`v-chamfer-sm flex h-9 w-9 items-center justify-center border ${
              pathname === '/settings'
                ? 'border-tide bg-tide/15 text-tide'
                : 'border-line bg-ink-2 text-mute'
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => {
              handleClick()
              setMenuOpen((open) => !open)
            }}
            className="v-chamfer-sm border border-line-strong bg-ink-2 p-2 text-bone transition-colors hover:border-acid hover:text-acid"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {menuOpen && (
        <div className="v-panel v-accent-acid absolute right-4 top-[calc(100%+0.5rem)] z-50 flex w-64 flex-col gap-3 p-4 md:hidden">
          <Link
            href="/skins"
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            className={`flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider ${
              pathname === '/skins' ? 'text-gold' : 'text-bone'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-gold" />
              ARMORY
            </span>
            <ArrowUpRight className="h-3 w-3 text-dim" />
          </Link>

          <Link
            href="/leaderboard"
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            className={`flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider ${
              pathname === '/leaderboard' ? 'text-acid' : 'text-bone'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-acid" />
              LADDER
            </span>
            <ArrowUpRight className="h-3 w-3 text-dim" />
          </Link>

          {activePlayer ? (
            <Link
              href="/profile/me"
              onClick={() => {
                handleClick()
                setMenuOpen(false)
              }}
              className={`flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider ${
                isProfileActive ? 'text-tide' : 'text-bone'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-bone/40"
                  style={{ backgroundColor: activePlayer.avatarColor || 'var(--color-tide)' }}
                />
                <span className="truncate">{activePlayer.username}</span>
              </span>
              <ArrowUpRight className="h-3 w-3 text-dim" />
            </Link>
          ) : (
            <Link
              href="/auth"
              onClick={() => {
                handleClick()
                setMenuOpen(false)
              }}
              className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-acid"
            >
              <span className="flex items-center gap-2">
                <LogIn className="h-3.5 w-3.5" />
                {lang === 'uz' ? 'KIRISH' : 'LOGIN'}
              </span>
              <ArrowUpRight className="h-3 w-3 text-dim" />
            </Link>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="v-chamfer-sm flex items-center border border-line bg-ink p-0.5 font-mono text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  handleClick()
                  setLang('uz')
                }}
                className={`px-2.5 py-1 ${lang === 'uz' ? 'bg-acid text-ink' : 'text-mute'}`}
              >
                UZ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClick()
                  setLang('en')
                }}
                className={`px-2.5 py-1 ${lang === 'en' ? 'bg-acid text-ink' : 'text-mute'}`}
              >
                EN
              </button>
            </div>
            <CoinWallet compact balanceOverride={coinBalanceOverride} />
          </div>

          <Link
            href="/game"
            onClick={() => {
              handleClick()
              setMenuOpen(false)
            }}
            className="v-btn w-full !py-2.5 !text-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>ARENA</span>
          </Link>
        </div>
      )}
    </header>
  )
}
