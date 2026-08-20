import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'score'
    const gameMode = searchParams.get('gameMode')
    const challengeDate = searchParams.get('challengeDate')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    let orderBy: Record<string, 'asc' | 'desc'> = { score: 'desc' }

    switch (category) {
      case 'kills':
        orderBy = { kills: 'desc' }
        break
      case 'survivalTime':
        orderBy = { survivalTime: 'desc' }
        break
      case 'level':
        orderBy = { level: 'desc' }
        break
      case 'score':
      default:
        orderBy = { score: 'desc' }
        break
    }

    const validModes = ['classic', 'survival', 'daily']
    const where = gameMode && validModes.includes(gameMode)
      ? { gameMode, ...(gameMode === 'daily' && challengeDate ? { challengeDate } : {}) }
      : {}

    const highScores = await prisma.highScore.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        player: {
          select: {
            id: true,
            username: true,
            avatarColor: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      category,
      highScores,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 })
  }
}
