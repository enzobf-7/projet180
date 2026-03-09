'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#060606',
  surface: '#0F0F0F',
  sidebar: '#060606',
  border:  '#1E1E1E',
  muted:   '#484848',
  dimmed:  '#1E1E1E',
  text:    '#F2F2F5',
  accent:  '#8B1A1A',
  gold:    '#C9A84C',
}
const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const
const M = { fontFamily: '"JetBrains Mono", monospace' }    as const

// ─── Types ────────────────────────────────────────────────────────────────────
export type ModuleType = 'video' | 'lecture' | 'exercise' | 'call' | 'podcast' | 'challenge' | 'bonus'

export interface ProgramModule {
  id:           string
  title:        string
  description?: string
  type:         ModuleType
  duration_min?: number
  url?:         string
}

export interface ProgramWeek {
  week:    number
  title:   string
  theme?:  string
  modules: ProgramModule[]
}

interface Gamification {
  xp_total:       number
  current_streak: number
  longest_streak: number
  level:          number
}

interface Props {
  jourX:          number
  firstName:      string
  gamification:   Gamification
  content:        ProgramWeek[]
  onboardingDate: string | null
}

// ─── Phases ───────────────────────────────────────────────────────────────────
const PHASES = [
  { phase: 1, label: 'Fondations',    weeks: [1,2,3,4],              days: '1–28'    },
  { phase: 2, label: 'Accélération',  weeks: [5,6,7,8],              days: '29–56'   },
  { phase: 3, label: 'Consolidation', weeks: [9,10,11,12],           days: '57–84'   },
  { phase: 4, label: 'Maîtrise',      weeks: [13,14,15,16],          days: '85–112'  },
  { phase: 5, label: 'Optimisation',  weeks: [17,18,19,20],          days: '113–140' },
  { phase: 6, label: 'Excellence',    weeks: [21,22,23,24,25,26],    days: '141–180' },
]

// ─── Level system ─────────────────────────────────────────────────────────────
const LEVELS = [
  { name: 'Initié',          min: 0,     max: 500   },
  { name: 'Soldat',          min: 500,   max: 1500  },
  { name: 'Guerrier',        min: 1500,  max: 3000  },
  { name: 'Combattant',      min: 3000,  max: 6000  },
  { name: "Homme d'honneur", min: 6000,  max: 12000 },
  { name: 'Gentleman Létal', min: 12000, max: Infinity },
]
function getCurrentLevel(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp < l.max) ?? LEVELS[LEVELS.length - 1]
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

// ─── Module type config ───────────────────────────────────────────────────────
const MODULE_CONFIG: Record<ModuleType, { label: string; color: string }> = {
  video:     { label: 'VIDEO',    color: C.accent   },
  lecture:   { label: 'LECTURE',  color: '#5B8DEF'  },
  exercise:  { label: 'EXERCICE', color: '#E07B39'  },
  call:      { label: 'APPEL',    color: '#9B6FE0'  },
  podcast:   { label: 'PODCAST',  color: '#3BBFBF'  },
  challenge: { label: 'DÉFI',     color: C.gold     },
  bonus:     { label: 'BONUS',    color: C.muted    },
}

