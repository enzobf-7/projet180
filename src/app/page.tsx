'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import P180Logo from '@/components/P180Logo'
import { P180Input } from '@/components/P180Input'
import { P180Button } from '@/components/P180Button'

// --- Particle system ---
function ParticleCanvas() {
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

    const PARTICLE_COUNT = 60
    const CONNECTION_DIST = 140
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.5 + 0.2,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12
            ctx!.strokeStyle = `rgba(58, 134, 255, ${alpha})`
            ctx!.lineWidth = 0.5
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.stroke()
          }
        }
      }

      // Draw & move particles
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(58, 134, 255, ${p.o})`
        ctx!.fill()

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#050505]">
      {/* Particle constellation */}
      <ParticleCanvas />

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-p180-accent/[0.06] rounded-full blur-[150px] pointer-events-none" />

      {/* Orbital ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none animate-[orbitSpin_20s_linear_infinite]">
        <div className="absolute inset-0 rounded-full border border-p180-accent/[0.08]" />
        {/* Orbiting dot */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-p180-accent/60 rounded-full shadow-[0_0_12px_rgba(58,134,255,0.6)]" />
      </div>

      {/* Second orbital ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none animate-[orbitSpin_35s_linear_infinite_reverse]">
        <div className="absolute inset-0 rounded-full border border-p180-accent/[0.04]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-p180-accent/40 rounded-full shadow-[0_0_8px_rgba(58,134,255,0.4)]" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4 animate-[fadeSlideUp_0.8s_ease-out]">
          <P180Logo size="xl" />
        </div>

        {/* Tagline */}
        <p
          className="text-center text-[#8a8a8a] text-xs uppercase tracking-[5px] mb-10 animate-[fadeSlideUp_0.8s_ease-out_0.15s_both]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          180 jours pour tout changer
        </p>

        {/* Form card */}
        <div className="relative animate-[fadeSlideUp_0.8s_ease-out_0.3s_both]">
          {/* Card glow border */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-p180-accent/25 via-p180-accent/8 to-transparent pointer-events-none" />

          {/* Card inner */}
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

              {/* Button with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-p180-accent/20 rounded-xl blur-xl pointer-events-none animate-pulse" />
                <P180Button
                  type="submit"
                  loading={loading}
                  fullWidth
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </P180Button>
              </div>
            </form>

            {/* Forgot password */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => { setShowForgot(!showForgot); setForgotMessage(''); setForgotError('') }}
                className="text-xs text-[#666] hover:text-p180-accent transition-colors uppercase tracking-wider"
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
        </div>

        {/* Footer */}
        <div className="mt-10 animate-[fadeSlideUp_0.8s_ease-out_0.5s_both]">
          <div className="h-px bg-gradient-to-r from-transparent via-p180-accent/25 to-transparent mb-5" />
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
        @keyframes orbitSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
