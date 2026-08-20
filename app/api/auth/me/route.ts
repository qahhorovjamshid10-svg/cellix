import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get('virus_player_id')?.value;

  if (!playerId) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        coins: player.coins,
        avatarColor: player.avatarColor
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
