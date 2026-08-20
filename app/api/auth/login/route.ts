import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { email }
    });

    if (!player || !player.passwordHash) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = verifyPassword(password, player.passwordHash);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('virus_player_id', player.id, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return NextResponse.json({ 
      success: true, 
      player: { 
        id: player.id, 
        username: player.username, 
        email: player.email, 
        coins: player.coins,
        avatarColor: player.avatarColor
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
