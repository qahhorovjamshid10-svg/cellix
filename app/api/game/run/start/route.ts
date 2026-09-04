import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { checkPersistentRateLimit, getRequestRateLimitKey } from '@/lib/ratelimit'
import { generateSessionToken, hashSessionToken, SESSION_TTL_MS } from '@/lib/security'
import { getDailyChallenge } from '@/lib/game/daily'

const GAME_MODES = ['classic', 'survival', 'daily', 'biowar'] as const
type GameMode = (typeof GAME_MODES)[number]

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const playerId = cookieStore.get('virus_player_id')?.value
    const subject = playerId || req.headers.get('user-agent') || 'anonymous'
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

    let activePlayerId = playerId
    let createdGuestId: string | null = null

    if (playerId) {
      const existingPlayer = await prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true },
      })
      if (existingPlayer) {
        activePlayerId = existingPlayer.id
      } else {
        activePlayerId = undefined
      }
    }

    if (!activePlayerId) {
      const suffix = Math.random().toString(36).substring(2, 7)
      const guest = await prisma.player.create({
        data: {
          username: `Guest_${suffix}`,
          bio: 'CELLIX Arena Guest',
          coins: 0,
        },
      })
      activePlayerId = guest.id
      createdGuestId = guest.id
    }

    // Enforce 1-play daily limit on server: block if player already completed today's daily
    if (gameMode === 'daily' && challengeDate && activePlayerId) {
      const existingDaily = await prisma.dailyResult.findUnique({
        where: {
          playerId_challengeDate: {
            playerId: activePlayerId,
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
        playerId: activePlayerId,
      },
    })

    const response = NextResponse.json({
      success: true,
      token,
      startTime,
      expiresAt: expiresAt.toISOString(),
      challenge,
    })

    if (createdGuestId) {
      response.cookies.set('virus_player_id', createdGuestId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    console.error('Error starting run:', error)
    return NextResponse.json({ error: 'Failed to start run.' }, { status: 500 })
  }
}
