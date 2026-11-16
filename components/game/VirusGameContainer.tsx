'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Phaser from 'phaser'
import MainScene, { GameHUDData, MainSceneConfig } from '@/lib/game/engine/MainScene'
import SurvivalScene, { SurvivalSceneConfig } from '@/lib/game/engine/SurvivalScene'
import BioWarScene, { BioWarHUDData, BioWarSceneConfig } from '@/lib/game/engine/BioWarScene'
import BioWarHUD from './BioWarHUD'
import { getArenaThemePalette, getSelectedSkinId, syncCoinBalance } from '@/lib/game/cosmetics'
import MutationOverlay from './MutationOverlay'
import GameOverModal from './GameOverModal'
import PauseOverlay from './PauseOverlay'
import MobileControls from './MobileControls'
import CellixLoader from '@/components/v26/CellixLoader'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { useSettings } from '@/components/SettingsContext'
import { MutationDefinition, getRandomMutationOptions } from '@/lib/game/mutations'
import { getActiveCombos } from '@/lib/game/combos'
import { getDailyChallenge } from '@/lib/game/daily'
import { Volume2, VolumeX, Heart, Zap, Biohazard, Pause, Shield, Bomb, Crosshair, Sparkles, RotateCcw } from 'lucide-react'

type GameScene = MainScene | SurvivalScene | BioWarScene
type GameSceneConfig = MainSceneConfig | SurvivalSceneConfig | BioWarSceneConfig
type GameMode = 'classic' | 'survival' | 'daily' | 'biowar'

function getSceneKey(gameMode: GameMode) {
  switch (gameMode) {
    case 'survival':
      return 'SurvivalScene'
    case 'biowar':
      return 'BioWarScene'
    default:
      return 'MainScene'
  }
}

async function requestRunToken(
  gameMode: GameMode,
  challengeDate?: string,
  onDailyBlocked?: () => void
): Promise<string | null> {
  try {
    const response = await fetch('/api/game/run/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameMode, challengeDate }),
    })
    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { error?: string; playedToday?: boolean }
      if (response.status === 403 && errData.playedToday) {
        if (typeof window !== 'undefined') {
          const d = new Date()
          const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
          localStorage.setItem(`cellix_daily_played_${today}`, 'true')
        }
        if (onDailyBlocked) {
          onDailyBlocked()
        } else if (typeof window !== 'undefined') {
          window.location.href = '/game'
        }
      }
      throw new Error(`Run start failed (${response.status})`)
    }
    const data = (await response.json()) as { token?: unknown }
    return typeof data.token === 'string' ? data.token : null
  } catch (error) {
    console.error('Unable to start verified run:', error)
    return null
  }
}

