// CELLIX 2.0 — Client Player Session Store (deduplicated /api/auth/me + live nickname sync)

export interface PublicPlayerSession {
  id: string
  username: string
  avatarColor?: string | null
}

const PLAYER_CACHE_KEY = 'cellix_player_cache_v1'
export const PLAYER_SESSION_EVENT = 'cellix-player-session-change'

interface SessionSnapshot {
  loaded: boolean
  authenticated: boolean
  player: PublicPlayerSession | null
}

const SERVER_SNAPSHOT: SessionSnapshot = {
  loaded: false,
  authenticated: false,
  player: null,
}

let cachedSnapshot: SessionSnapshot = SERVER_SNAPSHOT
let storageHydrated = false
let inFlightSessionFetch: Promise<void> | null = null
let lastSessionFetchAt = 0

function normalizePlayer(raw: unknown): PublicPlayerSession | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.username !== 'string' || !r.username.trim()) {
    return null
  }
  return {
    id: r.id,
    username: r.username,
    avatarColor: typeof r.avatarColor === 'string' ? r.avatarColor : null,
  }
}

export function getPlayerSessionSnapshot(): SessionSnapshot {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT
  if (!storageHydrated) {
    storageHydrated = true
    try {
      const raw = window.localStorage.getItem(PLAYER_CACHE_KEY)
      if (raw) {
        const parsed = normalizePlayer(JSON.parse(raw))
        if (parsed) {
          cachedSnapshot = { loaded: false, authenticated: true, player: parsed }
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
  return cachedSnapshot
}

function setSnapshot(next: SessionSnapshot) {
  cachedSnapshot = next
  storageHydrated = true
  if (typeof window !== 'undefined') {
    try {
      if (next.authenticated && next.player) {
        window.localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify(next.player))
      } else {
        window.localStorage.removeItem(PLAYER_CACHE_KEY)
      }
    } catch {
      /* ignore storage errors */
    }
    window.dispatchEvent(new Event(PLAYER_SESSION_EVENT))
  }
}

export function syncPlayerSession(player: PublicPlayerSession | null | undefined) {
  const clean = normalizePlayer(player)
  if (!clean) {
    clearPlayerSession()
    return
  }
  lastSessionFetchAt = Date.now()
  setSnapshot({
    loaded: true,
    authenticated: true,
    player: clean,
  })
}

export function clearPlayerSession() {
  lastSessionFetchAt = Date.now()
  setSnapshot({
    loaded: true,
    authenticated: false,
    player: null,
  })
}

export function refreshPlayerSession(force = false): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const now = Date.now()
  if (inFlightSessionFetch) return inFlightSessionFetch
  if (!force && now - lastSessionFetchAt < 3000) return Promise.resolve()

  lastSessionFetchAt = now
  inFlightSessionFetch = fetch('/api/auth/me', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : { authenticated: false }))
    .then((data: { authenticated?: boolean; player?: unknown }) => {
      if (data?.authenticated && data.player) {
        const clean = normalizePlayer(data.player)
        if (clean) {
          setSnapshot({ loaded: true, authenticated: true, player: clean })
          return
        }
      }
      setSnapshot({ loaded: true, authenticated: false, player: null })
    })
    .catch(() => {
      /* preserve previous snapshot cleanly on transient offline error */
    })
    .finally(() => {
      inFlightSessionFetch = null
    })

  return inFlightSessionFetch
}

export function subscribePlayerSession(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === PLAYER_CACHE_KEY) {
      storageHydrated = false
      callback()
    }
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(PLAYER_SESSION_EVENT, callback)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(PLAYER_SESSION_EVENT, callback)
  }
}

export function getServerPlayerSessionSnapshot(): SessionSnapshot {
  return SERVER_SNAPSHOT
}
