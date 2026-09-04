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

    const validModes = ['classic', 'survival', 'daily', 'biowar']
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

    // Bio-War Apex Predator snakes for the Bio-War & Global Leaderboard
    const BIOWAR_APEX_WORMS = [
      { id: 'bw_apex_1', username: 'Tashkent_Viper', score: 9840, level: 19, kills: 16, survivalTime: 180, avatarColor: '#06b6d4', gameMode: 'biowar' },
      { id: 'bw_apex_2', username: 'ApexPredator', score: 8750, level: 17, kills: 13, survivalTime: 180, avatarColor: '#f59e0b', gameMode: 'biowar' },
      { id: 'bw_apex_3', username: 'CyberPhantom', score: 7920, level: 15, kills: 11, survivalTime: 180, avatarColor: '#a855f7', gameMode: 'biowar' },
      { id: 'bw_apex_4', username: 'Samarkand_Venom', score: 6830, level: 14, kills: 9, survivalTime: 175, avatarColor: '#10b981', gameMode: 'biowar' },
      { id: 'bw_apex_5', username: 'NeoWorm_99', score: 5940, level: 12, kills: 8, survivalTime: 165, avatarColor: '#ec4899', gameMode: 'biowar' },
      { id: 'bw_apex_6', username: 'Bukhara_Strike', score: 5120, level: 11, kills: 7, survivalTime: 150, avatarColor: '#3b82f6', gameMode: 'biowar' },
      { id: 'bw_apex_7', username: 'Quantum_Serpent', score: 4650, level: 10, kills: 6, survivalTime: 145, avatarColor: '#f97316', gameMode: 'biowar' },
      { id: 'bw_apex_8', username: 'Bio_Titan', score: 3980, level: 9, kills: 5, survivalTime: 135, avatarColor: '#14b8a6', gameMode: 'biowar' },
      { id: 'bw_apex_9', username: 'Hyper_Cobra', score: 3420, level: 8, kills: 4, survivalTime: 125, avatarColor: '#8b5cf6', gameMode: 'biowar' },
      { id: 'bw_apex_10', username: 'Laser_Fang', score: 2890, level: 7, kills: 3, survivalTime: 110, avatarColor: '#ef4444', gameMode: 'biowar' },
    ]

    let merged = [...highScores]
    if (!gameMode || gameMode === 'biowar') {
      const existingUsernames = new Set(highScores.map((h) => h.player?.username))
      const botEntries = BIOWAR_APEX_WORMS.filter((b) => !existingUsernames.has(b.username)).map((b) => ({
        id: b.id,
        score: b.score,
        level: b.level,
        kills: b.kills,
        survivalTime: b.survivalTime,
        gameMode: b.gameMode,
        challengeDate: null,
        createdAt: new Date().toISOString() as any,
        playerId: b.id,
        player: {
          id: b.id,
          username: b.username,
          avatarColor: b.avatarColor,
        },
      }))
      merged = [...merged, ...botEntries]
    }

    // Sort combined results by selected category
    merged.sort((a, b) => {
      switch (category) {
        case 'kills':
          return b.kills - a.kills
        case 'survivalTime':
          return b.survivalTime - a.survivalTime
        case 'level':
          return b.level - a.level
        case 'score':
        default:
          return b.score - a.score
      }
    })

    const finalResults = merged.slice(0, limit)

    return NextResponse.json({
      success: true,
      category,
      highScores: finalResults,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 })
  }
}
