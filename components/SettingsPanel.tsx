'use client'

import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Gamepad2,
  Sliders,
  Monitor,
  RotateCcw,
  Sparkles,
  Crosshair,
  Activity,
  MousePointer,
  Languages,
  Play,
} from 'lucide-react'
import { useSettings } from '@/components/SettingsContext'
import { useLanguage } from '@/components/LanguageContext'
import { soundManager } from '@/lib/game/engine/SoundManager'
import type { FireModeDefault, GraphicsQuality, MovementControlMode } from '@/lib/game/settings'

interface SettingsPanelProps {
  compact?: boolean
}

export default function SettingsPanel({ compact = false }: SettingsPanelProps) {
  const { settings, updateSettings, toggleTheme, resetSettings } = useSettings()
  const { lang, setLang } = useLanguage()
  const isUz = lang === 'uz'

  const handleTestSfx = () => {
    soundManager.playPowerup()
  }

  const handleReset = () => {
    resetSettings()
  }

  const movementOptions: { id: MovementControlMode; labelUz: string; labelEn: string; descUz: string; descEn: string }[] = [
    {
      id: 'hybrid',
      labelUz: 'GIBRID (WASD + SENSOR)',
      labelEn: 'HYBRID (WASD + TOUCH)',
      descUz: 'Klaviatura harakati, sichqoncha bilan nishonga olish',
      descEn: 'WASD movement with mouse aiming & touch support',
    },
    {
      id: 'mouse_follow',
      labelUz: 'KURSOR ORTIDAN YURISH',
      labelEn: 'MOUSE FOLLOW',
      descUz: 'Personaj kursor tomonga yuradi (WASD ustuvor)',
      descEn: 'Cell follows your cursor automatically (WASD overrides)',
    },
    {
      id: 'keyboard',
      labelUz: 'FAQAT KLAVIATURA',
      labelEn: 'KEYBOARD STRICT',
      descUz: 'Bio-War va arenalarda faqat tugmalar ustuvorligi',
      descEn: 'Keyboard directional steering takes full priority',
    },
  ]

  const qualityOptions: { id: GraphicsQuality; labelUz: string; labelEn: string; badge: string }[] = [
    { id: 'high', labelUz: 'MAKSIMAL (3D + PARTICLE)', labelEn: 'HIGH QUALITY', badge: '140 FX' },
    { id: 'balanced', labelUz: 'MUVOZANATLI', labelEn: 'BALANCED', badge: '65 FX' },
    { id: 'performance', labelUz: 'YUQORI FPS REJIMI', labelEn: 'PERFORMANCE', badge: 'MAX FPS' },
  ]

  const keybinds = [
    { key: 'WASD', action: isUz ? 'Harakatlanish / Burilish' : 'Move / Steer' },
    { key: 'LMB / ←↑↓→', action: isUz ? 'Lazer otish / Nishon' : 'Shoot / Aim' },
    { key: 'RMB', action: isUz ? 'Zaryad zarba (Solo) / Nitro (Bio-War)' : 'Charge Shot / Boost' },
    { key: 'SPACE', action: isUz ? 'Dash (Solo) / Nitro (Bio-War)' : 'Dash / Nitro Boost' },
    { key: 'E / Q / R', action: isUz ? "To'lqin / Qalqon / Granata" : 'Impulse / Shield / Grenade' },
    { key: 'SHIFT / F', action: isUz ? "Parry / Otish rejimini o'zgartirish" : 'Parry / Fire Pattern' },
    { key: 'H / ESC', action: isUz ? 'Yordam / Pauza menyusi' : 'Controls Guide / Pause Menu' },
  ]

  if (compact) {
    return (
      <div className="space-y-3 text-left font-mono text-xs">
        {/* Compact Theme + Language */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="v-chamfer-sm flex items-center justify-between border border-line-strong bg-ink px-3 py-2 text-bone transition-colors hover:border-acid"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold">
              {settings.theme === 'dark' ? (
                <Moon className="h-3.5 w-3.5 text-acid" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-gold" />
              )}
              <span>{settings.theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
            </span>
            <span className="text-[9px] text-acid">SWITCH</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick()
              setLang(lang === 'uz' ? 'en' : 'uz')
            }}
            className="v-chamfer-sm flex items-center justify-between border border-line-strong bg-ink px-3 py-2 text-bone transition-colors hover:border-tide"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold">
              <Languages className="h-3.5 w-3.5 text-tide" />
              <span>{lang === 'uz' ? "O'ZBEKCHA" : 'ENGLISH'}</span>
            </span>
            <span className="text-[9px] text-tide">{lang.toUpperCase()}</span>
          </button>
        </div>

        {/* Compact Audio Sliders */}
        <div className="space-y-2 border border-line bg-ink p-3">
          <div className="flex items-center justify-between">
            <span className="v-label flex items-center gap-1.5">
              {settings.masterMuted ? <VolumeX className="h-3 w-3 text-ember" /> : <Volume2 className="h-3 w-3 text-acid" />}
              {isUz ? 'UMUMIY ZVUK' : 'MASTER AUDIO'}
            </span>
            <button
              type="button"
              onClick={() => updateSettings({ masterMuted: !settings.masterMuted })}
              className={`border px-2 py-0.5 text-[10px] font-bold ${
                settings.masterMuted ? 'border-ember/60 bg-ember/15 text-ember' : 'border-acid/60 bg-acid/15 text-acid'
              }`}
            >
              {settings.masterMuted ? 'MUTED' : 'ON'}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-mute">
              <span>{isUz ? 'JANG EFFEKTLARI (SFX)' : 'COMBAT SFX'}</span>
              <span className="text-bone">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) / 100 })}
              className="v-slider"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-mute">
              <span>{isUz ? 'SEZGIRLIK (SENSITIVITY)' : 'AIM SENSITIVITY'}</span>
              <span className="text-tide">{settings.aimSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={60}
              max={160}
              step={5}
              value={Math.round(settings.aimSensitivity * 100)}
              onChange={(e) => updateSettings({ aimSensitivity: Number(e.target.value) / 100 })}
              className="v-slider"
            />
          </div>
        </div>

        {/* Compact Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateSettings({ cameraShake: !settings.cameraShake })}
            className={`border px-2.5 py-2 text-left text-[10px] font-bold transition-colors ${
              settings.cameraShake ? 'border-acid/50 bg-acid/10 text-acid' : 'border-line bg-ink text-mute'
            }`}
          >
            {isUz ? 'TITRASH' : 'SHAKE'}: {settings.cameraShake ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ damageNumbers: !settings.damageNumbers })}
            className={`border px-2.5 py-2 text-left text-[10px] font-bold transition-colors ${
              settings.damageNumbers ? 'border-tide/50 bg-tide/10 text-tide' : 'border-line bg-ink text-mute'
            }`}
          >
            {isUz ? 'ZARAR SONI' : 'DAMAGE'}: {settings.damageNumbers ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ showFpsHud: !settings.showFpsHud })}
            className={`border px-2.5 py-2 text-left text-[10px] font-bold transition-colors ${
              settings.showFpsHud ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line bg-ink text-mute'
            }`}
          >
            FPS HUD: {settings.showFpsHud ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() =>
              updateSettings({
                defaultFireMode: settings.defaultFireMode === 'auto' ? 'manual' : 'auto',
              })
            }
            className={`border px-2.5 py-2 text-left text-[10px] font-bold transition-colors ${
              settings.defaultFireMode === 'auto' ? 'border-ember/50 bg-ember/10 text-ember' : 'border-line bg-ink text-mute'
            }`}
          >
            AUTO-FIRE: {settings.defaultFireMode === 'auto' ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PANEL 01: THEME & VISUALS */}
        <section className="v-panel v-accent-acid space-y-5 p-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <Sun className="h-5 w-5 text-acid" />
              <div>
                <span className="v-label block">01 // {isUz ? 'KO‘RINISH VA MAVZU' : 'APPEARANCE & DISPLAY'}</span>
                <h2 className="v-display text-2xl text-bone">{isUz ? 'MAVZU VA GRAFIKA' : 'THEME & GRAPHICS'}</h2>
              </div>
            </div>
            <span className="v-tag v-accent-acid">{settings.theme.toUpperCase()}</span>
          </div>

          {/* Dark / Light Mode Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ theme: 'dark' })
              }}
              className={`v-chamfer-sm flex flex-col items-start gap-2 border p-4 text-left transition-all ${
                settings.theme === 'dark'
                  ? 'border-acid bg-acid/12 ring-1 ring-acid/40'
                  : 'border-line bg-ink hover:border-line-strong'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Moon className="h-5 w-5 text-acid" />
                <span className="font-mono text-[10px] font-bold text-acid">
                  {settings.theme === 'dark' ? 'ACTIVE' : 'SELECT'}
                </span>
              </div>
              <div className="v-display text-xl text-bone">DARK MODE</div>
              <p className="font-mono text-[10px] text-mute">
                {isUz ? 'Tungi bioreaktor kontrast rejimi' : 'Deep biolumen void contrast'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ theme: 'light' })
              }}
              className={`v-chamfer-sm flex flex-col items-start gap-2 border p-4 text-left transition-all ${
                settings.theme === 'light'
                  ? 'border-acid bg-acid/12 ring-1 ring-acid/40'
                  : 'border-line bg-ink hover:border-line-strong'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Sun className="h-5 w-5 text-gold" />
                <span className="font-mono text-[10px] font-bold text-acid">
                  {settings.theme === 'light' ? 'ACTIVE' : 'SELECT'}
                </span>
              </div>
              <div className="v-display text-xl text-bone">LIGHT MODE</div>
              <p className="font-mono text-[10px] text-mute">
                {isUz ? 'Kunduzgi toza laboratoriya interfeysi' : 'Crisp daylight clinical lab theme'}
              </p>
            </button>
          </div>

          {/* Particle & Visual Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="v-label flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-tide" />
                {isUz ? 'GRAFIKA SIFATI & ZARRACHALAR' : 'GRAPHICS & PARTICLE BUDGET'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick()
                    updateSettings({ graphicsQuality: opt.id })
                  }}
                  className={`border p-2.5 text-left font-mono transition-colors ${
                    settings.graphicsQuality === opt.id
                      ? 'border-acid bg-acid/12 text-acid'
                      : 'border-line bg-ink text-mute hover:border-line-strong hover:text-bone'
                  }`}
                >
                  <div className="text-[10px] font-bold">{opt.badge}</div>
                  <div className="mt-1 text-[10px] leading-tight text-bone">
                    {isUz ? opt.labelUz : opt.labelEn}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visual & Telemetry Toggles */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ cameraShake: !settings.cameraShake })
              }}
              className="flex items-center justify-between border border-line bg-ink px-3.5 py-2.5 transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2 text-bone">
                <Sparkles className="h-3.5 w-3.5 text-acid" />
                <span>{isUz ? 'Ekran Titrashi (Shake)' : 'Camera Shake'}</span>
              </span>
              <span className={`font-bold ${settings.cameraShake ? 'text-acid' : 'text-dim'}`}>
                {settings.cameraShake ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ damageNumbers: !settings.damageNumbers })
              }}
              className="flex items-center justify-between border border-line bg-ink px-3.5 py-2.5 transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2 text-bone">
                <Crosshair className="h-3.5 w-3.5 text-ember" />
                <span>{isUz ? 'Zarar Raqamlari' : 'Damage Numbers'}</span>
              </span>
              <span className={`font-bold ${settings.damageNumbers ? 'text-acid' : 'text-dim'}`}>
                {settings.damageNumbers ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ showFpsHud: !settings.showFpsHud })
              }}
              className="flex items-center justify-between border border-line bg-ink px-3.5 py-2.5 transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2 text-bone">
                <Activity className="h-3.5 w-3.5 text-tide" />
                <span>{isUz ? 'FPS Telemetriya' : 'Show Live FPS HUD'}</span>
              </span>
              <span className={`font-bold ${settings.showFpsHud ? 'text-tide' : 'text-dim'}`}>
                {settings.showFpsHud ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ customCursor: !settings.customCursor })
              }}
              className="flex items-center justify-between border border-line bg-ink px-3.5 py-2.5 transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2 text-bone">
                <MousePointer className="h-3.5 w-3.5 text-gold" />
                <span>{isUz ? 'Taktik Kursor' : 'Tactical Reticle'}</span>
              </span>
              <span className={`font-bold ${settings.customCursor ? 'text-gold' : 'text-dim'}`}>
                {settings.customCursor ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </section>

        {/* PANEL 02: AUDIO MIXER */}
        <section className="v-panel v-accent-tide space-y-5 p-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              {settings.masterMuted ? (
                <VolumeX className="h-5 w-5 text-ember" />
              ) : (
                <Volume2 className="h-5 w-5 text-tide" />
              )}
              <div>
                <span className="v-label block">02 // {isUz ? 'ZVUK VA AUDIO MIKSHER' : 'AUDIO & SYNTH MIXER'}</span>
                <h2 className="v-display text-2xl text-bone">{isUz ? 'OVOZ NASTROYKASI' : 'SOUND CONTROLS'}</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateSettings({ masterMuted: !settings.masterMuted })}
              className={`v-chamfer-sm border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                settings.masterMuted
                  ? 'border-ember bg-ember/15 text-ember'
                  : 'border-tide bg-tide/15 text-tide'
              }`}
            >
              {settings.masterMuted ? (isUz ? 'OVOZSIZ (MUTED)' : 'MUTED') : isUz ? 'OVOZ YOQILGAN' : 'AUDIO ACTIVE'}
            </button>
          </div>

          <div className="space-y-5 font-mono">
            {/* Combat SFX Volume */}
            <div className="space-y-2 border border-line bg-ink p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-bone">
                  {isUz ? 'JANG VA LAZER EFFEKTLARI (SFX)' : 'COMBAT & WEAPON SFX'}
                </span>
                <span className="font-bold text-acid tabular-nums">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Combat SFX Volume"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) / 100 })}
                className="v-slider"
              />
              <p className="text-[10px] text-mute">
                {isUz ? 'Otish, zarba, dash, portlash va level-up ovozlari' : 'Lasers, hits, explosions, dash & fanfare'}
              </p>
            </div>

            {/* UI Feedback Volume */}
            <div className="space-y-2 border border-line bg-ink p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-bone">
                  {isUz ? 'INTERFEYS TUGMALARI (UI SFX)' : 'UI & BUTTON FEEDBACK'}
                </span>
                <span className="font-bold text-tide tabular-nums">
                  {Math.round(settings.uiVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="UI Volume"
                min={0}
                max={100}
                value={Math.round(settings.uiVolume * 100)}
                onChange={(e) => updateSettings({ uiVolume: Number(e.target.value) / 100 })}
                className="v-slider"
              />
              <p className="text-[10px] text-mute">
                {isUz ? 'Tugma bosish va menyu navigatsiya signallari' : 'Tactile button clicks & hover tones'}
              </p>
            </div>

            {/* Arena Ambient Synth */}
            <div className="space-y-2 border border-line bg-ink p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-bone">
                  {isUz ? 'ARENA FON MUSIQASI (AMBIENT SYNTH)' : 'ARENA REACTOR AMBIENT'}
                </span>
                <span className="font-bold text-gold tabular-nums">
                  {Math.round(settings.ambientVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Ambient Volume"
                min={0}
                max={100}
                value={Math.round(settings.ambientVolume * 100)}
                onChange={(e) => updateSettings({ ambientVolume: Number(e.target.value) / 100 })}
                className="v-slider"
              />
              <p className="text-[10px] text-mute">
                {isUz ? 'Arena ichida past chastotali atmosfera sintezi' : 'Low-frequency generative reactor hum in arena'}
              </p>
            </div>

            <button type="button" onClick={handleTestSfx} className="v-btn-ghost w-full !py-2.5 !text-sm">
              <Play className="h-4 w-4 text-acid" />
              <span>{isUz ? 'OVOZNI TEKSHIRISH (TEST SFX)' : 'PLAY TEST AUDIO CHIME'}</span>
            </button>
          </div>
        </section>

        {/* PANEL 03: CONTROLS & GAMEPLAY */}
        <section className="v-panel v-accent-ember space-y-5 p-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <Gamepad2 className="h-5 w-5 text-ember" />
              <div>
                <span className="v-label block">03 // {isUz ? 'KONTROL VA JANG' : 'CONTROLS & COMBAT'}</span>
                <h2 className="v-display text-2xl text-bone">{isUz ? 'BOSHQARUV REJIMI' : 'INPUT & AIMING'}</h2>
              </div>
            </div>
            <Sliders className="h-4 w-4 text-mute" />
          </div>

          {/* Movement Control Mode */}
          <div className="space-y-2">
            <span className="v-label block">{isUz ? 'HARAKAT BOSHQARUVI' : 'MOVEMENT CONTROL MODE'}</span>
            <div className="space-y-2">
              {movementOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick()
                    updateSettings({ movementMode: opt.id })
                  }}
                  className={`flex w-full items-center justify-between border p-3 text-left font-mono transition-colors ${
                    settings.movementMode === opt.id
                      ? 'border-ember bg-ember/12 text-bone'
                      : 'border-line bg-ink text-mute hover:border-line-strong'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-bone">{isUz ? opt.labelUz : opt.labelEn}</div>
                    <div className="mt-0.5 text-[10px] text-mute">{isUz ? opt.descUz : opt.descEn}</div>
                  </div>
                  <span className={`text-[10px] font-bold ${settings.movementMode === opt.id ? 'text-ember' : 'text-dim'}`}>
                    {settings.movementMode === opt.id ? '● ON' : 'SELECT'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Fire Mode & Auto Hint */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                const next: FireModeDefault = settings.defaultFireMode === 'auto' ? 'manual' : 'auto'
                updateSettings({ defaultFireMode: next })
              }}
              className="flex flex-col gap-1 border border-line bg-ink p-3 text-left transition-colors hover:border-line-strong"
            >
              <span className="v-label">{isUz ? 'AVTOMATIK OTISH' : 'AUTO-FIRE'}</span>
              <span className={`font-bold ${settings.defaultFireMode === 'auto' ? 'text-acid' : 'text-bone'}`}>
                {settings.defaultFireMode === 'auto'
                  ? isUz ? 'YOQILGAN (AUTO)' : 'ENABLED (AUTO)'
                  : isUz ? "QO'LDA (LMB)" : 'MANUAL (CLICK)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick()
                updateSettings({ autoShowControls: !settings.autoShowControls })
              }}
              className="flex flex-col gap-1 border border-line bg-ink p-3 text-left transition-colors hover:border-line-strong"
            >
              <span className="v-label">{isUz ? 'YORDAM PANELI [H]' : 'START KEY HINT'}</span>
              <span className={`font-bold ${settings.autoShowControls ? 'text-tide' : 'text-dim'}`}>
                {settings.autoShowControls ? (isUz ? 'KIRISHDA KO‘RSATISH' : 'SHOW ON START') : isUz ? 'YASHIRIN' : 'HIDDEN'}
              </span>
            </button>
          </div>

          {/* Aim / Turn Sensitivity */}
          <div className="space-y-2 border border-line bg-ink p-4 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-bone">
                {isUz ? 'BURILISH & NISHON SEZGIRLIGI' : 'STEERING & AIM SENSITIVITY'}
              </span>
              <span className="font-bold text-ember tabular-nums">{settings.aimSensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              aria-label="Aim Sensitivity"
              min={60}
              max={160}
              step={5}
              value={Math.round(settings.aimSensitivity * 100)}
              onChange={(e) => updateSettings({ aimSensitivity: Number(e.target.value) / 100 })}
              className="v-slider"
            />
          </div>
        </section>

        {/* PANEL 04: KEYBIND MATRIX + LANGUAGE + RESET */}
        <section className="v-panel v-accent-gold flex flex-col justify-between space-y-5 p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <Languages className="h-5 w-5 text-gold" />
                <div>
                  <span className="v-label block">04 // {isUz ? 'TUGMALAR XARITASI & TIL' : 'KEYBINDS & LANGUAGE'}</span>
                  <h2 className="v-display text-2xl text-bone">{isUz ? 'TIZIM VA QO‘LLANMA' : 'SYSTEM & KEYMAP'}</h2>
                </div>
              </div>
              <span className="v-tag v-accent-gold">CELLIX 2.0</span>
            </div>

            {/* Language Selector */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick()
                  setLang('uz')
                }}
                className={`border px-4 py-3 text-left font-bold transition-colors ${
                  lang === 'uz' ? 'border-acid bg-acid/12 text-acid' : 'border-line bg-ink text-mute hover:text-bone'
                }`}
              >
                🇺🇿 O&apos;ZBEKCHA (UZ)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick()
                  setLang('en')
                }}
                className={`border px-4 py-3 text-left font-bold transition-colors ${
                  lang === 'en' ? 'border-acid bg-acid/12 text-acid' : 'border-line bg-ink text-mute hover:text-bone'
                }`}
              >
                🇬🇧 ENGLISH (EN)
              </button>
            </div>

            {/* Keybind Table */}
            <div className="divide-y divide-line border border-line bg-ink font-mono text-xs">
              {keybinds.map((kb) => (
                <div key={kb.key} className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="border border-line-strong bg-ink-2 px-2 py-0.5 text-[11px] font-bold text-acid">
                    {kb.key}
                  </span>
                  <span className="text-right text-[11px] text-bone">{kb.action}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleReset} className="v-btn-ghost w-full !py-2.5 !text-sm">
            <RotateCcw className="h-4 w-4 text-ember" />
            <span>{isUz ? 'STANDART SOZLAMALARGA QAYTARISH' : 'RESET TO DEFAULTS'}</span>
          </button>
        </section>
      </div>
    </div>
  )
}
