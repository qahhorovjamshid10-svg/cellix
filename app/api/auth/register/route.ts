import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || username.length < 2 || username.length > 24) {
      return NextResponse.json({ success: false, error: 'Username must be between 2 and 24 characters' }, { status: 400 });
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingUser = await prisma.player.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Username or email already exists' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    const player = await prisma.player.create({
      data: {
        username,
        email,
        passwordHash,
        coins: 500,
      }
    });

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
        coins: player.coins 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
