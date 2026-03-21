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

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')
    setForgotMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    })

    if (error) {
      setForgotError(error.message)
    } else {
      setForgotMessage('Un email de réinitialisation a été envoyé.')
    }
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-5%,rgba(58,134,255,0.08)_0%,transparent_60%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-p180-accent/20 to-transparent" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-p180-accent/[0.03] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-p180-accent/[0.02] rounded-full blur-[60px] pointer-events-none" />

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <P180Logo size="2xl" />
        </div>

        {/* Tagline */}
        <p
          className="text-center text-p180-muted text-[11px] uppercase tracking-[4px] mb-10"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          180 jours pour tout changer
        </p>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-p180-accent/30 to-transparent mb-8" />

        {/* Form card */}
        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
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
              <div className="text-[#ff6b6b] text-sm bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <P180Button
              type="submit"
              loading={loading}
              fullWidth
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </P180Button>
          </form>

          {/* Forgot password link */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(!showForgot); setForgotMessage(''); setForgotError('') }}
              className="text-xs text-p180-muted/60 hover:text-p180-accent transition-colors uppercase tracking-wider"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Forgot password form */}
          {showForgot && (
            <form onSubmit={handleForgotPassword} className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
              <P180Input
                label="Votre email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoComplete="email"
              />

              {forgotError && (
                <div className="text-[#ff6b6b] text-sm bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="text-[#22C55E] text-sm bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-xl px-4 py-3">
                  {forgotMessage}
                </div>
              )}

              <P180Button
                type="submit"
                loading={forgotLoading}
                fullWidth
                variant="ghost"
                size="md"
              >
                {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
              </P180Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p
          className="text-center text-p180-muted/30 text-[10px] uppercase tracking-[3px] mt-8"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Un engagement · Une transformation
        </p>
      </div>
    </div>
  )
}
