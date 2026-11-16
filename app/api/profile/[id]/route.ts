import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateAchievements } from '@/lib/game/achievements'
import { getAuthenticatedPlayer } from '@/lib/auth'

interface CachedProfileStats {
  timestamp: number
  stats: {
    totalGames: number
    bestScore: number
    totalKills: number
    maxLevel: number
    avgSurvival: number
    maxSurvivalTime: number
  }
  biowarStats: {
    games: number
    bestScore: number
    totalKills: number
    maxSurvival: number
  }
  achievements: ReturnType<typeof evaluateAchievements>
}

const profileStatsCache = new Map<string, CachedProfileStats>()
const PROFILE_CACHE_TTL_MS = 30000 // 30 seconds

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authenticatedPlayer = await getAuthenticatedPlayer()
    let player = null

    if (id === 'me') {
      if (!authenticatedPlayer) {
        return NextResponse.json({ error: 'Avval tizimga kiring yoki ro‘yxatdan o‘ting.' }, { status: 401 })
      }
      player = await prisma.player.findUnique({
        where: { id: authenticatedPlayer.id },
        include: {
          highScores: { orderBy: { score: 'desc' }, take: 1 },
        },
      })
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

    // In-memory short-lived cache for profile aggregates
    const isOwner = Boolean(authenticatedPlayer && authenticatedPlayer.id === player.id)
    const cacheKey = player.id
    const cached = profileStatsCache.get(cacheKey)
    const now = Date.now()

    let stats
    let biowarStats
    let achievements

    if (cached && !isOwner && now - cached.timestamp < PROFILE_CACHE_TTL_MS) {
      stats = cached.stats
      biowarStats = cached.biowarStats
      achievements = cached.achievements
    } else {
      // Execute optimized, indexed PostgreSQL aggregations concurrently
      const [generalStats, bestScoreRecord, survivalStats, biowarAggregate, bossRecord, topScore] = await Promise.all([
        prisma.gameSession.aggregate({
          where: { playerId: player.id },
          _count: { id: true },
          _sum: { kills: true },
          _max: { level: true, survivalTime: true },
          _avg: { survivalTime: true },
        }),
        prisma.gameSession.findFirst({
          where: { playerId: player.id },
          orderBy: { score: 'desc' },
          select: { score: true },
        }),
        prisma.gameSession.aggregate({
          where: { playerId: player.id, gameMode: 'survival' },
          _max: { wave: true },
        }),
        prisma.gameSession.aggregate({
          where: { playerId: player.id, gameMode: 'biowar' },
          _count: { id: true },
          _sum: { kills: true },
          _max: { score: true, survivalTime: true },
        }),
        prisma.gameSession.findFirst({
          where: { playerId: player.id, bossDefeated: true },
          select: { id: true },
        }),
        prisma.highScore.findFirst({
          orderBy: { score: 'desc' },
          select: { playerId: true },
        }),
      ])

      const totalGames = generalStats._count.id || 0
      const totalKills = generalStats._sum.kills || 0
      const bestScore = bestScoreRecord?.score || (player.highScores[0]?.score || 0)
      const maxLevel = generalStats._max.level || 0
      const maxSurvivalTime = generalStats._max.survivalTime || 0
      const avgSurvival = generalStats._avg.survivalTime ? Math.round(generalStats._avg.survivalTime) : 0
      const totalMutations = maxLevel > 1 ? maxLevel - 1 : 0
      const survivalWavesCleared = survivalStats._max.wave || 0
      const bossDefeated = Boolean(bossRecord)
      const isTopOne = topScore?.playerId === player.id

      achievements = evaluateAchievements({
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

      stats = {
        totalGames,
        bestScore,
        totalKills,
        maxLevel,
        avgSurvival,
        maxSurvivalTime,
      }

      biowarStats = {
        games: biowarAggregate._count.id || 0,
        bestScore: biowarAggregate._max.score || 0,
        totalKills: biowarAggregate._sum.kills || 0,
        maxSurvival: biowarAggregate._max.survivalTime || 0,
      }

      profileStatsCache.set(cacheKey, {
        timestamp: now,
        stats,
        biowarStats,
        achievements,
      })
    }

    // Optional Paginated Game History (Bounded, max 50 items)
    let history: { page: number; limit: number; sessions: unknown[] } | undefined
    const url = new URL(req.url)
    if (url.searchParams.get('history') === 'true') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10))
      const skip = (page - 1) * limit
      const sessions = await prisma.gameSession.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          score: true,
          level: true,
          kills: true,
          survivalTime: true,
          gameMode: true,
          wave: true,
          createdAt: true,
        },
      })
      history = { page, limit, sessions }
    }

    return NextResponse.json({
      isOwner,
      player: {
        id: player.id,
        username: player.username,
        bio: player.bio,
        avatarColor: player.avatarColor,
        coins: player.coins,
        ownedSkins: player.ownedSkins,
        createdAt: player.createdAt,
      },
      stats,
      biowarStats,
      achievements,
      ...(history ? { history } : {}),
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 })
  }
}
