import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSession } from '@/lib/auth'

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

    const existingUsername = await prisma.player.findFirst({
      where: {
        OR: [
          { username },
          { username: username.toLowerCase() },
        ],
      },
    })

    const existingEmail = await prisma.player.findFirst({
      where: {
        OR: [
          { email },
          { email: email.toLowerCase() },
        ],
      },
    })

    if (existingEmail && existingEmail.id !== existingUsername?.id) {
      return NextResponse.json(
        { success: false, error: 'Bu elektron pochta bilan allaqachon hisob ochilgan.' },
        { status: 409 }
      )
    }

    if (existingUsername) {
      if (existingUsername.passwordHash) {
        return NextResponse.json(
          { success: false, error: 'Bu foydalanuvchi nomi allaqachon band.' },
          { status: 409 }
        )
      }

      // Upgrade existing unclaimed account (e.g. iflxczz)
      const passwordHash = hashPassword(password)
      const updated = await prisma.player.update({
        where: { id: existingUsername.id },
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

      await createSession(updated.id, response)

      return response
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

    await createSession(player.id, response)

    return response
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    console.error('Registration error:', error)
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Bu foydalanuvchi nomi yoki elektron pochta allaqachon band.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Serverda xatolik yuz berdi.' },
      { status: 500 }
    )
  }
}
