import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('virus_player_id', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return NextResponse.json({ success: true });
}
