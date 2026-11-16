'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { getDailyChallengeModifier } from '@/lib/game/daily'
import { useLanguage } from '@/components/LanguageContext'
import { Reveal, MaskText } from '@/components/v26/Reveal'
import ScrambleText from '@/components/v26/ScrambleText'
import CountUp from '@/components/v26/CountUp'
import Marquee from '@/components/v26/Marquee'
import {
  Play,
  ArrowUpRight,
  Crosshair,
  ShieldAlert,
  Flame,
  Zap,
  User,
  Crown,
  ShoppingBag,
  Radio,
  Keyboard,
} from 'lucide-react'

export default function HubLandingPage() {
  const { t, lang } = useLanguage()
  const isUz = lang === 'uz'
  const currentYear = new Date().getFullYear()
  const dailyMod = getDailyChallengeModifier()

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  const sectors = [
    {
      index: '01',
      href: '/game?mode=classic',
      accent: 'v-accent-acid',
      tagColor: 'text-acid',
      tag: 'SOLO ARCADE',
      title: t('modeClassic'),
      desc: isUz
        ? 'Cheksiz virus to‘dalari, adaptiv mutatsiyalar va global rekordlar poygasi.'
        : 'Infinite pathogen swarm, adaptive mutation builds, and ranked ladder ascent.',
      meta: 'ENDLESS // RANKED',
      Icon: Crosshair,
    },
    {
      index: '02',
      href: '/game?mode=survival',
      accent: 'v-accent-ember',
      tagColor: 'text-ember',
      tag: '10 WAVES // BOSS',
      title: t('modeSurvival'),
      desc: isUz
        ? '10 bosqichli og‘ir to‘lqinlar, ikki Overlord boss va yadro ekstraktsiyasi.'
        : 'Survive 10 escalating waves, defeat twin Overlord bosses, extract the core.',
      meta: 'HIGH THREAT',
      Icon: ShieldAlert,
    },
    {
      index: '03',
      href: '/game?mode=daily',
      accent: 'v-accent-gold',
      tagColor: 'text-gold',
      tag: '1 RUN / 24H // 3X CR',
      title: isUz ? 'KUNLIK SINOV' : 'DAILY HAZARD',
      desc: isUz
        ? 'Har kuni yangi kriptografik seed va qoidalar. Kuniga faqat bir urinish!'
        : 'Synchronized daily cryptographic seed with shifting rules. One shot per 24h.',
      meta: 'PRESTIGE BOUNTY',
      Icon: Flame,
    },
    {
      index: '04',
      href: '/game?mode=biowar',
      accent: 'v-accent-tide',
      tagColor: 'text-tide',
      tag: '30 ENTITIES // 20 TPS',
      title: 'BIO-WAR 30',
      desc: isUz
        ? '30 ta entiti bir arenada. 20 TPS avtoritativ WebSocket server fizikasi.'
        : '30-entity real-time slither + laser battle royale on a 20 TPS server.',
      meta: 'ONLINE MULTIPLAYER',
      Icon: Zap,
    },
  ]

  const keycaps = [
    { key: 'WASD', label: isUz ? 'HARAKAT' : 'STEER / MOVE' },
    { key: 'LMB / ARROWS', label: isUz ? 'OTISH / ZARYAD' : 'FIRE / CHARGE' },
    { key: 'SPACE', label: 'DASH' },
    { key: 'E', label: isUz ? 'IMPULS ZARBA' : 'SHOCKWAVE' },
    { key: 'Q', label: isUz ? 'KIBER QALQON' : 'PHASE SHIELD' },
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-ink text-bone v-dots">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        {/* Live Telemetry Bar */}
        <div className="border-b border-line bg-ink/85 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] text-mute">
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <span className="v-live shrink-0" aria-hidden />
              <span className="font-bold text-acid">PROTOCOL // 04:</span>
              <span className="text-bone">
                <ScrambleText text="BIOLUMEN NEO-MUTAGEN ARENA" />
              </span>
            </div>
            <div className="hidden items-center gap-5 md:flex">
              <span className="flex items-center gap-1.5 text-tide">
                <Radio className="h-3 w-3" />
                WS_20TPS
              </span>
              <span className="text-dim">|</span>
              <span>ANTI-CHEAT: VERIFIED</span>
              <span className="text-dim">|</span>
              <span className="text-bone">BUILD 2.0</span>
            </div>
          </div>
        </div>

        {/* SECTION 01: EDITORIAL ASYMMETRIC HERO */}
        <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:py-20">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
            {/* Left 8 Cols: Display Typography & CTAs */}
            <div className="space-y-8 lg:col-span-8">
              <Reveal>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="v-tag v-accent-acid">
                    <span className="v-live" aria-hidden />
                    <span>{isUz ? 'CELLIX 2.0 KIBER ARENA' : 'CELLIX 2.0 SPECIMEN ARENA'}</span>
                  </span>
                  <span className="v-label">PHASER 4 // AUTHORITATIVE ENGINE</span>
                </div>
              </Reveal>

              <h1 className="v-display text-[clamp(4.4rem,13vw,10.5rem)] leading-[0.84] tracking-tight">
                <MaskText
                  lines={[
                    <span key="brand" className="v-glitch inline-block text-bone">
                      {t('brand')}
                    </span>,
                    <span key="sub" className="v-stroke-acid inline-block">
                      {isUz ? 'EVOLYUTSIYA.' : 'DOMINATE.'}
                    </span>,
                  ]}
                  stagger={110}
                />
              </h1>

              <Reveal delay={180}>
                <p className="max-w-xl font-sans text-sm leading-relaxed text-mute sm:text-base">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-acid">
                    {t('tagline')} —{' '}
                  </span>
                  {t('hubDescription')}
                </p>
              </Reveal>

              <Reveal delay={260}>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/game"
                    onMouseEnter={handleHover}
                    onClick={handleClick}
                    className="v-btn"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{t('hubEnter')}</span>
                    <ArrowUpRight className="v-arrow h-4 w-4" />
                  </Link>

                  <Link
                    href="/skins"
                    onMouseEnter={handleHover}
                    onClick={handleClick}
                    className="v-btn-ghost"
                  >
                    <ShoppingBag className="h-4 w-4 text-gold" />
                    <span>{isUz ? 'KIBER ARMORY' : 'CYBER ARMORY'}</span>
                    <ArrowUpRight className="v-arrow h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              {/* Hairline Telemetry Numbers */}
              <Reveal delay={340}>
                <div className="grid max-w-2xl grid-cols-3 border-t border-line pt-6">
                  <div className="pr-4">
                    <span className="v-label block">TICK RATE</span>
                    <div className="v-display mt-1 text-3xl text-bone sm:text-4xl">
                      <CountUp to={20} suffix=" TPS" />
                    </div>
                  </div>
                  <div className="border-l border-line px-4">
                    <span className="v-label block">ARENA CAP</span>
                    <div className="v-display mt-1 text-3xl text-tide sm:text-4xl">
                      <CountUp to={30} suffix=" MAX" />
                    </div>
                  </div>
                  <div className="border-l border-line pl-4">
                    <span className="v-label block">COMBAT MODES</span>
                    <div className="v-display mt-1 text-3xl text-acid sm:text-4xl">
                      <CountUp to={4} pad={2} />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right 4 Cols: Specimen Dossier & Daily Hazard Slab */}
            <div className="lg:col-span-4">
              <Reveal delay={280}>
                <div className="v-panel v-accent-gold space-y-5 p-6 transition-transform duration-500 hover:-translate-y-1">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="v-label !text-gold">TODAY&apos;S MUTAGEN SEED</span>
                    <span className="v-tag v-accent-gold animate-float">3X BOUNTY</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl transition-transform duration-300 hover:scale-125">{dailyMod.badge}</span>
                      <h2 className="v-display text-2xl text-bone sm:text-3xl">
                        {isUz ? dailyMod.nameUz : dailyMod.name}
                      </h2>
                    </div>
                    <p className="font-mono text-xs leading-relaxed text-mute">
                      {isUz ? dailyMod.descriptionUz : dailyMod.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-line pt-4">
                    <span className="v-label">1 ATTEMPT / 24H</span>
                    <Link
                      href="/game?mode=daily"
                      onMouseEnter={handleHover}
                      onClick={handleClick}
                      className="v-link inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-gold"
                    >
                      <span>{isUz ? 'KIRISH' : 'DEPLOY'}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SECTION 02: KINETIC DUAL MARQUEE TICKER (Yellow/Acid Moving Tape) */}
        <div className="relative z-10 border-y border-line">
          <div className="v-tape-yellow py-3">
            <Marquee className="v-display text-2xl tracking-wide sm:text-3xl">
              <span className="px-6">CELLIX // 2.0</span>
              <span className="px-6">•</span>
              <span className="px-6">CLASSIC ENDLESS</span>
              <span className="px-6">•</span>
              <span className="px-6">10-WAVE SURVIVAL</span>
              <span className="px-6">•</span>
              <span className="px-6">DAILY BIO-HAZARD</span>
              <span className="px-6">•</span>
              <span className="px-6">BIO-WAR 30 MULTIPLAYER</span>
              <span className="px-6">•</span>
            </Marquee>
          </div>
          <div className="bg-ink-2 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
            <Marquee reverse>
              <span className="px-8">SERVER-SIDE ANTI-CHEAT</span>
              <span className="px-8">{'//'}</span>
              <span className="px-8">20 TPS WEBSOCKET ENGINE</span>
              <span className="px-8">{'//'}</span>
              <span className="px-8">ZERO-TRUST SESSIONS</span>
              <span className="px-8">{'//'}</span>
              <span className="px-8 text-acid">3D ARENA SKINS</span>
              <span className="px-8">{'//'}</span>
            </Marquee>
          </div>
        </div>

        {/* SECTION 03: TACTICAL BATTLE SECTORS (01-04) */}
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <span className="v-label block text-acid">
                  01 // {isUz ? 'ARENA SEKTORLARI' : 'COMBAT DEPLOYMENT'}
                </span>
                <h2 className="v-display mt-2 text-4xl text-bone sm:text-6xl">
                  <ScrambleText text={isUz ? 'JANG REJIMLARI' : 'BATTLE SECTORS'} />
                </h2>
              </div>
              <span className="v-label">4 DEPLOYABLE PROTOCOLS</span>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sectors.map((s, idx) => {
              const Icon = s.Icon
              return (
                <Reveal key={s.index} delay={idx * 90}>
                  <Link
                    href={s.href}
                    onMouseEnter={handleHover}
                    onClick={handleClick}
                    className={`v-card ${s.accent} group flex min-h-[320px] flex-col justify-between p-6`}
                  >
                    <div className="space-y-5">
                      <div className="flex items-start justify-between">
                        <span className="v-display text-5xl text-dim transition-colors group-hover:text-bone">
                          {s.index}
                        </span>
                        <div className={`v-chamfer-sm border border-line bg-ink p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:border-line-strong ${s.tagColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className={`v-tag ${s.accent}`}>{s.tag}</span>
                        <h3 className="v-display pt-1 text-3xl text-bone transition-colors group-hover:text-acid">
                          {s.title}
                        </h3>
                        <p className="font-sans text-xs leading-relaxed text-mute">{s.desc}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
                      <span className="text-dim">{s.meta}</span>
                      <span className={`inline-flex items-center gap-1 ${s.tagColor}`}>
                        <span>{isUz ? 'BOSHLASH' : 'DEPLOY'}</span>
                        <ArrowUpRight className="v-arrow h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* SECTION 04: DOSSIER, LADDER & KEYCAPS */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left 7 Cols: Dossier & Hall of Fame */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
              <Reveal>
                <Link
                  href="/profile/me"
                  onMouseEnter={handleHover}
                  onClick={handleClick}
                  className="v-card v-accent-tide group flex h-full flex-col justify-between p-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="v-label !text-tide">{t('dossierLabel')}</span>
                      <User className="h-5 w-5 text-tide" />
                    </div>
                    <h3 className="v-display text-3xl text-bone">{t('navProfile')}</h3>
                    <p className="font-sans text-xs leading-relaxed text-mute">
                      {t('cardProfileDesc')}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-tide">
                    <span>{t('viewProfileBtn')}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </Reveal>

              <Reveal delay={100}>
                <Link
                  href="/leaderboard"
                  onMouseEnter={handleHover}
                  onClick={handleClick}
                  className="v-card v-accent-gold group flex h-full flex-col justify-between p-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="v-label !text-gold">{t('rankingsLabel')}</span>
                      <Crown className="h-5 w-5 text-gold" />
                    </div>
                    <h3 className="v-display text-3xl text-bone">{t('navLeaderboard')}</h3>
                    <p className="font-sans text-xs leading-relaxed text-mute">
                      {t('cardRankingsDesc')}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
                    <span>{t('viewRankingsBtn')}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </Reveal>
            </div>

            {/* Right 5 Cols: Combat Keycaps Telemetry Slab */}
            <Reveal delay={180} className="lg:col-span-5">
              <div className="v-panel v-accent-acid flex h-full flex-col justify-between p-6">
                <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                  <span className="v-label flex items-center gap-2 text-acid">
                    <Keyboard className="h-3.5 w-3.5" />
                    {t('controlsTitle')}
                  </span>
                  <Link
                    href="/settings"
                    onMouseEnter={handleHover}
                    onClick={handleClick}
                    className="v-label inline-flex items-center gap-1 text-tide transition-colors hover:text-acid"
                  >
                    <span>{isUz ? 'SOZLAMALAR' : 'SETTINGS'}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {keycaps.map((k) => (
                    <div
                      key={k.key}
                      className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[11px] transition-all duration-200 hover:-translate-y-0.5 hover:border-acid/60"
                    >
                      <span className="v-chamfer-sm bg-ink-3 px-2 py-0.5 font-bold text-acid">
                        {k.key}
                      </span>
                      <span className="text-mute">{k.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* EDITORIAL FOOTER */}
        <footer className="mt-auto border-t border-line bg-ink-2 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-5 font-mono text-xs">
              <a
                href="https://instagram.com/iflxczz"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={handleHover}
                className="v-link inline-flex items-center gap-2 text-mute transition-colors hover:text-acid"
              >
                <span>INSTAGRAM // @iflxczz</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <span className="text-dim">/</span>
              <a
                href="https://tiktok.com/@iflxczz"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={handleHover}
                className="v-link inline-flex items-center gap-2 text-mute transition-colors hover:text-acid"
              >
                <span>TIKTOK // @iflxczz</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-mute">
              <span>CELLIX &copy; {currentYear}</span>
              <span className="text-dim">{'//'}</span>
              <span className="text-bone">{t('createdBy')}</span>
              <span className="text-dim">{'//'}</span>
              <span className="text-acid">CELLIX 2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
