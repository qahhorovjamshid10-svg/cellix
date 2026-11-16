import Phaser from 'phaser'
import { soundManager } from './SoundManager'
import { getArenaThemePalette, getSelectedSkinId, getSkinConfig, type CellSkin, type CellSkinId } from '../cosmetics'
import type { CellModel3DType } from '../types'
import { BioWarNetworkClient } from '../biowarNetwork'
import { getGameSettings, getParticleCapForQuality } from '../settings'
import { safeCameraShake } from './ArenaCombatHelper'

// ============================================================
// CELLIX 2.0 — BIO-WAR 30 (Realtime Multiplayer + Bot Fallback)
// ============================================================

export interface BioWarLeaderboardEntry {
  id: string
  name: string
  mass: number
  kills: number
  isPlayer: boolean
  isKing: boolean
}

export interface BioWarKillEvent {
  id: string
  killer: string
  victim: string
  method: 'tail' | 'shot' | 'border' | 'head'
  timestamp: number
}

export interface BioWarRadarEntity {
  x: number // 0 to 1 normalized
  y: number // 0 to 1 normalized
  isPlayer: boolean
  isKing: boolean
}

export interface BioWarHUDData {
  myMass: number
  myKills: number
  myRank: number
  totalPlayers: number
  boostPct: number
  leaderboard: BioWarLeaderboardEntry[]
  killFeed: BioWarKillEvent[]
  radar: BioWarRadarEntity[]
  isDead: boolean
  killerName?: string
  roundTimeRemaining: number
  roundNumber: number
  lastWinnerName?: string
  peakMass?: number
  savedScore?: number
  coinsEarned?: number
  recentKillEvent?: { id: string; victimName: string; massGained: number; comboCount: number }
  autoAimActive?: boolean
  humanPlayers?: number
  botPlayers?: number
  isOnlineMultiplayer?: boolean
}

export interface BioWarSceneConfig {
  onReady?: () => void
  onBioWarUpdate?: (data: BioWarHUDData) => void
  onGameOver?: (metrics: {
    score: number
    level: number
    kills: number
    survivalTime: number
    mutationsCount: number
    damageDealt: number
    damageTaken: number
    criticalHits: number
    bossDefeated: boolean
  }) => void
  initialSkin?: CellSkinId
  playerName?: string
}

interface TailSegment {
  x: number
  y: number
  radius: number
}

interface WormEntity {
  id: string
  name: string
  isPlayer: boolean
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  targetAngle: number
  turnSpeed: number
  baseSpeed: number
  speed: number
  mass: number
  headRadius: number
  primaryColor: number
  secondaryColor: number
  accentColor?: number
  projectileColor?: number
  model3dType?: CellModel3DType
  tail: TailSegment[]
  history: { x: number; y: number }[]
  kills: number
  isBoosting: boolean
  boostEnergy: number
  isDead: boolean
  shootCooldown: number
  nameText?: Phaser.GameObjects.Text
  // Bot AI specific
  aiTimer?: number
  aiTargetX?: number
  aiTargetY?: number
  // Damage & Kill Attribution
  lastDamagerId?: string
  lastDamageTime?: number
}

interface FoodOrb {
  x: number
  y: number
  radius: number
  color: number
  value: number
  glowPhase: number
  createdAt: number
  lifetime: number
}

interface BioProjectile {
  x: number
  y: number
  vx: number
  vy: number
  ownerId: string
  color: number
  damage: number
  lifetime: number
}

const ARENA_SIZE = 3400
const TARGET_BOT_COUNT = 15
const INITIAL_FOOD_COUNT = 100
const MAX_FOOD_COUNT = 1500
const ROUND_DURATION_SEC = 180 // 3 minutes per round
const KILL_MASS_THRESHOLD = 10 // Baseline worm dies only after taking at least 8 head hits (or 14 tail hits)

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
  'LaserWorm',
  'Vortex_X',
  'Bukhara_King',
]

const BOT_COLORS = [
  { primary: 0x06b6d4, secondary: 0x0891b2 }, // Cyan
  { primary: 0xec4899, secondary: 0xbe185d }, // Pink
  { primary: 0x10b981, secondary: 0x059669 }, // Emerald
  { primary: 0xf59e0b, secondary: 0xd97706 }, // Amber
  { primary: 0x8b5cf6, secondary: 0x7c3aed }, // Purple
  { primary: 0xef4444, secondary: 0xdc2626 }, // Red
  { primary: 0x3b82f6, secondary: 0x2563eb }, // Blue
  { primary: 0x14b8a6, secondary: 0x0f766e }, // Teal
]

export default class BioWarScene extends Phaser.Scene {
  private configCallbacks?: BioWarSceneConfig

  // Entities
  private player!: WormEntity
  private bots: WormEntity[] = []
  private food: FoodOrb[] = []
  private projectiles: BioProjectile[] = []
  private killFeed: BioWarKillEvent[] = []
  private networkClient?: BioWarNetworkClient

  // Graphics renderers
  private arenaGraphics!: Phaser.GameObjects.Graphics
  private foodGraphics!: Phaser.GameObjects.Graphics
  private tailGraphics!: Phaser.GameObjects.Graphics
  private headGraphics!: Phaser.GameObjects.Graphics
  private projectileGraphics!: Phaser.GameObjects.Graphics
  private hazardTrailGraphics!: Phaser.GameObjects.Graphics

  // Input
  private mousePointer!: Phaser.Input.Pointer
  private spaceKey!: Phaser.Input.Keyboard.Key
  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private enterKey?: Phaser.Input.Keyboard.Key
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys

  // Mobile touch controls & Auto-Aim
  public mobileSteerAngle: number | null = null
  public isMobileBoosting: boolean = false
  public isMobileShooting: boolean = false
  public autoAimTarget: { x: number; y: number } | null = null
  private playerKillComboCount: number = 0
  private lastPlayerKillTime: number = 0
  private recentPlayerKill?: { id: string; victimName: string; massGained: number; comboCount: number }

  // Game & Round timing
  private lastHudEmitTime: number = 0
  private hazardParticles: { x: number; y: number; alpha: number; color: number }[] = []
  private roundTimeRemaining: number = ROUND_DURATION_SEC
  private roundNumber: number = 1
  private lastWinnerName?: string

  // Session stats & persistence
  private peakMass: number = 30
  private score: number = 0
  private sessionStartTime: number = Date.now()
  private lastSavedScore: number = 0
  private lastEarnedCoins: number = 0
  private foodSpawnTimer: number = 0
  private foodRecycleTimer: number = 0
  private nextBotUid: number = 1
  private scoreSavedThisLife: boolean = false
  private playerSkin!: CellSkin
  private resizeHandler?: () => void
  private uiPaused: boolean = false

  constructor() {
    super('BioWarScene')
  }

  public init(data: { config?: BioWarSceneConfig }) {
    if (data.config) {
      this.configCallbacks = data.config
    }
  }

  public create() {
    this.roundTimeRemaining = ROUND_DURATION_SEC
    this.sessionStartTime = Date.now()
    this.peakMass = 30
    this.nextBotUid = 1

    // Physics world bounds
    this.physics.world.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE)

    // Multi-touch support for mobile devices (up to 4 fingers simultaneously)
    this.input.addPointer(3)

    // Setup input listeners
    this.mousePointer = this.input.activePointer
    this.input.mouse?.disableContextMenu()
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    // Initialize graphics pipelines
    this.arenaGraphics = this.add.graphics().setDepth(1)
    this.foodGraphics = this.add.graphics().setDepth(2)
    this.tailGraphics = this.add.graphics().setDepth(3)
    this.headGraphics = this.add.graphics().setDepth(4)
    this.projectileGraphics = this.add.graphics().setDepth(5)
    this.hazardTrailGraphics = this.add.graphics().setDepth(2)

    // Setup arena boundary and background grid
    this.drawArenaEnvironment()

    // Spawn entities
    this.spawnInitialFood()
    this.spawnPlayer()
    this.spawnInitialBots()

