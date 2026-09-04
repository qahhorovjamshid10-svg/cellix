import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const emailOrUsername = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { success: false, error: 'Email/Username va parol kiritilishi shart.' },
        { status: 400 }
      )
    }

    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
          { email: emailOrUsername },
        ],
      },
    })

    if (!player || !player.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Bunday foydalanuvchi topilmadi yoki parol noto‘g‘ri.' },
        { status: 401 }
      )
    }

    const isValid = verifyPassword(password, player.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Noto‘g‘ri parol kiritildi.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        coins: player.coins,
        avatarColor: player.avatarColor,
        ownedSkins: player.ownedSkins,
      },
    })

    await createSession(player.id, response)

    return response
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: err?.message || 'Serverda xatolik yuz berdi.' }, { status: 500 })
  }
}
