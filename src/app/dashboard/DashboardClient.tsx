'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toggleHabitAction } from './actions'
import { getXpDelta } from './utils'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#0B0B0B',
  surface: '#0F0F0F',
  sidebar: '#0A0A0A',
  border:  '#1E1E1E',
  muted:   '#484848',
  dimmed:  '#161616',
  text:    '#F0F0F0',
  accent:  '#8B1A1A',
  accentL: '#A32020',
  green:   '#15803D',
  greenL:  '#22C55E',
}
const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const
const M = { fontFamily: '"JetBrains Mono", monospace' }    as const

// ─── Types ────────────────────────────────────────────────────────────────────
interface Habit { id: string; name: string }
interface Gamification {
  xp_total: number; current_streak: number
  longest_streak: number; level: number
}
interface LeaderboardEntry {
  rank: number; clientId: string; firstName: string
  xp: number; streak: number; isMe: boolean
}
interface Props {
  jourX:             number
  firstName:         string
  gamification:      Gamification
  habits:            Habit[]
  completedHabitIds: string[]
  responses:         Record<string, unknown>
  leaderboard:       LeaderboardEntry[]
  onboardingDate:    string | null
  whatsappLink:      string | null
  weeklyXP:          number
}
interface XPParticle { id: number; delta: number; multiplier: number }

// ─── Level system ─────────────────────────────────────────────────────────────
const LEVELS = [
  { name: 'Initié',          min: 0,     max: 500   },
  { name: 'Soldat',          min: 500,   max: 1500  },
  { name: 'Guerrier',        min: 1500,  max: 3000  },
  { name: 'Combattant',      min: 3000,  max: 6000  },
  { name: "Homme d'honneur", min: 6000,  max: 12000 },
  { name: 'Gentleman Létal', min: 12000, max: Infinity },
]

const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90]

function getCurrentLevel(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp < l.max) ?? LEVELS[LEVELS.length - 1]
}
function getLevelProgress(xp: number) {
  const lvl = getCurrentLevel(xp)
  if (lvl.max === Infinity) return 100
  return Math.round(((xp - lvl.min) / (lvl.max - lvl.min)) * 100)
}
function getNextLevel(xp: number) {
  const lvl = getCurrentLevel(xp)
  if (lvl.max === Infinity) return null
  const idx = LEVELS.indexOf(lvl)
  return { name: LEVELS[idx + 1]?.name ?? '', xpNeeded: lvl.max - xp }
}

