// ============================================================
// CELLIX v2.1 — Bio-War 30 Dedicated Authoritative Realtime Server
// ============================================================

import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import crypto from 'crypto'

export const ARENA_SIZE = 3400
export const MAX_ROOM_CAPACITY = 30
export const SERVER_TICK_RATE = 20 // 20 ticks per second (50ms per tick)
export const TICK_MS = 1000 / SERVER_TICK_RATE
export const ROUND_DURATION_SEC = 180 // 3 minutes per round

export interface TailSegment {
  x: number
  y: number
  radius: number
}

export interface NetworkWormEntity {
  id: string
  name: string
  isBot: boolean
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  targetAngle: number
  speed: number
  mass: number
  headRadius: number
  primaryColor: number
  secondaryColor: number
  tail: TailSegment[]
  history: { x: number; y: number }[]
  kills: number
  isBoosting: boolean
  boostEnergy: number
  isDead: boolean
  shootCooldown: number
  lastDamagerId?: string
}

export interface NetworkFoodOrb {
  id: number
  x: number
  y: number
  radius: number
  color: number
  value: number
}

export interface NetworkProjectile {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  ownerId: string
  color: number
  damage: number
  lifetime: number
}

export interface NetworkKillEvent {
  id: string
  killer: string
  victim: string
  method: 'tail' | 'shot' | 'border' | 'head'
  timestamp: number
  killerId?: string
}

export interface ClientInputMessage {
  type: 'input'
  angle: number
  isBoosting: boolean
  isShooting: boolean
}

export interface ClientRespawnMessage {
  type: 'respawn'
  name?: string
  skinId?: string
}

const BOT_NAMES = [
  'Tashkent_Viper',
  'CyberPhantom',
  'NeoWorm_99',
  'Samarkand_Star',
  'KiberBori',
  'ShadowCell',
  'ApexPredator',
  'ByteHunter',
  'Fergana_Storm',
  'ZeroCool',
  'NanoGlitch',
  'Bukhara_Ghost',
  'PulseDemon',
  'TurboBio',
  'OmegaCell',
]

const BOT_PALETTES = [
  { primary: 0x06b6d4, secondary: 0x0891b2 },
  { primary: 0xec4899, secondary: 0xbe185d },
  { primary: 0x10b981, secondary: 0x059669 },
  { primary: 0xf59e0b, secondary: 0xd97706 },
  { primary: 0x8b5cf6, secondary: 0x7c3aed },
  { primary: 0xef4444, secondary: 0xdc2626 },
]

export class BioWarRoom {
  public id: string
  public roundTimeRemaining: number = ROUND_DURATION_SEC
  public roundNumber: number = 1
  public players = new Map<string, { ws: WebSocket; entity: NetworkWormEntity }>()
  public bots = new Map<string, NetworkWormEntity>()
  public food: NetworkFoodOrb[] = []
  public projectiles: NetworkProjectile[] = []
  public killFeed: NetworkKillEvent[] = []
  private nextFoodId = 1
  private nextProjId = 1
  private tickInterval: NodeJS.Timeout | null = null

  constructor(id: string) {
    this.id = id
    this.initFood(200)
    this.fillBots()
    this.startTickLoop()
  }

  private initFood(count: number) {
    for (let i = 0; i < count; i++) {
      this.spawnFood()
    }
  }

  private spawnFood(x?: number, y?: number, value: number = 2) {
    const posX = typeof x === 'number' ? x : 100 + Math.random() * (ARENA_SIZE - 200)
    const posY = typeof y === 'number' ? y : 100 + Math.random() * (ARENA_SIZE - 200)
    const colors = [0x00f0ff, 0xb026ff, 0x10b981, 0xf59e0b, 0xff0055]
    this.food.push({
      id: this.nextFoodId++,
      x: posX,
      y: posY,
      radius: Math.min(8, 2.5 + Math.sqrt(value)),
      color: colors[Math.floor(Math.random() * colors.length)],
      value,
    })
  }

