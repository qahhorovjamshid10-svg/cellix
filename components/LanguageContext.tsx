'use client'

import React, { createContext, useContext, useSyncExternalStore } from 'react'
import { Language, translations } from '@/lib/i18n'

const LANGUAGE_CHANGE_EVENT = 'virus-language-change'

function getLanguageFromStorage(): Language {
  if (typeof window === 'undefined') return 'uz'
  const saved = window.localStorage.getItem('virus_lang')
  return saved === 'en' || saved === 'uz' ? saved : 'uz'
}

function subscribeToLanguage(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback)
  }
}

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: keyof typeof translations['uz']) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'uz',
  setLang: () => {},
  t: (key) => translations.uz[key] || key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang: Language = useSyncExternalStore(subscribeToLanguage, getLanguageFromStorage, () => 'uz' as Language)

  const setLang = (newLang: Language) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('virus_lang', newLang)
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT))
  }

  const t = (key: keyof typeof translations['uz']): string => {
    const dict = translations[lang] || translations.uz
    return dict[key] || translations.uz[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
