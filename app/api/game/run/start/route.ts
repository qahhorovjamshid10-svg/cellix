import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPersistentRateLimit, getRequestRateLimitKey } from '@/lib/ratelimit'
import { generateSessionToken, hashSessionToken, SESSION_TTL_MS } from '@/lib/security'
import { getDailyChallenge } from '@/lib/game/daily'
import { getAuthenticatedPlayer, createSession, SAFE_PLAYER_SELECT } from '@/lib/auth'

const GAME_MODES = ['classic', 'survival', 'daily', 'biowar'] as const
type GameMode = (typeof GAME_MODES)[number]

export async function POST(req: Request) {
  try {
    let player = await getAuthenticatedPlayer()
    let isNewGuest = false

    const response = NextResponse.json({
      success: true,
      token: '',
      startTime: 0,
      expiresAt: '',
      challenge: undefined as unknown,
    })

    if (!player) {
      const suffix = Math.random().toString(36).substring(2, 7)
      player = await prisma.player.create({
        data: {
          username: `Guest_${suffix}`,
          bio: 'CELLIX Arena Guest',
          coins: 0,
        },
        select: SAFE_PLAYER_SELECT,
      })
      await createSession(player.id, response)
      isNewGuest = true
    }

    const subject = player.id
    const rateCheck = await checkPersistentRateLimit(getRequestRateLimitKey(req, 'run_start', subject), 30, 300000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many run starts. Please wait.' }, { status: 429 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const gameMode = body.gameMode
    if (typeof gameMode !== 'string' || !GAME_MODES.includes(gameMode as GameMode)) {
      return NextResponse.json({ error: 'Invalid game mode.' }, { status: 400 })
    }

    const { token, startTime } = generateSessionToken(gameMode)
    const challenge = gameMode === 'daily' ? getDailyChallenge() : undefined
    const challengeDate = challenge?.date
    const expiresAt = new Date(startTime + SESSION_TTL_MS)

    // Enforce 1-play daily limit on server: block if player already completed today's daily
    if (gameMode === 'daily' && challengeDate) {
      const existingDaily = await prisma.dailyResult.findUnique({
        where: {
          playerId_challengeDate: {
            playerId: player.id,
            challengeDate,
          },
        },
      })

      if (existingDaily) {
        const now = new Date()
        const midnight = new Date(now)
        midnight.setHours(24, 0, 0, 0)
        const remainingMs = Math.max(0, midnight.getTime() - now.getTime())

        return NextResponse.json(
          {
            error: "Kunlik sinov faqat 1 kunda bir marta o'ynaladi! Keyingi sinovgacha kuting.",
            playedToday: true,
            remainingMs,
          },
          { status: 403 }
        )
      }
    }

    await prisma.runSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        gameMode,
        challengeDate,
        startedAt: new Date(startTime),
        expiresAt,
        playerId: player.id,
      },
    })

    const responseData = {
      success: true,
      token,
      startTime,
      expiresAt: expiresAt.toISOString(),
      challenge,
      isGuest: isNewGuest,
    }

    // Set JSON payload on response (preserving cookies set by createSession)
    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: response.headers,
    })
  } catch (error) {
    console.error('Error starting run:', error)
    return NextResponse.json({ error: 'Failed to start run.' }, { status: 500 })
  }
}
