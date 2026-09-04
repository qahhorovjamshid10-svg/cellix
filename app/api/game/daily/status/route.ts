import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getTodayDateString, getDailyChallengeModifier } from '@/lib/game/daily'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const playerId = cookieStore.get('virus_player_id')?.value
    const challengeDate = getTodayDateString()

    // Calculate milliseconds until next midnight (00:00:00)
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const remainingMs = Math.max(0, midnight.getTime() - now.getTime())

    const dailyMod = getDailyChallengeModifier(challengeDate)

    if (!playerId) {
      return NextResponse.json({
        playedToday: false,
        remainingMs,
        challengeDate,
        dailyMod,
        result: null,
      })
    }

    const dailyResult = await prisma.dailyResult.findUnique({
      where: {
        playerId_challengeDate: {
          playerId,
          challengeDate,
        },
      },
      select: {
        id: true,
        score: true,
        level: true,
        kills: true,
        survivalTime: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      playedToday: Boolean(dailyResult),
      remainingMs,
      challengeDate,
      dailyMod,
      result: dailyResult,
    })
  } catch (error) {
    console.error('Error fetching daily status:', error)
    return NextResponse.json({ error: 'Failed to fetch daily status' }, { status: 500 })
  }
}
