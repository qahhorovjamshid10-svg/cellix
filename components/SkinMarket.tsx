'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Coins, CreditCard, LockKeyhole, ShoppingCart, Sparkles } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import CoinWallet, { useCoinBalance } from '@/components/CoinWallet'
import PixelCharacterAvatar from '@/components/PixelCharacterAvatar'
import { COIN_PACKAGES } from '@/lib/game/coinPackages'
import {
  CELL_SKINS,
  COINS_CHANGED_EVENT,
  addCoins,
  getOwnedSkinIds,
  getSelectedSkinId,
  purchaseSkin,
  setSelectedSkinId,
  syncCoinBalance,
  syncOwnedSkinIds,
  type CellSkinId,
} from '@/lib/game/cosmetics'

export default function SkinMarket() {
  const { lang, t } = useLanguage()
  const isUz = lang === 'uz'
  const balance = useCoinBalance()
  const [selectedSkinId, setSelectedSkinIdState] = useState<CellSkinId>('neon_cyan')
  const [ownedSkinIds, setOwnedSkinIds] = useState<CellSkinId[]>(['neon_cyan'])
  const [notice, setNotice] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

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

      // Local guest mode remains playable until a profile is created.
      const result = purchaseSkin(skinId)
      setOwnedSkinIds(result.ownedSkinIds)
      showNotice(
        result.ok
          ? (isUz ? 'Skin muvaffaqiyatli sotib olindi.' : 'Skin purchased successfully.')
          : t('notEnoughCoins')
      )
    } catch {
      showNotice(isUz ? 'Server bilan aloqa bo‘lmadi.' : 'Could not reach the economy server.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleTopUp = async (coins: number) => {
    setBusyAction(`topup-${coins}`)
    try {
      const response = await fetch('/api/economy/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coins }),
      })
      const data = (await response.json().catch(() => ({}))) as { coins?: unknown; error?: unknown }

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
      addCoins(coins)
      showNotice(`+${coins.toLocaleString()} ${t('coinPackageAdded')} • ${t('demoTopup')}`)
    } finally {
      setBusyAction(null)
    }
  }

  const handleEquip = (skinId: CellSkinId) => {
    if (!ownedSkinIds.includes(skinId)) return
    setSelectedSkinId(skinId)
    setSelectedSkinIdState(skinId)
  }

  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

      <main className="relative z-10 mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold text-slate-400 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              HUB
            </Link>
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">CELLIX ARMORY / MARKET</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              {t('skinsTitle')} <span className="text-cyan-300">(8-BIT PIXEL HEROES)</span>
            </h1>
            <p className="max-w-xl font-mono text-sm leading-relaxed text-slate-400">{t('armorySubtitle')}</p>
          </div>

          <div className="space-y-2 text-right">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('coinWallet')}</span>
            <CoinWallet />
          </div>
        </div>

        {notice && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/50 px-4 py-3 font-mono text-xs text-amber-200">
            {notice}
          </div>
        )}

        <section className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <CreditCard className="h-4 w-4" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">COIN STORE / TEST MODE</span>
              </div>
              <h2 className="mt-2 font-mono text-xl font-black text-white">{t('coinPackagesTitle')}</h2>
              <p className="mt-1 font-mono text-xs text-slate-400">{t('coinPackagesSubtitle')}</p>
            </div>
            <span className="rounded-lg border border-amber-500/30 bg-amber-950/60 px-2 py-1 font-mono text-[10px] font-bold text-amber-300">
              {t('demoTopup')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {COIN_PACKAGES.map((coinPackage) => (
              <article key={coinPackage.coins} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-purple-300">{coinPackage.label}</span>
                  <Coins className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-3 font-mono text-2xl font-black text-white">{coinPackage.coins.toLocaleString()}</div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">{t('coinPackagePrice')}</div>
                <div className="mt-1 font-mono text-sm font-bold text-amber-300">{coinPackage.priceUzs.toLocaleString('uz-UZ')} so‘m</div>
                <button
                  type="button"
                  onClick={() => void handleTopUp(coinPackage.coins)}
                  disabled={busyAction !== null}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 font-mono text-[10px] font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-wait disabled:opacity-50"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t('coinPackageBuy')}
                </button>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CELL_SKINS.map((skin) => {
            const isOwned = ownedSkinIds.includes(skin.id)
            const isEquipped = selectedSkinId === skin.id
            const canAfford = balance >= skin.coinCost

            return (
              <article
                key={skin.id}
                className={`group relative overflow-hidden rounded-3xl border p-5 transition-all ${
                  isEquipped
                    ? 'border-cyan-400/70 bg-cyan-950/30 shadow-[0_0_30px_rgba(6,182,212,0.18)]'
                    : isOwned
                      ? 'border-slate-700 bg-slate-950/70 hover:border-purple-400/60'
                      : 'border-slate-800 bg-slate-950/50'
                }`}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: skin.glowColor }} />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 shadow-inner" style={{ background: `radial-gradient(circle, ${skin.glowColor}55, #0f172a 70%)` }}>
                      <PixelCharacterAvatar skin={skin} size={72} animated />
                      {!isOwned && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/55 text-slate-200">
                          <LockKeyhole className="h-6 w-6" />
                        </span>
                      )}
                    </div>
                    <span className="rounded-lg border border-purple-500/30 bg-purple-950/70 px-2 py-1 font-mono text-[10px] font-bold text-purple-300">
                      {skin.rarity}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="font-mono text-lg font-black text-white">{isUz ? skin.nameUz : skin.name}</h2>
                    <p className="min-h-12 font-mono text-xs leading-relaxed text-slate-400">{isUz ? skin.descriptionUz : skin.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                    <div className="font-mono text-xs">
                      {isOwned ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          {skin.unlockType === 'default' ? t('skinCommonOpen') : t('skinOwned')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
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
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[10px] font-bold transition-all ${
                          isEquipped
                            ? 'cursor-default bg-cyan-400 text-slate-950'
                            : 'cursor-pointer border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-white'
                        }`}
                      >
                        {isEquipped && <Check className="h-3.5 w-3.5" />}
                        {isEquipped ? t('skinEquipped') : t('skinEquip')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handlePurchase(skin.id)}
                        disabled={!canAfford || busyAction !== null}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[10px] font-bold transition-all ${
                          canAfford
                            ? 'cursor-pointer bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-600'
                        }`}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>{skin.coinCost.toLocaleString()}</span>
                        <Coins className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