  private fillBots() {
    const totalEntities = this.players.size + this.bots.size
    const botsToSpawn = Math.min(MAX_ROOM_CAPACITY - totalEntities, 15)
    for (let i = 0; i < botsToSpawn; i++) {
      const botId = `bot_${crypto.randomBytes(4).toString('hex')}`
      const palette = BOT_PALETTES[Math.floor(Math.random() * BOT_PALETTES.length)]
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] || `Bot_${i + 1}`
      const bot = this.createEntity(botId, name, true, palette.primary, palette.secondary)
      this.bots.set(botId, bot)
    }
  }

  private createEntity(
    id: string,
    name: string,
    isBot: boolean,
    primaryColor: number,
    secondaryColor: number
  ): NetworkWormEntity {
    const x = 300 + Math.random() * (ARENA_SIZE - 600)
    const y = 300 + Math.random() * (ARENA_SIZE - 600)
    const angle = Math.random() * Math.PI * 2
    return {
      id,
      name,
      isBot,
      x,
      y,
      vx: Math.cos(angle) * 160,
      vy: Math.sin(angle) * 160,
      angle,
      targetAngle: angle,
      speed: 160,
      mass: 30,
      headRadius: 16,
      primaryColor,
      secondaryColor,
      tail: [],
      history: [{ x, y }],
      kills: 0,
      isBoosting: false,
      boostEnergy: 100,
      isDead: false,
      shootCooldown: 0,
    }
  }

  public addPlayer(ws: WebSocket, playerId: string, playerName: string): NetworkWormEntity {
    // If room is full, prune a bot to make room for human
    if (this.players.size + this.bots.size >= MAX_ROOM_CAPACITY && this.bots.size > 0) {
      const firstBotKey = this.bots.keys().next().value
      if (firstBotKey) this.bots.delete(firstBotKey)
    }

    const entity = this.createEntity(playerId, playerName, false, 0xb026ff, 0x00f0ff)
    this.players.set(playerId, { ws, entity })
    return entity
  }

  public removePlayer(playerId: string) {
    this.players.delete(playerId)
    // Refill bot if below minimum entities
    if (this.players.size + this.bots.size < 12) {
      this.fillBots()
    }
  }

  public handleInput(playerId: string, input: ClientInputMessage) {
    const p = this.players.get(playerId)
    if (!p || p.entity.isDead) return

    const target = input.angle
    p.entity.angle = target
    p.entity.isBoosting = Boolean(input.isBoosting && p.entity.boostEnergy > 10 && p.entity.mass > 15)

    if (input.isShooting && p.entity.shootCooldown <= 0 && p.entity.mass > 12) {
      this.fireProjectile(p.entity)
      p.entity.shootCooldown = 4 // ~200ms at 20 TPS
    }
  }

  public respawnPlayer(playerId: string) {
    const p = this.players.get(playerId)
    if (!p) return
    const palette = BOT_PALETTES[Math.floor(Math.random() * BOT_PALETTES.length)]
    p.entity = this.createEntity(playerId, p.entity.name, false, palette.primary, palette.secondary)
  }

  private fireProjectile(entity: NetworkWormEntity) {
    const speed = 480
    const spawnDist = entity.headRadius + 8
    const px = entity.x + Math.cos(entity.angle) * spawnDist
    const py = entity.y + Math.sin(entity.angle) * spawnDist
    this.projectiles.push({
      id: this.nextProjId++,
      x: px,
      y: py,
      vx: Math.cos(entity.angle) * speed,
      vy: Math.sin(entity.angle) * speed,
      ownerId: entity.id,
      color: entity.primaryColor,
      damage: 10,
      lifetime: 30, // 1.5 seconds at 20 TPS
    })
    entity.mass = Math.max(10, entity.mass - 0.5)
  }

  private startTickLoop() {
    this.tickInterval = setInterval(() => {
      this.tick()
    }, TICK_MS)
  }

  public destroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  private tick() {
    const dt = TICK_MS / 1000

    // Update round timer
    this.roundTimeRemaining = Math.max(0, this.roundTimeRemaining - dt)
    if (this.roundTimeRemaining <= 0) {
      this.roundTimeRemaining = ROUND_DURATION_SEC
      this.roundNumber++
    }

    const allEntities = [...this.players.values()].map((p) => p.entity).concat([...this.bots.values()])

    // 1. Update Entities (Physics, History, Tail)
    for (const entity of allEntities) {
      if (entity.isDead) continue

      if (entity.shootCooldown > 0) {
        entity.shootCooldown--
      }

      // Boost mechanics
      if (entity.isBoosting && entity.boostEnergy > 0) {
        entity.speed = 280
        entity.boostEnergy = Math.max(0, entity.boostEnergy - 35 * dt)
        if (Math.random() < 0.25) {
          entity.mass = Math.max(10, entity.mass - 0.2)
          this.spawnFood(entity.x - Math.cos(entity.angle) * 20, entity.y - Math.sin(entity.angle) * 20, 1)
        }
      } else {
        entity.speed = Math.max(100, 160 - (entity.mass / 2000) * 40)
        entity.boostEnergy = Math.min(100, entity.boostEnergy + 20 * dt)
      }

      // Bot AI steering
      if (entity.isBot) {
        this.updateBotAI(entity)
      }

      // Movement
      entity.vx = Math.cos(entity.angle) * entity.speed
      entity.vy = Math.sin(entity.angle) * entity.speed
      entity.x += entity.vx * dt
      entity.y += entity.vy * dt

      // Head radius scales with mass
      entity.headRadius = Math.min(36, 12 + Math.sqrt(entity.mass) * 0.7)

      // Arena boundary collision
      const pad = entity.headRadius + 10
      if (entity.x < pad || entity.x > ARENA_SIZE - pad || entity.y < pad || entity.y > ARENA_SIZE - pad) {
        this.killEntity(entity, 'border', 'The Arena Void')
        continue
      }

      // Update history and tail segments
      entity.history.unshift({ x: entity.x, y: entity.y })
      const maxTailCount = Math.min(120, Math.floor(8 + entity.mass / 12))
      const historySpacing = 3
      const maxHistory = (maxTailCount + 1) * historySpacing
      if (entity.history.length > maxHistory) {
        entity.history.length = maxHistory
      }

      entity.tail = []
      for (let i = 1; i <= maxTailCount; i++) {
        const histIdx = i * historySpacing
        if (histIdx < entity.history.length) {
          const pt = entity.history[histIdx]
          const segRadius = Math.max(6, entity.headRadius * (1 - (i / maxTailCount) * 0.45))
          entity.tail.push({ x: pt.x, y: pt.y, radius: segRadius })
        }
      }

      // Food consumption
      for (let f = this.food.length - 1; f >= 0; f--) {
        const orb = this.food[f]
        const distSq = (entity.x - orb.x) ** 2 + (entity.y - orb.y) ** 2
        const eatRadius = entity.headRadius + orb.radius + 6
        if (distSq <= eatRadius * eatRadius) {
          entity.mass += orb.value
          this.food.splice(f, 1)
        }
      }
    }

    // Maintain food density
    if (this.food.length < 250) {
      this.spawnFood()
    }

    // 2. Head-to-Tail Snake Collisions
    for (const attacker of allEntities) {
      if (attacker.isDead) continue

      for (const defender of allEntities) {
        if (defender.isDead || defender.id === attacker.id) continue

        // Check attacker head against defender tail segments
        for (let s = 1; s < defender.tail.length; s++) {
          const seg = defender.tail[s]
          const distSq = (attacker.x - seg.x) ** 2 + (attacker.y - seg.y) ** 2
          const minDist = attacker.headRadius + seg.radius - 2
          if (distSq < minDist * minDist) {
            this.killEntity(attacker, 'tail', defender.name, defender.id)
            defender.kills++
            defender.mass += Math.floor(attacker.mass * 0.4)
            break
          }
        }
        if (attacker.isDead) break
      }
    }

    // 3. Projectiles movement and hit detection
    for (let p = this.projectiles.length - 1; p >= 0; p--) {
      const proj = this.projectiles[p]
      proj.x += proj.vx * dt
      proj.y += proj.vy * dt
      proj.lifetime--

      let hit = false
      for (const target of allEntities) {
        if (target.isDead || target.id === proj.ownerId) continue

        const distSq = (target.x - proj.x) ** 2 + (target.y - proj.y) ** 2
        if (distSq < (target.headRadius + 8) ** 2) {
          target.mass = Math.max(0, target.mass - proj.damage)
          target.lastDamagerId = proj.ownerId
          hit = true
          if (target.mass <= 8) {
            const owner = allEntities.find((e) => e.id === proj.ownerId)
            this.killEntity(target, 'shot', owner?.name || 'Laser Beam', proj.ownerId)
            if (owner) {
              owner.kills++
              owner.mass += 25
            }
          }
          break
        }
      }

      if (hit || proj.lifetime <= 0 || proj.x < 0 || proj.x > ARENA_SIZE || proj.y < 0 || proj.y > ARENA_SIZE) {
        this.projectiles.splice(p, 1)
      }
    }

    // 4. Broadcast Authoritative State to all Human Clients
    this.broadcastState()
  }

  private updateBotAI(bot: NetworkWormEntity) {
    // Simple steering: seek nearest food orb or flee from larger tails
    let nearestFood: NetworkFoodOrb | null = null
    let minDistSq = 600 * 600
    for (const f of this.food) {
      const dSq = (bot.x - f.x) ** 2 + (bot.y - f.y) ** 2
      if (dSq < minDistSq) {
        minDistSq = dSq
        nearestFood = f
      }
    }

    if (nearestFood) {
      bot.targetAngle = Math.atan2(nearestFood.y - bot.y, nearestFood.x - bot.x)
    }

    // Turn toward targetAngle
    let diff = bot.targetAngle - bot.angle
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    bot.angle += Math.max(-0.15, Math.min(0.15, diff))
  }

  private killEntity(victim: NetworkWormEntity, method: NetworkKillEvent['method'], killerName: string, killerId?: string) {
    victim.isDead = true
    const killEvent: NetworkKillEvent = {
      id: crypto.randomBytes(4).toString('hex'),
      killer: killerName,
      victim: victim.name,
      method,
      timestamp: Date.now(),
      killerId,
    }
    this.killFeed.unshift(killEvent)
    if (this.killFeed.length > 8) this.killFeed.pop()

    // Spawn dropped biomass orbs along victim's tail
    const dropOrbs = Math.min(40, Math.max(5, Math.floor(victim.mass / 4)))
    for (let i = 0; i < dropOrbs; i++) {
      const seg = victim.tail[i % (victim.tail.length || 1)] || { x: victim.x, y: victim.y }
      const jx = seg.x + (Math.random() - 0.5) * 30
      const jy = seg.y + (Math.random() - 0.5) * 30
      this.spawnFood(jx, jy, Math.max(3, Math.floor(victim.mass / dropOrbs)))
    }

    // If bot died, respawn after short delay
    if (victim.isBot) {
      setTimeout(() => {
        if (this.bots.has(victim.id)) {
          const palette = BOT_PALETTES[Math.floor(Math.random() * BOT_PALETTES.length)]
          this.bots.set(victim.id, this.createEntity(victim.id, victim.name, true, palette.primary, palette.secondary))
        }
      }, 4000)
    }
  }

  private broadcastState() {
    if (this.players.size === 0) return

    const allEntities = [...this.players.values()].map((p) => p.entity).concat([...this.bots.values()])
    const sorted = [...allEntities].sort((a, b) => b.mass - a.mass)
    const kingId = sorted[0]?.id

    const humanCount = this.players.size
    const botCount = this.bots.size
    const totalEntities = humanCount + botCount

    const leaderboard = sorted.slice(0, 10).map((e) => ({
      id: e.id,
      name: e.name,
      mass: Math.round(e.mass),
      kills: e.kills,
      isBot: e.isBot,
      isKing: e.id === kingId,
    }))

    const payload = JSON.stringify({
      type: 'snapshot',
      roundTimeRemaining: Math.round(this.roundTimeRemaining),
      roundNumber: this.roundNumber,
      humanCount,
      botCount,
      totalEntities,
      leaderboard,
      killFeed: this.killFeed,
      entities: allEntities.map((e) => ({
        id: e.id,
        name: e.name,
        isBot: e.isBot,
        x: Math.round(e.x),
        y: Math.round(e.y),
        angle: Number(e.angle.toFixed(2)),
        mass: Math.round(e.mass),
        kills: e.kills,
        headRadius: Math.round(e.headRadius),
        primaryColor: e.primaryColor,
        secondaryColor: e.secondaryColor,
        isBoosting: e.isBoosting,
        isDead: e.isDead,
        isKing: e.id === kingId,
        tail: e.tail.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), radius: Math.round(t.radius) })),
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        color: p.color,
      })),
      foodCount: this.food.length,
      // Send nearby food for optimization
      food: this.food.slice(0, 300).map((f) => ({
        id: f.id,
        x: Math.round(f.x),
        y: Math.round(f.y),
        radius: f.radius,
        color: f.color,
      })),
    })

    for (const { ws } of this.players.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }
}

