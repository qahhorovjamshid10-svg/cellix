'use client'

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'
import {
  CellixSettings,
  DEFAULT_SETTINGS,
  applyThemeToDocument,
  getGameSettings,
  resetGameSettings,
  subscribeSettings,
  updateGameSettings,
} from '@/lib/game/settings'
import { soundManager } from '@/lib/game/engine/SoundManager'

interface SettingsContextValue {
  settings: CellixSettings
  updateSettings: (patch: Partial<CellixSettings>) => void
  toggleTheme: () => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  toggleTheme: () => {},
  resetSettings: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getGameSettings,
    () => DEFAULT_SETTINGS
  )

  useEffect(() => {
    applyThemeToDocument(settings.theme)
    soundManager.syncWithSettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<CellixSettings>) => {
    const next = updateGameSettings(patch)
    soundManager.syncWithSettings(next)
  }, [])

  const toggleTheme = useCallback(() => {
    const current = getGameSettings()
    const nextTheme = current.theme === 'dark' ? 'light' : 'dark'
    const next = updateGameSettings({ theme: nextTheme })
    soundManager.syncWithSettings(next)
    soundManager.playClick()
  }, [])

  const resetSettings = useCallback(() => {
    const next = resetGameSettings()
    soundManager.syncWithSettings(next)
    soundManager.playPowerup()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleTheme, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