// ─── useCountdown ─────────────────────────────────────────────────────────────
function useCountdown(startDate: string | null) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const tick = () => {
      if (!startDate) return
      const diff = Math.max(0, new Date(startDate).getTime() + 180 * 86400000 - Date.now())
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startDate])
  return t
}
const p2 = (n: number) => String(n).padStart(2, '0')

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return m
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
function AnimatedCounter({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const from = prevRef.current
    prevRef.current = to
    const d = (from === 0 && to > 50) ? duration : 280
    let start: number | null = null
    let raf: number
    const tick = (ts: number) => {
      if (!start) start = ts
      const p    = Math.min((ts - start) / d, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setCount(Math.round(from + ease * (to - from)))
      if (p < 1) { raf = requestAnimationFrame(tick) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{count.toLocaleString('fr-FR')}</>
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardClient({
  jourX, firstName, gamification, habits, completedHabitIds, responses,
  leaderboard, onboardingDate, whatsappLink, weeklyXP,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedHabitIds))
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [localXP, setLocalXP] = useState(gamification.xp_total)
  const [localStreak, setLocalStreak] = useState(gamification.current_streak)
  const [levelUpOverlay, setLevelUpOverlay] = useState<string | null>(null)
  const [particles, setParticles] = useState<XPParticle[]>([])
  const particleId = useRef(0)
  const [celebrateRing, setCelebrateRing] = useState(false)
  const [displayedLevelPct, setDisplayedLevelPct] = useState(0)
  const isMobile = useIsMobile()
  const countdown = useCountdown(onboardingDate)
  const supabase  = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleToggle = (habitId: string) => {
    if (loadingId) return
    const wasCompleted = completed.has(habitId)
    // Optimistic estimate (multiplier-aware, uses current localStreak)
    const optimisticDelta = wasCompleted ? -10 : getXpDelta(localStreak)
    setCompleted(prev => {
      const next = new Set(prev)
      wasCompleted ? next.delete(habitId) : next.add(habitId)
      return next
    })
    setLocalXP(prev => Math.max(0, prev + optimisticDelta))
    const pid = ++particleId.current
    setParticles(p => [...p, { id: pid, delta: optimisticDelta, multiplier: 1 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1500)
    setLoadingId(habitId)
    startTransition(async () => {
      try {
        const result = await toggleHabitAction(habitId, !wasCompleted, habits.length)
        if (result) {
          // Reconcile with server truth
          setLocalXP(result.newXP)
          setLocalStreak(result.newStreak)
          // Swap optimistic particle for accurate one (with real delta + multiplier)
          const accuratePid = ++particleId.current
          setParticles(p => [
            ...p.filter(x => x.id !== pid),
            { id: accuratePid, delta: result.xpDelta, multiplier: result.multiplier },
          ])
          setTimeout(() => setParticles(p => p.filter(x => x.id !== accuratePid)), 1500)
          if (result.leveledUp) {
            setLevelUpOverlay(result.newLevel)
            setTimeout(() => setLevelUpOverlay(null), 2800)
          }
        }
      } catch {
        // Rollback on error
        setCompleted(prev => {
          const next = new Set(prev)
          wasCompleted ? next.add(habitId) : next.delete(habitId)
          return next
        })
        setLocalXP(prev => Math.max(0, prev - optimisticDelta))
      } finally {
        setLoadingId(null)
      }
    })
  }

  // Derived
  const totalHabits    = habits.length
  const completedCount = completed.size
  const completedPct   = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0
  const allDone        = totalHabits > 0 && completedCount === totalHabits
  const daysPct        = Math.round((jourX / 180) * 100)
  const daysLeft       = 180 - jourX
  const xp             = localXP
  const level          = getCurrentLevel(xp)
  const levelPct       = getLevelProgress(xp)
  const nextLevel      = getNextLevel(xp)
  const streak         = localStreak
  const record         = gamification.longest_streak
  const hotStreak      = streak >= 7
  const legendStreak   = streak >= 30
  const myRank         = leaderboard.find(e => e.isMe)?.rank ?? null
  const maxXP          = leaderboard[0]?.xp || 1
  const visionText     = (responses?.vision as string) ?? null
  const objectifText   = (responses?.objectif_principal as string) ?? null

  // ── Badges (computed from existing data, no DB table) ──────────────────────
  const BADGES: { key: string; label: string; icon: string; earned: boolean; desc: string }[] = [
    { key: 'first_step',   label: 'Premier pas',      icon: '⚡', earned: xp >= 10,                           desc: 'Premier XP gagné' },
    { key: 'week_fire',    label: 'Semaine de feu',    icon: '🔥', earned: streak >= 7,                        desc: '7 jours de série' },
    { key: 'fortnight',    label: 'Quinzaine',         icon: '⚔',  earned: streak >= 14,                       desc: '14 jours de série' },
    { key: 'month_king',   label: 'Mois entier',       icon: '👑', earned: record >= 30,                       desc: '30 jours de série' },
    { key: 'soldier',      label: 'Soldat',            icon: '🛡',  earned: xp >= 500,                          desc: '500 XP cumulés' },
    { key: 'warrior',      label: 'Guerrier',          icon: '⚔',  earned: xp >= 1500,                         desc: '1 500 XP cumulés' },
    { key: 'fighter',      label: 'Combattant',        icon: '💎', earned: xp >= 3000,                         desc: '3 000 XP cumulés' },
    { key: 'honor',        label: "Homme d'honneur",   icon: '🏆', earned: xp >= 6000,                         desc: '6 000 XP cumulés' },
  ]
  const earnedCount = BADGES.filter(b => b.earned).length

  const navItems = [
    { label: 'Dashboard',  href: '/dashboard',  active: true  },
    { label: 'Programme',  href: '/programme',  active: false },
    { label: 'Profil',     href: '/profil',     active: false },
  ]

  const isFirstRun    = useRef(true)
  const prevAllDoneRef = useRef(false)
  const hasMounted    = useRef(false)

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; prevAllDoneRef.current = allDone; return }
    if (allDone && !prevAllDoneRef.current) {
      setCelebrateRing(true)
      setTimeout(() => setCelebrateRing(false), 600)
    }
    prevAllDoneRef.current = allDone
  }, [allDone])

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisplayedLevelPct(levelPct))
      })
    } else {
      setDisplayedLevelPct(levelPct)
    }
  }, [levelPct])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text, overflowX: 'hidden' }}>

      {/* ── CSS Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes glc-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes glc-slide {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0);      }
        }
        @keyframes glc-ping {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%      { transform: scale(1.6); opacity: 0.35; }
        }
        .glc-fade      { animation: glc-fade      0.45s cubic-bezier(0.2,0,0.1,1) both; }
        .glc-slide     { animation: glc-slide     0.4s  cubic-bezier(0.2,0,0.1,1) both; }
        .glc-ping      { animation: glc-ping      1.8s  ease-in-out infinite; }
        @keyframes glc-xp-rise {
          0%   { opacity: 0; transform: translateY(0) scale(0.8); }
          15%  { opacity: 1; transform: translateY(-4px) scale(1.15); }
          70%  { opacity: 1; transform: translateY(-36px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.9); }
        }
        @keyframes glc-ring-done {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.18); }
          60%  { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
        .glc-xp-rise   { animation: glc-xp-rise   1.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
        .glc-ring-done { animation: glc-ring-done  0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes glc-habit-check {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.22); }
          70%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .glc-habit-row:hover { background: rgba(139,26,26,0.06) !important; }
        @keyframes glc-levelup-bg {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes glc-levelup-card {
          0%   { opacity: 0; transform: scale(0.72) translateY(24px); }
          25%  { opacity: 1; transform: scale(1.04) translateY(-4px); }
          45%  { transform: scale(0.98) translateY(0); }
          60%  { transform: scale(1) translateY(0); }
          80%  { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(1.06) translateY(-12px); }
        }
        @keyframes glc-levelup-line {
          0%   { width: 0; opacity: 0; }
          40%  { width: 60px; opacity: 1; }
          80%  { width: 60px; opacity: 1; }
          100% { width: 0; opacity: 0; }
        }
      `}</style>

      {/* ── XP Particles overlay ─────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
        {particles.map(p => (
          <div key={p.id} className="glc-xp-rise" style={{
            position: 'absolute',
            right: isMobile ? '24px' : '48px',
            top:   isMobile ? '80px' : '160px',
            ...M, fontWeight: 700, fontSize: '16px',
            color: p.delta > 0 ? C.greenL : '#f97373',
            letterSpacing: '0.05em',
            textShadow: p.delta > 0 ? `0 0 12px ${C.greenL}60` : '0 0 12px #f9737360',
          }}>
            {p.delta > 0 ? `+${p.delta}` : p.delta} XP{p.multiplier > 1 ? ` ×${p.multiplier}` : ''}
          </div>
        ))}
      </div>

      {/* ── Level-up Overlay ─────────────────────────────────────────────────── */}
      {levelUpOverlay && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6,6,6,0.92)',
          animation: 'glc-levelup-bg 2.8s ease both',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', animation: 'glc-levelup-card 2.8s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div style={{ ...M, fontSize: '11px', letterSpacing: '0.2em', color: C.accent, marginBottom: 12, textTransform: 'uppercase' as const }}>
              Niveau supérieur
            </div>
            <div style={{ ...D, fontSize: '52px', fontWeight: 800, color: C.text, letterSpacing: '0.02em', lineHeight: 1 }}>
              {levelUpOverlay}
            </div>
            <div style={{ height: 2, background: C.accent, margin: '20px auto 0', borderRadius: 1, animation: 'glc-levelup-line 2.8s ease both' }} />
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {!isMobile && <aside style={{
        width: 220, flexShrink: 0,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '32px 24px 28px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            width: 44, height: 44,
            background: C.accent,
            clipPath: 'polygon(12% 0%, 88% 0%, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0% 88%, 0% 12%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <span style={{ ...D, fontWeight: 900, fontSize: '18px', color: 'white', letterSpacing: '0.05em' }}>
              GLC
            </span>
          </div>
          <div style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase' as const }}>
            Gentleman Létal Club
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '20px 16px', flex: 1 }}>
          {navItems.map(item => (
            <a key={item.href} href={item.href} style={{
              display: 'block',
              padding: '9px 12px',
              marginBottom: 2,
              ...D,
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              color:      item.active ? C.text : C.muted,
              background: item.active ? C.dimmed : 'transparent',
              borderLeft: item.active ? `2px solid ${C.accent}` : '2px solid transparent',
            }}>
              {item.label}
            </a>
          ))}

          {/* WhatsApp nav item */}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px',
              marginTop: 8,
              ...D,
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              color: C.greenL,
              borderLeft: `2px solid ${C.green}`,
            }}>
              <span>WhatsApp</span>
              <span className="glc-ping" style={{
                width: 7, height: 7, flexShrink: 0,
                borderRadius: '50%',
                background: C.greenL,
                display: 'inline-block',
              }} />
            </a>
          )}
        </nav>

        {/* Programme bar */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Jour {jourX} / 180
          </div>
          <div style={{ height: 2, background: C.border }}>
            <div style={{ height: '100%', width: `${daysPct}%`, background: C.accent }} />
          </div>
        </div>

        {/* User footer */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ ...D, fontWeight: 900, fontSize: '13px', color: 'white' }}>
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...D, fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName}
            </div>
            <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em', color: C.accent, textTransform: 'uppercase' as const }}>
              {level.name}
            </div>
          </div>
          <button onClick={handleSignOut} title="Déconnexion" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: '18px', lineHeight: 1, padding: 4,
          }}>
            ⏻
          </button>
        </div>
      </aside>}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── Sticky header ───────────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 2, background: C.dimmed }}>
            <div style={{ height: '100%', width: `${daysPct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentL})`, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 16px' : '10px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ ...D, fontWeight: 900, fontSize: '13px', letterSpacing: '0.32em', color: C.accent, textTransform: 'uppercase' as const }}>
                GLC
              </span>
              <div style={{ width: 1, height: 14, background: C.border }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ ...D, fontWeight: 900, fontSize: '18px', letterSpacing: '0.06em', color: C.text, lineHeight: 1 }}>
                  JOUR {String(jourX).padStart(3, '0')}
                </span>
                <span style={{ ...M, fontSize: '10px', color: C.muted }}>/ 180 — {daysLeft}j</span>
              </div>
            </div>
            {!isMobile && onboardingDate && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {[
                  { v: countdown.d, u: 'j' },
                  { v: countdown.h, u: 'h' },
                  { v: countdown.m, u: 'm' },
                  { v: countdown.s, u: 's' },
                ].map(({ v, u }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ ...M, fontSize: '15px', fontWeight: 700, color: i === 3 ? C.accent : C.text }}>{p2(v)}</span>
                    <span style={{ ...D, fontWeight: 700, fontSize: '9px', color: C.muted, letterSpacing: '0.1em' }}>{u}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────────────*/}
        <div style={{
          position: 'relative',
          background: `radial-gradient(ellipse 90% 140% at 0% 60%, #1F0308 0%, #0E0507 40%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? '28px 20px 22px' : '36px 40px 26px',
          overflow: 'hidden',
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '-60px', left: '-80px', width: '280px', height: '280px', background: `radial-gradient(circle, ${C.accent}18 0%, transparent 65%)`, pointerEvents: 'none' }} />
          {/* Overline */}
          <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.35em', color: C.accent, textTransform: 'uppercase' as const, marginBottom: 10, position: 'relative' }}>
            Programme 180j — Gentleman Létal Club
          </div>
          {/* Big day number row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 12 : 20, marginBottom: 16, position: 'relative' }}>
            <span style={{ ...D, fontWeight: 900, fontSize: isMobile ? '60px' : '76px', letterSpacing: '-0.01em', color: C.text, lineHeight: 0.88 }}>
              JOUR&nbsp;{String(jourX).padStart(3, '0')}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: isMobile ? 7 : 9 }}>
              <span style={{ ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.accent }}>
                {level.name}
              </span>
              <span style={{ ...D, fontWeight: 500, fontSize: '11px', color: C.muted, letterSpacing: '0.1em' }}>
                {firstName.toUpperCase()}{myRank ? ` · #${myRank}` : ''}
              </span>
            </div>
            {allDone && (
              <span style={{
                ...D, fontWeight: 900, fontSize: '10px', letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                color: C.accent, border: `1px solid ${C.accent}`,
                padding: '5px 12px', marginLeft: 'auto', alignSelf: 'center',
              }}>
                Mission accomplie
              </span>
            )}
          </div>
          {/* 180-day progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <div style={{ flex: 1, height: 2, background: C.dimmed, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${daysPct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentL})`, transition: 'width 1.2s ease' }} />
            </div>
            <span style={{ ...M, fontSize: '10px', color: C.muted, whiteSpace: 'nowrap' as const }}>{jourX} / 180</span>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div style={{ padding: isMobile ? '24px 16px 64px' : '36px 40px 80px' }}>


          {/* ── Stats strip ─────────────────────────────────────────────────── */}
          <div className="glc-fade" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            background: C.surface,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
            marginBottom: 32,
            animationDelay: '0.2s',
          }}>
            {[
              { label: 'XP Total',   value: localXP,   color: C.accent, mono: true },
              { label: 'XP Semaine', value: weeklyXP,  color: C.text,   mono: true },
              { label: `Série ${hotStreak ? '🔥' : ''}`, value: streak, color: C.text, mono: true },
              { label: 'Classement', value: myRank ?? '—', color: myRank && myRank <= 3 ? C.accent : C.text, mono: false },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: isMobile ? '18px 8px' : '22px 12px',
                borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                borderBottom: isMobile && i < 2 ? `1px solid ${C.border}` : 'none',
              }}>
                <span style={{ ...D, fontWeight: 900, fontSize: isMobile ? '28px' : '32px', color: stat.color, lineHeight: 1 }}>
                  {stat.mono
                    ? (typeof stat.value === 'number' ? <AnimatedCounter to={stat.value} /> : stat.value)
                    : (typeof stat.value === 'number' ? `#${stat.value}` : stat.value)
                  }
                </span>
                <span style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const, marginTop: 5 }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 24, alignItems: 'start', marginBottom: 32 }}>

            {/* ── Missions ──────────────────────────────────────────────── */}
            <div style={{ minWidth: 0 }}>
              <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Check-in quotidien
              </div>
              {gamification.current_streak > 0 && completed.size === 0 && new Date().getHours() >= 18 && (
                <div style={{ background: '#1A0A0A', border: '1px solid #8B1A1A', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#E05050', fontSize: 13 }}>
                  ⚠️ Ta série de {gamification.current_streak}j est en danger — coche tes habitudes avant minuit.
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <h2 style={{ ...D, fontWeight: 900, fontSize: '20px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, margin: 0, flex: 1 }}>
                  Missions du jour
                </h2>
                {/* Mini ring */}
                <div className={celebrateRing ? 'glc-ring-done' : undefined} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                  <svg width={72} height={72} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                    <circle cx={36} cy={36} r={28} fill="none" stroke={C.border} strokeWidth={5} />
                    <circle cx={36} cy={36} r={28} fill="none"
                      stroke={allDone ? C.accentL : C.accent}
                      strokeWidth={5}
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - completedPct / 100)}
                      strokeLinecap="butt"
                      style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <span style={{ ...D, fontSize: '15px', fontWeight: 900, color: C.text, lineHeight: 1 }}>{completed.size}</span>
                    <span style={{ ...M, fontSize: '8px', color: C.muted }}>/ {habits.length}</span>
                  </div>
                </div>
              </div>

              {habits.length === 0 ? (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  padding: '28px 24px',
                  ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em',
                  color: C.muted, textTransform: 'uppercase' as const,
                }}>
                  Aucune mission assignée
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {habits.map((habit, i) => {
                    const done    = completed.has(habit.id)
                    const loading = loadingId === habit.id
                    return (
                      <button
                        key={habit.id}
                        onClick={() => handleToggle(habit.id)}
                        disabled={!!loadingId}
                        className={`glc-slide glc-habit-row`}
                        style={{
                          animationDelay: `${i * 55}ms`,
                          display: 'flex', alignItems: 'center', gap: 20,
                          background:  done ? `${C.accent}15` : C.surface,
                          border:      `1px solid ${done ? `${C.accent}40` : C.border}`,
                          borderLeft:  done ? `3px solid ${C.accent}` : '3px solid transparent',
                          padding:     '18px 22px',
                          cursor:      loadingId ? 'wait' : 'pointer',
                          textAlign:   'left' as const,
                          opacity:     loading ? 0.6 : 1,
                          transition:  'background 0.15s, opacity 0.15s',
                          width:       '100%',
                        }}
                      >
                        <span style={{ ...M, fontSize: '10px', color: C.muted, minWidth: 20 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{
                          flex: 1,
                          ...D, fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em',
                          textTransform: 'uppercase' as const,
                          color:          done ? C.muted : C.text,
                          textDecoration: done ? 'line-through' : 'none',
                        }}>
                          {habit.name}
                        </span>
                        <div style={{
                          width: 26, height: 26, flexShrink: 0,
                          border:     `1.5px solid ${done ? C.accent : C.muted}`,
                          background: done ? C.accent : 'transparent',
                          boxShadow:  done ? `0 0 10px ${C.accent}70` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}>
                          {done && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="square" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Right sidebar ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* XP card */}
              <div className="glc-fade" style={{
                background: `linear-gradient(180deg, #110507 0%, ${C.surface} 60%)`,
                border: `1px solid ${C.border}`,
                borderTop: `2px solid ${C.accent}`,
                padding: '24px',
                animationDelay: '0.15s',
              }}>
                <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.accent, textTransform: 'uppercase' as const, marginBottom: 16 }}>
                  Progression XP
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...D, fontSize: '44px', fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                    <AnimatedCounter to={localXP} />
                  </span>
                  <span style={{ ...D, fontSize: '14px', fontWeight: 700, color: C.muted, letterSpacing: '0.12em' }}>pts</span>
                </div>
                <div style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 16 }}>
                  {level.name}
                </div>
                <div style={{ height: 10, background: C.border, marginBottom: nextLevel ? 8 : 16, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${displayedLevelPct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentL})`, transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 8px ${C.accent}60` }} />
                </div>
                {nextLevel && (
                  <div style={{ ...M, fontSize: '9px', color: C.muted, marginBottom: 16 }}>
                    {nextLevel.xpNeeded.toLocaleString('fr-FR')} XP pour {nextLevel.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {LEVELS.map((lvl, i) => {
                    const isActive = lvl.name === level.name
                    const isPast   = xp >= lvl.max
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isPast ? 0.3 : 1 }}>
                        <div style={{ width: 6, height: 6, flexShrink: 0, background: isActive ? C.accent : isPast ? C.muted : C.dimmed }} />
                        <span style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: isActive ? C.text : C.muted }}>
                          {lvl.name}
                        </span>
                        {lvl.max !== Infinity && (
                          <span style={{ ...M, fontSize: '9px', color: C.muted, marginLeft: 'auto' }}>
                            {lvl.max.toLocaleString('fr-FR')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Streak card */}
              <div className="glc-fade" style={{
                background: C.surface,
                border: legendStreak ? `1px solid ${C.accentL}50` : `1px solid ${C.border}`,
                borderTop: legendStreak ? `2px solid ${C.accentL}` : hotStreak ? `2px solid ${C.accentL}` : `1px solid ${C.border}`,
                padding: '20px 24px',
                animationDelay: '0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase' as const }}>
                    Série actuelle
                  </div>
                  {hotStreak && <span style={{ fontSize: '14px', lineHeight: 1 }}>🔥</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span style={{ ...M, fontSize: '32px', fontWeight: 700, color: legendStreak ? C.accentL : hotStreak ? C.accentL : C.text, lineHeight: 1 }}>
                    {streak}
                  </span>
                  <span style={{ ...M, fontSize: '11px', color: C.muted }}>jours</span>
                  {record > 0 && (
                    <span style={{ ...M, fontSize: '10px', color: C.muted, marginLeft: 4 }}>
                      · record {record}j
                    </span>
                  )}
                </div>
                {/* Milestone bars */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                  {STREAK_MILESTONES.map((ms, i) => {
                    const reached = streak >= ms
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ height: 12, width: '100%', background: reached ? C.accentL : C.border, borderRadius: 2 }} />
                        <span style={{ ...M, fontSize: '8px', color: reached ? C.text : C.muted }}>
                          {ms}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Badges card */}
              <div className="glc-fade" style={{
                background: C.surface, border: `1px solid ${C.border}`,
                padding: '20px 24px',
                animationDelay: '0.22s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase' as const }}>
                    Badges
                  </div>
                  <div style={{ ...M, fontSize: '9px', color: C.muted }}>
                    {earnedCount} / {BADGES.length}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {BADGES.map(badge => (
                    <div key={badge.key} title={`${badge.label} — ${badge.desc}`} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      padding: '10px 4px',
                      background: badge.earned ? `${C.accent}18` : C.bg,
                      border: `1px solid ${badge.earned ? C.accent + '40' : C.border}`,
                      borderRadius: 6,
                      opacity: badge.earned ? 1 : 0.45,
                      transition: 'opacity 0.3s',
                      cursor: 'default',
                    }}>
                      <span style={{ fontSize: '18px', lineHeight: 1, filter: badge.earned ? 'none' : 'grayscale(1)' }}>
                        {badge.icon}
                      </span>
                      <span style={{ ...M, fontSize: '7px', color: badge.earned ? C.text : C.muted, textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.04em' }}>
                        {badge.label}
                      </span>
                      {!badge.earned && (
                        <p style={{ ...M, fontSize: '6px', color: C.muted, textAlign: 'center', margin: 0, marginTop: 2, lineHeight: 1.3, letterSpacing: '0.02em' }}>
                          {badge.desc}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp CTA card */}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="glc-fade" style={{
                  display: 'block',
                  background: '#010F06',
                  border: `1px solid ${C.green}30`,
                  borderLeft: `3px solid ${C.green}`,
                  padding: '18px 20px',
                  textDecoration: 'none',
                  animationDelay: '0.25s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={C.greenL}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span style={{ ...D, fontWeight: 900, fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.greenL }}>
                      Groupe WhatsApp
                    </span>
                  </div>
                  <div style={{ ...D, fontWeight: 500, fontSize: '12px', color: '#4A7A5A', letterSpacing: '0.04em' }}>
                    Rejoindre la communauté GLC
                  </div>
                </a>
              )}

              {/* Objectif */}
              {objectifText && (
                <div className="glc-fade" style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  padding: '20px 24px',
                  animationDelay: '0.3s',
                }}>
                  <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 10 }}>
                    Objectif
                  </div>
                  <p style={{ ...D, fontWeight: 500, fontSize: '13px', lineHeight: 1.6, color: C.text, margin: 0 }}>
                    {objectifText}
                  </p>
                </div>
              )}

              {/* Vision */}
              {visionText && (
                <div className="glc-fade" style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderTop: `2px solid ${C.accent}`,
                  padding: '20px 24px',
                  animationDelay: '0.35s',
                }}>
                  <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.accent, textTransform: 'uppercase' as const, marginBottom: 10 }}>
                    Vision 180j
                  </div>
                  <p style={{ ...D, fontWeight: 500, fontSize: '13px', lineHeight: 1.6, color: C.text, margin: 0, fontStyle: 'italic' }}>
                    &ldquo;{visionText}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Leaderboard ─────────────────────────────────────────────────── */}
          {leaderboard.length > 0 && (
            <div className="glc-fade" style={{ animationDelay: '0.4s' }}>
              <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Membres actifs
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                <h2 style={{ ...D, fontWeight: 900, fontSize: '20px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, margin: 0 }}>
                  Classement
                </h2>
                <span style={{ ...M, fontSize: '11px', color: C.muted }}>{leaderboard.length} membres</span>
              </div>

              <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 38px 1fr 80px 88px',
                  padding: '8px 20px',
                  background: C.surface,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {[
                    { label: '#',      align: 'left'  },
                    { label: '',       align: 'left'  },
                    { label: 'Membre', align: 'left'  },
                    { label: 'Série',  align: 'right' },
                    { label: 'XP',     align: 'right' },
                  ].map((h, i) => (
                    <div key={i} style={{
                      ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                      color: C.muted, textTransform: 'uppercase' as const,
                      textAlign: h.align as 'left' | 'right',
                    }}>
                      {h.label}
                    </div>
                  ))}
                </div>

                {leaderboard.slice(0, 20).map((entry, i) => {
                  const isTop3    = entry.rank <= 3
                  const rankColor = entry.rank === 1 ? C.accent : entry.rank === 2 ? '#A0AABA' : entry.rank === 3 ? '#B07840' : C.muted
                  const rankLabel = entry.rank === 1 ? '①' : entry.rank === 2 ? '②' : entry.rank === 3 ? '③' : String(entry.rank)
                  const xpPct     = Math.round((entry.xp / maxXP) * 100)

                  return (
                    <div
                      key={entry.clientId}
                      style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: '52px 38px 1fr 80px 88px',
                        padding: '12px 20px',
                        borderBottom: i < Math.min(leaderboard.length, 20) - 1 ? `1px solid ${C.border}` : 'none',
                        background: entry.isMe
                          ? `${C.accent}10`
                          : i % 2 === 0 ? C.bg : C.surface,
                        outline: entry.isMe ? `1px solid ${C.accent}28` : 'none',
                        outlineOffset: '-1px',
                      }}
                    >
                      {/* XP background bar */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${xpPct}%`, pointerEvents: 'none',
                        background: isTop3 ? `${C.accent}06` : `${C.muted}04`,
                      }} />

                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <span style={{ ...M, fontSize: isTop3 ? '17px' : '12px', fontWeight: 700, color: rankColor, lineHeight: 1 }}>
                          {rankLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{
                          width: 26, height: 26,
                          background: entry.isMe ? C.accent : C.dimmed,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ ...D, fontWeight: 900, fontSize: '11px', color: entry.isMe ? 'white' : C.muted }}>
                            {entry.firstName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, position: 'relative' }}>
                        <span style={{
                          ...D, fontWeight: entry.isMe ? 900 : 700,
                          fontSize: '13px', letterSpacing: '0.08em',
                          textTransform: 'uppercase' as const,
                          color: entry.isMe ? C.text : isTop3 ? C.text : C.muted,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {entry.firstName}
                        </span>
                        {entry.isMe && (
                          <span style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em', color: C.accent, flexShrink: 0 }}>
                            toi
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
                        <span style={{ ...M, fontSize: '12px', fontWeight: 700, color: entry.streak > 0 ? C.text : C.dimmed }}>
                          {entry.streak > 0 ? `🔥 ${entry.streak}j` : '—'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
                        <span style={{
                          ...M, fontSize: '13px', fontWeight: 700,
                          color: isTop3 ? C.accent : entry.isMe ? C.accent : C.text,
                        }}>
                          {entry.xp.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {leaderboard.length > 20 && (
                <div style={{
                  ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.2em',
                  color: C.muted, textTransform: 'uppercase' as const,
                  textAlign: 'center' as const, marginTop: 12,
                }}>
                  + {leaderboard.length - 20} autres membres
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Mobile bottom nav ────────────────────────────────────────── */}
        {isMobile && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, zIndex: 50,
            display: 'flex', background: C.surface, borderTop: `1px solid ${C.border}` }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 4,
                color: item.active ? C.accent : C.muted, textDecoration: 'none' }}>
                {item.href === '/dashboard'  && <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
                {item.href === '/programme'  && <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>}
                {item.href === '/profil'     && <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                <span style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{item.label}</span>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
