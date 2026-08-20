import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { checkPersistentRateLimit, getRequestRateLimitKey } from '@/lib/ratelimit'
import { generateSessionToken, hashSessionToken, SESSION_TTL_MS } from '@/lib/security'
import { getDailyChallenge } from '@/lib/game/daily'

const GAME_MODES = ['classic', 'survival', 'daily'] as const
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
    const expiresAt = new Date(startTime + SESSION_TTL_MS)
    const player = playerId
      ? await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } })
      : null

    await prisma.runSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        gameMode,
        challengeDate: challenge?.date,
        startedAt: new Date(startTime),
        expiresAt,
        playerId: player?.id,
      },
    })

    return NextResponse.json({
      success: true,
      token,
      startTime,
      expiresAt: expiresAt.toISOString(),
      challenge,
    })
  } catch (error) {
    console.error('Error starting run:', error)
    return NextResponse.json({ error: 'Failed to start run.' }, { status: 500 })
  }
}
