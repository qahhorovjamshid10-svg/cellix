// ============================================================
// CELLIX v2.1 — Production Payment Gateway Architecture
// Order Initiation Placeholder (Stripe / Payme / Click)
// ============================================================

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedPlayer } from '@/lib/auth'
import { COIN_PACKAGES } from '@/lib/game/coinPackages'

/**
 * Initiates a verified payment order.
 *
 * WORKFLOW:
 * 1. Client authenticates via httpOnly session.
 * 2. Client selects a verified coin package.
 * 3. Server generates a pending PaymentTransaction record with an idempotency key.
 * 4. Server calls external payment gateway (Stripe Checkout, Payme, Click) to create session.
 * 5. Returns checkout URL or payment token to client.
 * 6. The client is redirected to the gateway.
 * 7. Coins are NOT credited here — coins are ONLY credited upon verified webhook arrival.
 */
export async function POST(req: Request) {
  try {
    const player = await getAuthenticatedPlayer()
    if (!player) {
      return NextResponse.json({ error: 'Authentication required to initiate payment.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const pkg = COIN_PACKAGES.find((p) => p.coins === body.coins || p.label === body.packageId)

    if (!pkg) {
      return NextResponse.json({ error: 'Invalid coin package.' }, { status: 400 })
    }

    // Convert UZS price to approximate USD cents (or store UZS price)
    const amountCents = Math.max(99, Math.round((pkg.priceUzs / 12800) * 100))

    const transactionId = `ord_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    const idempotencyKey = typeof body.idempotencyKey === 'string'
      ? body.idempotencyKey.slice(0, 128)
      : `idem_${transactionId}`

    const transaction = await prisma.paymentTransaction.create({
      data: {
        transactionId,
        playerId: player.id,
        coins: pkg.coins,
        amountCents,
        currency: 'USD',
        status: 'pending',
        provider: 'stripe_placeholder',
        idempotencyKey,
        metadata: JSON.stringify({
          packageLabel: pkg.label,
          username: player.username,
          clientIp: req.headers.get('x-forwarded-for') || 'unknown',
        }),
      },
    })

    // TODO: Connect production payment provider here:
    // e.g. const stripeSession = await stripe.checkout.sessions.create({ ... })
    // Return stripeSession.url for redirect

    return NextResponse.json({
      success: true,
      transactionId: transaction.transactionId,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      coins: transaction.coins,
      status: 'pending',
      // Placeholder checkout URL
      checkoutUrl: `/payment/mock-gateway?orderId=${transaction.transactionId}`,
      note: 'Connect production payment provider (e.g. Stripe/Click/Payme) to receive webhooks.',
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate payment.' }, { status: 500 })
  }
}
