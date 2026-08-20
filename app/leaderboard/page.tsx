'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Trophy, Swords, Clock, TrendingUp, Crown, Hexagon } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { getTodayDateString } from '@/lib/game/daily'

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

  const categories = [
    { id: 'score', label: t('catScore'), icon: Trophy, color: 'text-amber-400' },
    { id: 'kills', label: t('catKills'), icon: Swords, color: 'text-rose-400' },
    { id: 'survivalTime', label: t('catSurvival'), icon: Clock, color: 'text-emerald-400' },
    { id: 'level', label: t('catLevel'), icon: TrendingUp, color: 'text-purple-400' },
  ]

  const [modeFilter, setModeFilter] = useState<'all' | 'classic' | 'survival' | 'daily'>('all')

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
      case 'kills': return `${item.kills} kills`
      case 'survivalTime': return formatTime(item.survivalTime)
      case 'level': return `Level ${item.level}`
      default: return item.score.toLocaleString()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#060620] text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <Trophy className="h-3.5 w-3.5" />
            <span>HALL OF FAME</span>
          </div>
          <h1 className="text-4xl font-mono font-extrabold text-white text-glow-purple">
            {t('leaderboardTitle')}
          </h1>
          <p className="text-xs text-slate-400 font-mono">{t('leaderboardSub')}</p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-start sm:justify-center">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = category === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setLoading(true)
                  setCategory(cat.id)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-950 border border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(176,38,255,0.3)]'
                    : 'glass-panel border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${cat.color}`} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Mode Filters */}
        <div className="flex items-center justify-center gap-2">
          {(['all', 'classic', 'survival', 'daily'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setLoading(true)
                setModeFilter(m)
              }}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold uppercase transition-all border cursor-pointer ${
                modeFilter === m
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'all' ? 'ALL MODES' : m}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-16 text-center space-y-3 font-mono text-sm text-purple-400">
            <Hexagon className="h-8 w-8 text-purple-400 animate-spin mx-auto" />
            <p>{t('loading')}</p>
          </div>
        ) : highScores.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center font-mono text-slate-400">
            {t('leaderboardEmpty')}
          </div>
        ) : (
          <div className="space-y-2">
            {highScores.map((item, index) => {
              const rank = index + 1
              const rankStyle =
                rank === 1 ? 'text-amber-400 border-amber-500/60 bg-amber-950/40 shadow-[0_0_15px_rgba(255,183,0,0.3)]'
                : rank === 2 ? 'text-slate-300 border-slate-400/40 bg-slate-900/60'
                : rank === 3 ? 'text-amber-600 border-amber-600/40 bg-amber-950/20'
                : 'text-slate-500 border-slate-800 bg-slate-950/60'

              return (
                <div key={item.id} className={`glass-panel p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  rank <= 3 ? 'border-purple-500/30 hover:border-purple-400' : 'border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-mono font-extrabold text-sm ${rankStyle}`}>
                      {rank === 1 ? <Crown className="h-5 w-5 text-amber-400" /> : `#${rank}`}
                    </div>
                    <div>
                      <Link href={`/profile/${item.player?.id}`} className="font-mono text-base font-bold text-white hover:text-purple-400 transition-colors">
                        {item.player?.username || 'Anonymous'}
                      </Link>
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-0.5">
                        <span>Score: <span className="text-purple-300 font-bold">{item.score.toLocaleString()}</span></span>
                        <span>Lv.{item.level}</span>
                        <span>{item.kills} kills</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-lg font-bold text-purple-300">{getStatValue(item)}</span>
                    <p className="text-[10px] text-slate-500 uppercase">{item.gameMode || 'classic'}</p>
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
