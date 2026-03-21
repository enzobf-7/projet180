'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import P180Logo from '@/components/P180Logo'
import { P180Input } from '@/components/P180Input'
import { P180Button } from '@/components/P180Button'

// --- Interactive particle constellation ---
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -1000, y: -1000 })

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

    const PARTICLE_COUNT = 70
    const CONNECTION_DIST = 150
    const MOUSE_DIST = 180
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; baseO: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const o = Math.random() * 0.5 + 0.15
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.5,
        o,
        baseO: o,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      const mx = mouse.current.x
      const my = mouse.current.y

      // Connections
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

      // Mouse connections
      for (const p of particles) {
        const dx = p.x - mx
        const dy = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_DIST) {
          const alpha = (1 - dist / MOUSE_DIST) * 0.25
          ctx!.strokeStyle = `rgba(58, 134, 255, ${alpha})`
          ctx!.lineWidth = 0.8
          ctx!.beginPath()
          ctx!.moveTo(p.x, p.y)
          ctx!.lineTo(mx, my)
          ctx!.stroke()

          // Brighten near mouse
          p.o = p.baseO + (1 - dist / MOUSE_DIST) * 0.5
        } else {
          p.o += (p.baseO - p.o) * 0.05
        }
      }

      // Draw & move
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

    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => { mouse.current = { x: -1000, y: -1000 } }
    const onResize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ pointerEvents: 'auto' }} />
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
      {/* Interactive particles */}
      <ParticleCanvas />

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-p180-accent/[0.05] rounded-full blur-[150px] pointer-events-none" />

      {/* Orbital ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] pointer-events-none animate-[orbitSpin_25s_linear_infinite]">
        <div className="absolute inset-0 rounded-full border border-p180-accent/[0.07]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-p180-accent/50 rounded-full shadow-[0_0_12px_rgba(58,134,255,0.5)]" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] pointer-events-none animate-[orbitSpin_40s_linear_infinite_reverse]">
        <div className="absolute inset-0 rounded-full border border-p180-accent/[0.04]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-p180-accent/30 rounded-full shadow-[0_0_8px_rgba(58,134,255,0.3)]" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo — bigger */}
        <div className="flex justify-center mb-4 animate-[fadeSlideUp_0.8s_ease-out]">
          <P180Logo size="2xl" />
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
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-p180-accent/20 via-p180-accent/5 to-transparent pointer-events-none" />

          <div className="relative bg-[#0A0A0A]/85 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8">
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
                <div className="absolute inset-0 bg-p180-accent/20 rounded-xl blur-xl pointer-events-none animate-[glowPulse_3s_ease-in-out_infinite]" />
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
          <div className="h-px bg-gradient-to-r from-transparent via-p180-accent/20 to-transparent mb-5" />
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
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes orbitSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
