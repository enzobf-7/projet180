'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DEMO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_SEED_TEST_USER === 'true'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError('')

    try {
      const res = await fetch('/api/dev/create-test-user', {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('failed')
      }

      const { email: demoEmail, password: demoPassword } = await res.json()

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      })

      if (error) {
        setError(`Impossible de connecter l'utilisateur de démo.`)
        return
      }

      router.refresh()
    } catch {
      setError(`Impossible de créer l'utilisateur de démo.`)
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,30,42,0.08)_0%,_transparent_60%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-glc-accent/5 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-glc-card border border-glc-border mb-6">
            <span className="text-2xl font-black text-glc-accent">GL</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gentleman Létal Club
          </h1>
          <p className="text-glc-muted text-sm mt-2">
            Connecte-toi pour accéder à ton espace
          </p>
        </div>

        {/* Login form */}
        <div className="bg-glc-card border border-glc-border rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-glc-muted uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                className="w-full px-4 py-3 bg-glc-bg border border-glc-border rounded-xl text-glc-text placeholder:text-glc-muted/50 focus:border-glc-accent focus:outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-glc-muted uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-glc-bg border border-glc-border rounded-xl text-glc-text placeholder:text-glc-muted/50 focus:border-glc-accent focus:outline-none transition-colors text-sm"
              />
            </div>

            {error && (
              <div className="text-glc-danger text-sm bg-glc-danger/10 border border-glc-danger/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-3.5 bg-glc-accent hover:bg-glc-accent-hover text-white font-semibold rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>

            {DEMO_LOGIN_ENABLED && (
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading || loading}
                className="w-full py-3.5 border border-glc-border text-glc-muted rounded-xl text-sm hover:border-glc-accent/60 hover:text-glc-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoLoading ? 'Connexion de démo…' : 'Connexion de démo (auto)'}
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-glc-muted/50 text-xs mt-8">
          Gentleman Létal Club — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
