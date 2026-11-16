'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Coins } from 'lucide-react'
import {
  COINS_CHANGED_EVENT,
  getCoinBalance,
  syncCoinBalance,
  syncOwnedSkinIds,
  type CellSkinId,
} from '@/lib/game/cosmetics'

let inFlightEconomyFetch: Promise<void> | null = null
let lastEconomyFetchAt = 0

function fetchEconomyOnce() {
  const now = Date.now()
  if (inFlightEconomyFetch) return inFlightEconomyFetch
  if (now - lastEconomyFetchAt < 4000) return Promise.resolve()

  lastEconomyFetchAt = now
  inFlightEconomyFetch = fetch('/api/economy', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data: { authenticated?: boolean; coins?: unknown; ownedSkins?: unknown }) => {
      if (typeof data.coins === 'number') {
        syncCoinBalance(data.coins)
      }
      if (Array.isArray(data.ownedSkins)) {
        syncOwnedSkinIds(data.ownedSkins.filter((id): id is CellSkinId => typeof id === 'string'))
      }
    })
    .catch(() => {
      // Anonymous/local mode can continue without a server economy profile.
    })
    .finally(() => {
      inFlightEconomyFetch = null
    })

  return inFlightEconomyFetch
}

function subscribeToCoins(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(COINS_CHANGED_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(COINS_CHANGED_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useCoinBalance() {
  const balance = useSyncExternalStore(subscribeToCoins, getCoinBalance, () => 0)

  useEffect(() => {
    void fetchEconomyOnce()
  }, [])

  return balance
}

export default function CoinWallet({ compact = false, balanceOverride }: { compact?: boolean; balanceOverride?: number }) {
  const balance = useCoinBalance()
  const visibleBalance = typeof balanceOverride === 'number' ? balanceOverride : balance
  const safeBalance = Number.isFinite(visibleBalance) ? visibleBalance : 0

  return (
    <div
      className={`v-chamfer-sm inline-flex items-center gap-2 border border-gold/35 bg-ink-2 font-mono font-bold text-gold transition-colors hover:border-gold ${
        compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
      }`}
      title={`${safeBalance.toLocaleString()} coins`}
    >
      <Coins className={compact ? 'h-3.5 w-3.5 text-gold' : 'h-4 w-4 text-gold'} />
      <span className="tabular-nums tracking-wider">{safeBalance.toLocaleString()}</span>
      {!compact && <span className="v-label !text-gold/70">CR</span>}
    </div>
  )
}
