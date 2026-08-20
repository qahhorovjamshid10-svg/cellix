'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { LogIn, UserPlus, Mail, Lock, User, Hexagon, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

export default function AuthPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const isUz = lang === 'uz'
  
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login' 
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

      if (!res.ok) {
        throw new Error(data.error || (isUz ? 'Xatolik yuz berdi' : 'An error occurred'))
      }

      // Success
      window.location.href = '/profile/me'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const translations = {
    uz: {
      login: 'KIRISH',
      register: "RO'YXATDAN O'TISH",
      email: 'Elektron pochta',
      password: 'Parol',
      username: 'Foydalanuvchi nomi',
      loginBtn: 'TIZIMGA KIRISH',
      registerBtn: 'HISOB YARATISH',
      noAccount: "Hisobingiz yo'qmi?",
      haveAccount: 'Hisobingiz bormi?',
      welcome: 'CELLIX ARENASIGA XUSH KELIBSIZ',
      welcomeDesc: 'Hisobingizga kiring yoki yangi hisob yarating',
    },
    en: {
      login: 'LOGIN',
      register: 'SIGN UP',
      email: 'Email address',
      password: 'Password',
      username: 'Username',
      loginBtn: 'SIGN IN',
      registerBtn: 'CREATE ACCOUNT',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      welcome: 'WELCOME TO CELLIX ARENA',
      welcomeDesc: 'Sign in to your account or create a new one',
    }
  }

  const t = translations[isUz ? 'uz' : 'en']

  return (
    <div className="min-h-screen bg-[#040416] text-white flex flex-col font-mono selection:bg-purple-500/30">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10">
          {/* Cyberpunk decorative elements */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-20 animate-pulse" />
          
          <div className="relative bg-[#0a0a2a]/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
            
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-purple-950/50 border border-purple-500/50 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <Hexagon className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                {t.welcome}
              </h1>
              <p className="text-sm text-slate-400 mt-2 text-center">
                {t.welcomeDesc}
              </p>
            </div>

            <div className="flex bg-[#040416] rounded-lg p-1 mb-8 border border-slate-800">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${
                  mode === 'login' 
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {t.login}
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${
                  mode === 'register' 
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {t.register}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.username}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={e => setForm({...form, username: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 bg-[#040416] border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                      placeholder="neon_ninja"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.email}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 bg-[#040416] border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    placeholder="player@cellix.net"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.password}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="block w-full pl-10 pr-10 py-3 bg-[#040416] border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-lg tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {mode === 'login' ? t.loginBtn : t.registerBtn}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {mode === 'login' ? t.noAccount : t.haveAccount}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError(null)
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {mode === 'login' ? t.register : t.login}
              </button>
            </div>
            
            <div className="mt-8 text-center">
              <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">
                ← {isUz ? 'Asosiy sahifaga qaytish' : 'Back to Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