export default function VirusGameContainer({
  gameMode = 'classic',
  onDailyBlocked,
  onExitToModes,
}: {
  gameMode?: GameMode
  onDailyBlocked?: () => void
  onExitToModes?: () => void
}) {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const sceneConfigRef = useRef<GameSceneConfig | null>(null)
  const reticleRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const [engineReady, setEngineReady] = useState(false)
  const [bootProgress, setBootProgress] = useState(12)
  const [fpsValue, setFpsValue] = useState<number | null>(null)
  const onDailyBlockedRef = useRef(onDailyBlocked)
  const onExitToModesRef = useRef(onExitToModes)

  useEffect(() => {
    onDailyBlockedRef.current = onDailyBlocked
    onExitToModesRef.current = onExitToModes
  }, [onDailyBlocked, onExitToModes])

  const [hud, setHud] = useState<GameHUDData>({
    hp: 100,
    maxHp: 100,
    xp: 0,
    nextLevelXp: 100,
    level: 1,
    score: 0,
    kills: 0,
    survivalTime: 0,
    dashCooldownPct: 1,
    specialCooldownPct: 1,
    bossActive: false,
    bossHpPct: 1,
    bossName: 'THE ANCIENT CELL',
  })

  const isMuted = settings.masterMuted
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const [levelUpOptions, setLevelUpOptions] = useState<MutationDefinition[] | null>(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [activeMutations, setActiveMutations] = useState<MutationDefinition[]>([])
  const [runToken, setRunToken] = useState<string | null>(null)
  const [bioWarHud, setBioWarHud] = useState<BioWarHUDData>({
    myMass: 25,
    myKills: 0,
    myRank: 1,
    totalPlayers: 16,
    boostPct: 1,
    leaderboard: [],
    killFeed: [],
    radar: [],
    isDead: false,
    roundTimeRemaining: 600,
    roundNumber: 1,
  })
  const bioWarHudRef = useRef(bioWarHud)
  useEffect(() => {
    bioWarHudRef.current = bioWarHud
  }, [bioWarHud])
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])
  const [gameOverMetrics, setGameOverMetrics] = useState<{
    score: number
    level: number
    kills: number
    survivalTime: number
    mutationsCount: number
    damageDealt: number
    damageTaken: number
    criticalHits: number
    bossDefeated: boolean
    combosCount: number
    wave?: number
    isVictory?: boolean
    wavesCleared?: number
  } | null>(null)

  const [waveData, setWaveData] = useState({ currentWave: 1, totalWaves: 10, enemiesRemaining: 0, waveActive: false })
  const [banishedIds, setBanishedIds] = useState<string[]>([])
  const banishedIdsRef = useRef<string[]>([])
  const activeMutationsRef = useRef<MutationDefinition[]>([])
  const runTokenRef = useRef<string | null>(null)
  const levelUpOptionsRef = useRef<MutationDefinition[] | null>(null)
  const gameOverMetricsRef = useRef<typeof gameOverMetrics>(null)

  useEffect(() => {
    levelUpOptionsRef.current = levelUpOptions
    gameOverMetricsRef.current = gameOverMetrics
  }, [levelUpOptions, gameOverMetrics])
  const lastHudUpdateRef = useRef<number>(0)
  const lastHudDataRef = useRef<GameHUDData | null>(null)
  const dailyChallenge = useMemo(
    () => (gameMode === 'daily' ? getDailyChallenge() : undefined),
    [gameMode]
  )
  const activeCombos = getActiveCombos(activeMutations)
  const [showControlsHint, setShowControlsHint] = useState(() => settings.autoShowControls)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [dismissOrientationPrompt, setDismissOrientationPrompt] = useState(false)

  // Strictly detect touch-capable devices (works on all phones, tablets, iPad Pro, Samsung Tab, etc.)
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return
      const ua = navigator.userAgent || ''
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      const isIPad = (navigator.platform === 'MacIntel' || navigator.platform === 'iPad') && navigator.maxTouchPoints > 1
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches

      const isMobile = isMobileUA || isIPad || (hasTouchScreen && isCoarsePointer)
      setIsTouchDevice(isMobile)

      const portrait = isMobile && window.innerHeight > window.innerWidth
      setIsPortrait(portrait)

      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight)
      }
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    type OrientationWithLock = ScreenOrientation & { lock?: (orientation: string) => Promise<void> }
    const orientationObj = window.screen?.orientation as OrientationWithLock | undefined
    if (orientationObj && 'addEventListener' in orientationObj) {
      orientationObj.addEventListener('change', checkOrientation)
    }

    // Attempt to lock landscape orientation on mobile devices
    try {
      if (orientationObj && typeof orientationObj.lock === 'function') {
        void orientationObj.lock('landscape').catch(() => {})
      }
    } catch {}

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
      if (orientationObj && 'removeEventListener' in orientationObj) {
        orientationObj.removeEventListener('change', checkOrientation)
      }
    }
  }, [])

  const handleRotateOrFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {}
    try {
      type OrientationWithLock = ScreenOrientation & { lock?: (orientation: string) => Promise<void> }
      const orientationObj = window.screen?.orientation as OrientationWithLock | undefined
      if (orientationObj && typeof orientationObj.lock === 'function') {
        await orientationObj.lock('landscape')
      }
    } catch {}
  }

  const applyScenePauseState = useCallback(
    (paused: boolean) => {
      const activeScene = sceneRef.current
      if (!activeScene) return
      if (gameMode === 'biowar') {
        const bioScene = activeScene as BioWarScene
        if (typeof bioScene.setUiPaused === 'function') {
          bioScene.setUiPaused(paused)
        }
      } else if (activeScene.scene) {
        if (paused && activeScene.scene.isActive()) {
          activeScene.scene.pause()
        } else if (!paused && activeScene.scene.isPaused()) {
          activeScene.scene.resume()
        }
      }
    },
    [gameMode]
  )

  const handlePause = useCallback(() => {
    setIsPaused(true)
    applyScenePauseState(true)
  }, [applyScenePauseState])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    applyScenePauseState(false)
  }, [applyScenePauseState])

  const cleanupAndLeave = useCallback(
    async (dest: 'modes' | 'hub') => {
      soundManager.stopAmbient()
      try {
        if (gameMode === 'biowar') {
          const bioScene = sceneRef.current as BioWarScene | null
          bioScene?.saveAndEndCurrentRun?.()
        }
      } catch {
        /* ignore save errors on teardown */
      }

      if (gameRef.current) {
        const g = gameRef.current
        gameRef.current = null
        try {
          g.loop?.sleep?.()
          g.destroy(true)
        } catch {
          /* ignore destroy errors */
        }
      }
      sceneRef.current = null
      sceneConfigRef.current = null

      if (dest === 'hub') {
        router.push('/')
        return
      }
      if (onExitToModesRef.current) {
        onExitToModesRef.current()
      } else {
        router.push('/game')
      }
    },
    [gameMode, router]
  )

  // Live ambient drone lifecycle & optional FPS counter
  useEffect(() => {
    if (engineReady) {
      soundManager.startAmbient()
    }
    return () => {
      soundManager.stopAmbient()
    }
  }, [engineReady])

  useEffect(() => {
    if (!engineReady || !settings.showFpsHud) return
    const interval = window.setInterval(() => {
      if (gameRef.current?.loop) {
        setFpsValue(Math.round(gameRef.current.loop.actualFps))
      }
    }, 450)
    return () => window.clearInterval(interval)
  }, [engineReady, settings.showFpsHud])

  // 5-second auto-fade for controls hint, with 'H' toggle + ESC/P Pause toggle across ALL modes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControlsHint(false)
    }, 5000)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowControlsHint((prev) => !prev)
      } else if (
        (e.key === 'Escape' || e.key === 'p' || e.key === 'P') &&
        !levelUpOptionsRef.current &&
        !gameOverMetricsRef.current &&
        !(gameMode === 'biowar' && bioWarHudRef.current?.isDead)
      ) {
        e.preventDefault()
        setIsPaused((prev) => {
          const next = !prev
          applyScenePauseState(next)
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameMode, applyScenePauseState])

  // 0ms Direct GPU Combat Crosshair inside active arena (desktop fine pointer)
  const showCombatReticle =
    engineReady &&
    !isTouchDevice &&
    !isPaused &&
    !levelUpOptions &&
    !gameOverMetrics &&
    !(gameMode === 'biowar' && bioWarHud.isDead)

  useEffect(() => {
    const shell = shellRef.current
    if (!showCombatReticle) {
      if (shell) shell.style.cursor = 'crosshair'
      return
    }
    const reticle = reticleRef.current
    if (!reticle) return

    let lastTarget: EventTarget | null = null
    let hoveringUI = false

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (e.target !== lastTarget) {
        lastTarget = e.target
        const el = e.target as HTMLElement | null
        hoveringUI = Boolean(el?.closest('button, a, input, select, [role="button"], [data-ui-interactive="true"]'))
        if (shell) shell.style.cursor = hoveringUI ? '' : 'none'
        reticle.style.opacity = hoveringUI ? '0' : '1'
      }
      reticle.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      reticle.dataset.firing = 'true'
    }

    const onUp = () => {
      reticle.dataset.firing = 'false'
    }

    const onLeave = () => {
      reticle.style.opacity = '0'
      if (shell) shell.style.cursor = 'crosshair'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      if (shell) shell.style.cursor = 'crosshair'
    }
  }, [showCombatReticle])

  useEffect(() => {
    banishedIdsRef.current = banishedIds
  }, [banishedIds])

  const handleReroll = () => {
    setLevelUpOptions(getRandomMutationOptions(3, activeMutationsRef.current, banishedIdsRef.current))
  }

  const handleBanish = (mId: string) => {
    setBanishedIds((prev) => {
      const next = prev.includes(mId) ? prev : [...prev, mId]
      banishedIdsRef.current = next
      return next
    })
  }

  // Initialize the Phaser 4 game dynamically inside the client
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    setEngineReady(false)
    setBootProgress(10)
    setActiveMutations([])
    activeMutationsRef.current = []

    let cancelled = false
    let game: Phaser.Game | null = null
    let watchdogTimer = 0
    let pctTimer = 0

    const arenaPalette = getArenaThemePalette(gameMode)
    const arenaBgCss = '#' + arenaPalette.floorHex.toString(16).padStart(6, '0')

    const markReady = () => {
      if (cancelled) return
      setBootProgress(100)
      setEngineReady(true)
    }

    const initializeGame = async () => {
      let currentPct = 14
      pctTimer = window.setInterval(() => {
        currentPct = Math.min(82, currentPct + 8)
        if (!cancelled) setBootProgress(currentPct)
      }, 90)

      const fetchWithTimeout = async <T,>(promise: Promise<T>, fallback: T, ms = 4500): Promise<T> => {
        let tid = 0
        try {
          return await Promise.race([
            promise,
            new Promise<T>((resolve) => {
              tid = window.setTimeout(() => resolve(fallback), ms)
            }),
          ])
        } finally {
          window.clearTimeout(tid)
        }
      }

      const [token, authData] = await Promise.all([
        fetchWithTimeout(
          requestRunToken(gameMode, dailyChallenge?.date, onDailyBlockedRef.current),
          null
        ),
        fetchWithTimeout(
          fetch('/api/auth/me')
            .then((res) => res.json())
            .catch(() => null) as Promise<{ player?: { username?: string } } | null>,
          null
        ),
      ])

      window.clearInterval(pctTimer)
      if (cancelled || !containerRef.current) return
      if (!token && gameMode === 'daily') return

      setBootProgress(88)

      const resolvedPlayerName = authData?.player?.username || 'SIZ'
      runTokenRef.current = token
      setRunToken(token)

      const initialSkin = getSelectedSkinId()

      const sceneConfig: GameSceneConfig = {
        onReady: () => {
          markReady()
        },
        onLevelUp: (lvl: number) => {
          setCurrentLevel(lvl)
          setLevelUpOptions(getRandomMutationOptions(3, activeMutationsRef.current, banishedIdsRef.current))
        },
        onGameOver: (metrics: Parameters<MainSceneConfig['onGameOver']>[0]) => {
          setGameOverMetrics({
            ...metrics,
            combosCount: getActiveCombos(activeMutationsRef.current).length,
          })
        },
        onHUDUpdate: (data: GameHUDData) => {
          const now = Date.now()
          if (!lastHudUpdateRef.current) lastHudUpdateRef.current = now
          const prevHp = lastHudDataRef.current?.hp ?? data.maxHp
          const hpChangedSignificant = Math.abs(data.hp - prevHp) > (data.maxHp * 0.05)
          const combatStateChanged =
            data.isCharging !== lastHudDataRef.current?.isCharging ||
            data.fireMode !== lastHudDataRef.current?.fireMode ||
            data.shieldActive !== lastHudDataRef.current?.shieldActive ||
            Boolean(data.isCharging && Math.abs((data.chargeLevel || 0) - (lastHudDataRef.current?.chargeLevel || 0)) > 0.05)
          if (now - lastHudUpdateRef.current > 100 || hpChangedSignificant || combatStateChanged || data.hp === 0) {
            setHud(data)
            lastHudUpdateRef.current = now
            lastHudDataRef.current = data
          }
        },
        ...(gameMode === 'survival'
          ? {
              onWaveUpdate: (data: Parameters<SurvivalSceneConfig['onWaveUpdate']>[0]) => {
                setWaveData(data)
              },
              onVictory: (metrics: Parameters<SurvivalSceneConfig['onVictory']>[0]) => {
                setGameOverMetrics({
                  ...metrics,
                  isVictory: true,
                  combosCount: getActiveCombos(activeMutationsRef.current).length,
                })
              },
            }
          : {}),
        ...(dailyChallenge ? { challenge: dailyChallenge } : {}),
        ...(gameMode === 'biowar'
          ? {
              playerName: resolvedPlayerName,
              onBioWarUpdate: (data: BioWarHUDData) => {
                setBioWarHud(data)
              },
              onGameOver: async (metrics: {
                score: number
                level: number
                kills: number
                survivalTime: number
                mutationsCount: number
                damageDealt: number
                damageTaken: number
                criticalHits: number
                bossDefeated: boolean
              }) => {
                if (runTokenRef.current) {
                  try {
                    const res = await fetch('/api/game/score', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...metrics,
                        gameMode: 'biowar',
                        token: runTokenRef.current,
                      }),
                    })
                    const json = await res.json()
                    const nextCoins = json.coinBalance ?? json.totalCoins
                    if (typeof nextCoins === 'number') {
                      syncCoinBalance(nextCoins)
                    }
                    const nextToken = await requestRunToken('biowar')
                    setRunToken(nextToken)
                    runTokenRef.current = nextToken
                  } catch (e) {
                    console.error('BioWar score save error:', e)
                  }
                }
              },
            }
          : {}),
        initialSkin,
      } as GameSceneConfig

      sceneConfigRef.current = sceneConfig

      let sceneKey = 'MainScene'
      let sceneInstance: Phaser.Scene = new MainScene()
      if (gameMode === 'survival') {
        sceneKey = 'SurvivalScene'
        sceneInstance = new SurvivalScene()
      } else if (gameMode === 'biowar') {
        sceneKey = 'BioWarScene'
        sceneInstance = new BioWarScene()
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        render: {
          pixelArt: false,
          antialias: true,
          roundPixels: false,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        backgroundColor: arenaBgCss,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        callbacks: {
          postBoot: (bootedGame: Phaser.Game) => {
            if (cancelled) return
            try {
              setBootProgress(96)
              const added = bootedGame.scene.add(sceneKey, sceneInstance, true, { config: sceneConfig })
              if (added) {
                sceneRef.current = added as GameScene
              }
            } catch (err) {
              console.error('Failed to boot arena scene:', err)
              markReady()
            }
          },
        },
        scene: [],
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      // Failsafe: never leave loader stuck forever if Phaser already created scene or canvas
      watchdogTimer = window.setTimeout(() => {
        if (!cancelled) markReady()
      }, 3000)
    }

    void initializeGame()

    return () => {
      cancelled = true
      window.clearInterval(pctTimer)
      window.clearTimeout(watchdogTimer)
      if (game && gameRef.current === game) {
        try {
          game.loop?.sleep?.()
          game.destroy(true)
        } catch {
          /* ignore destroy errors */
        }
      }
      gameRef.current = null
      sceneRef.current = null
      sceneConfigRef.current = null
      runTokenRef.current = null
      setRunToken(null)
    }
  }, [dailyChallenge, gameMode])

  const handleSelectMutation = (mutation: MutationDefinition) => {
    setLevelUpOptions(null)
    setActiveMutations((prev) => {
      const next = [...prev, mutation]
      activeMutationsRef.current = next
      return next
    })
    if (sceneRef.current && 'applyChosenMutation' in sceneRef.current) {
      (sceneRef.current as MainScene | SurvivalScene).applyChosenMutation(mutation)
    }
  }

  const handleRestartGame = () => {
    setGameOverMetrics(null)
    setLevelUpOptions(null)
    setIsPaused(false)
    if (gameMode === 'biowar') {
      const bioScene = sceneRef.current as BioWarScene | null
      bioScene?.restartArenaMatch?.()
      return
    }
    setBanishedIds([])
    banishedIdsRef.current = []
    setActiveMutations([])
    activeMutationsRef.current = []
    setWaveData({ currentWave: 1, totalWaves: 10, enemiesRemaining: 0, waveActive: false })
    setHud({
      hp: 100,
      maxHp: 100,
      xp: 0,
      nextLevelXp: 100,
      level: 1,
      score: 0,
      kills: 0,
      survivalTime: 0,
      dashCooldownPct: 1,
      specialCooldownPct: 1,
      bossActive: false,
      bossHpPct: 1,
      bossName: 'THE ANCIENT CELL',
    })
    if (gameRef.current && sceneRef.current) {
      const sceneKey = getSceneKey(gameMode)
      const scene = gameRef.current.scene.getScene(sceneKey) as GameScene | undefined
      if (!scene) return
      sceneRef.current = scene
      void requestRunToken(gameMode, dailyChallenge?.date, onDailyBlocked).then((token) => {
        if (!gameRef.current || !sceneRef.current) return
        runTokenRef.current = token
        setRunToken(token)
        scene.scene.restart(sceneConfigRef.current ? { config: sceneConfigRef.current } : undefined)
      })
    }
  }

  const handleToggleSound = () => {
    const nextMuted = !isMuted
    soundManager.setMuted(nextMuted)
    updateSettings({ masterMuted: nextMuted })
    if (!nextMuted) soundManager.playClick()
  }

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 h-full w-full select-none overflow-hidden bg-ink cursor-crosshair game-container"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/* Unified 1-100% CELLIX Logo Loader while engine & arena initialize */}
      {!engineReady && (
        <CellixLoader
          variant="fullscreen"
          label={gameMode === 'biowar' ? 'BIO-WAR 30 YUKLANMOQDA...' : 'ARENA YUKLANMOQDA...'}
          sublabel="3D ASSETS // PHASER ENGINE"
          progress={bootProgress}
        />
      )}

      {/* 0ms Precision Tactical Combat Crosshair */}
      {showCombatReticle && (
        <div
          ref={reticleRef}
          data-firing="false"
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[80] -ml-4 -mt-4 h-8 w-8 opacity-0"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 36 36" width={32} height={32} className="overflow-visible">
            <circle
              cx="18"
              cy="18"
              r={hud.isCharging ? 10 + (hud.chargeLevel ?? 0) * 6 : 11}
              fill="none"
              stroke={hud.isCharging ? '#ffc83a' : '#d4ff3a'}
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />
            <line x1="18" y1="2" x2="18" y2="9" stroke="#d4ff3a" strokeWidth="1.8" />
            <line x1="18" y1="27" x2="18" y2="34" stroke="#d4ff3a" strokeWidth="1.8" />
            <line x1="2" y1="18" x2="9" y2="18" stroke="#d4ff3a" strokeWidth="1.8" />
            <line x1="27" y1="18" x2="34" y2="18" stroke="#d4ff3a" strokeWidth="1.8" />
            <circle cx="18" cy="18" r="2.2" fill="#ff4d2e" />
          </svg>
        </div>
      )}

      {/* Phaser Canvas Mount Node */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Mobile Landscape Orientation Prompt Overlay */}
      {isPortrait && !dismissOrientationPrompt && (
        <div className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-ink/95 p-6 text-center">
          <div className="relative mb-6">
            <div className="v-chamfer flex h-36 w-20 flex-col items-center justify-between border border-acid/70 bg-ink-2 p-2.5">
              <div className="h-1 w-8 bg-acid/60" />
              <div className="flex flex-col items-center gap-1.5">
                <RotateCcw className="h-9 w-9 text-acid" />
                <span className="font-mono text-[10px] font-bold tracking-wider text-acid">90° BURISH</span>
              </div>
              <div className="h-3.5 w-3.5 border border-acid/60" />
            </div>
          </div>

          <div className="v-tag v-accent-acid mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GORIZONTAL REJIM TALAB QILINADI</span>
          </div>

          <h2 className="v-display mb-2 text-3xl text-bone">
            EKRANNI YOTIQ HOLATGA BURING
          </h2>

          <p className="mb-6 max-w-sm font-sans text-xs leading-relaxed text-mute sm:text-sm">
            CELLIX barcha o‘yin rejimlari (<strong className="text-acid">Klassik</strong>, <strong className="text-ember">Survival</strong>, <strong className="text-gold">Kunlik</strong> va <strong className="text-tide">Bio-War</strong>) smartfoningiz yotiq (landscape) holatida maksimal ko‘rish maydoni va 2 qo‘lli qulay boshqaruv uchun maxsus moslangan!
          </p>

          <button
            type="button"
            onClick={handleRotateOrFullscreen}
            className="v-btn"
          >
            <RotateCcw className="h-4 w-4" />
            <span>TO‘LIQ EKRAN &amp; GORIZONTAL REJIM</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissOrientationPrompt(true)}
            className="mt-4 cursor-pointer font-mono text-[11px] text-mute underline underline-offset-4 hover:text-bone"
          >
            Baribir vertikal o‘ynash (tavsiya etilmaydi)
          </button>
        </div>
      )}

      {gameMode === 'biowar' ? (
        <BioWarHUD
          hud={bioWarHud}
          onRespawn={() => {
            const bioScene = sceneRef.current as BioWarScene | null
            bioScene?.respawnPlayer?.()
          }}
          onOpenPause={handlePause}
          onExit={() => {
            void cleanupAndLeave('modes')
          }}
          onReturnToHub={() => {
            void cleanupAndLeave('hub')
          }}
          fps={fpsValue}
          showFps={settings.showFpsHud}
          onSteerAngle={(angle) => {
            const bioScene = sceneRef.current as BioWarScene | null
            bioScene?.setMobileSteer?.(angle)
          }}
          onBoostChange={(b) => {
            const bioScene = sceneRef.current as BioWarScene | null
            bioScene?.setMobileBoosting?.(b)
          }}
          onShootChange={(s) => {
            const bioScene = sceneRef.current as BioWarScene | null
            bioScene?.setMobileShooting?.(s)
          }}
          isUz={true}
        />
      ) : (
        <>
          {/* CELLIX 2.0 In-Game HUD Overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between" style={{ padding: 'max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))' }}>
        {/* Top HUD Row */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Top Left: HP Bar & Level */}
          <div className="v-panel v-accent-ember pointer-events-auto min-w-[140px] space-y-1.5 !bg-ink/85 p-2.5 sm:min-w-[260px] sm:space-y-2 sm:p-4">
            <div className="flex items-center justify-between font-mono text-xs text-bone">
              <span className="flex items-center gap-1.5 font-bold text-ember">
                <Heart className="h-4 w-4 fill-ember text-ember" />
                HP {hud.hp} / {hud.maxHp}
              </span>
              <span className="v-tag v-accent-acid !py-0.5 !text-[10px]">
                LV.{hud.level}
              </span>
            </div>

            {/* HP Progress Bar */}
            <div className="h-2 w-full overflow-hidden border border-line bg-ink">
              <div
                className="h-full bg-ember transition-all duration-200"
                style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
              />
            </div>

            {/* XP Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden border border-line bg-ink">
              <div
                className="h-full bg-acid transition-all duration-200"
                style={{ width: `${Math.min(100, (hud.xp / hud.nextLevelXp) * 100)}%` }}
              />
            </div>
          </div>

          {(hud.dailyChallenge || dailyChallenge) && (
            <div
              className="v-panel v-accent-gold absolute left-4 top-20 !bg-ink/85 px-3 py-2 font-mono text-xs text-gold sm:static"
              title={`Seed: ${(hud.dailyChallenge || dailyChallenge)?.seed}`}
            >
              <span className="v-label block !text-[9px] !text-gold">Daily Protocol</span>
              <span>{(hud.dailyChallenge || dailyChallenge)?.modifier.badge} {(hud.dailyChallenge || dailyChallenge)?.modifier.name}</span>
              <span className="block text-[9px] text-mute">{(hud.dailyChallenge || dailyChallenge)?.date}</span>
            </div>
          )}

          {/* Top Center: Boss Warning Header */}
          {hud.bossActive ? (
            <div className="v-panel v-accent-ember pointer-events-auto min-w-[240px] !bg-ink/90 p-3 text-center sm:min-w-[320px]">
              <span className="block font-mono text-[10px] font-extrabold uppercase tracking-widest text-ember">
                ANCIENT CELL BOSS DETECTED
              </span>
              <div className="mt-1.5 h-2 w-full overflow-hidden border border-ember/50 bg-ink">
                <div
                  className="h-full bg-ember transition-all duration-200"
                  style={{ width: `${Math.max(0, (hud.bossHpPct ?? 1) * 100)}%` }}
                />
              </div>
            </div>
          ) : (gameMode === 'survival' && waveData.waveActive) ? (
            <div className="v-panel v-accent-tide pointer-events-auto min-w-[240px] !bg-ink/85 p-3 text-center sm:min-w-[320px]">
              <span className="block font-mono text-[10px] font-extrabold uppercase tracking-widest text-tide">
                WAVE {waveData.currentWave} / {waveData.totalWaves}
              </span>
              <div className="mt-1 font-mono text-xs text-bone">
                Enemies Remaining: <strong className="text-tide">{waveData.enemiesRemaining}</strong>
              </div>
            </div>
          ) : null}

          {/* Top Right: FPS + Score & Sound Mute Toggle */}
          <div className="pointer-events-auto flex items-center gap-2">
            {settings.showFpsHud && typeof fpsValue === 'number' && (
              <div className="v-chamfer-sm border border-acid/40 bg-ink/85 px-2.5 py-2 font-mono text-[11px] font-bold text-acid tabular-nums">
                {fpsValue} FPS
              </div>
            )}

            <div className="v-panel v-accent-acid !bg-ink/85 px-4 py-2.5 text-right">
              <span className="v-label block !text-acid">SCORE</span>
              <span className="v-display text-2xl text-bone sm:text-3xl tabular-nums">
                {hud.score.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleToggleSound}
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
              className="v-chamfer-sm cursor-pointer border border-line bg-ink/85 p-3 text-bone transition-colors hover:border-acid hover:text-acid"
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-ember" /> : <Volume2 className="h-5 w-5 text-acid" />}
            </button>

            <button
              onClick={handlePause}
              aria-label="Pause game"
              className="v-chamfer-sm cursor-pointer border border-line bg-ink/85 p-3 text-bone transition-colors hover:border-acid hover:text-acid"
              title="Pause Game"
            >
              <Pause className="h-5 w-5 text-acid" />
            </button>
          </div>
        </div>

        {/* Bottom Desktop Ability & Combat HUD (Fades out after 20s) */}
        <div className={`pointer-events-auto flex select-none flex-col items-center justify-center gap-2 ${isTouchDevice ? 'hidden' : 'hidden sm:flex'}`}>
          <div
            className={`flex flex-col items-center justify-center gap-2 transition-all duration-1000 ease-in-out ${
              showControlsHint ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
            }`}
          >
            {/* Top Row: Fire Modes & Mouse / Arrow shooting info */}
            <div className="flex items-center gap-2">
              <div className="v-chamfer-sm flex items-center gap-2 border border-acid/40 bg-ink/85 px-3 py-1.5 font-mono text-xs">
                <span className="text-[10px] font-bold tracking-wider text-acid">[F / SCROLL]</span>
                <span className="text-dim">|</span>
                <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-bone">
                  <Crosshair className="h-3.5 w-3.5 text-acid" />
                  REJIM: <span className="text-acid underline underline-offset-2">{hud.fireMode || 'AUTO'}</span>
                </span>
              </div>

              <div className={`v-chamfer-sm flex items-center gap-2 border px-3 py-1.5 font-mono text-xs transition-colors ${
                hud.isCharging
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-line bg-ink/85 text-mute'
              }`}>
                <span className="text-[10px] font-bold text-gold">[LMB]</span>
                {hud.isCharging ? (
                  <span className="flex items-center gap-1.5 font-bold text-gold">
                    ⚡ ZARYAD: {Math.round((hud.chargeLevel || 0) * 100)}%
                  </span>
                ) : (
                  <span>OTISH <span className="text-[10px] text-dim">(BOSIB TURING: ZARYAD)</span></span>
                )}
              </div>

              <div className="v-chamfer-sm flex items-center gap-2 border border-ember/40 bg-ink/85 px-3 py-1.5 font-mono text-xs text-mute">
                <span className="text-[10px] font-bold text-ember">[RMB]</span>
                <span>KUCHLI O&apos;Q <span className="text-[10px] text-ember/80">(3X ZARAR)</span></span>
              </div>

              <div className="v-chamfer-sm flex items-center gap-1.5 border border-line bg-ink/85 px-3 py-1.5 font-mono text-xs text-mute">
                <span className="text-[10px] font-bold text-tide">[↑↓←→]</span>
                <span>YO&apos;NALISH BO&apos;YICHA OTISH</span>
              </div>
            </div>

            {/* Bottom Row: Abilities & Cooldowns */}
            <div className="flex items-center gap-2">
              <div className="v-chamfer-sm flex items-center gap-1.5 border border-line bg-ink/85 px-3 py-1.5 font-mono text-xs text-mute">
                <span className="text-[10px] font-bold text-acid">[WASD]</span>
                <span>YURISH</span>
              </div>

              <div className={`v-chamfer-sm flex items-center gap-1.5 border bg-ink/85 px-3 py-1.5 font-mono text-xs ${
                (hud.dashCooldownPct ?? 1) >= 1 ? 'border-acid/50 text-bone' : 'border-line text-dim'
              }`}>
                <Zap className={`h-3.5 w-3.5 ${(hud.dashCooldownPct ?? 1) >= 1 ? 'text-acid' : 'text-dim'}`} />
                <span className="text-[10px] font-bold text-acid">[SPACE]</span>
                <span>DASH</span>
                {(hud.dashCooldownPct ?? 1) < 1 && (
                  <span className="text-[10px] text-dim">({Math.round((hud.dashCooldownPct ?? 1) * 100)}%)</span>
                )}
              </div>

              <div className={`v-chamfer-sm flex items-center gap-1.5 border bg-ink/85 px-3 py-1.5 font-mono text-xs ${
                (hud.specialCooldownPct ?? 1) >= 1 ? 'border-tide/50 text-bone' : 'border-line text-dim'
              }`}>
                <Biohazard className={`h-3.5 w-3.5 ${(hud.specialCooldownPct ?? 1) >= 1 ? 'text-tide' : 'text-dim'}`} />
                <span className="text-[10px] font-bold text-tide">[E]</span>
                <span>IMPULS</span>
                {(hud.specialCooldownPct ?? 1) < 1 && (
                  <span className="text-[10px] text-dim">({Math.round((hud.specialCooldownPct ?? 1) * 100)}%)</span>
                )}
              </div>

              <div className={`v-chamfer-sm flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs ${
                hud.shieldActive
                  ? 'border-tide bg-tide/20 text-tide'
                  : (hud.shieldCdPct ?? 1) >= 1
                    ? 'border-tide/45 bg-ink/85 text-bone'
                    : 'border-line bg-ink/85 text-dim'
              }`}>
                <Shield className={`h-3.5 w-3.5 ${(hud.shieldActive || (hud.shieldCdPct ?? 1) >= 1) ? 'text-tide' : 'text-dim'}`} />
                <span className="text-[10px] font-bold text-tide">[Q]</span>
                <span>{hud.shieldActive ? 'QALQON (FAOL)' : 'QALQON'}</span>
                {!hud.shieldActive && (hud.shieldCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-dim">({Math.round((hud.shieldCdPct ?? 1) * 100)}%)</span>
                )}
              </div>

              <div className={`v-chamfer-sm flex items-center gap-1.5 border bg-ink/85 px-3 py-1.5 font-mono text-xs ${
                (hud.grenadeCdPct ?? 1) >= 1 ? 'border-ember/50 text-bone' : 'border-line text-dim'
              }`}>
                <Bomb className={`h-3.5 w-3.5 ${(hud.grenadeCdPct ?? 1) >= 1 ? 'text-ember' : 'text-dim'}`} />
                <span className="text-[10px] font-bold text-ember">[R]</span>
                <span>GRANATA</span>
                {(hud.grenadeCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-dim">({Math.round((hud.grenadeCdPct ?? 1) * 100)}%)</span>
                )}
              </div>

              <div className={`v-chamfer-sm flex items-center gap-1.5 border bg-ink/85 px-3 py-1.5 font-mono text-xs ${
                (hud.parryCdPct ?? 1) >= 1 ? 'border-gold/50 text-bone' : 'border-line text-dim'
              }`}>
                <Sparkles className={`h-3.5 w-3.5 ${(hud.parryCdPct ?? 1) >= 1 ? 'text-gold' : 'text-dim'}`} />
                <span className="text-[10px] font-bold text-gold">[SHIFT]</span>
                <span>BLOK / PARRY</span>
                {(hud.parryCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-dim">({Math.round((hud.parryCdPct ?? 1) * 100)}%)</span>
                )}
              </div>
            </div>
          </div>

          {!showControlsHint && (
            <button
              type="button"
              onClick={() => setShowControlsHint(true)}
              className="v-chamfer-sm pointer-events-auto cursor-pointer border border-line bg-ink/85 px-3 py-1 font-mono text-[10px] text-mute transition-colors hover:border-acid hover:text-acid"
              title="Boshqaruv tugmalarini ko'rsatish (H)"
            >
              <span>BOSHQARUV TUGMALARI [H]</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Virtual Touch Controls */}
      <MobileControls
        onMove={(vec) => {
          const s = sceneRef.current as MainScene | SurvivalScene | null
          if (s) s.mobileMoveVector = vec
        }}
        onAttack={(target) => {
          const s = sceneRef.current as MainScene | SurvivalScene | null
          if (s) s.mobileAttackTarget = target
        }}
        onDash={() => {
          const s = sceneRef.current as MainScene | SurvivalScene | null
          if (s) s.triggerDash(s.time.now)
        }}
        onSpecial={(dir) => {
          const s = sceneRef.current as MainScene | SurvivalScene | null
          if (s) s.triggerSpecialPulse(s.time.now, dir?.x, dir?.y)
        }}
        dashCdPct={hud.dashCooldownPct ?? 1}
        specCdPct={hud.specialCooldownPct ?? 1}
        forceShow={isTouchDevice}
      />

      {/* Level-Up Mutation Selection Card Overlay */}
      {levelUpOptions && (
        <MutationOverlay
          level={currentLevel}
          options={levelUpOptions}
          onSelectMutation={handleSelectMutation}
          onReroll={handleReroll}
          onBanish={handleBanish}
          activeCombos={activeCombos}
        />
      )}

      {/* Game Over Modal */}
      {gameOverMetrics && (
        <GameOverModal
          score={gameOverMetrics.score}
          level={gameOverMetrics.level}
          kills={gameOverMetrics.kills}
           survivalTime={gameOverMetrics.survivalTime}
           mutationsCount={gameOverMetrics.mutationsCount}
           damageDealt={gameOverMetrics.damageDealt}
           damageTaken={gameOverMetrics.damageTaken}
           criticalHits={gameOverMetrics.criticalHits}
           bossDefeated={gameOverMetrics.bossDefeated}
           combosCount={gameOverMetrics.combosCount}
           gameMode={gameMode as 'classic' | 'survival' | 'daily'}
           wave={gameOverMetrics.wave}
           isVictory={gameOverMetrics.isVictory}
          wavesCleared={gameOverMetrics.wavesCleared}
          runToken={runToken}
          onRestart={handleRestartGame}
          onExitToModes={() => {
            void cleanupAndLeave('modes')
          }}
          onReturnToHub={() => {
            void cleanupAndLeave('hub')
          }}
        />
      )}
        </>
      )}

      {/* Pause Overlay (Universal across Classic, Survival, Daily & Bio-War 30) */}
      {isPaused && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRestartGame}
          onExitToModes={() => {
            void cleanupAndLeave('modes')
          }}
          onReturnToHub={() => {
            void cleanupAndLeave('hub')
          }}
          score={gameMode === 'biowar' ? bioWarHud.myMass : hud.score}
          level={gameMode === 'biowar' ? bioWarHud.myRank : hud.level}
          kills={gameMode === 'biowar' ? bioWarHud.myKills : hud.kills}
          survivalTime={
            gameMode === 'biowar'
              ? Math.max(0, 180 - Math.round(bioWarHud.roundTimeRemaining))
              : hud.survivalTime
          }
          gameMode={gameMode}
          isMuted={isMuted}
          onToggleSound={handleToggleSound}
        />
      )}
    </div>
  )
}
