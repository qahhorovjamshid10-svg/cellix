import { NextResponse } from 'next/server'
import { CELL_SKINS, type CellSkinId } from '@/lib/game/cosmetics'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedPlayer } from '@/lib/auth'

function isCellSkinId(value: unknown): value is CellSkinId {
  return typeof value === 'string' && CELL_SKINS.some((skin) => skin.id === value)
}

function parseOwnedSkins(value: string): CellSkinId[] {
  try {
    const parsed: unknown = JSON.parse(value)
    const owned = Array.isArray(parsed) ? parsed.filter(isCellSkinId) : []
    return Array.from(new Set<CellSkinId>(['neon_cyan', ...owned]))
  } catch {
    return ['neon_cyan']
  }
}

export async function POST(req: Request) {
  try {
    const authenticatedPlayer = await getAuthenticatedPlayer()
    if (!authenticatedPlayer) {
      return NextResponse.json({ error: 'Authentication required to purchase skins.' }, { status: 401 })
    }

    const body = (await req.json()) as unknown
    const skinId = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { skinId?: unknown }).skinId
      : undefined

    if (!isCellSkinId(skinId)) {
      return NextResponse.json({ error: 'Invalid skin.' }, { status: 400 })
    }

    const skin = CELL_SKINS.find((item) => item.id === skinId)
    if (!skin || skin.unlockType === 'default') {
      return NextResponse.json({ error: 'This skin is already open.' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: authenticatedPlayer.id },
        select: { id: true, coins: true, ownedSkins: true },
      })

      if (!player) return { status: 401 as const, error: 'Profile not found.' }

      const ownedSkins = parseOwnedSkins(player.ownedSkins)
      if (ownedSkins.includes(skinId)) {
        return { status: 409 as const, error: 'Skin is already owned.' }
      }

      if (player.coins < skin.coinCost) {
        return { status: 400 as const, error: 'Not enough coins.' }
      }

      const updated = await tx.player.updateMany({
        where: {
          id: player.id,
          coins: { gte: skin.coinCost },
        },
        data: {
          coins: { decrement: skin.coinCost },
          ownedSkins: JSON.stringify([...ownedSkins, skinId]),
        },
      })

      if (updated.count !== 1) {
        return { status: 400 as const, error: 'Insufficient balance or concurrent transaction.' }
      }

      const freshPlayer = await tx.player.findUnique({
        where: { id: player.id },
        select: { coins: true, ownedSkins: true },
      })

      return {
        status: 200 as const,
        coins: freshPlayer?.coins ?? (player.coins - skin.coinCost),
        ownedSkins: parseOwnedSkins(freshPlayer?.ownedSkins || '[]'),
      }
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, coins: result.coins, ownedSkins: result.ownedSkins })
  } catch (error) {
    console.error('Error handling skin purchase:', error)
    return NextResponse.json({ error: 'Failed to process purchase.' }, { status: 500 })
  }
}
