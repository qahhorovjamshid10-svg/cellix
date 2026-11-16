import type { Metadata, Viewport } from 'next'
import { Anton, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageContext'
import { SettingsProvider } from '@/components/SettingsContext'
import CustomCursor from '@/components/v26/CustomCursor'
import InitialSplashLoader from '@/components/v26/InitialSplashLoader'

const display = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0A0C0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'CELLIX 2.0 — Evolve • Mutate • Dominate',
  description: 'CELLIX 2.0 - Action Roguelite & Bio-War Arena. Evolve, mutate and dominate in a living micro-arena.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
}

const THEME_PRE_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('cellix_settings_v2');var t=raw&&JSON.parse(raw).theme==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_PRE_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SettingsProvider>
          <LanguageProvider>
            <InitialSplashLoader />
            <CustomCursor />
            {children}
          </LanguageProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
