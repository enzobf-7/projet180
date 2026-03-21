'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import P180Logo from '@/components/P180Logo'
import { P180Input } from '@/components/P180Input'
import { P180Button } from '@/components/P180Button'

// --- Aurora Background ---
function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    // Aurora bands config
    const bands = [
      { yBase: 0.25, amplitude: 80, wavelength: 400, speed: 0.0004, color: [58, 134, 255], opacity: 0.07, width: 200 },
      { yBase: 0.35, amplitude: 60, wavelength: 300, speed: 0.0006, color: [80, 100, 255], opacity: 0.05, width: 160 },
      { yBase: 0.30, amplitude: 100, wavelength: 500, speed: 0.0003, color: [30, 180, 255], opacity: 0.04, width: 180 },
      { yBase: 0.45, amplitude: 50, wavelength: 350, speed: 0.0005, color: [100, 60, 255], opacity: 0.035, width: 140 },
      { yBase: 0.20, amplitude: 70, wavelength: 450, speed: 0.00035, color: [58, 134, 255], opacity: 0.03, width: 220 },
    ]

    let t = 0

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      t++

      for (const band of bands) {
        ctx!.beginPath()

        const baseY = h * band.yBase

        // Draw the aurora wave
        for (let x = 0; x <= w; x += 2) {
          const y = baseY
            + Math.sin((x / band.wavelength) + t * band.speed * 60) * band.amplitude
            + Math.sin((x / (band.wavelength * 0.7)) + t * band.speed * 40) * (band.amplitude * 0.5)
            + Math.cos((x / (band.wavelength * 1.3)) + t * band.speed * 25) * (band.amplitude * 0.3)

          if (x === 0) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }

        // Close path to fill downward
        ctx!.lineTo(w, h)
        ctx!.lineTo(0, h)
        ctx!.closePath()

        // Gradient fill
        const grad = ctx!.createLinearGradient(0, baseY - band.width, 0, baseY + band.width)
        const [r, g, b] = band.color
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
        grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${band.opacity * 0.6})`)
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${band.opacity})`)
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${band.opacity * 0.4})`)
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx!.fillStyle = grad
        ctx!.fill()

        // Draw a bright edge along the wave
        ctx!.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = baseY
            + Math.sin((x / band.wavelength) + t * band.speed * 60) * band.amplitude
            + Math.sin((x / (band.wavelength * 0.7)) + t * band.speed * 40) * (band.amplitude * 0.5)
            + Math.cos((x / (band.wavelength * 1.3)) + t * band.speed * 25) * (band.amplitude * 0.3)

          if (x === 0) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${band.opacity * 1.5})`
        ctx!.lineWidth = 1.5
        ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, 0.3)`
        ctx!.shadowBlur = 20
        ctx!.stroke()
        ctx!.shadowBlur = 0
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030308]">
      {/* Aurora */}
      <AuroraCanvas />

      {/* Soft vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,#030308_100%)] pointer-events-none" />

      {/* Main content */}
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4 animate-[fadeSlideUp_0.8s_ease-out]">
          <P180Logo size="xl" />
        </div>

        {/* Tagline */}
        <p
          className="text-center text-[#7a7a8a] text-xs uppercase tracking-[5px] mb-10 animate-[fadeSlideUp_0.8s_ease-out_0.15s_both]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          180 jours pour tout changer
        </p>

        {/* Form card */}
        <div className="relative animate-[fadeSlideUp_0.8s_ease-out_0.3s_both]">
          {/* Card glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent pointer-events-none" />

          <div className="relative bg-[#0A0A10]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8">
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

              {/* CTA with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-p180-accent/25 rounded-xl blur-xl pointer-events-none animate-[glowPulse_3s_ease-in-out_infinite]" />
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
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />
          <p
            className="text-center text-[#4a4a55] text-[11px] uppercase tracking-[4px]"
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
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
