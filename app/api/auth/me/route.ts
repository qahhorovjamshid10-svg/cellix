import { NextResponse } from 'next/server'
import { getAuthenticatedPlayer } from '@/lib/auth'

export async function GET() {
  try {
    const player = await getAuthenticatedPlayer()

    if (!player) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        coins: player.coins,
        avatarColor: player.avatarColor,
        ownedSkins: player.ownedSkins,
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
  }
}

