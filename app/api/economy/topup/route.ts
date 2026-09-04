import { NextResponse } from 'next/server'
import { COIN_PACKAGES } from '@/lib/game/coinPackages'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedPlayer } from '@/lib/auth'

/**
 * Demo Coin Top-Up Endpoint.
 *
 * SECURITY POLICY:
 * In production environments, client-initiated coin increments are strictly disallowed.
 * Real purchases must go through a verified payment gateway (e.g. Stripe, Payme, Click)
 * and can only be credited via cryptographic server-to-server webhooks.
 *
 * This demo endpoint is ONLY functional when ENABLE_DEMO_TOPUP is explicitly set to 'true'
 * or when running in a non-production environment where demo top-up has not been disabled.
 */
export async function POST(req: Request) {
  try {
    const isDemoAllowed =
      process.env.ENABLE_DEMO_TOPUP === 'true' ||
      (process.env.NODE_ENV !== 'production' && process.env.DISABLE_DEMO_TOPUP !== 'true')

    if (!isDemoAllowed) {
      return NextResponse.json(
        { error: 'Real payments are required in production.' },
        { status: 403 }
      )
    }

    const body = (await req.json()) as unknown
    const coins = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { coins?: unknown }).coins
      : undefined

    if (typeof coins !== 'number' || !Number.isInteger(coins) || !COIN_PACKAGES.some((item) => item.coins === coins)) {
      return NextResponse.json({ error: 'Invalid coin package.' }, { status: 400 })
    }

    const authenticatedPlayer = await getAuthenticatedPlayer()
    if (!authenticatedPlayer) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const updated = await prisma.player.update({
      where: { id: authenticatedPlayer.id },
      data: { coins: { increment: coins } },
      select: { coins: true },
    })

    return NextResponse.json({
      success: true,
      demo: true,
      coinsAdded: coins,
      coins: updated.coins,
    })
  } catch (error) {
    console.error('Error in demo top-up:', error)
    return NextResponse.json({ error: 'Failed to process demo top-up.' }, { status: 500 })
  }
}


