import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPersistentRateLimit, getRequestRateLimitKey } from '@/lib/ratelimit'
import {
  hashSessionToken,
  isSessionExpired,
  validateScoreSubmission,
  verifySessionToken,
} from '@/lib/security'
import { getCellLevelForXp, getRunProgressionXp } from '@/lib/game/progression'
import { calculateRunCoinReward } from '@/lib/game/cosmetics'
import { getAuthenticatedPlayer } from '@/lib/auth'

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
    const authenticatedPlayer = await getAuthenticatedPlayer()
    const subject = authenticatedPlayer?.id || req.headers.get('user-agent') || 'anonymous'
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

    if (!authenticatedPlayer) {
      return NextResponse.json({ error: 'Authentication required to submit score.' }, { status: 401 })
    }

    if (!runSession.playerId || runSession.playerId !== authenticatedPlayer.id) {
      return NextResponse.json(
        { error: 'Forbidden: Run session does not belong to the authenticated player.' },
        { status: 403 }
      )
    }

    const player = authenticatedPlayer

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
    const result = await prisma.$transaction(
      async (tx) => {
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
          await tx.dailyResult.upsert({
            where: {
              playerId_challengeDate: {
                playerId: player.id,
                challengeDate,
              },
            },
            create: {
              playerId: player.id,
              challengeDate,
              score: Math.floor(score),
              level: normalizedLevel,
              kills: normalizedKills,
              survivalTime: normalizedSurvivalTime,
            },
            update: {
              score: Math.floor(score),
              level: normalizedLevel,
              kills: normalizedKills,
              survivalTime: normalizedSurvivalTime,
            },
          })
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
        if (!existingHighScore) {
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
        } else if (Math.floor(score) > existingHighScore.score) {
          await tx.highScore.update({
            where: { id: existingHighScore.id },
            data: {
              score: Math.floor(score),
              level: normalizedLevel,
              kills: normalizedKills,
              survivalTime: normalizedSurvivalTime,
            },
          })
          isNewRecord = true
        }

        return { session, isNewRecord, progression, coinBalance: updatedPlayer.coins }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    )

    return NextResponse.json({
      success: true,
      session: result.session,
      isNewRecord: result.isNewRecord,
      progression: result.progression,
      coinReward,
      coinBalance: result.coinBalance,
      player: {
        id: player.id,
        username: player.username,
        bio: player.bio,
        avatarColor: player.avatarColor,
        coins: result.coinBalance,
        ownedSkins: player.ownedSkins,
        createdAt: player.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'RUN_ALREADY_FINISHED') {
      return NextResponse.json({ error: 'Run has already been finished.' }, { status: 409 })
    }
    console.error('Error submitting score:', error)
    return NextResponse.json({ error: 'Failed to record score.' }, { status: 500 })
  }
}