export class BioWarServer {
  private server: http.Server
  private wss: WebSocketServer
  public rooms = new Map<string, BioWarRoom>()

  constructor(port = parseInt(process.env.BIOWAR_PORT || '3001', 10)) {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', rooms: this.rooms.size }))
        return
      }
      res.writeHead(404)
      res.end()
    })

    this.wss = new WebSocketServer({ server: this.server })
    this.setupWss()

    this.server.listen(port, () => {
      console.log(`[BioWarServer] Realtime authoritative server running on port ${port}`)
    })
  }

  public getOrCreateRoom(): BioWarRoom {
    for (const room of this.rooms.values()) {
      if (room.players.size < MAX_ROOM_CAPACITY) {
        return room
      }
    }
    const newRoomId = `room_${crypto.randomBytes(4).toString('hex')}`
    const room = new BioWarRoom(newRoomId)
    this.rooms.set(newRoomId, room)
    return room
  }

  private setupWss() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '/', 'http://localhost')
      const playerId = url.searchParams.get('playerId') || `player_${crypto.randomBytes(4).toString('hex')}`
      const playerName = url.searchParams.get('name') || `Worm_${playerId.substring(0, 5)}`

      const room = this.getOrCreateRoom()
      const entity = room.addPlayer(ws, playerId, playerName)

      ws.send(
        JSON.stringify({
          type: 'init',
          playerId,
          roomId: room.id,
          arenaSize: ARENA_SIZE,
          entity: {
            id: entity.id,
            name: entity.name,
            x: entity.x,
            y: entity.y,
            mass: entity.mass,
          },
        })
      )

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as ClientInputMessage | ClientRespawnMessage
          if (msg.type === 'input') {
            room.handleInput(playerId, msg)
          } else if (msg.type === 'respawn') {
            room.respawnPlayer(playerId)
          }
        } catch {
          // ignore malformed packets
        }
      })

      ws.on('close', () => {
        room.removePlayer(playerId)
        if (room.players.size === 0) {
          room.destroy()
          this.rooms.delete(room.id)
        }
      })
    })
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      for (const room of this.rooms.values()) {
        room.destroy()
      }
      this.rooms.clear()
      this.wss.close(() => {
        this.server.close(() => resolve())
      })
    })
  }
}

// Direct execution entry point
if (process.argv[1]?.endsWith('biowar-server.ts') || process.argv[1]?.endsWith('biowar-server.js')) {
  new BioWarServer()
}
