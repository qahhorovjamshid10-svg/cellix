// CELLIX 2.0 — Persistent Client Settings & Audio/Theme/Control Preferences

export type ThemeMode = 'dark' | 'light'
export type MovementControlMode = 'hybrid' | 'mouse_follow' | 'keyboard'
export type GraphicsQuality = 'high' | 'balanced' | 'performance'
export type FireModeDefault = 'manual' | 'auto'

export interface CellixSettings {
  theme: ThemeMode
  masterMuted: boolean
  sfxVolume: number // 0..1
  uiVolume: number // 0..1
  ambientVolume: number // 0..1
  movementMode: MovementControlMode
  defaultFireMode: FireModeDefault
  aimSensitivity: number // 0.6..1.6
  cameraShake: boolean
  damageNumbers: boolean
  graphicsQuality: GraphicsQuality
  showFpsHud: boolean
  customCursor: boolean
  autoShowControls: boolean
}

export const SETTINGS_STORAGE_KEY = 'cellix_settings_v2'
export const SETTINGS_CHANGE_EVENT = 'cellix-settings-change'

export const DEFAULT_SETTINGS: CellixSettings = {
  theme: 'dark',
  masterMuted: false,
  sfxVolume: 0.85,
  uiVolume: 0.7,
  ambientVolume: 0.35,
  movementMode: 'hybrid',
  defaultFireMode: 'manual',
  aimSensitivity: 1.0,
  cameraShake: true,
  damageNumbers: true,
  graphicsQuality: 'high',
  showFpsHud: false,
  customCursor: true,
  autoShowControls: true,
}

let cachedSettings: CellixSettings = DEFAULT_SETTINGS
let initialized = false

function clampUnit(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(1, n))
}

function clampSensitivity(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.max(0.6, Math.min(1.6, Math.round(n * 20) / 20))
}

function normalizeSettings(raw: Partial<CellixSettings> | null | undefined): CellixSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  return {
    theme: raw.theme === 'light' ? 'light' : 'dark',
    masterMuted: typeof raw.masterMuted === 'boolean' ? raw.masterMuted : DEFAULT_SETTINGS.masterMuted,
    sfxVolume: clampUnit(raw.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    uiVolume: clampUnit(raw.uiVolume, DEFAULT_SETTINGS.uiVolume),
    ambientVolume: clampUnit(raw.ambientVolume, DEFAULT_SETTINGS.ambientVolume),
    movementMode:
      raw.movementMode === 'mouse_follow' || raw.movementMode === 'keyboard'
        ? raw.movementMode
        : 'hybrid',
    defaultFireMode: raw.defaultFireMode === 'auto' ? 'auto' : 'manual',
    aimSensitivity: clampSensitivity(raw.aimSensitivity, DEFAULT_SETTINGS.aimSensitivity),
    cameraShake: typeof raw.cameraShake === 'boolean' ? raw.cameraShake : DEFAULT_SETTINGS.cameraShake,
    damageNumbers:
      typeof raw.damageNumbers === 'boolean' ? raw.damageNumbers : DEFAULT_SETTINGS.damageNumbers,
    graphicsQuality:
      raw.graphicsQuality === 'balanced' || raw.graphicsQuality === 'performance'
        ? raw.graphicsQuality
        : 'high',
    showFpsHud: typeof raw.showFpsHud === 'boolean' ? raw.showFpsHud : DEFAULT_SETTINGS.showFpsHud,
    customCursor: typeof raw.customCursor === 'boolean' ? raw.customCursor : DEFAULT_SETTINGS.customCursor,
    autoShowControls:
      typeof raw.autoShowControls === 'boolean'
        ? raw.autoShowControls
        : DEFAULT_SETTINGS.autoShowControls,
  }
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function getGameSettings(): CellixSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  if (!initialized) {
    initialized = true
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (raw) {
        cachedSettings = normalizeSettings(JSON.parse(raw) as Partial<CellixSettings>)
      }
    } catch {
      cachedSettings = DEFAULT_SETTINGS
    }
    applyThemeToDocument(cachedSettings.theme)
  }
  return cachedSettings
}

export function updateGameSettings(patch: Partial<CellixSettings>): CellixSettings {
  const prev = getGameSettings()
  const next = normalizeSettings({ ...prev, ...patch })
  cachedSettings = next
  initialized = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota errors */
    }
    applyThemeToDocument(next.theme)
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT))
  }
  return next
}

export function resetGameSettings(): CellixSettings {
  return updateGameSettings(DEFAULT_SETTINGS)
}

export function reloadSettingsFromStorage(): CellixSettings {
  initialized = false
  return getGameSettings()
}

export function subscribeSettings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SETTINGS_STORAGE_KEY) {
      reloadSettingsFromStorage()
      callback()
    }
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(SETTINGS_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SETTINGS_CHANGE_EVENT, callback)
  }
}

export function getParticleCapForQuality(quality: GraphicsQuality): number {
  if (quality === 'performance') return 28
  if (quality === 'balanced') return 65
  return 140
}
