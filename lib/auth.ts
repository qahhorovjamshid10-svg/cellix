// ============================================================
// CELLIX v2.1 — Authentication & Session Management
// ============================================================

import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

export const AUTH_COOKIE_NAME = 'cellix_session'
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

export interface SafePlayer {
  id: string
  username: string
  bio: string
  avatarColor: string
  email: string | null
  coins: number
  ownedSkins: string
  createdAt: Date
  updatedAt: Date
}

export const SAFE_PLAYER_SELECT = {
  id: true,
  username: true,
  bio: true,
  avatarColor: true,
  email: true,
  coins: true,
  ownedSkins: true,
  createdAt: true,
  updatedAt: true,
} as const

export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Hashes a password using PBKDF2 with a random 256-bit salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Constant-time verification of a password against a stored PBKDF2 hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const verify = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')

  const hashBuf = Buffer.from(hash)
  const verifyBuf = Buffer.from(verify)
  if (hashBuf.length !== verifyBuf.length) return false
  return crypto.timingSafeEqual(hashBuf, verifyBuf)
}

/**
 * Computes a SHA-256 hash of a session token for secure database storage.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Creates a cryptographically random session, stores its SHA-256 hash in Prisma,
 * and sets an httpOnly secure cookie.
 */
export async function createSession(
  playerId: string,
  response?: NextResponse
): Promise<{ token: string; expiresAt: Date }> {
  // Generate 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  // Store only the hash in the database
  await prisma.session.create({
    data: {
      tokenHash,
      playerId,
      expiresAt,
    },
  })

  const cookieOptions = {
    name: AUTH_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }

  const cookieStore = await cookies()
  cookieStore.set(cookieOptions)
  // Clear any legacy insecure cookie
  cookieStore.set('virus_player_id', '', { path: '/', maxAge: 0 })

  if (response) {
    response.cookies.set(cookieOptions)
    response.cookies.set('virus_player_id', '', { path: '/', maxAge: 0 })
  }

  return { token: rawToken, expiresAt }
}

/**
 * Resolves the authenticated player from the httpOnly session cookie.
 * Returns null if no session exists, or if the session is invalid/expired.
 * Never returns passwordHash or sensitive credentials.
 */
export async function getAuthenticatedPlayer(): Promise<SafePlayer | null> {
  try {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
      return null
    }

    const tokenHash = hashSessionToken(rawToken)
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        player: {
          select: SAFE_PLAYER_SELECT,
        },
      },
    })

    if (!session || !session.player) {
      return null
    }

    if (session.expiresAt.getTime() < Date.now()) {
      // Asynchronously delete expired session
      prisma.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }

    return session.player
  } catch (error) {
    console.error('Error resolving authenticated player:', error)
    return null
  }
}

/**
 * Resolves the authenticated player or throws an AuthError if unauthenticated.
 */
export async function requireAuthenticatedPlayer(): Promise<SafePlayer> {
  const player = await getAuthenticatedPlayer()
  if (!player) {
    throw new AuthError('Authentication required')
  }
  return player
}

/**
 * Deletes the session in the database and clears the authentication cookie.
 */
export async function deleteSession(response?: NextResponse): Promise<void> {
  try {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(AUTH_COOKIE_NAME)?.value

    if (rawToken && typeof rawToken === 'string') {
      const tokenHash = hashSessionToken(rawToken)
      await prisma.session.deleteMany({
        where: { tokenHash },
      })
    }

    const expireOptions = {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    }

    cookieStore.set(AUTH_COOKIE_NAME, '', expireOptions)
    cookieStore.set('virus_player_id', '', { path: '/', maxAge: 0, expires: new Date(0) })

    if (response) {
      response.cookies.set(AUTH_COOKIE_NAME, '', expireOptions)
      response.cookies.set('virus_player_id', '', { path: '/', maxAge: 0, expires: new Date(0) })
    }
  } catch (error) {
    console.error('Error deleting session:', error)
  }
}
