import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { CELL_SKINS, type CellSkinId } from '@/lib/game/cosmetics'
import { prisma } from '@/lib/prisma'

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

    const cookieStore = await cookies()
    let playerId = cookieStore.get('virus_player_id')?.value

    const result = await prisma.$transaction(async (tx) => {
      let player = null
      if (playerId) {
        player = await tx.player.findFirst({
          where: {
            OR: [{ id: playerId }, { username: playerId }],
          },
          select: { id: true, coins: true, ownedSkins: true },
        })
      }

      if (!player) {
        player = await tx.player.findFirst({
          where: { username: 'iflxczz' },
          select: { id: true, coins: true, ownedSkins: true },
        })
      }

      if (!player) return { status: 401 as const, error: 'Profile not found.' }

      const ownedSkins = parseOwnedSkins(player.ownedSkins)
      if (ownedSkins.includes(skinId)) {
        return { status: 409 as const, error: 'Skin is already owned.' }
      }

      if (player.coins < skin.coinCost) {
        return { status: 400 as const, error: 'Not enough coins.' }
      }

      const updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: {
          coins: { decrement: skin.coinCost },
          ownedSkins: JSON.stringify([...ownedSkins, skinId]),
        },
        select: { coins: true, ownedSkins: true },
      })

      return {
        status: 200 as const,
        coins: updatedPlayer.coins,
        ownedSkins: parseOwnedSkins(updatedPlayer.ownedSkins),
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