    // Camera initial settings & resize cleanup
    this.cameras.main.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE)
    const updateCameraZoom = () => {
      if (!this.cameras?.main) return
      const screenFactor = Math.min(this.scale.width, this.scale.height) / 800
      this.cameras.main.setZoom(Phaser.Math.Clamp(1.1 * screenFactor, 0.55, 1.2))
    }
    updateCameraZoom()
    this.resizeHandler = updateCameraZoom
    this.scale.on('resize', this.resizeHandler)

    this.events.once('shutdown', () => this.cleanupScene())
    this.events.once('destroy', () => this.cleanupScene())

    // Initialize realtime multiplayer network connector (falls back to local simulation if offline)
    this.networkClient = new BioWarNetworkClient({
      onStatusChange: () => {
        this.emitHUD()
      },
    })
    this.networkClient.connect(undefined, this.player.id, this.configCallbacks?.playerName)

    this.configCallbacks?.onReady?.()
  }

  private cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler)
      this.resizeHandler = undefined
    }
    this.networkClient?.disconnect()
    if (this.player?.nameText) {
      this.player.nameText.destroy()
      this.player.nameText = undefined
    }
    for (const b of this.bots) {
      if (b.nameText) {
        b.nameText.destroy()
        b.nameText = undefined
      }
    }
  }

  private drawArenaEnvironment() {
    this.arenaGraphics.clear()
    const palette = getArenaThemePalette('biowar')

    // 0. Abyssal floor fill
    this.arenaGraphics.fillStyle(palette.floorHex, 1)
    this.arenaGraphics.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE)

    // 1. Cyber Grid lines (Biowar Deep Teal)
    this.arenaGraphics.lineStyle(1, palette.gridHex, 0.65)
    const gridSize = 120
    for (let x = 0; x <= ARENA_SIZE; x += gridSize) {
      this.arenaGraphics.lineBetween(x, 0, x, ARENA_SIZE)
    }
    for (let y = 0; y <= ARENA_SIZE; y += gridSize) {
      this.arenaGraphics.lineBetween(0, y, ARENA_SIZE, y)
    }

    // Center tactical radar rings
    this.arenaGraphics.lineStyle(1.5, palette.accentHex, 0.16)
    this.arenaGraphics.strokeCircle(ARENA_SIZE / 2, ARENA_SIZE / 2, 420)
    this.arenaGraphics.strokeCircle(ARENA_SIZE / 2, ARENA_SIZE / 2, 950)

    // 2. High-Tech Containment Outer Boundary (Lethal Neon Barrier + Inner Teal)
    this.arenaGraphics.lineStyle(8, palette.borderHex, 0.85)
    this.arenaGraphics.strokeRect(4, 4, ARENA_SIZE - 8, ARENA_SIZE - 8)

    this.arenaGraphics.lineStyle(2, palette.borderGlowHex, 0.65)
    this.arenaGraphics.strokeRect(14, 14, ARENA_SIZE - 28, ARENA_SIZE - 28)
  }

  private createFoodOrb(x?: number, y?: number, color?: number, value?: number, radius?: number): FoodOrb {
    const colors = [0x06b6d4, 0xec4899, 0xa855f7, 0x10b981, 0xfbbf24, 0x38bdf8]
    return {
      x: x ?? Phaser.Math.Between(80, ARENA_SIZE - 80),
      y: y ?? Phaser.Math.Between(80, ARENA_SIZE - 80),
      radius: radius ?? Phaser.Math.Between(4, 7),
      color: color ?? Phaser.Utils.Array.GetRandom(colors),
      value: value ?? Phaser.Math.Between(1, 3),
      glowPhase: Math.random() * Math.PI * 2,
      createdAt: Date.now(),
      lifetime: Phaser.Math.Between(45000, 85000), // 45-85 seconds
    }
  }

  private spawnInitialFood() {
    this.food = []
    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      this.food.push(this.createFoodOrb())
    }
  }

  private spawnPlayer() {
    const skinId = this.configCallbacks?.initialSkin || getSelectedSkinId()
    const skin = getSkinConfig(skinId)
    this.playerSkin = skin
    this.scoreSavedThisLife = false

    const spawnX = Phaser.Math.Between(800, ARENA_SIZE - 800)
    const spawnY = Phaser.Math.Between(800, ARENA_SIZE - 800)

    if (this.player?.nameText) {
      this.player.nameText.destroy()
    }

    const pName = this.configCallbacks?.playerName || 'SIZ'

    this.player = {
      id: 'player_me',
      name: pName,
      isPlayer: true,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      turnSpeed: 0.12,
      baseSpeed: 230,
      speed: 230,
      mass: 30,
      headRadius: 12,
      primaryColor: skin.primaryColor,
      secondaryColor: skin.secondaryColor,
      accentColor: skin.accentColor,
      projectileColor: skin.projectileColor,
      model3dType: skin.model3dType,
      tail: [],
      history: [],
      kills: 0,
      isBoosting: false,
      boostEnergy: 100,
      isDead: false,
      shootCooldown: 0,
    }

    // Populate initial small tail (3 segments)
    this.initializeTail(this.player, 3)

    // Name badge above player head
    this.player.nameText = this.add
      .text(this.player.x, this.player.y - this.player.headRadius - 10, this.player.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#38bdf8',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(10)
  }

  private spawnInitialBots() {
    this.bots = []
    for (let i = 0; i < TARGET_BOT_COUNT; i++) {
      this.spawnBot(i)
    }
  }

  private spawnBot(index: number) {
    const name = BOT_NAMES[index % BOT_NAMES.length] || `Bot_${index + 1}`
    const colorScheme = BOT_COLORS[index % BOT_COLORS.length]

    const spawnX = Phaser.Math.Between(200, ARENA_SIZE - 200)
    const spawnY = Phaser.Math.Between(200, ARENA_SIZE - 200)

    const initialMass = Phaser.Math.Between(30, 60)

    const bot: WormEntity = {
      id: `bot_${this.nextBotUid++}`,
      name,
      isPlayer: false,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      targetAngle: Math.random() * Math.PI * 2,
      turnSpeed: 0.08,
      baseSpeed: Phaser.Math.Between(190, 225),
      speed: 210,
      mass: initialMass,
      headRadius: 10 + Math.sqrt(initialMass) * 0.22,
      primaryColor: colorScheme.primary,
      secondaryColor: colorScheme.secondary,
      accentColor: 0xffffff,
      projectileColor: colorScheme.primary,
      tail: [],
      history: [],
      kills: Phaser.Math.Between(0, 2),
      isBoosting: false,
      boostEnergy: 100,
      isDead: false,
      shootCooldown: 0,
      aiTimer: 0,
      aiTargetX: Phaser.Math.Between(200, ARENA_SIZE - 200),
      aiTargetY: Phaser.Math.Between(200, ARENA_SIZE - 200),
    }

    this.initializeTail(bot, 3)

    // Name badge above bot head
    bot.nameText = this.add
      .text(bot.x, bot.y - bot.headRadius - 10, bot.name, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f1f5f9',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(10)

    this.bots.push(bot)
  }

  private initializeTail(entity: WormEntity, count: number) {
    entity.tail = []
    entity.history = []
    const spacing = 11

    for (let i = 0; i < count * 4; i++) {
      entity.history.push({
        x: entity.x - Math.cos(entity.angle) * (i * (spacing / 4)),
        y: entity.y - Math.sin(entity.angle) * (i * (spacing / 4)),
      })
    }

    for (let i = 1; i <= count; i++) {
      entity.tail.push({
        x: entity.x - Math.cos(entity.angle) * (i * spacing),
        y: entity.y - Math.sin(entity.angle) * (i * spacing),
        radius: Math.max(5, entity.headRadius * (1 - (i / (count + 10)) * 0.4)),
      })
    }
  }

  public respawnPlayer() {
    this.peakMass = 30
    this.score = 0
    this.sessionStartTime = Date.now()
    if (this.player?.nameText) {
      this.player.nameText.destroy()
      this.player.nameText = undefined
    }
    this.spawnPlayer()
  }

  /**
   * 3-Minute Round Reset to keep server and memory 100% fresh and competitive
   */
  private resetMatchRound() {
    const allWorms = [this.player, ...this.bots].filter((w) => !w.isDead)
    const sorted = [...allWorms].sort((a, b) => b.mass - a.mass)
    const winner = sorted[0]
    this.lastWinnerName = winner ? `${winner.name} (${Math.round(winner.mass)} MASS)` : 'Durang'

    // If the player survived this 3-minute round, save score and kills accurately!
    if (!this.player.isDead && !this.scoreSavedThisLife) {
      this.scoreSavedThisLife = true
      const isWinner = Boolean(winner && winner.isPlayer)
      const survivalSec = 180
      const finalScore = Math.floor(
        this.score + this.peakMass * 2 + this.player.kills * 200 + survivalSec * 5 + (isWinner ? 1000 : 250)
      )
      const virtualLevel = Math.min(30, Math.floor(this.peakMass / 50) + 1)
      const coins = Math.min(150, Math.floor(finalScore / 400) * 10 + this.player.kills * 5 + (isWinner ? 50 : 20))
      this.lastSavedScore = finalScore
      this.lastEarnedCoins = coins
      this.configCallbacks?.onGameOver?.({
        score: finalScore,
        level: virtualLevel,
        kills: this.player.kills,
        survivalTime: survivalSec,
        mutationsCount: 0,
        damageDealt: this.player.kills * 50 + (isWinner ? 200 : 60),
        damageTaken: 0,
        criticalHits: 0,
        bossDefeated: isWinner,
      })
    }

    // Add winner announcement to kill feed
    this.killFeed.unshift({
      id: `${Date.now()}_round_win`,
      killer: '👑 RAUND YAKUNI',
      victim: `${this.lastWinnerName} G‘OLIB!`,
      method: 'border',
      timestamp: Date.now(),
    })
    if (this.killFeed.length > 5) this.killFeed.pop()

    // Clean up name badges
    if (this.player?.nameText) {
      this.player.nameText.destroy()
      this.player.nameText = undefined
    }
    for (const b of this.bots) {
      if (b.nameText) {
        b.nameText.destroy()
        b.nameText = undefined
      }
    }

    // Clean up arrays
    this.projectiles = []
    this.hazardParticles = []
    this.spawnInitialFood()
    this.spawnPlayer()
    this.spawnInitialBots()

    this.roundTimeRemaining = ROUND_DURATION_SEC
    this.roundNumber++
    this.peakMass = 30
    this.score = 0
    this.sessionStartTime = Date.now()

    soundManager.playLevelUp()
  }

  public update(time: number, delta: number) {
    // Clamp delta to prevent tab-switch teleports, broken tail history, or instant round skips
    const dt = Math.min(Math.max(delta / 1000, 0.001), 0.05)

    // 0. Dynamic Food Spawning & Cycling up to 1500 max (starts small, recycles old)
    this.updateFoodCycling(delta)

    // Round timer countdown (3 minutes)
    this.roundTimeRemaining -= dt
    if (this.roundTimeRemaining <= 0) {
      this.resetMatchRound()
    }

    // 1. Update Player
    if (!this.player.isDead) {
      this.updatePlayer(dt)
    }

    // 2. Update Bots AI
    this.updateBots(dt)

    // 3. Update Projectiles
    this.updateProjectiles(dt)

    // 4. Update Hazard Trails
    this.updateHazardParticles(dt)

    // 5. Check Collisions (Head-to-Food, Head-to-Tail, Projectile-to-Snake)
    this.checkCollisions()

    // 6. Dynamic Camera (Zooms out as player grows)
    if (!this.player.isDead) {
      this.cameras.main.scrollX = this.player.x - this.cameras.main.width / 2
      this.cameras.main.scrollY = this.player.y - this.cameras.main.height / 2

      // Dynamic Zoom based on player's mass (smooth and gradual)
      const screenFactor = Math.min(this.scale.width, this.scale.height) / 800
      const massZoom = 1.15 - (this.player.mass / 2500) * 0.4
      const targetZoom = Phaser.Math.Clamp(massZoom * Phaser.Math.Clamp(screenFactor, 0.7, 1.2), 0.45, 1.2)
      this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.04)
    }

    // 7. Render All Graphics
    this.renderGraphics(time)

    // 8. Emit HUD data
    if (Date.now() - this.lastHudEmitTime > 80) {
      this.emitHUD()
      this.lastHudEmitTime = Date.now()
    }
  }

  private updateFoodCycling(delta: number) {
    this.foodSpawnTimer += delta
    if (this.foodSpawnTimer >= 70) {
      this.foodSpawnTimer = 0
      if (this.food.length < MAX_FOOD_COUNT) {
        const spawnCount = Math.min(4, MAX_FOOD_COUNT - this.food.length)
        for (let i = 0; i < spawnCount; i++) {
          this.food.push(this.createFoodOrb())
        }
      }
    }

    this.foodRecycleTimer += delta
    if (this.foodRecycleTimer >= 1000) {
      this.foodRecycleTimer = 0
      const now = Date.now()
      let expiredCount = 0
      for (let i = this.food.length - 1; i >= 0; i--) {
        const orb = this.food[i]
        if (now - orb.createdAt > orb.lifetime) {
          this.food.splice(i, 1)
          expiredCount++
          if (expiredCount >= 10) break
        }
      }

      // If at or near max capacity (1500), prune oldest to keep dynamic circulation
      if (this.food.length >= MAX_FOOD_COUNT - 15) {
        this.food.splice(0, 8)
      }
    }
  }

  private updatePlayer(dt: number) {
    const settings = getGameSettings()
    if (this.uiPaused) {
      this.player.isBoosting = false
      this.player.speed = this.player.baseSpeed
      if (this.networkClient?.status === 'connected') {
        this.networkClient.sendInput(this.player.angle, false, false)
      }
      this.updateWormTail(this.player)
      if (this.player.nameText) {
        this.player.nameText.setPosition(this.player.x, this.player.y - this.player.headRadius - 10)
      }
      return
    }

    if (this.mobileSteerAngle !== null) {
      // Mobile touch virtual joystick steering
      this.player.targetAngle = this.mobileSteerAngle
    } else {
      if (settings.movementMode !== 'keyboard' && this.mousePointer && this.cameras?.main) {
        // Determine target angle towards mouse pointer in world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(this.mousePointer.x, this.mousePointer.y)
        const dx = worldPoint.x - this.player.x
        const dy = worldPoint.y - this.player.y

        this.player.targetAngle = Math.atan2(dy, dx)
      }

      // Keyboard steering (WASD)
      if (this.keyW && (this.keyW.isDown || this.keyA.isDown || this.keyS.isDown || this.keyD.isDown)) {
        let kx = 0
        let ky = 0
        if (this.keyA.isDown) kx -= 1
        if (this.keyD.isDown) kx += 1
        if (this.keyW.isDown) ky -= 1
        if (this.keyS.isDown) ky += 1
        if (kx !== 0 || ky !== 0) {
          this.player.targetAngle = Math.atan2(ky, kx)
        }
      }
    }

    // Smooth turn towards target angle (scaled by sensitivity setting)
    this.player.angle = Phaser.Math.Angle.RotateTo(
      this.player.angle,
      this.player.targetAngle,
      this.player.turnSpeed * settings.aimSensitivity * (dt * 60)
    )

    // Continuous shooting: Left Mouse Button, Enter key (Auto-Aim), Mobile Laser, or Arrow Keys
    const isEnterAim = Boolean(this.enterKey && this.enterKey.isDown)
    let arrowDirX = 0
    let arrowDirY = 0
    if (this.cursors?.up.isDown) arrowDirY -= 1
    if (this.cursors?.down.isDown) arrowDirY += 1
    if (this.cursors?.left.isDown) arrowDirX -= 1
    if (this.cursors?.right.isDown) arrowDirX += 1
    const isArrowShooting = arrowDirX !== 0 || arrowDirY !== 0

    const wantsShoot =
      this.isMobileShooting ||
      isEnterAim ||
      isArrowShooting ||
      (this.mousePointer.isDown && this.mousePointer.leftButtonDown() && !this.mousePointer.wasTouch)

    if (wantsShoot) {
      if (this.player.shootCooldown <= 0) {
        this.shootProjectile(this.player)
      }
    }

    // Speed Boost (Space or RMB on desktop or Mobile Nitro button)
    const wantsBoost =
      this.isMobileBoosting ||
      (this.spaceKey && this.spaceKey.isDown) ||
      (this.mousePointer.rightButtonDown() && !this.mousePointer.wasTouch)
    if (wantsBoost && this.player.boostEnergy > 5 && this.player.mass > 20) {
      this.player.isBoosting = true
      this.player.speed = this.player.baseSpeed * 1.75
      this.player.boostEnergy = Math.max(0, this.player.boostEnergy - 35 * dt)
      this.player.mass = Math.max(12, this.player.mass - 1.8 * dt) // controlled mass burn, cannot kill player

      // Drop hazard trail behind player (respect graphics particle budget)
      if (Math.random() < 0.35 && this.hazardParticles.length < getParticleCapForQuality(settings.graphicsQuality)) {
        this.hazardParticles.push({
          x: this.player.x - Math.cos(this.player.angle) * (this.player.headRadius + 6),
          y: this.player.y - Math.sin(this.player.angle) * (this.player.headRadius + 6),
          alpha: 1.0,
          color: 0x06b6d4,
        })
      }
    } else {
      this.player.isBoosting = false
      this.player.speed = this.player.baseSpeed
      // 40% slower recharge: takes 7.0 seconds instead of 5.0 seconds
      this.player.boostEnergy = Math.min(100, this.player.boostEnergy + 14.3 * dt)
    }

    // Move forward
    this.player.vx = Math.cos(this.player.angle) * this.player.speed
    this.player.vy = Math.sin(this.player.angle) * this.player.speed
    this.player.x += this.player.vx * dt
    this.player.y += this.player.vy * dt

    // Forward inputs to authoritative server if connected
    if (this.networkClient?.status === 'connected') {
      this.networkClient.sendInput(
        this.player.targetAngle,
        this.player.isBoosting,
        Boolean(this.mousePointer.isDown || isEnterAim || this.isMobileShooting || isArrowShooting)
      )
    }

    // Boundary check
    this.constrainToArena(this.player)

    // Gradual head size scaling & track peak mass
    this.peakMass = Math.max(this.peakMass, Math.round(this.player.mass))
    this.player.headRadius = 11 + Math.sqrt(this.player.mass) * 0.22
    this.updateWormTail(this.player)

    if (this.player.nameText) {
      this.player.nameText.setPosition(this.player.x, this.player.y - this.player.headRadius - 10)
    }
  }

  private updateBots(dt: number) {
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i]
      if (bot.isDead) continue

      bot.aiTimer = (bot.aiTimer || 0) + dt

      // AI Decision Cycle every 0.3s
      if (bot.aiTimer > 0.3) {
        bot.aiTimer = 0
        this.runBotAI(bot)
      }

      // Smooth turn
      bot.angle = Phaser.Math.Angle.RotateTo(bot.angle, bot.targetAngle, bot.turnSpeed * (dt * 60))

      // Speed boost state
      if (bot.isBoosting && bot.boostEnergy > 10 && bot.mass > 25) {
        bot.speed = bot.baseSpeed * 1.65
        bot.boostEnergy = Math.max(0, bot.boostEnergy - 30 * dt)
        bot.mass = Math.max(12, bot.mass - 1.8 * dt)
        if (Math.random() < 0.25) {
          this.hazardParticles.push({
            x: bot.x - Math.cos(bot.angle) * (bot.headRadius + 5),
            y: bot.y - Math.sin(bot.angle) * (bot.headRadius + 5),
            alpha: 0.8,
            color: bot.primaryColor,
          })
        }
      } else {
        bot.isBoosting = false
        bot.speed = bot.baseSpeed
        // 40% slower recharge for bots
        bot.boostEnergy = Math.min(100, bot.boostEnergy + 10.7 * dt)
      }

      // Move
      bot.vx = Math.cos(bot.angle) * bot.speed
      bot.vy = Math.sin(bot.angle) * bot.speed
      bot.x += bot.vx * dt
      bot.y += bot.vy * dt

      this.constrainToArena(bot)
      bot.headRadius = 10 + Math.sqrt(bot.mass) * 0.22
      this.updateWormTail(bot)

      if (bot.nameText) {
        bot.nameText.setPosition(bot.x, bot.y - bot.headRadius - 10)
      }
    }

    // Maintain exactly 15 active/pending bots without duplicating during 2.5s respawn delay
    while (this.bots.length < TARGET_BOT_COUNT) {
      this.spawnBot(this.nextBotUid)
    }
  }

  private runBotAI(bot: WormEntity) {
    // 1. Boundary check (arena walls)
    const margin = 180
    if (bot.x < margin) {
      bot.targetAngle = 0
      return
    }
    if (bot.x > ARENA_SIZE - margin) {
      bot.targetAngle = Math.PI
      return
    }
    if (bot.y < margin) {
      bot.targetAngle = Math.PI / 2
      return
    }
    if (bot.y > ARENA_SIZE - margin) {
      bot.targetAngle = -Math.PI / 2
      return
    }

    // 2. Incoming laser projectile dodging
    for (let p = 0; p < this.projectiles.length; p++) {
      const proj = this.projectiles[p]
      if (proj.ownerId === bot.id) continue
      const distToProj = Phaser.Math.Distance.Between(bot.x, bot.y, proj.x, proj.y)
      if (distToProj < 150) {
        // Projectile is close! Dodge perpendicularly
        const projAngle = Math.atan2(proj.vy, proj.vx)
        bot.targetAngle = projAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2)
        bot.isBoosting = true
        return
      }
    }

    // 3. Check if a rival tail is immediately in front
    const lookAheadX = bot.x + Math.cos(bot.angle) * 115
    const lookAheadY = bot.y + Math.sin(bot.angle) * 115

    let nearestThreatDist = 9999
    let threatAngle = 0

    // Check all alive worms' tails
    const allEnemies = [this.player, ...this.bots].filter((w) => !w.isDead && w.id !== bot.id)
    for (const enemy of allEnemies) {
      for (let s = 0; s < enemy.tail.length; s += 2) {
        const seg = enemy.tail[s]
        const d = Phaser.Math.Distance.Between(lookAheadX, lookAheadY, seg.x, seg.y)
        if (d < nearestThreatDist) {
          nearestThreatDist = d
          threatAngle = Math.atan2(seg.y - bot.y, seg.x - bot.x)
        }
      }
    }

    // If danger immediately in front, steer hard away!
    if (nearestThreatDist < 95) {
      bot.targetAngle = threatAngle + Math.PI * 0.75
      bot.isBoosting = true
      return
    }

    // 4. Aggressive PvP Hunting & Tactical Intercept
    let targetWorm: WormEntity | null = null
    let closestWormDist = 450

    for (const enemy of allEnemies) {
      const d = Phaser.Math.Distance.Between(bot.x, bot.y, enemy.x, enemy.y)
      if (d < closestWormDist) {
        closestWormDist = d
        targetWorm = enemy
      }
    }

    if (targetWorm) {
      if (bot.mass >= targetWorm.mass * 0.95 && bot.mass > 30) {
        // Hunter mode: calculate intercept point ahead of the target to cut them off with tail
        const leadDist = targetWorm.isBoosting ? 120 : 75
        const interceptX = targetWorm.x + Math.cos(targetWorm.angle) * leadDist
        const interceptY = targetWorm.y + Math.sin(targetWorm.angle) * leadDist
        bot.targetAngle = Math.atan2(interceptY - bot.y, interceptX - bot.x)
        bot.isBoosting = bot.boostEnergy > 25

        // Tactical shooting if aimed well at victim
        const angleToVictim = Math.atan2(targetWorm.y - bot.y, targetWorm.x - bot.x)
        if (Math.abs(Phaser.Math.Angle.Normalize(bot.angle - angleToVictim)) < 0.35) {
          this.shootProjectile(bot)
        }
        return
      } else if (targetWorm.mass > bot.mass * 1.15) {
        // Prey mode: steer away from bigger predator!
        const fleeAngle = Math.atan2(bot.y - targetWorm.y, bot.x - targetWorm.x)
        bot.targetAngle = fleeAngle
        bot.isBoosting = bot.boostEnergy > 30

        // Shoot behind to slow down chaser
        const rearAngle = fleeAngle + Math.PI
        if (Math.abs(Phaser.Math.Angle.Normalize(bot.angle - rearAngle)) < 0.4) {
          this.shootProjectile(bot)
        }
        return
      }
    }

    // 5. Hunt closest food or corpse drop cluster
    let closestFood: FoodOrb | null = null
    let minDist = 400

    for (let f = 0; f < this.food.length; f += 2) {
      const orb = this.food[f]
      const dist = Phaser.Math.Distance.Between(bot.x, bot.y, orb.x, orb.y)
      if (dist < minDist) {
        minDist = dist
        closestFood = orb
      }
    }

    if (closestFood) {
      bot.targetAngle = Math.atan2(closestFood.y - bot.y, closestFood.x - bot.x)
      bot.isBoosting = false
    } else {
      // Wander towards center
      const toCenterX = ARENA_SIZE / 2 - bot.x
      const toCenterY = ARENA_SIZE / 2 - bot.y
      bot.targetAngle = Math.atan2(toCenterY, toCenterX) + (Math.random() - 0.5) * 0.4
    }
  }

  private updateWormTail(worm: WormEntity) {
    // Record current head position into history
    worm.history.unshift({ x: worm.x, y: worm.y })

    // Maximum history to keep
    const maxHistory = 400
    if (worm.history.length > maxHistory) {
      worm.history.length = maxHistory
    }

    // Gradual tail segment formula: 1 extra segment per ~50 mass
    const targetSegmentCount = Math.min(75, Math.floor(worm.mass / 50) + 3)
    const segmentSpacing = 10 + worm.headRadius * 0.15

    // Expand tail array if needed
    while (worm.tail.length < targetSegmentCount) {
      const lastSeg = worm.tail[worm.tail.length - 1] || { x: worm.x, y: worm.y, radius: worm.headRadius }
      worm.tail.push({
        x: lastSeg.x,
        y: lastSeg.y,
        radius: Math.max(5, worm.headRadius * 0.75),
      })
    }

    // Shrink if lost mass
    if (worm.tail.length > targetSegmentCount) {
      worm.tail.length = targetSegmentCount
    }

    // Position each tail segment along the history trail
    for (let i = 0; i < worm.tail.length; i++) {
      const historyIndex = Math.min(worm.history.length - 1, Math.floor((i + 1) * (segmentSpacing / 4)))
      const pos = worm.history[historyIndex]
      if (pos) {
        worm.tail[i].x = pos.x
        worm.tail[i].y = pos.y
        // Segments slightly taper towards the end
        worm.tail[i].radius = Math.max(5, worm.headRadius * (1 - (i / (worm.tail.length + 15)) * 0.45))
      }
    }
  }

  private constrainToArena(worm: WormEntity) {
    const r = worm.headRadius + 8
    if (worm.x < r) worm.x = r
    if (worm.x > ARENA_SIZE - r) worm.x = ARENA_SIZE - r
    if (worm.y < r) worm.y = r
    if (worm.y > ARENA_SIZE - r) worm.y = ARENA_SIZE - r
  }

  /**
   * Accurate projectile shooting:
   * - On Mobile: Instant Auto-Aim at the nearest enemy within 650px!
   * - On Desktop: Shoots directly at the cursor with boosted speed & damage.
   */
  private shootProjectile(shooter: WormEntity) {
    if (shooter.shootCooldown > 0) return
    shooter.shootCooldown = 0.15 // Fast 150ms responsive shooting cadence

    let aimAngle = shooter.angle

    if (shooter.isPlayer) {
      const isAutoAim = this.isMobileShooting || Boolean(this.enterKey && this.enterKey.isDown)

      let arrowDirX = 0
      let arrowDirY = 0
      if (this.cursors?.up.isDown) arrowDirY -= 1
      if (this.cursors?.down.isDown) arrowDirY += 1
      if (this.cursors?.left.isDown) arrowDirX -= 1
      if (this.cursors?.right.isDown) arrowDirX += 1
      const isArrowShooting = arrowDirX !== 0 || arrowDirY !== 0

      if (isAutoAim) {
        // Auto-Aim for Enter key (PC) and Lazer button (Mobile): find nearest alive enemy within 750px
        let closestDist = 750
        let targetEnemy: { x: number; y: number } | null = null

        for (const b of this.bots) {
          if (b.isDead) continue
          const d = Phaser.Math.Distance.Between(shooter.x, shooter.y, b.x, b.y)
          if (d < closestDist) {
            closestDist = d
            targetEnemy = { x: b.x, y: b.y }
          }
        }

        if (targetEnemy) {
          aimAngle = Math.atan2(targetEnemy.y - shooter.y, targetEnemy.x - shooter.x)
          this.autoAimTarget = targetEnemy
        } else {
          aimAngle = shooter.angle
          this.autoAimTarget = null
        }
      } else if (isArrowShooting) {
        // Arrow Keys directional shooting: Tepa, Past, Chap, O'ng
        aimAngle = Math.atan2(arrowDirY, arrowDirX)
        this.autoAimTarget = null
      } else {
        const worldPoint = this.cameras.main.getWorldPoint(this.mousePointer.x, this.mousePointer.y)
        aimAngle = Math.atan2(worldPoint.y - shooter.y, worldPoint.x - shooter.x)
        this.autoAimTarget = null
      }
    }

    const speed = 920 // Boosted plasma projectile speed (was 820)
    const vx = Math.cos(aimAngle) * speed
    const vy = Math.sin(aimAngle) * speed

    this.projectiles.push({
      x: shooter.x + Math.cos(aimAngle) * (shooter.headRadius + 8),
      y: shooter.y + Math.sin(aimAngle) * (shooter.headRadius + 8),
      vx,
      vy,
      ownerId: shooter.id,
      color: shooter.projectileColor ?? shooter.primaryColor,
      damage: 2.5, // Balanced: requires at least 8 head hits or 14 tail hits to kill a baseline worm
      lifetime: 1.25,
    })

    if (shooter.isPlayer) {
      soundManager.playShoot()
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.lifetime -= dt

      if (p.lifetime <= 0 || p.x < 0 || p.x > ARENA_SIZE || p.y < 0 || p.y > ARENA_SIZE) {
        this.projectiles.splice(i, 1)
      }
    }

    // Decrement cooldowns
    if (this.player.shootCooldown > 0) this.player.shootCooldown -= dt
    for (const b of this.bots) {
      if (b.shootCooldown > 0) b.shootCooldown -= dt
    }
  }

  private updateHazardParticles(dt: number) {
    for (let i = this.hazardParticles.length - 1; i >= 0; i--) {
      const part = this.hazardParticles[i]
      part.alpha -= dt * 1.5
      if (part.alpha <= 0) {
        this.hazardParticles.splice(i, 1)
      }
    }
  }

  private checkCollisions() {
    const allWorms = [this.player, ...this.bots].filter((w) => !w.isDead)

    // 1. Head eats Food Orbs
    for (const worm of allWorms) {
      for (let f = this.food.length - 1; f >= 0; f--) {
        const orb = this.food[f]
        const dist = Phaser.Math.Distance.Between(worm.x, worm.y, orb.x, orb.y)
        if (dist < worm.headRadius + orb.radius + 5) {
          worm.mass += orb.value
          this.food.splice(f, 1)

          if (worm.isPlayer) {
            soundManager.playPickup()
          }

          // Respawn food elsewhere to keep food density stable
          this.food.push(this.createFoodOrb(undefined, undefined, orb.color, Phaser.Math.Between(1, 3)))
        }
      }
    }

    // 2. Head vs Head Collisions (PvP Dominance: bigger absorbs smaller)
    for (let i = 0; i < allWorms.length; i++) {
      for (let j = i + 1; j < allWorms.length; j++) {
        const w1 = allWorms[i]
        const w2 = allWorms[j]
        if (w1.isDead || w2.isDead) continue

        const headDist = Phaser.Math.Distance.Between(w1.x, w1.y, w2.x, w2.y)
        if (headDist < (w1.headRadius + w2.headRadius) * 0.9) {
          if (w1.mass > w2.mass * 1.12) {
            // w1 dominates and destroys w2!
            this.killWorm(w2, w1, 'head')
          } else if (w2.mass > w1.mass * 1.12) {
            // w2 dominates and destroys w1!
            this.killWorm(w1, w2, 'head')
          } else {
            // Masses are nearly equal: recoil bounce clash with mass shaving!
            const angle = Math.atan2(w2.y - w1.y, w2.x - w1.x)
            w1.x -= Math.cos(angle) * 16
            w1.y -= Math.sin(angle) * 16
            w2.x += Math.cos(angle) * 16
            w2.y += Math.sin(angle) * 16
            w1.mass = Math.max(12, w1.mass - 8)
            w2.mass = Math.max(12, w2.mass - 8)
            soundManager.playHit()
            for (let sp = 0; sp < 6; sp++) {
              this.hazardParticles.push({
                x: (w1.x + w2.x) / 2 + (Math.random() - 0.5) * 24,
                y: (w1.y + w2.y) / 2 + (Math.random() - 0.5) * 24,
                alpha: 1.0,
                color: 0xf59e0b,
              })
            }
          }
        }
      }
    }

    // 3. Head vs Rival Tail Collision (Snake.io core mechanic)
    for (const attacker of allWorms) {
      if (attacker.isDead) continue
      for (const defender of allWorms) {
        if (attacker.id === defender.id || defender.isDead) continue

        // Check if attacker's head touches defender's tail segments
        for (let s = 1; s < defender.tail.length; s++) {
          const seg = defender.tail[s]
          const dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, seg.x, seg.y)

          if (dist < (attacker.headRadius + seg.radius) * 0.85) {
            // Attacker Crashes & Dies! Defender gets the kill!
            this.killWorm(attacker, defender, 'tail')
            break
          }
        }
      }
    }

    // 4. Projectile vs Head/Tail
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx]
      let hit = false
      let hitWorm: WormEntity | null = null

      for (const worm of allWorms) {
        if (worm.id === proj.ownerId || worm.isDead) continue

        // Check head hit
        const distHead = Phaser.Math.Distance.Between(proj.x, proj.y, worm.x, worm.y)
        if (distHead < worm.headRadius + 8) {
          hit = true
          hitWorm = worm
          worm.lastDamagerId = proj.ownerId
          worm.lastDamageTime = Date.now()

          // Baseline worm has 30 mass. Damage of 2.5 requires at least 8 head hits to reach death threshold (mass <= 10)
          const headDamage = Math.max(2.5, Math.min(6, Math.round(worm.mass * 0.04)))
          const stolenMass = Math.max(1, Math.round(headDamage * 0.6))
          worm.mass = Math.max(5, worm.mass - headDamage)

          const shooter = allWorms.find((w) => w.id === proj.ownerId)
          if (shooter && !shooter.isDead) {
            shooter.mass += stolenMass
            if (shooter.isPlayer) {
              this.score += stolenMass * 10
            }
          }

          if (worm.mass <= KILL_MASS_THRESHOLD) {
            this.killWorm(worm, shooter || null, 'shot')
          }
          break
        }

        // Check tail segments hit
        for (let s = 0; s < worm.tail.length; s++) {
          const seg = worm.tail[s]
          const distSeg = Phaser.Math.Distance.Between(proj.x, proj.y, seg.x, seg.y)
          if (distSeg < seg.radius + 6) {
            hit = true
            hitWorm = worm
            worm.lastDamagerId = proj.ownerId
            worm.lastDamageTime = Date.now()

            // Tail hit deals ~1.5 damage (requires ~14 tail hits to kill)
            const tailDamage = Math.max(1.5, Math.min(4, Math.round(worm.mass * 0.025)))
            const stolenMass = Math.max(1, Math.round(tailDamage * 0.6))
            worm.mass = Math.max(5, worm.mass - tailDamage)

            const shooter = allWorms.find((w) => w.id === proj.ownerId)
            if (shooter && !shooter.isDead) {
              shooter.mass += stolenMass
              if (shooter.isPlayer) {
                this.score += stolenMass * 10
              }
            }

            if (worm.mass <= KILL_MASS_THRESHOLD) {
              this.killWorm(worm, shooter || null, 'shot')
            }
            break
          }
        }

        if (hit) break
      }

      if (hit) {
        // Hit sound if player is involved
        if (proj.ownerId === this.player.id || hitWorm?.isPlayer) {
          soundManager.playHit()
        }

        // Hit spark effect
        for (let sp = 0; sp < 5; sp++) {
          this.hazardParticles.push({
            x: proj.x + (Math.random() - 0.5) * 14,
            y: proj.y + (Math.random() - 0.5) * 14,
            alpha: 0.95,
            color: proj.color,
          })
        }

        this.projectiles.splice(pIdx, 1)
      }
    }
  }

  private killWorm(victim: WormEntity, killer: WormEntity | null, method: 'tail' | 'shot' | 'head') {
    if (victim.isDead) return
    victim.isDead = true

    if (victim.nameText) {
      victim.nameText.destroy()
      victim.nameText = undefined
    }

    // If killer is not explicitly given, attribute to the last damager if recent (< 5s)
    if (!killer && victim.lastDamagerId && Date.now() - (victim.lastDamageTime || 0) < 5000) {
      const allWorms = [this.player, ...this.bots]
      killer = allWorms.find((w) => w.id === victim.lastDamagerId) || null
    }

    // Instant Mass Steal: Killer absorbs 40% of victim mass directly!
    const massStolen = Math.floor(victim.mass * 0.40)

    if (killer) {
      killer.kills++
      killer.mass += massStolen

      if (killer.isPlayer) {
        const now = Date.now()
        if (now - this.lastPlayerKillTime < 7000) {
          this.playerKillComboCount++
        } else {
          this.playerKillComboCount = 1
        }
        this.lastPlayerKillTime = now

        this.recentPlayerKill = {
          id: `${now}_${Math.random()}`,
          victimName: victim.name,
          massGained: massStolen,
          comboCount: this.playerKillComboCount,
        }

        // Screen shake & satisfying kill audio
        safeCameraShake(this, 220, 0.009)
        soundManager.playCombo()
      }
    }

    if (victim.isPlayer && !this.scoreSavedThisLife) {
      this.scoreSavedThisLife = true
      const survivalSec = Math.max(1, Math.floor((Date.now() - this.sessionStartTime) / 1000))
      const finalScore = Math.floor(this.score + this.peakMass * 2 + this.player.kills * 200 + survivalSec * 5)
      const virtualLevel = Math.min(30, Math.floor(this.peakMass / 50) + 1)
      const coins = Math.min(100, Math.floor(finalScore / 500) * 10 + this.player.kills * 5 + 15)

      this.lastSavedScore = finalScore
      this.lastEarnedCoins = coins

      this.configCallbacks?.onGameOver?.({
        score: finalScore,
        level: virtualLevel,
        kills: this.player.kills,
        survivalTime: survivalSec,
        mutationsCount: 0,
        damageDealt: this.player.kills * 50,
        damageTaken: 100,
        criticalHits: 0,
        bossDefeated: false,
      })
    }

    // Add to Kill-Feed
    this.killFeed.unshift({
      id: `${Date.now()}_${Math.random()}`,
      killer: killer ? killer.name : 'XARITA CHEGARASI',
      victim: victim.name,
      method: method === 'head' ? 'tail' : method,
      timestamp: Date.now(),
    })
    if (this.killFeed.length > 6) this.killFeed.pop()

    // Sound effect
    if (victim.isPlayer || killer?.isPlayer) {
      soundManager.playExplosion()
    }

    // Scatter the remaining ~50% mass as glowing food orbs where the worm was
    const dropCount = Math.min(22, Math.floor(victim.mass / 8) + 4)
    const points = [
      { x: victim.x, y: victim.y },
      ...victim.tail.map((t) => ({ x: t.x, y: t.y })),
    ]

    for (let i = 0; i < dropCount; i++) {
      const pt = Phaser.Utils.Array.GetRandom(points)
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * 40

      this.food.push(
        this.createFoodOrb(
          Phaser.Math.Clamp(pt.x + Math.cos(angle) * dist, 60, ARENA_SIZE - 60),
          Phaser.Math.Clamp(pt.y + Math.sin(angle) * dist, 60, ARENA_SIZE - 60),
          victim.primaryColor,
          Phaser.Math.Between(2, 5),
          Phaser.Math.Between(5, 9)
        )
      )
    }

    // If bot died, schedule respawn
    if (!victim.isPlayer) {
      this.time.delayedCall(2500, () => {
        const idx = this.bots.findIndex((b) => b.id === victim.id)
        if (idx !== -1) {
          this.bots.splice(idx, 1)
        }
      })
    }
  }

  private renderGraphics(time: number) {
    // 1. Render Hazard Particles
    this.hazardTrailGraphics.clear()
    for (const part of this.hazardParticles) {
      this.hazardTrailGraphics.fillStyle(part.color, part.alpha * 0.5)
      this.hazardTrailGraphics.fillCircle(part.x, part.y, 5)
    }

    // 2. Render Food Orbs (Viewport culled 3D specular orbs)
    this.foodGraphics.clear()
    const bounds = this.cameras.main.worldView
    for (const orb of this.food) {
      if (
        orb.x < bounds.x - 30 ||
        orb.x > bounds.right + 30 ||
        orb.y < bounds.y - 30 ||
        orb.y > bounds.bottom + 30
      ) {
        continue
      }
      const r = orb.radius
      // Outer bloom
      this.foodGraphics.fillStyle(orb.color, 0.22)
      this.foodGraphics.fillCircle(orb.x, orb.y, r + 2.5)
      // Sphere body
      this.foodGraphics.fillStyle(orb.color, 0.95)
      this.foodGraphics.fillCircle(orb.x, orb.y, r)
      // 3D specular highlight
      this.foodGraphics.fillStyle(0xffffff, 0.55)
      this.foodGraphics.fillCircle(orb.x - r * 0.28, orb.y - r * 0.28, Math.max(1.2, r * 0.35))
    }

    // 3. Render Volumetric 3D Tails
    this.tailGraphics.clear()
    const allWorms = [this.player, ...this.bots].filter((w) => !w.isDead)

    for (const worm of allWorms) {
      const accent = worm.accentColor ?? worm.secondaryColor
      for (let i = worm.tail.length - 1; i >= 0; i--) {
        const seg = worm.tail[i]
        // Drop shadow under segment
        this.tailGraphics.fillStyle(0x000000, 0.35)
        this.tailGraphics.fillCircle(seg.x - 1.5, seg.y + 3, seg.radius)
        // Outer shaded rim
        this.tailGraphics.fillStyle(worm.secondaryColor, 0.95)
        this.tailGraphics.fillCircle(seg.x, seg.y, seg.radius)
        // Lit upper-left sphere dome
        this.tailGraphics.fillStyle(worm.primaryColor, 0.96)
        this.tailGraphics.fillCircle(seg.x - seg.radius * 0.14, seg.y - seg.radius * 0.14, seg.radius * 0.84)
        // Dorsal stripe on Leviathan / Helix skin or every 2nd segment highlight
        if (i % 2 === 0 || worm.model3dType === 'leviathan_apex') {
          this.tailGraphics.fillStyle(accent, 0.55)
          this.tailGraphics.fillCircle(seg.x, seg.y, Math.max(2, seg.radius * 0.36))
        }
        // Specular sheen
        this.tailGraphics.fillStyle(0xffffff, 0.35)
        this.tailGraphics.fillCircle(seg.x - seg.radius * 0.34, seg.y - seg.radius * 0.34, Math.max(1.4, seg.radius * 0.28))
      }
    }

    // 4. Render 3D Heads + Skin-Specific Accessories
    this.headGraphics.clear()
    for (const worm of allWorms) {
      const r = worm.headRadius
      const accent = worm.accentColor ?? worm.secondaryColor
      const cos = Math.cos(worm.angle)
      const sin = Math.sin(worm.angle)
      const px = -sin
      const py = cos

      // Shadow underneath head
      this.headGraphics.fillStyle(0x000000, 0.42)
      this.headGraphics.fillCircle(worm.x - 2, worm.y + 4, r + 1.5)

      // Boost / Arena glow ring
      this.headGraphics.fillStyle(accent, worm.isBoosting ? 0.38 : 0.18)
      this.headGraphics.fillCircle(worm.x, worm.y, r + (worm.isBoosting ? 6 : 3))

      // Model-specific 3D side mandibles / cannons / gimbal ring
      if (worm.model3dType === 'leviathan_apex') {
        this.headGraphics.fillStyle(worm.secondaryColor, 1)
        this.headGraphics.fillTriangle(
          worm.x + px * r * 0.7, worm.y + py * r * 0.7,
          worm.x + cos * (r + 12) + px * (r * 0.45), worm.y + sin * (r + 12) + py * (r * 0.45),
          worm.x + cos * 6 + px * (r * 0.95), worm.y + sin * 6 + py * (r * 0.95)
        )
        this.headGraphics.fillTriangle(
          worm.x - px * r * 0.7, worm.y - py * r * 0.7,
          worm.x + cos * (r + 12) - px * (r * 0.45), worm.y + sin * (r + 12) - py * (r * 0.45),
          worm.x + cos * 6 - px * (r * 0.95), worm.y + sin * 6 - py * (r * 0.95)
        )
      } else if (worm.model3dType === 'bastion_mech' || worm.model3dType === 'plasma_core') {
        this.headGraphics.fillStyle(0x334155, 1)
        this.headGraphics.fillCircle(worm.x + px * (r * 0.85), worm.y + py * (r * 0.85), r * 0.42)
        this.headGraphics.fillCircle(worm.x - px * (r * 0.85), worm.y - py * (r * 0.85), r * 0.42)
        this.headGraphics.fillStyle(accent, 1)
        this.headGraphics.fillCircle(worm.x + cos * 6 + px * (r * 0.85), worm.y + sin * 6 + py * (r * 0.85), 2.5)
        this.headGraphics.fillCircle(worm.x + cos * 6 - px * (r * 0.85), worm.y + sin * 6 - py * (r * 0.85), 2.5)
      } else if (worm.model3dType === 'void_orb' || worm.model3dType === 'chrono_octa') {
        this.headGraphics.lineStyle(2, accent, 0.8)
        this.headGraphics.strokeCircle(worm.x, worm.y, r + 5.5)
      }

      // Base shadowed 3D rim + bright dome
      this.headGraphics.fillStyle(worm.secondaryColor, 1.0)
      this.headGraphics.fillCircle(worm.x, worm.y, r)
      this.headGraphics.fillStyle(worm.primaryColor, 1.0)
      this.headGraphics.fillCircle(worm.x - r * 0.14, worm.y - r * 0.14, r * 0.86)

      // Center crest motif (Helix / Crown)
      if (worm.model3dType === 'helix_crystal' || worm.model3dType === 'chrono_octa') {
        this.headGraphics.fillStyle(accent, 0.9)
        this.headGraphics.fillCircle(worm.x, worm.y, Math.max(3, r * 0.34))
      } else if (worm.model3dType === 'crown_sovereign') {
        this.headGraphics.lineStyle(2, 0xffffff, 0.9)
        this.headGraphics.strokeCircle(worm.x, worm.y, r * 0.48)
      }

      // 3D specular highlight crescent
      this.headGraphics.fillStyle(0xffffff, 0.48)
      this.headGraphics.fillCircle(worm.x - r * 0.32, worm.y - r * 0.32, Math.max(2, r * 0.3))

      // Cyber eyes / optics
      const eyeOffset = r * 0.44
      const eyeForward = r * 0.38
      const leftEyeX = worm.x + cos * eyeForward + px * eyeOffset
      const leftEyeY = worm.y + sin * eyeForward + py * eyeOffset
      const rightEyeX = worm.x + cos * eyeForward - px * eyeOffset
      const rightEyeY = worm.y + sin * eyeForward - py * eyeOffset

      this.headGraphics.fillStyle(0xffffff, 1.0)
      this.headGraphics.fillCircle(leftEyeX, leftEyeY, Math.max(2.5, r * 0.21))
      this.headGraphics.fillCircle(rightEyeX, rightEyeY, Math.max(2.5, r * 0.21))

      this.headGraphics.fillStyle(0x090c10, 1.0)
      this.headGraphics.fillCircle(leftEyeX + cos * 1.2, leftEyeY + sin * 1.2, Math.max(1.2, r * 0.1))
      this.headGraphics.fillCircle(rightEyeX + cos * 1.2, rightEyeY + sin * 1.2, Math.max(1.2, r * 0.1))
    }

    // 5. Render Projectiles (Plasma bolt with motion trail)
    this.projectileGraphics.clear()
    for (const p of this.projectiles) {
      // Glow trail line
      this.projectileGraphics.lineStyle(4, p.color, 0.45)
      this.projectileGraphics.lineBetween(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.x, p.y)
      // Glow circle
      this.projectileGraphics.fillStyle(p.color, 0.65)
      this.projectileGraphics.fillCircle(p.x, p.y, 6)
      // Crisp white core
      this.projectileGraphics.fillStyle(0xffffff, 1.0)
      this.projectileGraphics.fillCircle(p.x, p.y, 3.5)
    }
    // 6. Render Auto-Aim Lock Reticle (Mobile Laser or PC Enter key)
    const isAutoAimActive = Boolean(this.autoAimTarget && (this.isMobileShooting || (this.enterKey && this.enterKey.isDown)) && !this.player.isDead)
    if (isAutoAimActive && this.autoAimTarget) {
      const tx = this.autoAimTarget.x
      const ty = this.autoAimTarget.y
      const reticleRadius = 22 + Math.sin(time * 0.01) * 3
      this.projectileGraphics.lineStyle(2, 0xef4444, 0.85)
      this.projectileGraphics.strokeCircle(tx, ty, reticleRadius)
      this.projectileGraphics.lineBetween(tx - reticleRadius - 8, ty, tx - reticleRadius + 4, ty)
      this.projectileGraphics.lineBetween(tx + reticleRadius - 4, ty, tx + reticleRadius + 8, ty)
      this.projectileGraphics.lineBetween(tx, ty - reticleRadius - 8, tx, ty - reticleRadius + 4)
      this.projectileGraphics.lineBetween(tx, ty + reticleRadius - 4, tx, ty + reticleRadius + 8)

      // Aim laser line from player head to target
      this.projectileGraphics.lineStyle(1, 0xef4444, 0.3)
      this.projectileGraphics.lineBetween(this.player.x, this.player.y, tx, ty)
    }
  }

  private emitHUD() {
    if (!this.configCallbacks?.onBioWarUpdate) return

    const allWorms = [this.player, ...this.bots].filter((w) => !w.isDead)

    // Sort leaderboard by mass descending
    const sorted = [...allWorms].sort((a, b) => b.mass - a.mass)
    const kingId = sorted[0]?.id

    const leaderboard: BioWarLeaderboardEntry[] = sorted.slice(0, 10).map((w) => ({
      id: w.id,
      name: w.name,
      mass: Math.round(w.mass),
      kills: w.kills,
      isPlayer: w.isPlayer,
      isKing: w.id === kingId,
    }))

    // Dynamic Apex King crown & colors on floating nicknames
    for (const worm of allWorms) {
      if (worm.nameText && !worm.isDead) {
        const isKing = worm.id === kingId
        const prefix = isKing ? '👑 ' : ''
        const desiredText = `${prefix}${worm.name}`
        if (worm.nameText.text !== desiredText) {
          worm.nameText.setText(desiredText)
        }
        if (isKing) {
          worm.nameText.setColor('#fbbf24') // Gold for King
        } else if (worm.isPlayer) {
          worm.nameText.setColor('#38bdf8') // Cyan for player
        } else {
          worm.nameText.setColor('#f1f5f9') // Off-white for bots
        }
      }
    }

    const playerRank = sorted.findIndex((w) => w.id === this.player.id) + 1

    // Radar coordinates (normalized 0 to 1)
    const radar: BioWarRadarEntity[] = allWorms.map((w) => ({
      x: w.x / ARENA_SIZE,
      y: w.y / ARENA_SIZE,
      isPlayer: w.isPlayer,
      isKing: w.id === kingId,
    }))

    const isOnline = this.networkClient?.status === 'connected'
    const latestSnap = this.networkClient?.latestSnapshot
    const humanPlayers = isOnline && latestSnap ? latestSnap.humanCount : 1
    const botPlayers = isOnline && latestSnap ? latestSnap.botCount : this.bots.filter((b) => !b.isDead).length

    const activeKillEvent =
      this.recentPlayerKill && Date.now() - this.lastPlayerKillTime < 2500
        ? this.recentPlayerKill
        : undefined
    if (!activeKillEvent && this.recentPlayerKill) {
      this.recentPlayerKill = undefined
    }

    this.configCallbacks.onBioWarUpdate({
      myMass: Math.round(this.player.mass),
      myKills: this.player.kills,
      myRank: playerRank > 0 ? playerRank : sorted.length + 1,
      totalPlayers: humanPlayers + botPlayers,
      boostPct: this.player.boostEnergy / 100,
      leaderboard,
      killFeed: this.killFeed,
      radar,
      isDead: this.player.isDead,
      roundTimeRemaining: Math.ceil(this.roundTimeRemaining),
      roundNumber: this.roundNumber,
      lastWinnerName: this.lastWinnerName,
      peakMass: this.peakMass,
      savedScore: this.lastSavedScore,
      coinsEarned: this.lastEarnedCoins,
      recentKillEvent: activeKillEvent,
      autoAimActive: Boolean(this.autoAimTarget && (this.isMobileShooting || (this.enterKey && this.enterKey.isDown))),
      humanPlayers,
      botPlayers,
      isOnlineMultiplayer: isOnline,
    })
  }

  // Public control methods for Mobile & UI
  public setMobileSteer(angle: number | null) {
    this.mobileSteerAngle = angle
  }

  public setMobileBoosting(isBoosting: boolean) {
    this.isMobileBoosting = isBoosting
  }

  public setMobileShooting(isShooting: boolean) {
    this.isMobileShooting = isShooting
  }

  public setUiPaused(paused: boolean) {
    this.uiPaused = paused
    const isOnline = this.networkClient?.status === 'connected'
    if (!isOnline && this.scene) {
      if (paused && this.scene.isActive()) {
        this.scene.pause()
      } else if (!paused && this.scene.isPaused()) {
        this.scene.resume()
      }
    }
  }

  public isOnlineConnected(): boolean {
    return this.networkClient?.status === 'connected'
  }

  public restartArenaMatch() {
    this.uiPaused = false
    if (this.scene?.isPaused()) {
      this.scene.resume()
    }
    this.respawnPlayer()
  }

  public saveAndEndCurrentRun() {
    this.networkClient?.disconnect()
    if (!this.player.isDead && !this.scoreSavedThisLife && (this.player.kills > 0 || this.player.mass > 32)) {
      this.scoreSavedThisLife = true
      const survivalSec = Math.max(1, Math.floor((Date.now() - this.sessionStartTime) / 1000))
      const finalScore = Math.floor(this.peakMass * 2 + this.player.kills * 200 + survivalSec * 5)
      const virtualLevel = Math.min(30, Math.floor(this.peakMass / 50) + 1)
      this.configCallbacks?.onGameOver?.({
        score: finalScore,
        level: virtualLevel,
        kills: this.player.kills,
        survivalTime: survivalSec,
        mutationsCount: 0,
        damageDealt: this.player.kills * 50,
        damageTaken: 0,
        criticalHits: 0,
        bossDefeated: false,
      })
    }
  }
}
