import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { checkPersistentRateLimit, getRequestRateLimitKey } from '@/lib/ratelimit'
import {
  hashSessionToken,
  isSessionExpired,
  validateScoreSubmission,
  verifySessionToken,
} from '@/lib/security'
import { getCellLevelForXp, getRunProgressionXp } from '@/lib/game/progression'
import { calculateRunCoinReward } from '@/lib/game/cosmetics'

const GAME_MODES = ['classic', 'survival', 'daily', 'biowar'] as const
type GameMode = (typeof GAME_MODES)[number]

function readBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number | null {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return null
  }
  return Math.floor(value)
}

export async function POST(req: Request) {
  try {
    // Rate limit check (max 10 submissions per IP per 5 minutes)
    const cookieHeader = req.headers.get('cookie') || ''
    const playerCookie = cookieHeader.match(/(?:^|;\s*)virus_player_id=([^;]+)/)?.[1]
    const subject = playerCookie || req.headers.get('user-agent') || 'anonymous'
    const rateCheck = await checkPersistentRateLimit(getRequestRateLimitKey(req, 'score_submit', subject), 10, 300000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many score submissions. Please wait.' }, { status: 429 })
    }

    const body = (await req.json()) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const {
      score,
      level,
      kills,
      survivalTime,
      gameMode,
      wave,
      token,
      damageDealt,
      damageTaken,
      criticalHits,
      bossDefeated,
      mutations,
    } = body as Record<string, unknown>

    if (typeof token !== 'string' || token.length > 512) {
      return NextResponse.json({ error: 'A valid run token is required.' }, { status: 401 })
    }

    const tokenData = verifySessionToken(token)
    if (!tokenData || isSessionExpired(tokenData.startTime)) {
      return NextResponse.json({ error: 'Invalid or expired run token.' }, { status: 401 })
    }

    if (
      typeof score !== 'number' ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100_000_000
    ) {
      return NextResponse.json({ error: 'Invalid score.' }, { status: 400 })
    }

    const normalizedLevel = readBoundedInteger(level, 1, 1, 10_000)
    const normalizedKills = readBoundedInteger(kills, 0, 0, 1_000_000)
    const normalizedSurvivalTime = readBoundedInteger(survivalTime, 0, 0, 604_800)
    const normalizedWave = readBoundedInteger(wave, 0, 0, 10)
    const normalizedDamageDealt = readBoundedInteger(damageDealt, 0, 0, 1_000_000_000)
    const normalizedDamageTaken = readBoundedInteger(damageTaken, 0, 0, 1_000_000_000)
    const normalizedCriticalHits = readBoundedInteger(criticalHits, 0, 0, 1_000_000)
    const normalizedGameMode: GameMode | null =
      typeof gameMode === 'undefined'
        ? 'classic'
        : GAME_MODES.includes(gameMode as GameMode)
          ? (gameMode as GameMode)
          : null

    if (
      normalizedLevel === null ||
      normalizedKills === null ||
      normalizedSurvivalTime === null ||
      normalizedWave === null ||
      normalizedDamageDealt === null ||
      normalizedDamageTaken === null ||
      normalizedCriticalHits === null ||
      (typeof bossDefeated !== 'undefined' && typeof bossDefeated !== 'boolean') ||
      (typeof mutations !== 'undefined' && (!Array.isArray(mutations) || mutations.some((id) => typeof id !== 'string') || mutations.length > 64)) ||
      normalizedGameMode === null ||
      ((normalizedGameMode === 'classic' || normalizedGameMode === 'daily') && normalizedWave !== 0)
    ) {
      return NextResponse.json({ error: 'Invalid game metrics.' }, { status: 400 })
    }

    if (tokenData.gameMode !== normalizedGameMode) {
      return NextResponse.json({ error: 'Run mode does not match token.' }, { status: 401 })
    }

    const runSession = await prisma.runSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
    })
    if (!runSession || runSession.gameMode !== normalizedGameMode) {
      return NextResponse.json({ error: 'Run session not found.' }, { status: 401 })
    }
    if (normalizedGameMode === 'daily' && !runSession.challengeDate) {
      return NextResponse.json({ error: 'Daily challenge session is invalid.' }, { status: 401 })
    }
    if (runSession.status !== 'active') {
      return NextResponse.json({ error: 'Run has already been finished.' }, { status: 409 })
    }
    if (runSession.startedAt.getTime() !== tokenData.startTime || runSession.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Run session expired.' }, { status: 401 })
    }

    // Anti-Cheat density & sanity check
    const validation = validateScoreSubmission({
      score: Math.floor(score),
      level: normalizedLevel,
      kills: normalizedKills,
      survivalTime: normalizedSurvivalTime,
      gameMode: normalizedGameMode,
      startTime: tokenData.startTime,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: `Anti-cheat rejection: ${validation.reason}` }, { status: 400 })
    }

    const cookieStore = await cookies()
    const playerId = cookieStore.get('virus_player_id')?.value
    let player

    if (playerId) {
      player = await prisma.player.findUnique({ where: { id: playerId } })
    }

    if (!player) {
      // Create unique guest player so unique constraint on username never fails
      const suffix = Math.random().toString(36).substring(2, 7)
      player = await prisma.player.create({
        data: {
          username: `Guest_${suffix}`,
          bio: 'CELLIX Arena Guest',
          coins: 0,
        },
      })
    }

    const challengeDate = normalizedGameMode === 'daily' ? runSession.challengeDate : null
    const rewardXp = getRunProgressionXp({
      level: normalizedLevel,
      kills: normalizedKills,
      survivalTime: normalizedSurvivalTime,
    })
    const coinReward = calculateRunCoinReward({
      score: Math.floor(score),
      kills: normalizedKills,
      survivalTime: normalizedSurvivalTime,
      gameMode: normalizedGameMode,
    })
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.runSession.updateMany({
        where: { id: runSession.id, status: 'active' },
        data: {
          status: 'finished',
          finishedAt: new Date(),
          playerId: player.id,
        },
      })
      if (claimed.count !== 1) {
        throw new Error('RUN_ALREADY_FINISHED')
      }

      const session = await tx.gameSession.create({
        data: {
          playerId: player.id,
          score: Math.floor(score),
          level: normalizedLevel,
          kills: normalizedKills,
          survivalTime: normalizedSurvivalTime,
          gameMode: normalizedGameMode,
          wave: normalizedWave,
          damageDealt: normalizedDamageDealt,
          damageTaken: normalizedDamageTaken,
          criticalHits: normalizedCriticalHits,
          bossDefeated: bossDefeated === true,
          mutations: JSON.stringify(Array.isArray(mutations) ? mutations : []),
          challengeDate,
        },
      })

      await tx.gameRun.create({
        data: {
          runSessionId: runSession.id,
          playerId: player.id,
          score: Math.floor(score),
          level: normalizedLevel,
          kills: normalizedKills,
          survivalTime: normalizedSurvivalTime,
          gameMode: normalizedGameMode,
          wave: normalizedWave,
          damageDealt: normalizedDamageDealt,
          damageTaken: normalizedDamageTaken,
          criticalHits: normalizedCriticalHits,
          bossDefeated: bossDefeated === true,
          mutations: JSON.stringify(Array.isArray(mutations) ? mutations : []),
          challengeDate,
        },
      })

      const existingProgression = await tx.playerProgression.findUnique({ where: { playerId: player.id } })
      const totalXp = (existingProgression?.totalXp ?? 0) + rewardXp
      const progression = await tx.playerProgression.upsert({
        where: { playerId: player.id },
        create: { playerId: player.id, totalXp, cellLevel: getCellLevelForXp(totalXp) },
        update: { totalXp, cellLevel: getCellLevelForXp(totalXp) },
      })

      if (normalizedGameMode === 'daily' && challengeDate) {
        const existingDaily = await tx.dailyResult.findUnique({
          where: {
            playerId_challengeDate: {
              playerId: player.id,
              challengeDate,
            },
          },
        })

        if (!existingDaily) {
          await tx.dailyResult.create({
            data: {
              playerId: player.id,
              challengeDate,
              score: Math.floor(score),
              level: normalizedLevel,
              kills: normalizedKills,
              survivalTime: normalizedSurvivalTime,
            },
          })
        } else if (Math.floor(score) > existingDaily.score) {
          await tx.dailyResult.update({
            where: { id: existingDaily.id },
            data: {
              score: Math.floor(score),
              level: normalizedLevel,
              kills: normalizedKills,
              survivalTime: normalizedSurvivalTime,
            },
          })
        }
      }

      const updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: { coins: { increment: coinReward } },
        select: { coins: true },
      })

      const existingHighScore = await tx.highScore.findFirst({
        where: { playerId: player.id, gameMode: normalizedGameMode, challengeDate },
        orderBy: { score: 'desc' },
      })

      let isNewRecord = false
      if (!existingHighScore || Math.floor(score) > existingHighScore.score) {
        await tx.highScore.deleteMany({
          where: { playerId: player.id, gameMode: normalizedGameMode, challengeDate },
        })
        await tx.highScore.create({
          data: {
            playerId: player.id,
            score: Math.floor(score),
            level: normalizedLevel,
            kills: normalizedKills,
            survivalTime: normalizedSurvivalTime,
            gameMode: normalizedGameMode,
            challengeDate,
          },
        })
        isNewRecord = true
      }

      return { session, isNewRecord, progression, coinBalance: updatedPlayer.coins }
    })

    const response = NextResponse.json({
      success: true,
      session: result.session,
      isNewRecord: result.isNewRecord,
      progression: result.progression,
      coinReward,
      coinBalance: result.coinBalance,
      player: { ...player, coins: result.coinBalance },
    })

    response.cookies.set('virus_player_id', player.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    if (error instanceof Error && error.message === 'RUN_ALREADY_FINISHED') {
      return NextResponse.json({ error: 'Run has already been finished.' }, { status: 409 })
    }
    console.error('Error submitting score:', error)
    return NextResponse.json({ error: 'Failed to record score.' }, { status: 500 })
  }
}
