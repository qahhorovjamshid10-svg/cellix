import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!username || username.length < 2 || username.length > 24) {
      return NextResponse.json(
        { success: false, error: 'Foydalanuvchi nomi 2 dan 24 gacha belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'To‘g‘ri elektron pochta manzilini kiriting.' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.player.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    })

    if (existingUser) {
      if (existingUser.email && existingUser.email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'Bu elektron pochta bilan allaqachon hisob ochilgan.' },
          { status: 409 }
        )
      }

      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        if (existingUser.passwordHash) {
          return NextResponse.json(
            { success: false, error: 'Bu foydalanuvchi nomi allaqachon band.' },
            { status: 409 }
          )
        }

        // Upgrade existing unclaimed account (e.g. iflxczz)
        const passwordHash = hashPassword(password)
        const updated = await prisma.player.update({
          where: { id: existingUser.id },
          data: {
            email,
            passwordHash,
          },
        })

        const response = NextResponse.json({
          success: true,
          player: {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            coins: updated.coins,
            avatarColor: updated.avatarColor,
            ownedSkins: updated.ownedSkins,
          },
        })

        response.cookies.set('virus_player_id', updated.id, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          httpOnly: false,
        })

        return response
      }
    }

    const passwordHash = hashPassword(password)

    const player = await prisma.player.create({
      data: {
        username,
        email,
        passwordHash,
        coins: 500,
      },
    })

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

    response.cookies.set('virus_player_id', player.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ success: false, error: 'Serverda xatolik yuz berdi.' }, { status: 500 })
  }
}
