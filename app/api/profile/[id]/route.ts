import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateAchievements } from '@/lib/game/achievements'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let player = null

    if (id === 'me') {
      const cookieStore = await cookies()
      const cookiePlayerId = cookieStore.get('virus_player_id')?.value
      if (cookiePlayerId) {
        player = await prisma.player.findFirst({
          where: {
            OR: [{ id: cookiePlayerId }, { username: cookiePlayerId }],
          },
          include: {
            highScores: { orderBy: { score: 'desc' }, take: 1 },
          },
        })
      }
      if (!player) {
        return NextResponse.json({ error: 'Avval tizimga kiring yoki ro‘yxatdan o‘ting.' }, { status: 401 })
      }
    } else {
      player = await prisma.player.findFirst({
        where: {
          OR: [
            { id },
            { username: id },
          ],
        },
        include: {
          highScores: {
            orderBy: { score: 'desc' },
            take: 1,
          },
        },
      })
    }

    if (!player) {
      return NextResponse.json({ error: 'O‘yinchi profili topilmadi.' }, { status: 404 })
    }

    // Calculate stats
    const allSessions = await prisma.gameSession.findMany({
      where: { playerId: player.id },
    })

    const totalGames = allSessions.length
    const totalKills = allSessions.reduce((sum, s) => sum + s.kills, 0)
    const bestScore = player.highScores[0]?.score || 0
    const maxLevel = Math.max(...allSessions.map(s => s.level), 0)
    const maxSurvivalTime = Math.max(...allSessions.map(s => s.survivalTime), 0)
    const avgSurvival = totalGames > 0 ? Math.round(allSessions.reduce((sum, s) => sum + s.survivalTime, 0) / totalGames) : 0
    const totalMutations = maxLevel > 1 ? maxLevel - 1 : 0
    const survivalWavesCleared = Math.max(...allSessions.filter(s => s.gameMode === 'survival').map(s => s.wave), 0)
    const bossDefeated = allSessions.some((session) => session.bossDefeated)

    // Check #1 leaderboard
    const topScore = await prisma.highScore.findFirst({
      orderBy: { score: 'desc' },
      select: { playerId: true },
    })
    const isTopOne = topScore?.playerId === player.id

    const achievements = evaluateAchievements({
      totalGames,
      bestScore,
      totalKills,
      maxLevel,
      maxSurvivalTime,
      totalMutations,
      survivalWavesCleared,
      isTopOne,
      bossDefeated,
    })

    const biowarSessions = allSessions.filter((s) => s.gameMode === 'biowar')
    const biowarGames = biowarSessions.length
    const biowarBestScore = biowarSessions.length > 0 ? Math.max(...biowarSessions.map((s) => s.score)) : 0
    const biowarTotalKills = biowarSessions.reduce((sum, s) => sum + s.kills, 0)
    const biowarMaxSurvival = biowarSessions.length > 0 ? Math.max(...biowarSessions.map((s) => s.survivalTime)) : 0

    return NextResponse.json({
      player: {
        id: player.id,
        username: player.username,
        bio: player.bio,
        avatarColor: player.avatarColor,
        coins: player.coins,
        ownedSkins: player.ownedSkins,
        createdAt: player.createdAt,
      },
      stats: {
        totalGames,
        bestScore,
        totalKills,
        maxLevel,
        avgSurvival,
        maxSurvivalTime,
      },
      biowarStats: {
        games: biowarGames,
        bestScore: biowarBestScore,
        totalKills: biowarTotalKills,
        maxSurvival: biowarMaxSurvival,
      },
      achievements,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 })
  }
}
