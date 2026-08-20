import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('virus_player_id', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    httpOnly: false,
  })
  return response
}
