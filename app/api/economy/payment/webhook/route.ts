// ============================================================
// CELLIX v2.1 — Production Payment Webhook Architecture
// Cryptographically Verified Webhook (Stripe / Payme / Click)
// ============================================================

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Validates a payment provider webhook signature.
 * Uses timing-safe constant-time comparison to prevent timing attacks.
 */
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}

/**
 * Verified Payment Webhook Endpoint.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. NEVER credit coins from client-reported payment events.
 * 2. ONLY credit coins when a cryptographically signed webhook arrives from the gateway.
 * 3. Enforce idempotency: If transaction status is already 'completed', return 200 without re-crediting.
 * 4. Use an atomic Prisma transaction to transition status and increment player coins simultaneously.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-payment-signature')
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET

    // In production, the webhook secret and signature are strictly enforced
    if (process.env.NODE_ENV === 'production' || webhookSecret) {
      if (!webhookSecret) {
        console.error('CRITICAL: PAYMENT_WEBHOOK_SECRET is not configured on the server.')
        return NextResponse.json({ error: 'Webhook misconfigured.' }, { status: 500 })
      }

      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody) as {
      transactionId?: string
      status?: string
      amountCents?: number
    }

    const transactionId = payload.transactionId
    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json({ error: 'Missing transactionId.' }, { status: 400 })
    }

    // Process payment atomically with idempotency protection
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { transactionId },
      })

      if (!transaction) {
        return { status: 404 as const, error: 'Transaction record not found.' }
      }

      // Idempotency: already processed transactions must not credit twice
      if (transaction.status === 'completed') {
        return { status: 200 as const, message: 'Already processed (idempotent).' }
      }

      if (payload.status === 'failed') {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'failed' },
        })
        return { status: 200 as const, message: 'Transaction marked failed.' }
      }

      // Transition to completed and credit coins atomically
      const updatedTx = await tx.paymentTransaction.updateMany({
        where: { id: transaction.id, status: 'pending' },
        data: { status: 'completed' },
      })

      if (updatedTx.count !== 1) {
        // Concurrently processed
        return { status: 200 as const, message: 'Concurrent webhook handled.' }
      }

      await tx.player.update({
        where: { id: transaction.playerId },
        data: { coins: { increment: transaction.coins } },
      })

      return { status: 200 as const, message: 'Payment verified and coins credited successfully.' }
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Payment webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing error.' }, { status: 500 })
  }
}
