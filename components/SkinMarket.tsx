'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Coins, CreditCard, LockKeyhole, ShoppingCart, Zap } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import CoinWallet, { useCoinBalance } from '@/components/CoinWallet'
import PixelCharacterAvatar from '@/components/PixelCharacterAvatar'
import { COIN_PACKAGES } from '@/lib/game/coinPackages'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { Reveal, MaskText } from '@/components/v26/Reveal'
import ScrambleText from '@/components/v26/ScrambleText'
import CellixLoader from '@/components/v26/CellixLoader'
import {
  CELL_SKINS,
  COINS_CHANGED_EVENT,
  addCoins,
  getArenaMatchedSkins,
  getOwnedSkinIds,
  getSelectedSkinId,
  purchaseSkin,
  setSelectedSkinId,
  syncCoinBalance,
  syncOwnedSkinIds,
  type ArenaAffinity,
  type CellSkinId,
} from '@/lib/game/cosmetics'

function rarityAccent(rarity: string) {
  switch (rarity) {
    case 'Legendary':
      return { panel: 'v-accent-gold', text: 'text-gold' }
    case 'Epic':
      return { panel: 'v-accent-acid', text: 'text-acid' }
    case 'Rare':
      return { panel: 'v-accent-tide', text: 'text-tide' }
    default:
      return { panel: 'v-accent-bone', text: 'text-bone' }
  }
}

function arenaBadge(affinity: ArenaAffinity, isUz: boolean) {
  switch (affinity) {
    case 'classic':
      return { cls: 'v-accent-acid', label: isUz ? 'KLASSIK ARENA' : 'CLASSIC LAB' }
    case 'survival':
      return { cls: 'v-accent-ember', label: isUz ? 'SURVIVAL ARENA' : 'SURVIVAL SECTOR' }
    case 'daily':
      return { cls: 'v-accent-gold', label: isUz ? 'KUNLIK SINOV' : 'DAILY VAULT' }
    case 'biowar':
      return { cls: 'v-accent-tide', label: 'BIO-WAR 30' }
    default:
      return { cls: 'v-accent-bone', label: isUz ? 'BARCHA ARENALAR' : 'UNIVERSAL' }
  }
}

