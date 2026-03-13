'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import P180Logo from '@/components/P180Logo'
import { P180Input } from '@/components/P180Input'
import { P180Button } from '@/components/P180Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(58,134,255,0.1)_0%,transparent_70%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-p180-accent/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[360px] relative z-10 animate-fade-in">
        {/* Logo + heading */}
        <div className="flex justify-center mb-10">
          <P180Logo size="2xl" />
        </div>

        {/* Form card */}
        <div className="bg-p180-card border border-p180-accent rounded-2xl p-7 shadow-[0_4px_30px_rgba(58,134,255,0.15)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <P180Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              autoComplete="email"
            />

            <P180Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="text-[#ff6b6b] text-sm bg-[rgba(220,38,38,0.12)] border border-[rgba(220,38,38,0.25)] rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <P180Button
              type="submit"
              loading={loading}
              fullWidth
              className="mt-1"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </P180Button>
          </form>
        </div>

      </div>
    </div>
  )
}
