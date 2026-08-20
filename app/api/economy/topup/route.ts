import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { COIN_PACKAGES } from '@/lib/game/coinPackages'
import { prisma } from '@/lib/prisma'

// Demo top-up endpoint. Replace this with a payment-provider webhook before production.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const coins = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { coins?: unknown }).coins
      : undefined

    if (typeof coins !== 'number' || !Number.isInteger(coins) || !COIN_PACKAGES.some((item) => item.coins === coins)) {
      return NextResponse.json({ error: 'Invalid coin package.' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const playerId = cookieStore.get('virus_player_id')?.value
    if (!playerId) {
      return NextResponse.json({ error: 'Sign in through a game profile first.' }, { status: 401 })
    }

    const player = await prisma.player.update({
      where: { id: playerId },
      data: { coins: { increment: coins } },
      select: { coins: true },
    })

    return NextResponse.json({ success: true, demo: true, coinsAdded: coins, coins: player.coins })
  } catch (error) {
    console.error('Error adding demo coin package:', error)
    return NextResponse.json({ error: 'Failed to add coin package.' }, { status: 500 })
  }
}