export default function SkinMarket() {
  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'
  const balance = useCoinBalance()
  const [selectedSkinId, setSelectedSkinIdState] = useState<CellSkinId>('neon_cyan')
  const [ownedSkinIds, setOwnedSkinIds] = useState<CellSkinId[]>(['neon_cyan'])
  const [arenaFilter, setArenaFilter] = useState<ArenaAffinity | 'all'>('all')
  const [notice, setNotice] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const visibleSkins = getArenaMatchedSkins(arenaFilter)

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedSkinIdState(getSelectedSkinId())
      setOwnedSkinIds(getOwnedSkinIds())
    })
    const refreshOwnedSkins = () => setOwnedSkinIds(getOwnedSkinIds())
    window.addEventListener(COINS_CHANGED_EVENT, refreshOwnedSkins)
    window.addEventListener('storage', refreshOwnedSkins)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener(COINS_CHANGED_EVENT, refreshOwnedSkins)
      window.removeEventListener('storage', refreshOwnedSkins)
    }
  }, [])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2600)
  }

  const handlePurchase = async (skinId: CellSkinId) => {
    handleClick()
    setBusyAction(skinId)
    try {
      const response = await fetch('/api/economy/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        coins?: unknown
        ownedSkins?: unknown
        error?: unknown
      }

      if (response.ok) {
        soundManager.playLevelUp()
        if (typeof data.coins === 'number') syncCoinBalance(data.coins)
        const nextOwned = Array.isArray(data.ownedSkins)
          ? syncOwnedSkinIds(data.ownedSkins.filter((id): id is CellSkinId => typeof id === 'string'))
          : getOwnedSkinIds()
        setOwnedSkinIds(nextOwned)
        showNotice(isUz ? 'Skin muvaffaqiyatli sotib olindi.' : 'Skin purchased successfully.')
        return
      }

      if (response.status !== 401) {
        showNotice(typeof data.error === 'string' ? data.error : t('notEnoughCoins'))
        return
      }

      const result = purchaseSkin(skinId)
      setOwnedSkinIds(result.ownedSkinIds)
      if (result.ok) soundManager.playLevelUp()
      showNotice(
        result.ok
          ? isUz
            ? 'Skin muvaffaqiyatli sotib olindi.'
            : 'Skin purchased successfully.'
          : t('notEnoughCoins')
      )
    } catch {
      showNotice(isUz ? 'Server bilan aloqa bo‘lmadi.' : 'Could not reach the economy server.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleTopUp = async (coins: number) => {
    handleClick()
    setBusyAction(`topup-${coins}`)
    try {
      const response = await fetch('/api/economy/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coins }),
      })
      const data = (await response.json().catch(() => ({}))) as { coins?: unknown; error?: unknown }

      soundManager.playPowerup()
      if (response.ok && typeof data.coins === 'number') {
        syncCoinBalance(data.coins)
        showNotice(`+${coins.toLocaleString()} ${t('coinPackageAdded')} • ${t('demoTopup')}`)
        return
      }

      if (response.status === 401) {
        addCoins(coins)
        showNotice(`+${coins.toLocaleString()} ${t('coinPackageAdded')} • ${t('demoTopup')}`)
        return
      }

      showNotice(typeof data.error === 'string' ? data.error : t('paymentUnavailable'))
    } catch {
      soundManager.playPowerup()
      addCoins(coins)
      showNotice(`+${coins.toLocaleString()} ${t('coinPackageAdded')} • ${t('demoTopup')}`)
    } finally {
      setBusyAction(null)
    }
  }

  const handleEquip = (skinId: CellSkinId) => {
    handleClick()
    if (!ownedSkinIds.includes(skinId)) return
    setSelectedSkinId(skinId)
    setSelectedSkinIdState(skinId)
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-10 sm:px-8">
      <main className="relative z-10 mx-auto max-w-7xl space-y-12">
        {/* Armory Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div className="space-y-4">
            <Link
              href="/"
              onMouseEnter={handleHover}
              onClick={handleClick}
              className="v-btn-ghost !px-4 !py-2 !text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>HUB</span>
            </Link>
            <div>
              <span className="v-label block text-gold">
                01 // <ScrambleText text="SPECIMEN ARMORY" />
              </span>
              <h1 className="v-display mt-2 text-5xl text-bone sm:text-7xl">
                <MaskText
                  lines={[
                    <span key="t">
                      {t('skinsTitle')} <span className="v-stroke-acid">3D</span>
                    </span>,
                  ]}
                />
              </h1>
              <p className="mt-3 max-w-xl font-sans text-sm text-mute">{t('armorySubtitle')}</p>
            </div>
          </div>

          <div className="space-y-2 text-right">
            <span className="v-label block">{t('coinWallet')}</span>
            <CoinWallet />
          </div>
        </div>

        {notice && (
          <div className="v-panel v-accent-acid v-enter flex items-center gap-3 px-5 py-3.5 font-mono text-xs text-acid">
            <Zap className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Coin Store Packages */}
        <Reveal>
          <section className="v-panel v-accent-gold p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>CREDIT SUPPLY // TOP-UP</span>
                </div>
                <h2 className="v-display mt-2 text-3xl text-bone">{t('coinPackagesTitle')}</h2>
                <p className="mt-1 font-sans text-xs text-mute">{t('coinPackagesSubtitle')}</p>
              </div>
              <span className="v-tag v-accent-gold">{t('demoTopup')}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {COIN_PACKAGES.map((coinPackage) => (
                <article
                  key={coinPackage.coins}
                  onMouseEnter={handleHover}
                  className="v-card v-accent-gold flex flex-col justify-between bg-ink p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="v-label !text-gold">{coinPackage.label}</span>
                      <Coins className="h-4 w-4 text-gold" />
                    </div>
                    <div className="v-display mt-3 text-3xl text-bone tabular-nums">
                      +{coinPackage.coins.toLocaleString()}
                    </div>
                    <div className="v-label mt-3">{t('coinPackagePrice')}</div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-gold">
                      {coinPackage.priceUzs.toLocaleString('uz-UZ')} so‘m
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleTopUp(coinPackage.coins)}
                    disabled={busyAction !== null}
                    className="v-btn mt-4 w-full !bg-gold !py-2.5 !text-sm !text-ink"
                  >
                    {busyAction === `topup-${coinPackage.coins}` ? (
                      <CellixLoader variant="compact" label={isUz ? 'QOSHILMOQDA...' : 'ADDING...'} />
                    ) : (
                      <>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>{t('coinPackageBuy')}</span>
                      </>
                    )}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Arena Affinity Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
          <div className="space-y-1">
            <span className="v-label block text-acid">
              {isUz ? 'ARENAGA MOSLANGAN 3D MODELLAR' : 'ARENA-MATCHED 3D MODELS'}
            </span>
            <p className="font-sans text-xs text-mute">
              {isUz
                ? 'Har bir arena uslubi uchun maxsus ishlab chiqilgan 3D skinlarni filtrlang'
                : 'Filter volumetric 3D skins tuned for each combat arena'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: isUz ? 'BARCHASI' : 'ALL ARENAS' },
                { id: 'classic', label: 'CLASSIC' },
                { id: 'survival', label: 'SURVIVAL' },
                { id: 'daily', label: 'DAILY' },
                { id: 'biowar', label: 'BIO-WAR 30' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onMouseEnter={handleHover}
                onClick={() => {
                  handleClick()
                  setArenaFilter(tab.id)
                }}
                className={`v-chamfer-sm border px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  arenaFilter === tab.id
                    ? tab.id === 'biowar'
                      ? 'border-tide bg-tide/15 text-tide'
                      : tab.id === 'survival'
                        ? 'border-ember bg-ember/15 text-ember'
                        : tab.id === 'daily'
                          ? 'border-gold bg-gold/15 text-gold'
                          : 'border-acid bg-acid/15 text-acid'
                    : 'border-line bg-ink-2 text-mute hover:border-line-strong hover:text-bone'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skins Showcase Matrix */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSkins.map((skin, idx) => {
            const isOwned = ownedSkinIds.includes(skin.id)
            const isEquipped = selectedSkinId === skin.id
            const canAfford = balance >= skin.coinCost
            const accent = rarityAccent(skin.rarity)
            const arenaMeta = arenaBadge(skin.arenaAffinity, isUz)

            return (
              <Reveal key={skin.id} delay={idx * 50}>
                <article
                  onMouseEnter={handleHover}
                  className={`v-card group ${isEquipped ? 'v-accent-acid bg-ink-3' : accent.panel} flex min-h-[360px] flex-col justify-between p-6`}
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between">
                      {/* Volumetric 3D Specimen Pedestal */}
                      <div className="v-chamfer relative flex h-24 w-24 items-center justify-center border border-line-strong bg-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-acid/60">
                        <PixelCharacterAvatar skin={skin} size={82} animated />
                        {!isOwned && (
                          <span className="absolute inset-0 flex items-center justify-center bg-ink/75 text-gold">
                            <LockKeyhole className="h-6 w-6" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`v-tag ${accent.panel}`}>{skin.rarity}</span>
                        <span className={`v-tag ${arenaMeta.cls}`}>{arenaMeta.label}</span>
                        {skin.isNew3D && <span className="v-tag v-accent-acid">3D MODEL</span>}
                        {isEquipped && <span className="v-tag v-accent-acid">ACTIVE</span>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="v-label">UNIT #{String(CELL_SKINS.indexOf(skin) + 1).padStart(2, '0')}</div>
                      <h2 className="v-display text-3xl text-bone">
                        {isUz ? skin.nameUz : skin.name}
                      </h2>
                      <p className="min-h-12 font-sans text-xs leading-relaxed text-mute">
                        {isUz ? skin.descriptionUz : skin.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                    <div className="font-mono text-[11px] font-semibold">
                      {isOwned ? (
                        <span className="inline-flex items-center gap-1.5 text-acid">
                          <Check className="h-3.5 w-3.5" />
                          {skin.unlockType === 'default' ? t('skinCommonOpen') : t('skinOwned')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-dim">
                          <LockKeyhole className="h-3.5 w-3.5" />
                          {t('skinLocked')}
                        </span>
                      )}
                    </div>

                    {isOwned ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(skin.id)}
                        disabled={isEquipped}
                        className={
                          isEquipped
                            ? 'v-btn !py-2 !px-4 !text-sm'
                            : 'v-btn-ghost !py-2 !px-4 !text-sm'
                        }
                      >
                        {isEquipped && <Check className="h-3.5 w-3.5" />}
                        <span>{isEquipped ? t('skinEquipped') : t('skinEquip')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handlePurchase(skin.id)}
                        disabled={!canAfford || busyAction !== null}
                        className={`v-btn !py-2 !px-4 !text-sm ${
                          canAfford ? '!bg-gold !text-ink' : '!bg-ink-3 !text-dim'
                        }`}
                      >
                        {busyAction === skin.id ? (
                          <CellixLoader variant="compact" label="..." />
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>{skin.coinCost.toLocaleString()}</span>
                            <Coins className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </main>
    </div>
  )
}
