import { CellixSettings, getGameSettings, updateGameSettings } from '../settings'

/**
 * Web Audio API Synthesizer for CELLIX 2.0 game SFX, UI feedback & reactor ambient audio.
 * Requires zero external audio files and honors live mixer volumes & mute settings.
 */
export class SoundManager {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private sfxVolume: number = 0.85
  private uiVolume: number = 0.7
  private ambientVolume: number = 0.35
  private ambientNodes: {
    osc1: OscillatorNode
    osc2: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
  } | null = null
  private ambientWanted: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncWithSettings(getGameSettings())
    }
  }

  public syncWithSettings(settings: CellixSettings) {
    this.isMuted = settings.masterMuted
    this.sfxVolume = settings.sfxVolume
    this.uiVolume = settings.uiVolume
    this.ambientVolume = settings.ambientVolume
    this.updateAmbientGain()
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = audioWindow.AudioContext || audioWindow.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {})
    }
    if (this.ambientWanted && !this.ambientNodes && this.ctx && !this.isMuted && this.ambientVolume > 0) {
      this.createAmbientGraph()
    }
  }

  private createAmbientGraph() {
    if (!this.ctx || this.ambientNodes) return
    const now = this.ctx.currentTime
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(55, now)

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(82.41, now)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(190, now)

    const targetGain = this.isMuted ? 0 : Math.max(0.0001, this.ambientVolume * 0.045)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.6)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    osc1.start(now)
    osc2.start(now)

    this.ambientNodes = { osc1, osc2, gain, filter }
  }

  private updateAmbientGain() {
    if (!this.ctx || !this.ambientNodes) return
    const now = this.ctx.currentTime
    const target = !this.ambientWanted || this.isMuted ? 0.0001 : Math.max(0.0001, this.ambientVolume * 0.045)
    try {
      this.ambientNodes.gain.gain.setTargetAtTime(target, now, 0.12)
    } catch {
      /* ignore teardown race */
    }
  }

  public startAmbient() {
    this.ambientWanted = true
    if (typeof window === 'undefined') return
    if (this.ctx && !this.ambientNodes && !this.isMuted && this.ambientVolume > 0) {
      this.createAmbientGraph()
    }
    this.updateAmbientGain()
  }

  public stopAmbient() {
    this.ambientWanted = false
    if (!this.ambientNodes) return
    try {
      this.ambientNodes.osc1.stop()
      this.ambientNodes.osc2.stop()
      this.ambientNodes.osc1.disconnect()
      this.ambientNodes.osc2.disconnect()
      this.ambientNodes.filter.disconnect()
      this.ambientNodes.gain.disconnect()
    } catch {
      /* ignore already stopped nodes */
    }
    this.ambientNodes = null
  }

  private scaleSfx(baseGain: number): number {
    return Math.max(0.0001, baseGain * this.sfxVolume)
  }

  private scaleUi(baseGain: number): number {
    return Math.max(0.0001, baseGain * this.uiVolume)
  }

  public toggleMute(): boolean {
    const next = !this.isMuted
    this.setMuted(next)
    return next
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
    if (typeof window !== 'undefined') {
      updateGameSettings({ masterMuted: muted })
    }
    this.updateAmbientGain()
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  // Play Laser/Shoot Sound
  public playShoot() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.1)

    gain.gain.setValueAtTime(this.scaleSfx(0.15), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.1)
  }

  // Play Enemy Hit Impact
  public playHit() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08)

    gain.gain.setValueAtTime(this.scaleSfx(0.2), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  }

  // Play XP / Resource Pickup Chime
  public playPickup() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12)

    gain.gain.setValueAtTime(this.scaleSfx(0.12), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }

  // Play Level-Up Fanfare Chime
  public playLevelUp() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const now = this.ctx.currentTime + idx * 0.08
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(this.scaleSfx(0.15), now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.18)
    })
  }

  // Play Boss Warning / Roar
  public playBossSpawn() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(90, now)
    osc.frequency.linearRampToValueAtTime(180, now + 0.3)
    osc.frequency.linearRampToValueAtTime(60, now + 0.7)

    gain.gain.setValueAtTime(this.scaleSfx(0.3), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.7)
  }

  // Play Explosion / Death Sound
  public playExplosion() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, now)
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.4)

    gain.gain.setValueAtTime(this.scaleSfx(0.3), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.4)
  }

  // Play Dash Whoosh Sound
  public playDash() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.15)

    gain.gain.setValueAtTime(this.scaleSfx(0.2), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  // Play UI Hover Click Sound
  public playHover() {
    if (this.isMuted || this.uiVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05)

    gain.gain.setValueAtTime(this.scaleUi(0.04), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  // Play Tactile UI Button Click Sound
  public playClick() {
    if (this.isMuted || this.uiVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.06)

    gain.gain.setValueAtTime(this.scaleUi(0.08), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  // Play Powerup / Top-up Chime
  public playPowerup() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const freqs = [659.25, 880, 1174.66]
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return
      const now = this.ctx.currentTime + idx * 0.06
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(this.scaleSfx(0.12), now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.12)
    })
  }

  // Play Kill / Combo Fanfare
  public playCombo() {
    if (this.isMuted || this.sfxVolume <= 0) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const now = this.ctx.currentTime + idx * 0.05
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(this.scaleSfx(0.14), now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.12)
    })
  }
}

export const soundManager = new SoundManager()
