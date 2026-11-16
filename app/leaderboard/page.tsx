'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Trophy, Swords, Clock, TrendingUp, Crown, Medal, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { getTodayDateString } from '@/lib/game/daily'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { Reveal, MaskText } from '@/components/v26/Reveal'
import ScrambleText from '@/components/v26/ScrambleText'
import CountUp from '@/components/v26/CountUp'
import CellixLoader from '@/components/v26/CellixLoader'

interface HighScoreEntry {
  id: string
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: string
  player?: {
    id: string
    username: string
    avatarColor: string
  }
}

export default function LeaderboardPage() {
  const { t } = useLanguage()
  const [category, setCategory] = useState('score')
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([])
  const [loading, setLoading] = useState(true)

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  const categories = [
    { id: 'score', label: t('catScore'), icon: Trophy },
    { id: 'kills', label: t('catKills'), icon: Swords },
    { id: 'survivalTime', label: t('catSurvival'), icon: Clock },
    { id: 'level', label: t('catLevel'), icon: TrendingUp },
  ]

  const [modeFilter, setModeFilter] = useState<'all' | 'classic' | 'survival' | 'daily' | 'biowar'>('all')

  useEffect(() => {
    const modeQuery = modeFilter !== 'all' ? `&gameMode=${modeFilter}` : ''
    const dateQuery = modeFilter === 'daily' ? `&challengeDate=${getTodayDateString()}` : ''
    fetch(`/api/game/leaderboard?category=${category}&limit=50${modeQuery}${dateQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.highScores) setHighScores(data.highScores)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [category, modeFilter])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem.toString().padStart(2, '0')}`
  }

  const getStatValue = (item: HighScoreEntry) => {
    switch (category) {
      case 'kills':
        return `${item.kills} KILLS`
      case 'survivalTime':
        return formatTime(item.survivalTime)
      case 'level':
        return `LV.${item.level}`
      default:
        return item.score.toLocaleString()
    }
  }

  const top1 = highScores[0]
  const top2 = highScores[1]
  const top3 = highScores[2]

  const renderPodiumMetric = (item: HighScoreEntry) => {
    if (category === 'score') {
      return <CountUp to={item.score} />
    }
    if (category === 'kills') {
      return (
        <>
          <CountUp to={item.kills} /> KILLS
        </>
      )
    }
    if (category === 'level') {
      return (
        <>
          LV.<CountUp to={item.level} />
        </>
      )
    }
    return formatTime(item.survivalTime)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-ink text-bone v-dots">
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-10 sm:px-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <Link
            href="/"
            onMouseEnter={handleHover}
            onClick={handleClick}
            className="v-btn-ghost !px-4 !py-2 !text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>HUB</span>
          </Link>

          <span className="v-tag v-accent-gold">
            <Trophy className="h-3.5 w-3.5" />
            <ScrambleText text="HALL OF FAME // LIVE RANKINGS" />
          </span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <span className="v-label block text-acid">01 // GLOBAL LADDER</span>
          <h1 className="v-display text-5xl text-bone sm:text-7xl">
            <MaskText lines={[t('leaderboardTitle')]} />
          </h1>
          <p className="max-w-lg font-sans text-sm text-mute">{t('leaderboardSub')}</p>
        </div>

        {/* Category Tabs & Mode Filters */}
        <div className="space-y-4 border-y border-line py-5">
          <div className="flex flex-wrap items-center gap-2.5">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={handleHover}
                  onClick={() => {
                    handleClick()
                    setLoading(true)
                    setCategory(cat.id)
                  }}
                  className={isActive ? 'v-btn !py-2.5 !px-4 !text-sm' : 'v-btn-ghost !py-2.5 !px-4 !text-sm'}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'classic', 'survival', 'daily', 'biowar'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onMouseEnter={handleHover}
                onClick={() => {
                  handleClick()
                  setLoading(true)
                  setModeFilter(m)
                }}
                className={`v-chamfer-sm border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  modeFilter === m
                    ? m === 'biowar'
                      ? 'border-tide bg-tide/15 text-tide'
                      : 'border-acid bg-acid/15 text-acid'
                    : 'border-line bg-ink-2 text-mute hover:border-line-strong hover:text-bone'
                }`}
              >
                {m === 'all' ? 'ALL MODES' : m === 'biowar' ? 'BIO-WAR 30' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        {!loading && highScores.length >= 3 && (
          <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-3">
            {/* #2 Silver / Bone */}
            {top2 && (
              <Reveal delay={80} className="order-2 md:order-1">
                <div
                  onMouseEnter={handleHover}
                  className="v-card v-accent-bone space-y-4 p-6 text-center"
                >
                  <div className="flex items-center justify-between">
                    <span className="v-display text-4xl text-mute">#02</span>
                    <Medal className="h-5 w-5 text-bone" />
                  </div>
                  <div className="truncate font-mono text-base font-bold text-bone">
                    {top2.player?.username || 'Commander_2'}
                  </div>
                  <div className="v-display text-3xl text-bone tabular-nums">
                    {renderPodiumMetric(top2)}
                  </div>
                </div>
              </Reveal>
            )}

            {/* #1 Gold Champion */}
            {top1 && (
              <Reveal delay={0} className="order-1 md:order-2">
                <div
                  onMouseEnter={handleHover}
                  className="v-card v-accent-gold space-y-4 bg-ink-3 p-7 text-center"
                >
                  <div className="flex items-center justify-between">
                    <span className="v-display text-5xl text-gold">#01</span>
                    <Crown className="h-6 w-6 text-gold animate-float" />
                  </div>
                  <span className="v-tag v-accent-gold">APEX CHAMPION</span>
                  <div className="truncate font-mono text-xl font-black text-bone">
                    {top1.player?.username || 'Apex_Commander'}
                  </div>
                  <div className="v-display text-4xl text-gold tabular-nums">
                    {renderPodiumMetric(top1)}
                  </div>
                </div>
              </Reveal>
            )}

            {/* #3 Ember / Bronze */}
            {top3 && (
              <Reveal delay={160} className="order-3">
                <div
                  onMouseEnter={handleHover}
                  className="v-card v-accent-ember space-y-4 p-6 text-center"
                >
                  <div className="flex items-center justify-between">
                    <span className="v-display text-4xl text-ember">#03</span>
                    <Medal className="h-5 w-5 text-ember" />
                  </div>
                  <div className="truncate font-mono text-base font-bold text-bone">
                    {top3.player?.username || 'Commander_3'}
                  </div>
                  <div className="v-display text-3xl text-ember tabular-nums">
                    {renderPodiumMetric(top3)}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* Ledger Rows */}
        {loading ? (
          <CellixLoader
            variant="section"
            label={t('loading')}
            sublabel="COMPUTING GLOBAL RANKINGS"
          />
        ) : highScores.length === 0 ? (
          <div className="v-panel v-accent-bone p-12 text-center font-mono text-sm text-mute">
            {t('leaderboardEmpty')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {highScores.map((item, index) => {
              const rank = index + 1
              const isBioWar = item.gameMode === 'biowar'
              const bioTier =
                item.score >= 6000
                  ? 'TITAN'
                  : item.score >= 2500
                    ? 'PREDATOR'
                    : item.score >= 500
                      ? 'VIPER'
                      : 'PLANKTON'

              const rowAccent =
                rank === 1
                  ? 'v-accent-gold'
                  : rank === 2
                    ? 'v-accent-bone'
                    : rank === 3
                      ? 'v-accent-ember'
                      : 'v-accent-acid'

              return (
                <div
                  key={item.id}
                  onMouseEnter={handleHover}
                  className={`v-card ${rowAccent} flex items-center justify-between gap-4 px-5 py-4`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`v-chamfer-sm flex h-11 w-11 shrink-0 items-center justify-center border font-mono text-sm font-black ${
                        rank === 1
                          ? 'border-gold bg-gold/15 text-gold'
                          : rank === 2
                            ? 'border-bone/40 bg-ink text-bone'
                            : rank === 3
                              ? 'border-ember/50 bg-ember/10 text-ember'
                              : 'border-line bg-ink text-mute'
                      }`}
                    >
                      {rank === 1 ? <Crown className="h-5 w-5" /> : String(rank).padStart(2, '0')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.id.startsWith('bw_apex_') ? (
                          <span className="flex items-center gap-2 font-mono text-sm font-bold text-bone">
                            <span className="truncate">{item.player?.username || 'Anonymous'}</span>
                            <span className="v-tag v-accent-tide !py-0.5 !text-[9px]">APEX BOT</span>
                          </span>
                        ) : item.player?.id ? (
                          <Link
                            href={`/profile/${item.player.id}`}
                            className="v-link truncate font-mono text-sm font-bold text-bone hover:text-acid sm:text-base"
                          >
                            {item.player?.username || 'Anonymous'}
                          </Link>
                        ) : (
                          <span className="truncate font-mono text-sm font-bold text-bone sm:text-base">
                            {item.player?.username || 'Anonymous'}
                          </span>
                        )}
                        {isBioWar && (
                          <span className="v-tag v-accent-tide !py-0.5 !text-[9px]">{bioTier}</span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-mute">
                        <span>
                          SCORE <strong className="text-bone">{item.score.toLocaleString()}</strong>
                        </span>
                        <span className="text-dim">/</span>
                        <span>{isBioWar ? `MASS ${item.level * 50}` : `LV.${item.level}`}</span>
                        <span className="text-dim">/</span>
                        <span>{item.kills} KILLS</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="v-display text-2xl text-acid sm:text-3xl tabular-nums">
                      {getStatValue(item)}
                    </span>
                    <div className="v-label mt-0.5">{item.gameMode || 'classic'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