// ─── Duration formatter ───────────────────────────────────────────────────────
function formatDuration(minutes: number): string {
  if (minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProgrammeClient({
  jourX, firstName, gamification, content, onboardingDate,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const countdown = useCountdown(onboardingDate)

  const currentWeek     = Math.min(Math.ceil(jourX / 7), 26)
  const currentPhaseObj = PHASES.find(p => p.weeks.includes(currentWeek))
  const [activePhase, setActivePhase] = useState(currentPhaseObj?.phase ?? 1)

  const xp       = gamification.xp_total
  const level    = getCurrentLevel(xp)
  const daysPct  = Math.round((jourX / 180) * 100)
  const daysLeft = 180 - jourX

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Build week lookup map
  const weekMap = new Map<number, ProgramWeek>()
  for (const w of content) weekMap.set(w.week, w)

  const hasContent = content.length > 0

  // Active phase derived values
  const activePhaseInfo   = PHASES.find(p => p.phase === activePhase)!
  const phaseWeeks        = activePhaseInfo.weeks
  const assignedWeeks     = phaseWeeks.filter(wn => weekMap.has(wn))
  const totalModules      = assignedWeeks.reduce((s, wn) => s + (weekMap.get(wn)?.modules.length ?? 0), 0)
  const totalDuration     = assignedWeeks.reduce((s, wn) => {
    const w = weekMap.get(wn)
    return s + (w?.modules.reduce((ms, m) => ms + (m.duration_min ?? 0), 0) ?? 0)
  }, 0)

  const navItems = [
    { label: 'Dashboard',  href: '/dashboard',  active: false },
    { label: 'Programme',  href: '/programme',  active: true  },
    { label: 'Messagerie', href: '/messagerie', active: false },
    { label: 'Profil',     href: '/profil',     active: false },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text, overflowX: 'hidden' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside style={{
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
              background: item.active ? C.border : 'transparent',
              borderLeft: item.active ? `2px solid ${C.accent}` : '2px solid transparent',
            }}>
              {item.label}
            </a>
          ))}
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
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── Sticky header ─────────────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(6,6,6,0.90)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 2, background: C.dimmed }}>
            <div style={{ height: '100%', width: `${daysPct}%`, background: C.accent, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ ...D, fontWeight: 900, fontSize: '26px', letterSpacing: '0.06em', color: C.text, lineHeight: 1 }}>
                JOUR {jourX}
              </span>
              <span style={{ ...M, fontSize: '11px', color: C.muted }}>/ 180 — {daysLeft}j restants</span>
            </div>
            {onboardingDate && (
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

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(160deg, #0F0F0F 0%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
          padding: '52px 40px 44px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>

            {/* Left */}
            <div>
              <div style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.4em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>
                Programme 180 Jours · Gentleman Létal Club
              </div>
              <h1 style={{
                ...D, fontWeight: 900,
                fontSize: 'clamp(56px, 7.5vw, 104px)',
                lineHeight: 0.88, letterSpacing: '0.02em',
                textTransform: 'uppercase' as const,
                color: C.text, margin: '0 0 20px',
              }}>
                Programme
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                <span style={{
                  ...D, fontWeight: 700, fontSize: '14px', letterSpacing: '0.2em',
                  textTransform: 'uppercase' as const,
                  color: C.accent,
                  borderLeft: `3px solid ${C.accent}`,
                  paddingLeft: 10,
                }}>
                  {level.name}
                </span>
                <span style={{
                  ...M, fontSize: '11px', color: C.muted,
                  border: `1px solid ${C.border}`,
                  padding: '2px 10px',
                }}>
                  Semaine {currentWeek} / 26
                </span>
                {currentPhaseObj && (
                  <span style={{
                    ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em',
                    textTransform: 'uppercase' as const, color: C.gold,
                    border: `1px solid ${C.gold}40`,
                    padding: '2px 10px',
                  }}>
                    {currentPhaseObj.label}
                  </span>
                )}
              </div>
            </div>

            {/* Right: week counter */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
              <span style={{ ...M, fontWeight: 700, fontSize: '88px', lineHeight: 1, color: C.text, letterSpacing: '-0.04em' }}>
                {String(currentWeek).padStart(2, '0')}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ ...D, fontWeight: 700, fontSize: '12px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const }}>/26</span>
                <span style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em', color: C.muted, textTransform: 'uppercase' as const }}>SEMAINES</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quote strip ───────────────────────────────────────────────────── */}
        <div style={{ background: C.accent, padding: '13px 40px', overflow: 'hidden' }}>
          <span style={{
            ...D, fontWeight: 900, fontSize: '12px',
            letterSpacing: '0.32em', textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap',
          }}>
            LE CONFORT EST L&apos;ENNEMI DU PROGRÈS &nbsp;·&nbsp; DISCIPLINE &nbsp;·&nbsp; EXCELLENCE &nbsp;·&nbsp; IDENTITÉ
          </span>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div style={{ padding: '36px 40px 80px' }}>

          {!hasContent ? (

            /* ── Empty state ────────────────────────────────────────────────── */
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderTop: `2px solid ${C.accent}`,
              padding: '56px 40px',
            }}>
              <div style={{ ...D, fontWeight: 900, fontSize: '13px', letterSpacing: '0.35em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 20 }}>
                Programme en cours de préparation
              </div>
              <p style={{ ...D, fontWeight: 500, fontSize: '16px', color: C.text, lineHeight: 1.65, margin: '0 0 36px', maxWidth: 520 }}>
                Robin prépare votre programme personnalisé pour les 180 prochains jours.<br />
                Il sera disponible sous peu.
              </p>
              {/* Phase previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PHASES.map(p => {
                  const isCurrent = p.weeks.includes(currentWeek)
                  return (
                    <div key={p.phase} style={{
                      display: 'flex', alignItems: 'center', gap: 20,
                      padding: '14px 20px',
                      background: isCurrent ? `${C.accent}08` : 'transparent',
                      border: `1px solid ${isCurrent ? C.accent + '30' : C.border}`,
                      borderLeft: `3px solid ${isCurrent ? C.accent : C.dimmed}`,
                      opacity: p.weeks[p.weeks.length - 1] < currentWeek ? 0.4 : 1,
                    }}>
                      <span style={{ ...M, fontSize: '10px', color: isCurrent ? C.accent : C.muted, minWidth: 52 }}>
                        Phase {p.phase}
                      </span>
                      <span style={{ ...D, fontWeight: 900, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: isCurrent ? C.text : C.muted, flex: 1 }}>
                        {p.label}
                      </span>
                      <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                        Jours {p.days} &nbsp;·&nbsp; S{p.weeks[0]}–{p.weeks[p.weeks.length - 1]}
                      </span>
                      {isCurrent && (
                        <span style={{
                          ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                          textTransform: 'uppercase' as const,
                          color: C.accent, border: `1px solid ${C.accent}`,
                          padding: '2px 8px',
                        }}>
                          En cours
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          ) : (
            <>
              {/* ── Phase tabs ──────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginBottom: 24 }}>
                {PHASES.map(p => {
                  const isActive  = p.phase === activePhase
                  const isCurrent = p.weeks.includes(currentWeek)
                  const isPast    = p.weeks[p.weeks.length - 1] < currentWeek
                  const assigned  = p.weeks.filter(wn => weekMap.has(wn)).length
                  return (
                    <button
                      key={p.phase}
                      onClick={() => setActivePhase(p.phase)}
                      style={{
                        padding: '14px 12px',
                        background:  isActive ? C.surface : 'transparent',
                        border:      `1px solid ${isActive ? C.accent + '50' : C.border}`,
                        borderTop:   `2px solid ${isActive ? C.accent : isCurrent ? C.gold + '80' : 'transparent'}`,
                        cursor:      'pointer',
                        textAlign:   'left' as const,
                        transition:  'background 0.15s, border-color 0.15s',
                        minWidth:    0,
                      }}
                    >
                      <div style={{ ...M, fontSize: '8px', color: isActive ? C.accent : isCurrent ? C.gold : C.muted, marginBottom: 5, letterSpacing: '0.15em' }}>
                        PHASE {p.phase}
                      </div>
                      <div style={{ ...D, fontWeight: 900, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: isActive ? C.text : isPast ? C.muted : C.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.label}
                      </div>
                      <div style={{ ...M, fontSize: '8px', color: C.muted }}>
                        {p.days}j
                      </div>
                      {assigned > 0 && (
                        <div style={{ ...M, fontSize: '8px', color: isActive ? C.accent : C.muted, marginTop: 4 }}>
                          {assigned}/{p.weeks.length} sem.
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* ── Phase summary bar ───────────────────────────────────────── */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                background: C.surface, border: `1px solid ${C.border}`,
                marginBottom: 24,
              }}>
                {[
                  { label: 'Phase',     val: activePhaseInfo.label,                                      mono: false },
                  { label: 'Semaines',  val: `S${phaseWeeks[0]} – S${phaseWeeks[phaseWeeks.length - 1]}`, mono: true  },
                  { label: 'Modules',   val: totalModules > 0 ? String(totalModules) : '—',               mono: true  },
                  { label: 'Durée',     val: formatDuration(totalDuration),                               mono: true  },
                ].map((stat, i) => (
                  <div key={i} style={{ padding: '16px 20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                      {stat.label}
                    </div>
                    <div style={{
                      ...(stat.mono ? M : D),
                      fontSize: stat.mono ? '18px' : '15px',
                      fontWeight: 700, color: C.text, lineHeight: 1,
                      textTransform: stat.mono ? 'none' as const : 'uppercase' as const,
                      letterSpacing: stat.mono ? 0 : '0.06em',
                    }}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Week cards ──────────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {phaseWeeks.map(weekNum => {
                  const weekData  = weekMap.get(weekNum)
                  const isCurrent = weekNum === currentWeek
                  const isPast    = weekNum < currentWeek
                  const isFuture  = weekNum > currentWeek
                  const dayStart  = (weekNum - 1) * 7 + 1
                  const dayEnd    = Math.min(weekNum * 7, 180)
                  const weekDuration = weekData?.modules.reduce((s, m) => s + (m.duration_min ?? 0), 0) ?? 0

                  return (
                    <div
                      key={weekNum}
                      style={{
                        background:  isCurrent ? `${C.accent}07` : C.bg,
                        border:      `1px solid ${isCurrent ? C.accent + '40' : C.border}`,
                        borderLeft:  `3px solid ${isCurrent ? C.accent : isPast ? C.dimmed : 'transparent'}`,
                        opacity:     isFuture && !weekData ? 0.5 : 1,
                        transition:  'opacity 0.2s',
                      }}
                    >
                      {/* Week header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderBottom: weekData && weekData.modules.length > 0 ? `1px solid ${C.border}` : 'none',
                        gap: 16,
                        flexWrap: 'wrap' as const,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ ...M, fontWeight: 700, fontSize: '11px', color: isCurrent ? C.accent : C.dimmed, flexShrink: 0 }}>
                            S{String(weekNum).padStart(2, '0')}
                          </span>
                          <div>
                            <div style={{
                              ...D, fontWeight: 900, fontSize: '16px', letterSpacing: '0.1em',
                              textTransform: 'uppercase' as const,
                              color: isCurrent ? C.text : isPast ? C.muted : weekData ? C.muted : C.dimmed,
                              marginBottom: weekData?.theme ? 2 : 0,
                            }}>
                              {weekData?.title ?? 'À venir'}
                            </div>
                            {weekData?.theme && (
                              <div style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: isCurrent ? C.accent : C.muted }}>
                                {weekData.theme}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' as const }}>
                          {weekData && weekData.modules.length > 0 && (
                            <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                              {weekData.modules.length} module{weekData.modules.length > 1 ? 's' : ''}
                              {weekDuration > 0 && ` · ${formatDuration(weekDuration)}`}
                            </span>
                          )}
                          <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                            J{dayStart}–{dayEnd}
                          </span>
                          {isCurrent && (
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                              textTransform: 'uppercase' as const,
                              color: C.accent, border: `1px solid ${C.accent}`,
                              padding: '2px 8px', flexShrink: 0,
                            }}>
                              En cours
                            </span>
                          )}
                          {isPast && (
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                              textTransform: 'uppercase' as const,
                              color: C.muted, border: `1px solid ${C.border}`,
                              padding: '2px 8px', flexShrink: 0,
                            }}>
                              Complété
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Module list */}
                      {weekData && weekData.modules.length > 0 && weekData.modules.map((mod, mi) => {
                        const cfg = MODULE_CONFIG[mod.type] ?? MODULE_CONFIG.bonus
                        if (mod.url) {
                          return (
                            <a
                              key={mod.id}
                              href={mod.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 16,
                                padding: '13px 24px',
                                borderTop: `1px solid ${C.border}`,
                                textDecoration: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = C.surface }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ ...M, fontSize: '10px', color: C.muted, minWidth: 24, paddingTop: 2, flexShrink: 0 }}>
                                {String(mi + 1).padStart(2, '0')}
                              </span>
                              <span style={{
                                ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                                textTransform: 'uppercase' as const,
                                color: cfg.color, background: cfg.color + '18',
                                padding: '3px 8px', whiteSpace: 'nowrap' as const,
                                flexShrink: 0, marginTop: 1,
                              }}>
                                {cfg.label}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ ...D, fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: isFuture ? C.muted : C.text, marginBottom: mod.description ? 3 : 0 }}>
                                  {mod.title}
                                  <span style={{ ...M, fontSize: '9px', color: C.muted, marginLeft: 8 }}>↗</span>
                                </div>
                                {mod.description && (
                                  <div style={{ ...D, fontWeight: 500, fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>
                                    {mod.description}
                                  </div>
                                )}
                              </div>
                              {mod.duration_min ? (
                                <span style={{ ...M, fontSize: '10px', color: C.muted, flexShrink: 0, paddingTop: 2 }}>
                                  {mod.duration_min}min
                                </span>
                              ) : null}
                            </a>
                          )
                        }
                        return (
                          <div
                            key={mod.id}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 16,
                              padding: '13px 24px',
                              borderTop: `1px solid ${C.border}`,
                            }}
                          >
                            <span style={{ ...M, fontSize: '10px', color: C.muted, minWidth: 24, paddingTop: 2, flexShrink: 0 }}>
                              {String(mi + 1).padStart(2, '0')}
                            </span>
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em',
                              textTransform: 'uppercase' as const,
                              color: cfg.color, background: cfg.color + '18',
                              padding: '3px 8px', whiteSpace: 'nowrap' as const,
                              flexShrink: 0, marginTop: 1,
                            }}>
                              {cfg.label}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ ...D, fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: isFuture ? C.muted : C.text, marginBottom: mod.description ? 3 : 0 }}>
                                {mod.title}
                              </div>
                              {mod.description && (
                                <div style={{ ...D, fontWeight: 500, fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>
                                  {mod.description}
                                </div>
                              )}
                            </div>
                            {mod.duration_min ? (
                              <span style={{ ...M, fontSize: '10px', color: C.muted, flexShrink: 0, paddingTop: 2 }}>
                                {mod.duration_min}min
                              </span>
                            ) : null}
                          </div>
                        )
                      })}

                      {/* No content placeholder for assigned weeks with 0 modules (shouldn't normally happen) */}
                      {weekData && weekData.modules.length === 0 && (
                        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}` }}>
                          <span style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted }}>
                            Modules en préparation
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
