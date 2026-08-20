'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import MainScene, { GameHUDData, MainSceneConfig } from '@/lib/game/engine/MainScene'
import SurvivalScene, { SurvivalSceneConfig } from '@/lib/game/engine/SurvivalScene'
import { PracticeScene, PracticeSceneConfig } from '@/lib/game/engine/PracticeScene'
import { MultiplayerScene, MultiplayerSceneConfig } from '@/lib/game/engine/MultiplayerScene'
import { getSelectedSkinId } from '@/lib/game/cosmetics'
import MutationOverlay from './MutationOverlay'
import GameOverModal from './GameOverModal'
import PauseOverlay from './PauseOverlay'
import MobileControls from './MobileControls'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { MutationDefinition, getRandomMutationOptions } from '@/lib/game/mutations'
import { getActiveCombos } from '@/lib/game/combos'
import { getDailyChallenge } from '@/lib/game/daily'
import { Volume2, VolumeX, Heart, Zap, Biohazard, Pause } from 'lucide-react'

type GameScene = MainScene | SurvivalScene | PracticeScene | MultiplayerScene
type GameSceneConfig = MainSceneConfig | SurvivalSceneConfig | PracticeSceneConfig | MultiplayerSceneConfig
type GameMode = 'classic' | 'survival' | 'daily' | 'practice' | 'multiplayer'

function getSceneKey(gameMode: GameMode) {
  switch (gameMode) {
    case 'survival':
      return 'SurvivalScene'
    case 'practice':
      return 'PracticeScene'
    case 'multiplayer':
      return 'MultiplayerScene'
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
    if (!response.ok) throw new Error(`Run start failed (${response.status})`)
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
        } else if (gameMode === 'practice') {
          sceneKey = 'PracticeScene'
          sceneInstance = new PracticeScene()
        } else if (gameMode === 'multiplayer') {
          sceneKey = 'MultiplayerScene'
          sceneInstance = new MultiplayerScene()
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
            if (now - lastHudUpdateRef.current > 250 || hpChangedSignificant || data.hp === 0) {
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
          initialSkin,
          ...(gameMode === 'multiplayer' ? { initialSkinP1: initialSkin } : {}),
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
    if (sceneRef.current) {
      sceneRef.current.applyChosenMutation(mutation)
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none cursor-crosshair">
      {/* Phaser Canvas Mount Node */}
      <div ref={containerRef} className="w-full h-full" />

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

        {/* Bottom Desktop Ability Cooldown Indicators */}
        <div className="hidden sm:flex items-center justify-center gap-4 pointer-events-auto">
          <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
            <span>WASD: MOVE</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
            <span>ARROWS: SHOOT</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
            <Zap className={`h-4 w-4 ${(hud.dashCooldownPct ?? 1) >= 1 ? 'text-purple-400' : 'text-slate-600'}`} />
            <span>SPACE: DASH</span>
            {(hud.dashCooldownPct ?? 1) < 1 && (
              <span className="text-[10px] text-slate-500">({Math.round((hud.dashCooldownPct ?? 1) * 100)}%)</span>
            )}
          </div>

          <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
            <Biohazard className={`h-4 w-4 ${(hud.specialCooldownPct ?? 1) >= 1 ? 'text-violet-400' : 'text-slate-600'}`} />
            <span>E: RADIAL PULSE</span>
            {(hud.specialCooldownPct ?? 1) < 1 && (
              <span className="text-[10px] text-slate-500">({Math.round((hud.specialCooldownPct ?? 1) * 100)}%)</span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Virtual Touch Controls */}
      <MobileControls
        onMove={(vec) => {
          if (sceneRef.current) sceneRef.current.mobileMoveVector = vec
        }}
        onAttack={(target) => {
          if (sceneRef.current) sceneRef.current.mobileAttackTarget = target
        }}
        onDash={() => {
          if (sceneRef.current) sceneRef.current.triggerDash(sceneRef.current.time.now)
        }}
        onSpecial={() => {
          if (sceneRef.current) sceneRef.current.triggerSpecialPulse(sceneRef.current.time.now)
        }}
        dashCdPct={hud.dashCooldownPct ?? 1}
        specCdPct={hud.specialCooldownPct ?? 1}
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
           gameMode={gameMode}
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
          gameMode={gameMode}
          isMuted={isMuted}
          onToggleSound={handleToggleSound}
        />
      )}
    </div>
  )
}
