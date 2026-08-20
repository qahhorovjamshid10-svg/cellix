import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { cookies } from 'next/headers'

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies()
    const playerId = cookieStore.get('virus_player_id')?.value

    if (!playerId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const { username, bio, avatarColor } = body

    const updateData: Prisma.PlayerUpdateInput = {}
    if (username && typeof username === 'string' && username.trim().length >= 2 && username.trim().length <= 24) {
      updateData.username = username.trim()
    }
    if (typeof bio === 'string' && bio.length <= 200) {
      updateData.bio = bio
    }
    if (avatarColor && typeof avatarColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) {
      updateData.avatarColor = avatarColor
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const player = await prisma.player.update({
      where: { id: playerId },
      data: updateData,
    })

    return NextResponse.json({ success: true, player })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
  }
}
