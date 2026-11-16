'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Trophy,
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
  Crown,
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
import { Reveal, MaskText } from '@/components/v26/Reveal'
import CountUp from '@/components/v26/CountUp'
import ScrambleText from '@/components/v26/ScrambleText'
import CellixLoader from '@/components/v26/CellixLoader'

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

interface BioWarProfileStats {
  games: number
  bestScore: number
  totalKills: number
  maxSurvival: number
}

interface ProfileResponse {
  isOwner?: boolean
  player: ProfilePlayer
  stats: ProfileStats
  biowarStats?: BioWarProfileStats
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
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatarColor: '#d4ff3a' })
  const [saving, setSaving] = useState(false)
  const [activeSkinId, setActiveSkinId] = useState<CellSkinId>('neon_cyan')
  const [ownedSkinIds, setOwnedSkinIds] = useState<CellSkinId[]>(['neon_cyan'])
  const [activeTab, setActiveTab] = useState<'overview' | 'wardrobe' | 'biowar'>('overview')
  const [purchasingSkinId, setPurchasingSkinId] = useState<string | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setActiveSkinId(getSelectedSkinId())
      setOwnedSkinIds(getOwnedSkinIds())
    })

    const targetId = id

    fetch(`/api/profile/${targetId}`, { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = '/auth'
          return null
        }
        return res.json()
      })
      .then((data: ProfileResponse | { error?: string } | null) => {
        if (!data) return
        if (isProfileResponse(data)) {
          const profileIsOwner = data.isOwner ?? false
          setIsOwner(profileIsOwner)

          if (profileIsOwner && typeof data.player.coins === 'number') {
            syncCoinBalance(data.player.coins)
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
            avatarColor: data.player.avatarColor || '#d4ff3a',
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
    window.location.href = '/'
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  if (loading) {
    return (
      <CellixLoader
        variant="fullscreen"
        label={t('loading')}
        sublabel="LOADING PLAYER DOSSIER"
      />
    )
  }

  if (error || !profileData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-5 bg-ink p-4 text-center text-bone v-dots">
        <ShieldAlert className="h-12 w-12 text-ember" />
        <h2 className="v-display text-4xl text-bone">{error || t('profileNotFound')}</h2>
        <p className="max-w-md font-sans text-sm text-mute">
          {isUz
            ? 'Siz hali tizimga kirmagansiz yoki sessiya eskirgan. Profilingizni ko‘rish uchun hisobingizga kiring.'
            : 'You are not logged in or your session has expired. Please sign in to view your profile.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth" className="v-btn">
            {isUz ? 'TIZIMGA KIRISH' : 'SIGN IN / REGISTER'}
          </Link>
          <Link href="/game" className="v-btn-ghost">
            {t('hubEnter')}
          </Link>
        </div>
      </div>
    )
  }

  const { player, stats, achievements } = profileData
  const profileCoins = typeof player.coins === 'number' && Number.isFinite(player.coins) ? player.coins : 0
  const activeSkinObj = CELL_SKINS.find((s) => s.id === activeSkinId) || CELL_SKINS[0]

  return (
    <div className="flex min-h-screen flex-col bg-ink text-bone v-dots">
      <Navbar coinBalanceOverride={profileCoins} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-10 sm:px-6">
        {/* Profile Header Dossier */}
        <Reveal>
          <div className="v-panel v-accent-acid p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Chamfered Specimen Pedestal */}
              <div className="v-chamfer flex h-28 w-28 shrink-0 items-center justify-center border border-line-strong bg-ink">
                <PixelCharacterAvatar skin={activeSkinObj} size={86} animated />
              </div>

              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <span className="v-label block text-acid">
                      <ScrambleText text="PLAYER DOSSIER // 2.0" />
                    </span>
                    <h1 className="v-display mt-1 text-5xl text-bone sm:text-6xl">
                      <MaskText lines={[player.username]} />
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] text-mute sm:justify-start">
                      <span>
                        {t('registered')}: {new Date(player.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-dim">{'//'}</span>
                      <span className="v-tag v-accent-gold">
                        <Coins className="h-3 w-3" />
                        {profileCoins.toLocaleString()} {t('coinUnit')}
                      </span>
                      <span className="v-tag v-accent-tide">LV.{stats.maxLevel}</span>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="flex items-center justify-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(!editing)}
                        className="v-btn-ghost !px-3.5 !py-2 !text-sm"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{editing ? (isUz ? 'BEKOR QILISH' : 'CANCEL') : t('profileEdit')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="v-btn-ember !px-3.5 !py-2 !text-sm"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{isUz ? 'CHIQISH' : 'LOG OUT'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3 border-t border-line pt-4 font-mono">
                    <div>
                      <label className="v-label mb-1 block">Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="v-input sm:w-72"
                      />
                    </div>
                    <div>
                      <label className="v-label mb-1 block">{t('profileBio')}</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        placeholder={t('profileBioPlaceholder')}
                        className="v-input h-20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="v-btn !py-2.5 !px-5 !text-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{saving ? t('saving') : t('profileSave')}</span>
                    </button>
                  </div>
                ) : (
                  <p className="border-t border-line pt-3 font-sans text-sm text-mute">
                    {player.bio || 'Organizm haqida ma’lumot yo‘q.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={
              activeTab === 'overview' ? 'v-btn !py-2.5 !px-5 !text-sm' : 'v-btn-ghost !py-2.5 !px-5 !text-sm'
            }
          >
            {isUz ? '01 // UMUMIY STATISTIKA' : '01 // OVERVIEW STATS'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wardrobe')}
            className={
              activeTab === 'wardrobe'
                ? 'v-btn !bg-tide !text-ink !py-2.5 !px-5 !text-sm'
                : 'v-btn-ghost !py-2.5 !px-5 !text-sm'
            }
          >
            02 // {t('skinsTitle')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biowar')}
            className={
              activeTab === 'biowar'
                ? 'v-btn-ember !py-2.5 !px-5 !text-sm'
                : 'v-btn-ghost !py-2.5 !px-5 !text-sm'
            }
          >
            03 // BIO-WAR 30
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* Editorial Stats Grid */}
            <Reveal>
              <div className="v-panel v-accent-acid grid grid-cols-2 sm:grid-cols-4">
                <div className="border-b border-r border-line p-5 sm:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="v-label">{t('profileGamesPlayed')}</span>
                    <Gamepad2 className="h-4 w-4 text-acid" />
                  </div>
                  <div className="v-display mt-2 text-4xl text-bone sm:text-5xl tabular-nums">
                    <CountUp to={stats.totalGames} />
                  </div>
                </div>

                <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
                  <div className="flex items-center justify-between">
                    <span className="v-label">{t('profileBestScore')}</span>
                    <Trophy className="h-4 w-4 text-gold" />
                  </div>
                  <div className="v-display mt-2 text-4xl text-gold sm:text-5xl tabular-nums">
                    <CountUp to={stats.bestScore} />
                  </div>
                </div>

                <div className="border-r border-line p-5">
                  <div className="flex items-center justify-between">
                    <span className="v-label">{t('profileTotalKills')}</span>
                    <Swords className="h-4 w-4 text-ember" />
                  </div>
                  <div className="v-display mt-2 text-4xl text-ember sm:text-5xl tabular-nums">
                    <CountUp to={stats.totalKills} />
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="v-label">{t('profileAvgSurvival')}</span>
                    <Clock className="h-4 w-4 text-tide" />
                  </div>
                  <div className="v-display mt-2 text-4xl text-tide sm:text-5xl tabular-nums">
                    {formatTime(stats.avgSurvival)}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Achievements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="v-label flex items-center gap-2 !text-gold">
                  <Trophy className="h-3.5 w-3.5" />
                  {t('achievementsTitle')}
                </span>
                <span className="v-label">
                  {achievements.filter((a) => a.unlocked).length} / {achievements.length} UNLOCKED
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {achievements.map((ach, idx) => (
                  <Reveal key={ach.id} delay={idx * 40}>
                    <div
                      className={`v-card ${ach.unlocked ? 'v-accent-acid' : 'v-accent-bone opacity-55'} flex items-start gap-4 p-5`}
                    >
                      <span className="v-chamfer-sm flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-ink text-2xl">
                        {ach.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-mono text-sm font-bold text-bone">
                            {lang === 'uz' ? ach.titleUz : ach.title}
                          </h4>
                          {ach.unlocked ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-acid" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-dim" />
                          )}
                        </div>
                        <p className="font-sans text-xs text-mute">
                          {lang === 'uz' ? ach.descriptionUz : ach.description}
                        </p>
                        <div className="pt-1 font-mono text-[10px] font-semibold text-acid">
                          {t('progress')}: {ach.progress}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WARDROBE & SKINS */}
        {activeTab === 'wardrobe' && (
          <div className="space-y-6">
            <div className="border-b border-line pb-3">
              <h3 className="v-display text-3xl text-bone">{t('skinsTitle')}</h3>
              <p className="mt-1 font-sans text-xs text-mute">
                {isUz
                  ? 'Hub Armory bo‘limida coinlar bilan askar personajlarini oching'
                  : 'Buy and equip cyber-soldier characters from the Hub Armory'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {CELL_SKINS.map((skin) => {
                const isEquipped = activeSkinId === skin.id
                const unlocked = ownedSkinIds.includes(skin.id)

                return (
                  <div
                    key={skin.id}
                    className={`v-card ${
                      isEquipped
                        ? 'v-accent-acid bg-ink-3'
                        : unlocked
                          ? 'v-accent-tide'
                          : 'v-accent-bone opacity-60'
                    } flex flex-col justify-between space-y-4 p-5`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="v-chamfer-sm flex items-center justify-center border border-line bg-ink p-2">
                          <PixelCharacterAvatar skin={skin} size={48} animated />
                        </div>
                        <span className="v-tag v-accent-acid">{skin.rarity}</span>
                      </div>

                      <h4 className="v-display text-2xl text-bone">
                        {isUz ? skin.nameUz : skin.name}
                      </h4>
                      <p className="font-sans text-xs text-mute">
                        {isUz ? skin.descriptionUz : skin.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-line pt-3 font-mono">
                      <span className="text-[10px] text-mute">
                        {unlocked
                          ? skin.unlockType === 'default'
                            ? t('skinCommonOpen')
                            : t('skinOwned')
                          : `${t('skinLocked')} (${skin.coinCost.toLocaleString()} ${t('coinUnit')})`}
                      </span>

                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipSkin(skin.id)}
                          className={
                            isEquipped ? 'v-btn !py-1.5 !px-3 !text-xs' : 'v-btn-ghost !py-1.5 !px-3 !text-xs'
                          }
                        >
                          {isEquipped && <Check className="h-3.5 w-3.5" />}
                          <span>{isEquipped ? t('skinEquipped') : t('skinEquip')}</span>
                        </button>
                      ) : isOwner ? (
                        <button
                          type="button"
                          onClick={() => handleBuySkin(skin)}
                          disabled={
                            purchasingSkinId === skin.id || (profileData?.player.coins ?? 0) < skin.coinCost
                          }
                          className="v-btn !bg-gold !text-ink !py-1.5 !px-3 !text-xs"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>{purchasingSkinId === skin.id ? '...' : isUz ? 'SOTIB OLISH' : 'BUY'}</span>
                        </button>
                      ) : (
                        <Lock className="h-4 w-4 text-dim" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BIO-WAR 30 ARENA STATS */}
        {activeTab === 'biowar' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h3 className="v-display text-3xl text-bone">BIO-WAR 30 // ARENA</h3>
                <p className="mt-1 font-sans text-xs text-mute">
                  {isUz
                    ? '30 kishilik kiber-arenadagi erishilgan rekordlar va o‘yinlar tarixi'
                    : 'Records, peak mass and performance in 30-player Bio-War arena'}
                </p>
              </div>
              <span className="v-tag v-accent-tide">MULTIPLAYER RECORD</span>
            </div>

            <div className="v-panel v-accent-tide grid grid-cols-2 sm:grid-cols-4">
              <div className="border-b border-r border-line p-5 sm:border-b-0">
                <span className="v-label">{isUz ? 'Eng Yuqori Ball' : 'Best Score'}</span>
                <div className="v-display mt-2 text-4xl text-gold tabular-nums">
                  <CountUp to={profileData.biowarStats?.bestScore || 0} />
                </div>
              </div>

              <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
                <span className="v-label">{isUz ? 'Jami O‘yinlar' : 'Total Matches'}</span>
                <div className="v-display mt-2 text-4xl text-tide tabular-nums">
                  <CountUp to={profileData.biowarStats?.games || 0} />
                </div>
              </div>

              <div className="border-r border-line p-5">
                <span className="v-label">{isUz ? 'Jami Killar' : 'Total Kills'}</span>
                <div className="v-display mt-2 text-4xl text-ember tabular-nums">
                  <CountUp to={profileData.biowarStats?.totalKills || 0} />
                </div>
              </div>

              <div className="p-5">
                <span className="v-label">{isUz ? 'Maksimal Vaqt' : 'Max Survival'}</span>
                <div className="v-display mt-2 text-4xl text-acid tabular-nums">
                  {formatTime(profileData.biowarStats?.maxSurvival || 0)}
                </div>
              </div>
            </div>

            <div className="v-panel v-accent-ember flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="v-chamfer-sm flex h-14 w-14 items-center justify-center border border-gold/40 bg-ink text-gold">
                  <Crown className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="v-display text-2xl text-bone">
                    {profileData.biowarStats && profileData.biowarStats.bestScore >= 6000
                      ? 'TITAN LEVIATHAN'
                      : profileData.biowarStats && profileData.biowarStats.bestScore >= 2500
                        ? 'APEX PREDATOR'
                        : profileData.biowarStats && profileData.biowarStats.bestScore >= 500
                          ? 'KIBER-VIPER'
                          : 'PLANKTON'}
                  </h4>
                  <p className="mt-1 font-sans text-xs text-mute">
                    {isUz
                      ? '3 daqiqalik raundlarda ilon massasi va killariga qarab beriladigan kiber unvon'
                      : 'Cyber rank tier based on peak mass and frags in 3-minute rounds'}
                  </p>
                </div>
              </div>

              <Link href="/game?mode=biowar" className="v-btn-ember shrink-0">
                <Swords className="h-4 w-4" />
                <span>{isUz ? 'Jangga Kirish' : 'Enter Bio-War'}</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
