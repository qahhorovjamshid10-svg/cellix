import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_SKINS = ['neon_cyan']

function parseOwnedSkins(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    const owned = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
    return Array.from(new Set([...DEFAULT_SKINS, ...owned]))
  } catch {
    return DEFAULT_SKINS
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    let playerId = cookieStore.get('virus_player_id')?.value

    if (!playerId) {
      const creator = await prisma.player.findFirst({
        where: { username: 'iflxczz' },
        select: { id: true, coins: true, ownedSkins: true },
      })
      if (creator) {
        return NextResponse.json({
          authenticated: true,
          coins: creator.coins,
          ownedSkins: parseOwnedSkins(creator.ownedSkins),
        })
      }
      return NextResponse.json({ authenticated: false, coins: 0, ownedSkins: DEFAULT_SKINS })
    }

    const player = await prisma.player.findFirst({
      where: {
        OR: [{ id: playerId }, { username: playerId }],
      },
      select: { coins: true, ownedSkins: true },
    })

    if (!player) {
      return NextResponse.json({ authenticated: false, coins: 0, ownedSkins: DEFAULT_SKINS })
    }

    return NextResponse.json({
      authenticated: true,
      coins: player.coins,
      ownedSkins: parseOwnedSkins(player.ownedSkins),
    })
  } catch (error) {
    console.error('Error fetching economy profile:', error)
    return NextResponse.json({ error: 'Failed to fetch economy profile.' }, { status: 500 })
  }
}
