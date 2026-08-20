'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Trophy,
  Hexagon,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Pencil,
  Save,
  Swords,
  Clock,
  Gamepad2,
  Check,
  Coins,
  LogOut,
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import type { Achievement } from '@/lib/game/achievements'
import {
  CELL_SKINS,
  getSelectedSkinId,
  getOwnedSkinIds,
  setSelectedSkinId,
  syncCoinBalance,
  syncOwnedSkinIds,
  purchaseSkin,
  type CellSkinId,
} from '@/lib/game/cosmetics'
import PixelCharacterAvatar from '@/components/PixelCharacterAvatar'
import confetti from 'canvas-confetti'

interface ProfilePlayer {
  id: string
  username: string
  bio: string
  avatarColor: string
  coins: number
  ownedSkins?: string
  createdAt: string
}

interface ProfileStats {
  totalGames: number
  bestScore: number
  totalKills: number
  maxLevel: number
  avgSurvival: number
  maxSurvivalTime: number
}

interface ProfileResponse {
  player: ProfilePlayer
  stats: ProfileStats
  achievements: Achievement[]
}

function isProfileResponse(data: ProfileResponse | { error?: string }): data is ProfileResponse {
  return 'player' in data
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t, lang } = useLanguage()
  const isUz = lang === 'uz'

  const [profileData, setProfileData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatarColor: '#b026ff' })
  const [saving, setSaving] = useState(false)
  const [activeSkinId, setActiveSkinId] = useState<CellSkinId>('neon_cyan')
  const [ownedSkinIds, setOwnedSkinIds] = useState<CellSkinId[]>(['neon_cyan'])
  const [activeTab, setActiveTab] = useState<'overview' | 'wardrobe' | 'analytics'>('overview')
  const [purchasingSkinId, setPurchasingSkinId] = useState<string | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setActiveSkinId(getSelectedSkinId())
      setOwnedSkinIds(getOwnedSkinIds())
    })

    let targetId = id
    const ownerCookie = document.cookie.match(/virus_player_id=([^;]+)/)?.[1] ?? null

    if (id === 'me') {
      if (ownerCookie) {
        targetId = ownerCookie
      } else {
        window.location.href = '/auth'
        return
      }
    }

    fetch(`/api/profile/${targetId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ProfileResponse | { error?: string }) => {
        if (isProfileResponse(data)) {
          const profileIsOwner = !!ownerCookie && ownerCookie === data.player.id

          setIsOwner(profileIsOwner)

          if (profileIsOwner) {
            if (typeof data.player.coins === 'number') {
              syncCoinBalance(data.player.coins)
            }
          }

          if (data.player.ownedSkins) {
            try {
              const parsed = JSON.parse(data.player.ownedSkins)
              if (Array.isArray(parsed)) {
                syncOwnedSkinIds(parsed)
                setOwnedSkinIds(parsed)
              }
            } catch {
              // ignore
            }
          }

          setProfileData(data)
          setEditForm({
            username: data.player.username,
            bio: data.player.bio || '',
            avatarColor: data.player.avatarColor || '#b026ff',
          })
        } else {
          setError(data.error || t('profileNotFound'))
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))

    return () => window.cancelAnimationFrame(frame)
  }, [id, t])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const data = await res.json()
        setProfileData((prev) => (prev ? { ...prev, player: { ...prev.player, ...data.player } } : prev))
        setEditing(false)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleEquipSkin = (skinId: CellSkinId) => {
    if (!ownedSkinIds.includes(skinId)) return
    setSelectedSkinId(skinId)
    setActiveSkinId(skinId)
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } })
    } catch {
      // ignore
    }
  }

  const handleBuySkin = async (skin: (typeof CELL_SKINS)[0]) => {
    setPurchasingSkinId(skin.id)
    try {
      const res = await fetch('/api/economy/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId: skin.id }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        coins?: number
        ownedSkins?: string[]
        error?: string
      }

      if (res.ok) {
        if (typeof data.coins === 'number') {
          syncCoinBalance(data.coins)
          setProfileData((prev) => (prev ? { ...prev, player: { ...prev.player, coins: data.coins! } } : prev))
        }
        if (Array.isArray(data.ownedSkins)) {
          const nextOwned = syncOwnedSkinIds(data.ownedSkins as CellSkinId[])
          setOwnedSkinIds(nextOwned)
        }
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
      } else {
        // Fallback local guest purchase
        const local = purchaseSkin(skin.id)
        if (local.ok) {
          setOwnedSkinIds(local.ownedSkinIds)
          setProfileData((prev) => (prev ? { ...prev, player: { ...prev.player, coins: local.balance } } : prev))
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
        } else {
          alert(data.error || t('notEnoughCoins'))
        }
      }
    } catch {
      const local = purchaseSkin(skin.id)
      if (local.ok) {
        setOwnedSkinIds(local.ownedSkinIds)
        setProfileData((prev) => (prev ? { ...prev, player: { ...prev.player, coins: local.balance } } : prev))
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
      }
    } finally {
      setPurchasingSkinId(null)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    document.cookie = 'virus_player_id=; path=/; max-age=0'
    window.location.href = '/'
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060620] text-white flex flex-col items-center justify-center space-y-4 font-mono">
        <Hexagon className="h-10 w-10 text-purple-400 animate-spin" />
        <p className="text-sm text-purple-300 animate-pulse">{t('loading')}</p>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-[#060620] text-white flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <ShieldAlert className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-mono font-bold">{error || t('profileNotFound')}</h2>
        <p className="text-sm font-mono text-slate-400">{t('profilePlayFirst')}</p>
        <Link href="/game" className="btn-cyber-primary px-6 py-2 rounded-xl text-xs font-mono font-bold uppercase mt-4">
          {t('hubEnter')}
        </Link>
      </div>
    )
  }

  const { player, stats, achievements } = profileData
  const profileCoins = typeof player.coins === 'number' && Number.isFinite(player.coins) ? player.coins : 0

  return (
    <div className="min-h-screen bg-[#060620] text-white flex flex-col selection:bg-purple-500/30 selection:text-white">
      <Navbar coinBalanceOverride={profileCoins} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Profile Header Dossier */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-slate-950/70 backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="h-24 w-24 rounded-2xl flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(176,38,255,0.4)] border-2 border-white/20 shrink-0"
              style={{ backgroundColor: player.avatarColor || '#b026ff' }}
            >
              🧬
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">{player.username}</h1>
                  <span className="text-xs font-mono text-slate-400">
                    {t('registered')}: {new Date(player.createdAt).toLocaleDateString()} • CELLIX v1.2
                  </span>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300">
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    {profileCoins.toLocaleString()} {t('coinUnit')}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2 self-center sm:self-auto">
                    <button
                      onClick={() => setEditing(!editing)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{editing ? (isUz ? 'BEKOR QILISH' : 'CANCEL') : t('profileEdit')}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{isUz ? 'CHIQISH' : 'LOG OUT'}</span>
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-3 pt-2 font-mono">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Username</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t('profileBio')}</label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder={t('profileBioPlaceholder')}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-purple-400 h-20"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-cyber-primary px-4 py-1.5 rounded-lg text-xs font-bold uppercase inline-flex items-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? t('saving') : t('profileSave')}</span>
                  </button>
                </div>
              ) : (
                <p className="text-sm font-mono text-slate-300 italic">{player.bio || 'Organizm haqida ma’lumot yo‘q.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(176,38,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 {isUz ? 'UMUMIY STATISTIKA' : 'OVERVIEW STATS'}
          </button>

          <button
            onClick={() => setActiveTab('wardrobe')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'wardrobe'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ✨ {t('skinsTitle')}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 {t('analyticsTitle')}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
                <Gamepad2 className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{t('profileGamesPlayed')}</span>
                <span className="text-2xl font-mono font-bold text-white">{stats.totalGames}</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
                <Trophy className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{t('profileBestScore')}</span>
                <span className="text-2xl font-mono font-bold text-purple-300">{stats.bestScore.toLocaleString()}</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
                <Swords className="h-5 w-5 text-rose-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{t('profileTotalKills')}</span>
                <span className="text-2xl font-mono font-bold text-white">{stats.totalKills}</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
                <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{t('profileAvgSurvival')}</span>
                <span className="text-2xl font-mono font-bold text-white">{formatTime(stats.avgSurvival)}</span>
              </div>
            </div>

            {/* Achievements */}
            <div className="space-y-3">
              <h3 className="text-sm font-mono tracking-wider font-bold text-white uppercase border-b border-slate-800 pb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                {t('achievementsTitle')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`glass-panel p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      ach.unlocked
                        ? 'border-purple-500/40 bg-purple-950/20 shadow-[0_0_10px_rgba(176,38,255,0.15)]'
                        : 'border-slate-800/80 bg-slate-950/40 opacity-60'
                    }`}
                  >
                    <span className="text-2xl">{ach.icon}</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-mono font-bold text-white">{lang === 'uz' ? ach.titleUz : ach.title}</h4>
                        {ach.unlocked ? <CheckCircle2 className="h-4 w-4 text-purple-400" /> : <Lock className="h-4 w-4 text-slate-500" />}
                      </div>
                      <p className="text-xs font-mono text-slate-400">{lang === 'uz' ? ach.descriptionUz : ach.description}</p>
                      <span className="text-[10px] font-mono text-purple-400/80">
                        {t('progress')}: {ach.progress}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WARDROBE & SKINS */}
        {activeTab === 'wardrobe' && (
          <div className="space-y-6 font-mono">
            <div>
              <h3 className="text-lg font-bold text-white">{t('skinsTitle')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                {isUz
                  ? 'Hub Armory bo‘limida coinlar bilan askar personajlarini oching'
                  : 'Buy and equip cyber-soldier characters from the Hub Armory'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {CELL_SKINS.map((skin) => {
                const isEquipped = activeSkinId === skin.id
                const unlocked = ownedSkinIds.includes(skin.id)

                return (
                  <div
                    key={skin.id}
                    className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                      isEquipped
                        ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                        : unlocked
                          ? 'border-slate-800 bg-slate-950/70 hover:border-purple-500/50'
                          : 'border-slate-900 bg-slate-950/40 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                          <PixelCharacterAvatar skin={skin} size={42} animated />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950 border border-purple-500/30 text-purple-300">
                          {skin.rarity}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{isUz ? skin.nameUz : skin.name}</h4>
                      <p className="text-xs text-slate-400">{isUz ? skin.descriptionUz : skin.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {unlocked
                          ? (skin.unlockType === 'default' ? t('skinCommonOpen') : t('skinOwned'))
                          : `${t('skinLocked')} (${skin.coinCost.toLocaleString()} ${t('coinUnit')})`}
                      </span>

                      {unlocked ? (
                        <button
                          onClick={() => handleEquipSkin(skin.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isEquipped
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isEquipped && <Check className="w-3.5 h-3.5" />}
                          <span>{isEquipped ? t('skinEquipped') : t('skinEquip')}</span>
                        </button>
                      ) : isOwner ? (
                        <button
                          onClick={() => handleBuySkin(skin)}
                          disabled={purchasingSkinId === skin.id || (profileData?.player.coins ?? 0) < skin.coinCost}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                            (profileData?.player.coins ?? 0) >= skin.coinCost
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-950" />
                          <span>{purchasingSkinId === skin.id ? '...' : (isUz ? 'SOTIB OLISH' : 'BUY')}</span>
                        </button>
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BATTLE ANALYTICS & HEATMAP */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 font-mono">
            <div>
              <h3 className="text-lg font-bold text-white">{t('analyticsTitle')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isUz
                  ? 'Jang telemetriyasi: DPS o‘sishi, zararlar taqsimoti va o‘limlar xaritasi'
                  : 'Battle telemetry: DPS curves, damage breakdown & spatial death heatmap'}
              </p>
            </div>

            {/* Spatial Death Heatmap Arena Grid */}
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-slate-950/70 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase">{t('heatmapLabel')}</span>
                <span className="text-[10px] text-slate-500">3000 x 3000 ARENA PROJECTION</span>
              </div>

              <div className="relative w-full aspect-video rounded-2xl bg-[#040416] border border-slate-800 overflow-hidden flex items-center justify-center p-4">
                {/* Micro Grid Lines */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(168, 85, 247, 0.2) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(168, 85, 247, 0.2) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Center Spawn Indicator */}
                <div className="absolute w-6 h-6 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center text-[8px] text-cyan-300 font-bold">
                  S
                </div>

                {/* Simulated / Recorded Spatial Death Markers */}
                <div className="absolute top-[28%] left-[34%] w-4 h-4 rounded-full bg-rose-500/60 blur-[2px] animate-ping" />
                <div className="absolute top-[28%] left-[34%] w-3 h-3 rounded-full bg-rose-500 border border-white" />

                <div className="absolute top-[65%] left-[72%] w-4 h-4 rounded-full bg-rose-500/60 blur-[2px] animate-ping" />
                <div className="absolute top-[65%] left-[72%] w-3 h-3 rounded-full bg-rose-500 border border-white" />

                <div className="absolute top-[42%] left-[80%] w-4 h-4 rounded-full bg-rose-500/60 blur-[2px]" />
                <div className="absolute top-[42%] left-[80%] w-3 h-3 rounded-full bg-rose-500 border border-white" />

                <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                  🔴 {isUz ? 'Oxirgi o‘lim nuqtalari' : 'Recent death hotspots'}
                </div>
              </div>
            </div>

            {/* Damage Source Breakdown Bars */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-950/70 space-y-4">
              <span className="text-xs font-bold text-white uppercase">{isUz ? 'Mutatsiyalar Zarar Taqsimoti' : 'Damage By Source'}</span>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Spora O‘qlari (Spores)</span>
                    <span className="text-cyan-400 font-bold">42%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Zanjirli Chaqmoq & Toksik Bo‘ron</span>
                    <span className="text-purple-400 font-bold">28%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Dash & Radial To‘lqin</span>
                    <span className="text-rose-400 font-bold">18%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Nanitlar & Viral Klon</span>
                    <span className="text-amber-400 font-bold">12%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
