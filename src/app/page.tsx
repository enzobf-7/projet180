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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#050505]">
      {/* Animated gradient blobs — CSS only, subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[rgba(58,134,255,0.06)] blur-[120px] top-[-10%] left-[-5%] animate-[drift1_20s_ease-in-out_infinite]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(80,60,255,0.04)] blur-[100px] bottom-[-5%] right-[-5%] animate-[drift2_25s_ease-in-out_infinite]" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(58,134,255,0.035)] blur-[80px] top-[40%] left-[60%] animate-[drift3_18s_ease-in-out_infinite]" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4 animate-[fadeSlideUp_0.8s_ease-out]">
          <P180Logo size="2xl" />
        </div>

        {/* Tagline */}
        <p
          className="text-center text-[#888] text-xs uppercase tracking-[5px] mb-10 animate-[fadeSlideUp_0.8s_ease-out_0.15s_both]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          180 jours pour tout changer
        </p>

        {/* Form card */}
        <div className="relative animate-[fadeSlideUp_0.8s_ease-out_0.3s_both]">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-p180-accent/15 via-transparent to-transparent pointer-events-none" />

          <div className="relative bg-[#0A0A0A]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-8">
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

              <div className="relative">
                <div className="absolute inset-0 bg-p180-accent/15 rounded-xl blur-lg pointer-events-none" />
                <P180Button type="submit" loading={loading} fullWidth>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </P180Button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => { setShowForgot(!showForgot); setForgotMessage(''); setForgotError('') }}
                className="text-xs text-[#555] hover:text-p180-accent transition-colors uppercase tracking-wider"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mot de passe oublié ?
              </button>
            </div>

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

                <P180Button type="submit" loading={forgotLoading} fullWidth variant="ghost" size="md">
                  {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
                </P180Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 animate-[fadeSlideUp_0.8s_ease-out_0.5s_both]">
          <div className="h-px bg-gradient-to-r from-transparent via-p180-accent/15 to-transparent mb-5" />
          <p
            className="text-center text-[#555] text-[11px] uppercase tracking-[4px]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Un engagement · Une transformation
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(80px, 40px); }
          66% { transform: translate(-30px, 60px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-60px, -30px); }
          66% { transform: translate(40px, -50px); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-40px, 30px); }
          66% { transform: translate(50px, -20px); }
        }
      `}</style>
    </div>
  )
}
