'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { C, D, M } from '@/lib/design-tokens'
import { TopBar } from '@/app/dashboard/components/TopBar'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProgramContentRow {
  phase_number:  number
  week_number:   number
  title:         string | null
  objectives:    string | null
  focus_text:    string | null
  robin_notes:   string | null
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
  programContent: ProgramContentRow[]
  onboardingDate: string | null
  robinWhatsapp:  string | null
}

// ─── Phases ───────────────────────────────────────────────────────────────────
const PHASES = [
  { phase: 1, label: 'Destruction',    weeks: [1,2,3,4],            days: '1–30'    },
  { phase: 2, label: 'Fondation',      weeks: [5,6,7,8,9],          days: '31–60'   },
  { phase: 3, label: 'Ignition',       weeks: [10,11,12,13],        days: '61–90'   },
  { phase: 4, label: 'Accélération',   weeks: [14,15,16,17],        days: '91–120'  },
  { phase: 5, label: 'Domination',     weeks: [18,19,20,21],        days: '121–150' },
  { phase: 6, label: 'Transcendance',  weeks: [22,23,24,25,26],     days: '151–180' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProgrammeClient({
  jourX, firstName, gamification, programContent, onboardingDate, robinWhatsapp,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const currentWeek     = Math.min(Math.ceil(jourX / 7), 26)
  const currentPhaseIdx = PHASES.findIndex(p => p.weeks.includes(currentWeek))
  const daysPct         = Math.round((jourX / 180) * 100)
  const daysLeft        = 180 - jourX

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Build week lookup map
  const contentMap = new Map<number, ProgramContentRow>()
  for (const row of programContent) contentMap.set(row.week_number, row)

  // Current week content
  const currentWeekContent = contentMap.get(currentWeek)

  const navItems = [
    { label: 'Dashboard',  href: '/dashboard',  active: false },
    { label: 'Programme',  href: '/programme',  active: true  },
    { label: 'Classement', href: '/classement', active: false },
    { label: 'Profil',     href: '/profil',     active: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, overflowX: 'hidden' }}>

      <TopBar
        jourX={jourX}
        daysLeft={daysLeft}
        daysPct={daysPct}
        firstName={firstName}
        navItems={navItems}
        onSignOut={handleSignOut}
        onboardingDate={onboardingDate}
        robinWhatsapp={robinWhatsapp}
      />

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main style={{ padding: '28px 40px 80px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Cette semaine ─────────────────────────────────────────────────── */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${C.accent}`,
          marginBottom: 40,
        }}>
          <div style={{ padding: '20px 24px 8px' }}>
            <div style={{
              ...D, fontWeight: 900, fontSize: '20px',
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: C.text, marginBottom: 4,
            }}>
              Cette semaine
            </div>
            <div style={{ ...M, fontSize: '11px', color: C.muted, marginBottom: 16 }}>
              Semaine {currentWeek} / 26 &nbsp;&middot;&nbsp; Jour {jourX} / 180
            </div>
          </div>

          {currentWeekContent ? (
            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {currentWeekContent.objectives && (
                <div>
                  <div style={{
                    ...D, fontWeight: 700, fontSize: '10px',
                    letterSpacing: '0.25em', textTransform: 'uppercase' as const,
                    color: C.muted, marginBottom: 6,
                  }}>
                    Objectifs
                  </div>
                  <div style={{
                    ...D, fontWeight: 500, fontSize: '14px',
                    color: C.text, lineHeight: 1.6,
                    whiteSpace: 'pre-line' as const,
                  }}>
                    {currentWeekContent.objectives}
                  </div>
                </div>
              )}
              {currentWeekContent.focus_text && (
                <div>
                  <div style={{
                    ...D, fontWeight: 700, fontSize: '10px',
                    letterSpacing: '0.25em', textTransform: 'uppercase' as const,
                    color: C.muted, marginBottom: 6,
                  }}>
                    Focus
                  </div>
                  <div style={{
                    ...D, fontWeight: 500, fontSize: '14px',
                    color: C.text, lineHeight: 1.6,
                    whiteSpace: 'pre-line' as const,
                  }}>
                    {currentWeekContent.focus_text}
                  </div>
                </div>
              )}
              {currentWeekContent.robin_notes && (
                <div style={{
                  background: `${C.accent}08`,
                  border: `1px solid ${C.accent}20`,
                  padding: '14px 16px',
                }}>
                  <div style={{
                    ...D, fontWeight: 700, fontSize: '10px',
                    letterSpacing: '0.25em', textTransform: 'uppercase' as const,
                    color: C.accent, marginBottom: 6,
                  }}>
                    Note de Robin
                  </div>
                  <div style={{
                    ...D, fontWeight: 500, fontSize: '14px',
                    color: C.text, lineHeight: 1.6,
                    whiteSpace: 'pre-line' as const,
                    fontStyle: 'italic',
                  }}>
                    {currentWeekContent.robin_notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{
                ...D, fontWeight: 500, fontSize: '14px',
                color: C.muted, lineHeight: 1.6,
              }}>
                Robin n&apos;a pas encore configure cette semaine.
              </div>
            </div>
          )}
        </div>

        {/* ── Timeline verticale ───────────────────────────────────────────── */}
        <div style={{
          ...D, fontWeight: 700, fontSize: '10px',
          letterSpacing: '0.35em', textTransform: 'uppercase' as const,
          color: C.muted, marginBottom: 20,
        }}>
          Programme 180 jours
        </div>

        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: 15,
            top: 0,
            bottom: 0,
            width: 2,
            background: C.border,
            zIndex: 0,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PHASES.map((phase, phaseIdx) => {
              const isCurrent = phaseIdx === currentPhaseIdx
              const isPast    = currentPhaseIdx >= 0 && phaseIdx < currentPhaseIdx
              const isFuture  = currentPhaseIdx >= 0 && phaseIdx > currentPhaseIdx

              // Progressive opacity for future phases
              const futureOffset = isFuture ? phaseIdx - currentPhaseIdx : 0
              const opacity = isFuture
                ? Math.max(0.3, 1 - futureOffset * 0.15)
                : isPast ? 0.6 : 1

              // Progress within current phase
              const weeksInPhase = phase.weeks.length
              const weeksCompleted = isCurrent
                ? phase.weeks.filter(w => w < currentWeek).length
                : isPast ? weeksInPhase : 0
              const weeksCurrent = isCurrent ? 1 : 0
              const progressPct = isCurrent
                ? Math.round(((weeksCompleted + 0.5) / weeksInPhase) * 100)
                : isPast ? 100 : 0

              return (
                <div key={phase.phase} style={{ opacity, position: 'relative', paddingLeft: 44 }}>

                  {/* ── Dot on timeline ──────────────────────────────────── */}
                  <div style={{
                    position: 'absolute',
                    left: 8,
                    top: 20,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: isCurrent ? C.accent : isPast ? C.muted : C.border,
                    border: `2px solid ${isCurrent ? C.accent : isPast ? C.muted : C.border}`,
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isPast && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.5 7.5L8 3" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isCurrent && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>

                  {/* ── Phase card ─────────────────────────────────────── */}
                  <div style={{
                    background: isCurrent ? `${C.accent}0A` : C.surface,
                    border: `1px solid ${isCurrent ? C.accent + '40' : C.border}`,
                    marginBottom: 2,
                    overflow: 'hidden',
                  }}>
                    {/* Phase header */}
                    <div style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap' as const,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{
                            ...M, fontSize: '10px',
                            color: isCurrent ? C.accent : C.muted,
                            letterSpacing: '0.15em',
                          }}>
                            PHASE {phase.phase}
                          </span>
                          {isCurrent && (
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px',
                              letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                              color: C.accent,
                              border: `1px solid ${C.accent}`,
                              padding: '2px 8px',
                            }}>
                              En cours
                            </span>
                          )}
                          {isPast && (
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px',
                              letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                              color: C.muted,
                              border: `1px solid ${C.border}`,
                              padding: '2px 8px',
                            }}>
                              Terminee
                            </span>
                          )}
                        </div>
                        <div style={{
                          ...D, fontWeight: 900, fontSize: '18px',
                          letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                          color: isCurrent ? C.text : isPast ? C.muted : C.text,
                        }}>
                          {phase.label}
                        </div>
                      </div>
                      <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                        Jours {phase.days}
                      </span>
                    </div>

                    {/* Progress bar for current phase */}
                    {isCurrent && (
                      <div style={{ padding: '0 20px 12px' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', marginBottom: 6,
                        }}>
                          <span style={{
                            ...M, fontSize: '10px', color: C.muted,
                          }}>
                            S{phase.weeks[0]}–S{phase.weeks[phase.weeks.length - 1]}
                          </span>
                          <span style={{
                            ...M, fontSize: '10px', color: C.accent,
                          }}>
                            {weeksCompleted + weeksCurrent}/{weeksInPhase} semaines
                          </span>
                        </div>
                        <div style={{
                          height: 4,
                          background: C.border,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: C.accent,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Weeks inside phase */}
                    <div style={{ borderTop: `1px solid ${isCurrent ? C.accent + '20' : C.border}` }}>
                      {phase.weeks.map(weekNum => {
                        const weekContent    = contentMap.get(weekNum)
                        const isCurrentWeek  = weekNum === currentWeek
                        const isPastWeek     = weekNum < currentWeek
                        const dayStart       = (weekNum - 1) * 7 + 1
                        const dayEnd         = Math.min(weekNum * 7, 180)

                        return (
                          <div
                            key={weekNum}
                            style={{
                              padding: '12px 20px',
                              borderBottom: `1px solid ${isCurrent ? C.accent + '10' : C.border}`,
                              background: isCurrentWeek ? `${C.accent}12` : 'transparent',
                            }}
                          >
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', gap: 12,
                              marginBottom: weekContent ? 6 : 0,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  ...M, fontWeight: 700, fontSize: '11px',
                                  color: isCurrentWeek ? C.accent : isPastWeek ? C.muted : C.muted,
                                  minWidth: 28,
                                }}>
                                  S{String(weekNum).padStart(2, '0')}
                                </span>
                                <span style={{
                                  ...D, fontWeight: 700, fontSize: '14px',
                                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                                  color: isCurrentWeek ? C.text : isPastWeek ? C.muted : C.muted,
                                }}>
                                  {weekContent?.title ?? `Semaine ${weekNum}`}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                                  J{dayStart}–{dayEnd}
                                </span>
                                {isCurrentWeek && (
                                  <span style={{
                                    width: 6, height: 6,
                                    borderRadius: '50%',
                                    background: C.accent,
                                    flexShrink: 0,
                                  }} />
                                )}
                                {isPastWeek && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Week content details */}
                            {weekContent && (weekContent.objectives || weekContent.focus_text) && (
                              <div style={{ paddingLeft: 38, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {weekContent.objectives && (
                                  <div style={{
                                    ...D, fontWeight: 500, fontSize: '12px',
                                    color: isCurrentWeek ? C.text : C.muted,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-line' as const,
                                  }}>
                                    {weekContent.objectives}
                                  </div>
                                )}
                                {weekContent.focus_text && (
                                  <div style={{
                                    ...D, fontWeight: 500, fontSize: '11px',
                                    color: C.muted, lineHeight: 1.5,
                                    fontStyle: 'italic',
                                  }}>
                                    {weekContent.focus_text}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}
