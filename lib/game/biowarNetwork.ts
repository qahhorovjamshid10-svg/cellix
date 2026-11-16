// ============================================================
// CELLIX v2.1 — Bio-War Client Network Connector
// ============================================================

export interface ServerSnapshot {
  type: 'snapshot'
  roundTimeRemaining: number
  roundNumber: number
  humanCount: number
  botCount: number
  totalEntities: number
  leaderboard: Array<{
    id: string
    name: string
    mass: number
    kills: number
    isBot: boolean
    isKing: boolean
  }>
  killFeed: Array<{
    id: string
    killer: string
    victim: string
    method: 'tail' | 'shot' | 'border' | 'head'
    timestamp: number
  }>
  entities: Array<{
    id: string
    name: string
    isBot: boolean
    x: number
    y: number
    angle: number
    mass: number
    kills: number
    headRadius: number
    primaryColor: number
    secondaryColor: number
    isBoosting: boolean
    isDead: boolean
    isKing: boolean
    tail: Array<{ x: number; y: number; radius: number }>
  }>
  projectiles: Array<{
    id: number
    x: number
    y: number
    color: number
  }>
  food: Array<{
    id: number
    x: number
    y: number
    radius: number
    color: number
  }>
}

export type NetworkStatus = 'connecting' | 'connected' | 'offline' | 'error'

export class BioWarNetworkClient {
  private ws: WebSocket | null = null
  public status: NetworkStatus = 'offline'
  public myPlayerId: string | null = null
  public latestSnapshot: ServerSnapshot | null = null
  public prevSnapshot: ServerSnapshot | null = null
  public snapshotTime: number = 0
  private onStatusChange?: (status: NetworkStatus) => void
  private onSnapshot?: (snapshot: ServerSnapshot) => void

  constructor(callbacks?: {
    onStatusChange?: (status: NetworkStatus) => void
    onSnapshot?: (snapshot: ServerSnapshot) => void
  }) {
    this.onStatusChange = callbacks?.onStatusChange
    this.onSnapshot = callbacks?.onSnapshot
  }

  public connect(url?: string, playerId?: string, playerName?: string) {
    if (typeof window === 'undefined') return

    const wsUrl =
      url ||
      process.env.NEXT_PUBLIC_BIOWAR_WS_URL ||
      `ws://${window.location.hostname}:3001`

    this.setStatus('connecting')

    try {
      const fullUrl = `${wsUrl}?playerId=${encodeURIComponent(playerId || '')}&name=${encodeURIComponent(playerName || '')}`
      this.ws = new WebSocket(fullUrl)

      this.ws.onopen = () => {
        this.setStatus('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'init') {
            this.myPlayerId = data.playerId
          } else if (data.type === 'snapshot') {
            this.prevSnapshot = this.latestSnapshot
            this.latestSnapshot = data as ServerSnapshot
            this.snapshotTime = Date.now()
            this.onSnapshot?.(this.latestSnapshot)
          }
        } catch {
          // ignore parsing error
        }
      }

      this.ws.onclose = () => {
        this.setStatus('offline')
        this.ws = null
      }

      this.ws.onerror = () => {
        this.setStatus('offline')
      }
    } catch {
      this.setStatus('offline')
    }
  }

  public sendInput(angle: number, isBoosting: boolean, isShooting: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'input',
          angle: Number(angle.toFixed(3)),
          isBoosting,
          isShooting,
        })
      )
    }
  }

  public sendRespawn() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'respawn' }))
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('offline')
  }

  private setStatus(status: NetworkStatus) {
    this.status = status
    this.onStatusChange?.(status)
  }
}
