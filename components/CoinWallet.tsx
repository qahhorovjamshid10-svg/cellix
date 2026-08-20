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
    let cancelled = false

    fetch('/api/economy', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean; coins?: unknown; ownedSkins?: unknown }) => {
        if (cancelled) return
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

    return () => {
      cancelled = true
    }
  }, [])

  return balance
}

export default function CoinWallet({ compact = false, balanceOverride }: { compact?: boolean; balanceOverride?: number }) {
  const balance = useCoinBalance()
  const visibleBalance = typeof balanceOverride === 'number' ? balanceOverride : balance
  const safeBalance = Number.isFinite(visibleBalance) ? visibleBalance : 0

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 font-mono font-bold text-amber-300 ${
        compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'
      }`}
      title={`${safeBalance.toLocaleString()} coins`}
    >
      <Coins className={compact ? 'h-3.5 w-3.5 text-amber-400' : 'h-4 w-4 text-amber-400'} />
      <span>{safeBalance.toLocaleString()}</span>
      {!compact && <span className="text-[10px] text-amber-400/70">COINS</span>}
    </div>
  )
}
