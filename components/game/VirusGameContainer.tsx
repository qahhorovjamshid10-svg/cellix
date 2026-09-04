'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import MainScene, { GameHUDData, MainSceneConfig } from '@/lib/game/engine/MainScene'
import SurvivalScene, { SurvivalSceneConfig } from '@/lib/game/engine/SurvivalScene'
import BioWarScene, { BioWarHUDData, BioWarSceneConfig } from '@/lib/game/engine/BioWarScene'
import BioWarHUD from './BioWarHUD'
import { getSelectedSkinId, syncCoinBalance } from '@/lib/game/cosmetics'
import MutationOverlay from './MutationOverlay'
import GameOverModal from './GameOverModal'
import PauseOverlay from './PauseOverlay'
import MobileControls from './MobileControls'
import { soundManager } from '@/lib/game/engine/SoundManager'
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

async function requestRunToken(gameMode: GameMode, challengeDate?: string): Promise<string | null> {
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
          alert(errData.error || "Kunlik sinov faqat 1 kunda bir marta o'ynaladi!")
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

export default function VirusGameContainer({ gameMode = 'classic' }: { gameMode?: GameMode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const sceneConfigRef = useRef<GameSceneConfig | null>(null)

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

  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
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
  const lastHudUpdateRef = useRef<number>(0)
  const lastHudDataRef = useRef<GameHUDData | null>(null)
  const dailyChallenge = useMemo(
    () => (gameMode === 'daily' ? getDailyChallenge() : undefined),
    [gameMode]
  )
  const activeCombos = getActiveCombos(activeMutations)
  const [showControlsHint, setShowControlsHint] = useState(true)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [dismissOrientationPrompt, setDismissOrientationPrompt] = useState(false)
  const [playerName, setPlayerName] = useState<string>('SIZ')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.player?.username) {
          setPlayerName(data.player.username)
        }
      })
      .catch(() => {})
  }, [])

  // Strictly detect mobile devices (never show joysticks or orientation prompt on PC!)
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return
      const ua = navigator.userAgent || ''
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
      const isTouchOnly =
        window.matchMedia('(pointer: coarse)').matches &&
        !window.matchMedia('(pointer: fine)').matches &&
        window.innerWidth <= 1024

      const isMobile = isMobileUA || isIPad || isTouchOnly
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
    const orientationObj = (window.screen as any)?.orientation
    if (orientationObj && 'addEventListener' in orientationObj) {
      orientationObj.addEventListener('change', checkOrientation)
    }

    // Attempt to lock landscape orientation on mobile devices
    try {
      if (orientationObj && 'lock' in orientationObj) {
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
      const orientationObj = (window.screen as any)?.orientation
      if (orientationObj && 'lock' in orientationObj) {
        await orientationObj.lock('landscape')
      }
    } catch {}
  }

  // 5-second auto-fade for controls hint, with 'H' toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControlsHint(false)
    }, 5000)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowControlsHint((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

  const handlePause = () => {
    setIsPaused(true)
    if (sceneRef.current) sceneRef.current.scene.pause()
  }

  const handleResume = () => {
    setIsPaused(false)
    if (sceneRef.current) sceneRef.current.scene.resume()
  }

  // Initialize the Phaser 4 game dynamically inside the client
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    setActiveMutations([])
    activeMutationsRef.current = []

    let cancelled = false
    let game: Phaser.Game | null = null

    const initializeGame = async () => {
      const token = await requestRunToken(gameMode, dailyChallenge?.date)
      if (cancelled || !containerRef.current) return

      runTokenRef.current = token
      setRunToken(token)

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        backgroundColor: '#060913',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [],
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      game.events.once('ready', () => {
        if (!game || cancelled) return
        let sceneKey = 'MainScene'
        let sceneInstance: Phaser.Scene = new MainScene()
        if (gameMode === 'survival') {
          sceneKey = 'SurvivalScene'
          sceneInstance = new SurvivalScene()
        } else if (gameMode === 'biowar') {
          sceneKey = 'BioWarScene'
          sceneInstance = new BioWarScene()
        }

        game.scene.add(sceneKey, sceneInstance, false)
        const scene = game.scene.getScene(sceneKey) as GameScene | undefined
        if (!scene) return
        sceneRef.current = scene

        const initialSkin = getSelectedSkinId()

        const sceneConfig: GameSceneConfig = {
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
                playerName,
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
                      if (json.totalCoins !== undefined) {
                        syncCoinBalance(json.totalCoins)
                      }
                      // Fetch next fresh runToken for respawn
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

        scene.scene.start(sceneKey, { config: sceneConfig })
      })
    }

    void initializeGame()

    return () => {
      cancelled = true
      game?.destroy(true)
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
    setActiveMutations([])
    activeMutationsRef.current = []
    if (gameRef.current && sceneRef.current) {
      const sceneKey = getSceneKey(gameMode)
      const scene = gameRef.current.scene.getScene(sceneKey) as GameScene | undefined
      if (!scene) return
      sceneRef.current = scene
      void requestRunToken(gameMode, dailyChallenge?.date).then((token) => {
        if (!gameRef.current || !sceneRef.current) return
        runTokenRef.current = token
        setRunToken(token)
        scene.scene.restart(sceneConfigRef.current ? { config: sceneConfigRef.current } : undefined)
      })
    }
  }

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute()
    setIsMuted(muted)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none cursor-crosshair" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      {/* Phaser Canvas Mount Node */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Cyberpunk Mobile Landscape Orientation Prompt Overlay */}
      {isPortrait && !dismissOrientationPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
          <div className="relative mb-6">
            {/* Animated 90-degree rotating phone */}
            <div className="w-20 h-36 border-4 border-cyan-400/80 rounded-2xl flex flex-col items-center justify-between p-2.5 shadow-[0_0_35px_rgba(6,182,212,0.4)] animate-pulse">
              <div className="w-8 h-1 bg-cyan-400/60 rounded-full" />
              <div className="flex flex-col items-center gap-1.5">
                <RotateCcw className="h-9 w-9 text-cyan-400 animate-spin" style={{ animationDuration: '3.5s' }} />
                <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wider">90° BURISH</span>
              </div>
              <div className="w-3.5 h-3.5 border-2 border-cyan-400/60 rounded-full" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 text-[11px] font-mono font-bold tracking-widest uppercase mb-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>GORIZONTAL REJIM TALAB QILINADI</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-wide text-white uppercase mb-2">
            📲 EKRANNI YOTIQ HOLATGA BURING
          </h2>

          <p className="text-xs sm:text-sm font-mono text-slate-300 max-w-sm leading-relaxed mb-6">
            CELLIX barcha o‘yin rejimlari (<strong className="text-cyan-400">Klassik</strong>, <strong className="text-purple-400">Survival</strong>, <strong className="text-amber-400">Kunlik</strong> va <strong className="text-rose-400">Bio-War</strong>) smartfoningiz yotiq (landscape) holatida maksimal ko‘rish maydoni va 2 qo‘lli qulay boshqaruv uchun maxsus moslangan!
          </p>

          <button
            type="button"
            onClick={handleRotateOrFullscreen}
            className="btn-cyber-primary px-6 py-3.5 rounded-xl font-mono text-xs sm:text-sm font-bold text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>TO‘LIQ EKRAN & GORIZONTAL REJIM</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissOrientationPrompt(true)}
            className="mt-4 text-[11px] font-mono text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer"
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
          onExit={async () => {
            const bioScene = sceneRef.current as BioWarScene | null
            if (bioScene?.saveAndEndCurrentRun) {
              await bioScene.saveAndEndCurrentRun()
            }
            window.location.href = '/game'
          }}
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
          {/* Cyberpunk HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none z-20 p-4 sm:p-6 flex flex-col justify-between">
        {/* Top HUD Row */}
        <div className="flex items-start justify-between gap-4">
          {/* Top Left: HP Bar & Level */}
          <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-purple-500/30 bg-purple-950/80 space-y-2 pointer-events-auto min-w-[200px] sm:min-w-[260px]">
            <div className="flex items-center justify-between font-mono text-xs text-white">
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500 animate-pulse" />
                HP {hud.hp} / {hud.maxHp}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-500/40 text-[10px] font-bold">
                LEVEL {hud.level}
              </span>
            </div>

            {/* HP Progress Bar */}
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
              />
            </div>

            {/* XP Progress Bar */}
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-violet-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (hud.xp / hud.nextLevelXp) * 100)}%` }}
              />
            </div>
          </div>

          {(hud.dailyChallenge || dailyChallenge) && (
            <div
              className="glass-panel absolute left-4 top-20 px-3 py-2 rounded-2xl border border-amber-500/40 bg-amber-950/70 text-amber-200 font-mono text-xs sm:static"
              title={`Seed: ${(hud.dailyChallenge || dailyChallenge)?.seed}`}
            >
              <span className="block text-[9px] uppercase tracking-widest text-amber-400">Daily Protocol</span>
              <span>{(hud.dailyChallenge || dailyChallenge)?.modifier.badge} {(hud.dailyChallenge || dailyChallenge)?.modifier.name}</span>
              <span className="block text-[9px] text-amber-400/80">{(hud.dailyChallenge || dailyChallenge)?.date}</span>
            </div>
          )}

          {/* Top Center: Boss Warning Header */}
          {hud.bossActive ? (
            <div className="glass-panel p-3 rounded-2xl border-2 border-rose-500/60 bg-rose-950/70 text-center pointer-events-auto animate-pulse min-w-[240px] sm:min-w-[320px]">
              <span className="text-[10px] font-mono text-rose-300 font-extrabold uppercase tracking-widest block">
                ⚠️ ANCIENT CELL BOSS DETECTED ⚠️
              </span>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-1.5 border border-rose-800">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(0, (hud.bossHpPct ?? 1) * 100)}%` }}
                />
              </div>
            </div>
          ) : (gameMode === 'survival' && waveData.waveActive) ? (
            <div className="glass-panel p-3 rounded-2xl border-2 border-blue-500/60 bg-blue-950/70 text-center pointer-events-auto min-w-[240px] sm:min-w-[320px]">
              <span className="text-[10px] font-mono text-blue-300 font-extrabold uppercase tracking-widest block">
                WAVE {waveData.currentWave} / {waveData.totalWaves}
              </span>
              <div className="text-white font-mono text-sm mt-1">
                Enemies Remaining: {waveData.enemiesRemaining}
              </div>
            </div>
          ) : null}

          {/* Top Right: Score & Sound Mute Toggle */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="glass-panel p-3 rounded-2xl border border-violet-500/30 bg-slate-950/80 font-mono text-right">
              <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">
                SCORE
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-white text-glow-purple">
                {hud.score}
              </span>
            </div>

            <button
              onClick={handleToggleSound}
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
              className="p-3 rounded-2xl glass-panel border border-slate-800 text-slate-300 hover:text-white hover:border-purple-400 transition-all cursor-pointer"
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5 text-purple-400" />}
            </button>

            <button
              onClick={handlePause}
              aria-label="Pause game"
              className="p-3 rounded-2xl glass-panel border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer"
              title="Pause Game"
            >
              <Pause className="h-5 w-5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Bottom Desktop Ability & Combat HUD (Fades out after 20s) */}
        <div className={`flex flex-col items-center justify-center gap-2 pointer-events-auto select-none ${isTouchDevice ? 'hidden' : 'hidden sm:flex'}`}>
          <div
            className={`flex flex-col items-center justify-center gap-2 transition-all duration-1000 ease-in-out ${
              showControlsHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {/* Top Row: Fire Modes & Mouse / Arrow shooting info */}
            <div className="flex items-center gap-2">
              {/* Fire Mode Switcher Indicator */}
              <div className="glass-panel px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-slate-950/85 font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="text-[10px] text-cyan-400 font-bold tracking-wider">[F / SCROLL]</span>
                <span className="text-slate-600">|</span>
                <span className="text-white font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                  REJIM: <span className="text-cyan-300 underline underline-offset-2">{hud.fireMode || 'AUTO'}</span>
                </span>
              </div>

              {/* LMB: Shoot & Charge Indicator */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 transition-all ${
                hud.isCharging
                  ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  : 'border-slate-800 bg-slate-950/80 text-slate-300'
              }`}>
                <span className="text-[10px] text-amber-400 font-bold">[LMB]</span>
                {hud.isCharging ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1.5 animate-pulse">
                    ⚡ ZARYAD: {Math.round((hud.chargeLevel || 0) * 100)}%
                  </span>
                ) : (
                  <span>OTISH <span className="text-[10px] text-slate-500">(BOSIB TURING: ZARYAD)</span></span>
                )}
              </div>

              {/* RMB: Heavy Shot */}
              <div className="glass-panel px-3 py-1.5 rounded-xl border border-rose-500/30 bg-slate-950/80 font-mono text-xs flex items-center gap-2 text-slate-300">
                <span className="text-[10px] text-rose-400 font-bold">[RMB]</span>
                <span>KUCHLI O'Q <span className="text-[10px] text-rose-400/80">(3X ZARAR)</span></span>
              </div>

              {/* Arrow Keys Shoot */}
              <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs flex items-center gap-1.5 text-slate-400">
                <span className="text-[10px] text-purple-400 font-bold">[↑↓←→]</span>
                <span>YO'NALISH BO'YICHA OTISH</span>
              </div>
            </div>

            {/* Bottom Row: Abilities & Cooldowns */}
            <div className="flex items-center gap-2.5">
              {/* WASD Move */}
              <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold text-[10px]">[WASD]</span>
                <span>YURISH</span>
              </div>

              {/* Space: Dash */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition-all ${
                (hud.dashCooldownPct ?? 1) >= 1 ? 'border-cyan-500/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]' : 'border-slate-800 text-slate-500'
              }`}>
                <Zap className={`h-3.5 w-3.5 ${(hud.dashCooldownPct ?? 1) >= 1 ? 'text-cyan-400' : 'text-slate-600'}`} />
                <span className="font-bold text-[10px] text-cyan-400">[SPACE]</span>
                <span>DASH</span>
                {(hud.dashCooldownPct ?? 1) < 1 && (
                  <span className="text-[10px] text-slate-500">({Math.round((hud.dashCooldownPct ?? 1) * 100)}%)</span>
                )}
              </div>

              {/* E: Radial Pulse */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition-all ${
                (hud.specialCooldownPct ?? 1) >= 1 ? 'border-violet-500/40 text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'
              }`}>
                <Biohazard className={`h-3.5 w-3.5 ${(hud.specialCooldownPct ?? 1) >= 1 ? 'text-violet-400' : 'text-slate-600'}`} />
                <span className="font-bold text-[10px] text-violet-400">[E]</span>
                <span>IMPULS</span>
                {(hud.specialCooldownPct ?? 1) < 1 && (
                  <span className="text-[10px] text-slate-500">({Math.round((hud.specialCooldownPct ?? 1) * 100)}%)</span>
                )}
              </div>

              {/* Q: Shield Bubble */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition-all ${
                hud.shieldActive
                  ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse'
                  : (hud.shieldCdPct ?? 1) >= 1
                    ? 'border-cyan-500/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 text-slate-500'
              }`}>
                <Shield className={`h-3.5 w-3.5 ${hud.shieldActive ? 'text-cyan-300' : (hud.shieldCdPct ?? 1) >= 1 ? 'text-cyan-400' : 'text-slate-600'}`} />
                <span className="font-bold text-[10px] text-cyan-400">[Q]</span>
                <span>{hud.shieldActive ? 'QALQON (FAOL)' : 'QALQON'}</span>
                {!hud.shieldActive && (hud.shieldCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-slate-500">({Math.round((hud.shieldCdPct ?? 1) * 100)}%)</span>
                )}
              </div>

              {/* R: Grenade */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition-all ${
                (hud.grenadeCdPct ?? 1) >= 1 ? 'border-orange-500/40 text-white shadow-[0_0_12px_rgba(249,115,22,0.2)]' : 'border-slate-800 text-slate-500'
              }`}>
                <Bomb className={`h-3.5 w-3.5 ${(hud.grenadeCdPct ?? 1) >= 1 ? 'text-orange-400' : 'text-slate-600'}`} />
                <span className="font-bold text-[10px] text-orange-400">[R]</span>
                <span>GRANATA</span>
                {(hud.grenadeCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-slate-500">({Math.round((hud.grenadeCdPct ?? 1) * 100)}%)</span>
                )}
              </div>

              {/* Shift: Parry */}
              <div className={`glass-panel px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition-all ${
                (hud.parryCdPct ?? 1) >= 1 ? 'border-amber-500/40 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]' : 'border-slate-800 text-slate-500'
              }`}>
                <Sparkles className={`h-3.5 w-3.5 ${(hud.parryCdPct ?? 1) >= 1 ? 'text-amber-400' : 'text-slate-600'}`} />
                <span className="font-bold text-[10px] text-amber-400">[SHIFT]</span>
                <span>BLOK / PARRY</span>
                {(hud.parryCdPct ?? 1) < 1 && (
                  <span className="text-[10px] text-slate-500">({Math.round((hud.parryCdPct ?? 1) * 100)}%)</span>
                )}
              </div>
            </div>
          </div>

          {/* Discreet Help Pill when controls are hidden */}
          {!showControlsHint && (
            <button
              type="button"
              onClick={() => setShowControlsHint(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-800/80 bg-slate-950/70 hover:bg-slate-900/90 text-[10px] font-mono text-slate-400 hover:text-cyan-400 transition-all pointer-events-auto shadow-sm"
              title="Boshqaruv tugmalarini ko'rsatish (H)"
            >
              <span>⌨️ BOSHQARUV TUGMALARI [H]</span>
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
        />
      )}
      {/* Pause Overlay */}
      {isPaused && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRestartGame}
          score={hud.score}
          level={hud.level}
          kills={hud.kills}
          survivalTime={hud.survivalTime}
          gameMode={gameMode as 'classic' | 'survival' | 'daily'}
          isMuted={isMuted}
          onToggleSound={handleToggleSound}
        />
      )}
        </>
      )}
    </div>
  )
}
