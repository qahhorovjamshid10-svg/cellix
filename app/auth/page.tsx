'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Crosshair } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { soundManager } from '@/lib/game/engine/SoundManager'
import { syncPlayerSession } from '@/lib/game/playerSession'
import ScrambleText from '@/components/v26/ScrambleText'
import CellixLoader from '@/components/v26/CellixLoader'

export default function AuthPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const isUz = lang === 'uz'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleHover = () => soundManager.playHover()
  const handleClick = () => soundManager.playClick()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    handleClick()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { username: form.username, email: form.email, password: form.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || (isUz ? 'Xatolik yuz berdi' : 'An error occurred'))
      }

      if (data.player) {
        syncPlayerSession(data.player)
      }
      soundManager.playLevelUp()
      if (data.player?.id) {
        router.push(`/profile/${data.player.id}`)
      } else {
        router.push('/profile/me')
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setError(message || (isUz ? 'Xatolik yuz berdi' : 'An error occurred'))
    } finally {
      setLoading(false)
    }
  }

  const translations = {
    uz: {
      login: 'KIRISH',
      register: "RO'YXATDAN O'TISH",
      loginField: 'Elektron pochta yoki Username',
      registerEmail: 'Elektron pochta',
      password: 'Parol',
      username: 'Foydalanuvchi nomi',
      loginBtn: 'TIZIMGA KIRISH',
      registerBtn: 'HISOB YARATISH',
      noAccount: "Hisobingiz yo'qmi?",
      haveAccount: 'Hisobingiz bormi?',
      welcome: 'COMMAND ACCESS',
      welcomeDesc: 'Kiber-profilingizga kiring yoki yangi jangchi hisobini oching',
    },
    en: {
      login: 'LOGIN',
      register: 'SIGN UP',
      loginField: 'Email or Username',
      registerEmail: 'Email address',
      password: 'Password',
      username: 'Username',
      loginBtn: 'SIGN IN',
      registerBtn: 'CREATE ACCOUNT',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      welcome: 'COMMAND ACCESS',
      welcomeDesc: 'Authenticate to access your battle dossier and stats',
    },
  }

  const t = translations[isUz ? 'uz' : 'en']

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-ink text-bone v-dots">
      <Navbar />

      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="v-panel v-accent-acid v-enter p-6 sm:p-8">
            <div className="mb-7 space-y-2 border-b border-line pb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-acid/40 bg-ink text-acid v-chamfer-sm">
                <Crosshair className="h-6 w-6" />
              </div>
              <span className="v-label !text-acid">
                <ScrambleText text="SESSION // AUTHENTICATION" />
              </span>
              <h1 className="v-display text-4xl text-bone sm:text-5xl">{t.welcome}</h1>
              <p className="font-sans text-xs text-mute">{t.welcomeDesc}</p>
            </div>

            {/* Mode Switch */}
            <div className="mb-6 grid grid-cols-2 border border-line bg-ink p-1 font-mono text-xs font-bold">
              <button
                type="button"
                onMouseEnter={handleHover}
                onClick={() => {
                  handleClick()
                  setMode('login')
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors ${
                  mode === 'login' ? 'bg-acid text-ink' : 'text-mute hover:text-bone'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{t.login}</span>
              </button>
              <button
                type="button"
                onMouseEnter={handleHover}
                onClick={() => {
                  handleClick()
                  setMode('register')
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors ${
                  mode === 'register' ? 'bg-tide text-ink' : 'text-mute hover:text-bone'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t.register}</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 border border-ember/60 bg-ember/10 p-3 text-center font-mono text-xs font-semibold text-ember">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="v-label block">{t.username}</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-4 w-4 text-dim" />
                    </div>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="v-input !pl-9"
                      placeholder="neon_ninja"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="v-label block">
                  {mode === 'login' ? t.loginField : t.registerEmail}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-dim" />
                  </div>
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="v-input !pl-9"
                    placeholder={
                      mode === 'login'
                        ? isUz
                          ? 'username yoki pochta...'
                          : 'username or email...'
                        : 'player@cellix.net'
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="v-label block">{t.password}</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-dim" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="v-input !pl-9 !pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-dim hover:text-bone focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="v-btn mt-4 w-full">
                {loading ? (
                  <CellixLoader
                    variant="compact"
                    label={isUz ? 'TEKSHIRILMOQDA...' : 'AUTHENTICATING...'}
                    className="text-ink"
                  />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    <span>{mode === 'login' ? t.loginBtn : t.registerBtn}</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center font-mono text-xs text-mute">
              {mode === 'login' ? t.noAccount : t.haveAccount}{' '}
              <button
                type="button"
                onClick={() => {
                  handleClick()
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError(null)
                }}
                className="ml-1 font-bold text-acid hover:underline"
              >
                {mode === 'login' ? t.register : t.login}
              </button>
            </div>

            <div className="mt-6 border-t border-line pt-4 text-center">
              <Link
                href="/"
                onMouseEnter={handleHover}
                className="v-link inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-mute hover:text-bone"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{isUz ? 'Asosiy sahifaga qaytish' : 'Back to Home'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
