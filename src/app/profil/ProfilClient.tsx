'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { C, D, M } from '@/lib/design-tokens'
import { TopBar } from '@/app/dashboard/components/TopBar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Gamification {
  xp_total:       number
  current_streak: number
  longest_streak: number
  level:          number
}

interface WeeklyReport {
  id:               string
  week_number:      number
  motivation_score: number | null
  responses:        Record<string, unknown>
  submitted_at:     string
}

interface Win {
  id:          string
  content:     string
  week_number: number
  created_at:  string
}

interface Props {
  jourX:          number
  email:          string
  responses:      Record<string, unknown>
  gamification:   Gamification
  onboardingDate: string | null
  weeklyReports:  WeeklyReport[]
  wins:           Win[]
}

import { LEVELS, getCurrentLevel, getLevelProgress } from '@/lib/levels'

// ─── Questionnaire sections ───────────────────────────────────────────────────
const SECTIONS = [
  {
    label: 'Identité',
    fields: [
      { key: 'full_name',   label: 'Nom complet' },
      { key: 'age',         label: 'Âge' },
      { key: 'city',        label: 'Ville' },
      { key: 'job',         label: 'Profession' },
      { key: 'income',      label: 'Revenus actuels' },
      { key: 'how_found',   label: 'Comment nous avez-vous trouvé ?' },
      { key: 'why_us',      label: 'Pourquoi Projet180 ?' },
    ],
  },
  {
    label: 'Corps & Santé',
    fields: [
      { key: 'daily_routine',       label: 'Routine quotidienne' },
      { key: 'body_relationship',   label: 'Relation avec votre corps' },
      { key: 'training',            label: 'Entraînement actuel' },
      { key: 'nutrition',           label: 'Alimentation' },
      { key: 'sleep_hours',         label: 'Heures de sommeil' },
      { key: 'health_notes',        label: 'Notes de santé' },
    ],
  },
  {
    label: 'Business & Finance',
    fields: [
      { key: 'business_description', label: 'Votre activité' },
      { key: 'financial_goal',       label: 'Objectif financier' },
      { key: 'business_blocker',     label: 'Blocages business' },
      { key: 'past_coaching',        label: 'Coaching passé' },
    ],
  },
  {
    label: 'Mental & Comportement',
    fields: [
      { key: 'frustration',     label: 'Frustrations' },
      { key: 'procrastination', label: 'Procrastination' },
      { key: 'patterns',        label: 'Patterns récurrents' },
      { key: 'screen_time',     label: 'Temps écran' },
      { key: 'substances',      label: 'Substances' },
    ],
  },
  {
    label: 'Social & Lifestyle',
    fields: [
      { key: 'relationship',   label: 'Relation amoureuse' },
      { key: 'social_circle',  label: 'Cercle social' },
      { key: 'travel',         label: 'Voyages' },
      { key: 'hobbies',        label: 'Loisirs' },
    ],
  },
  {
    label: 'Vision & Engagement',
    fields: [
      { key: 'success_vision',     label: 'Vision du succès' },
      { key: 'main_goal',          label: 'Objectif principal 180j' },
      { key: 'tried_failed',       label: 'Ce qui a échoué par le passé' },
      { key: 'why_now',            label: 'Pourquoi maintenant' },
      { key: 'weekly_hours',       label: 'Heures/semaine disponibles' },
      { key: 'feedback_reaction',  label: 'Réaction au feedback' },
      { key: 'anything_else',      label: 'Autres informations' },
    ],
  },
]

const SCORE_FIELDS = [
  { key: 'score_body',     label: 'Corps' },
  { key: 'score_business', label: 'Business' },
  { key: 'score_mental',   label: 'Mental' },
  { key: 'score_social',   label: 'Social' },
]

export default function ProfilClient({ jourX, email, responses, gamification, onboardingDate, weeklyReports, wins }: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState(0)
  const [signOutLoading, setSignOutLoading] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const daysPct   = Math.round((jourX / 180) * 100)
  const level     = getCurrentLevel(gamification.xp_total)
  const levelPct  = getLevelProgress(gamification.xp_total)
  const levelIdx  = LEVELS.findIndex(l => l.name === level.name)

  const rawName   = (responses.full_name as string) ?? ''
  const firstName = rawName.split(' ')[0] || 'Client'
  const lastName  = rawName.split(' ').slice(1).join(' ')

  const navItems = [
    { label: 'Dashboard',  href: '/dashboard',  active: false },
    { label: 'Programme',  href: '/programme',  active: false },
    { label: 'Classement', href: '/classement', active: false },
    { label: 'Profil',     href: '/profil',     active: true  },
  ]

  async function handleSignOut() {
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (newPassword.length < 6) {
      setPwError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }

    setPwLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwError(error.message)
      } else {
        setPwSuccess('Mot de passe mis à jour avec succès.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setPwError('Une erreur est survenue.')
    } finally {
      setPwLoading(false)
    }
  }

  const startDate = onboardingDate ? new Date(onboardingDate) : null
  const endDate   = startDate ? new Date(startDate.getTime() + 180 * 86400000) : null

  function fmt(d: Date) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const daysLeft = 180 - jourX

  // Group wins by week_number
  const winsByWeek: Map<number, Win[]> = new Map()
  for (const w of wins) {
    const existing = winsByWeek.get(w.week_number)
    if (existing) {
      existing.push(w)
    } else {
      winsByWeek.set(w.week_number, [w])
    }
  }
  const winWeeks = Array.from(winsByWeek.entries()).sort((a, b) => b[0] - a[0])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>

      <TopBar
        jourX={jourX}
        daysLeft={daysLeft}
        daysPct={daysPct}
        firstName={firstName}
        navItems={navItems}
        onSignOut={handleSignOut}
      />

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 110px)' }}>

        {/* Content */}
        <div style={{ padding: '40px', width: '100%' }}>

          {/* ── Hero card ─────────────────────────────────────────────────── */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            padding: '32px 40px', marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' as const,
          }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, flexShrink: 0,
              background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ ...D, fontWeight: 900, fontSize: '32px', color: 'white' }}>
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ ...D, fontWeight: 900, fontSize: '28px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, lineHeight: 1 }}>
                {firstName}{lastName ? ` ${lastName}` : ''}
              </div>
              <div style={{ ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.accent, marginTop: 4 }}>
                {level.name}
              </div>
              <div style={{ ...M, fontSize: '11px', color: C.muted, marginTop: 6 }}>{email}</div>
              {!!responses.city && (
                <div style={{ ...M, fontSize: '10px', color: C.muted, marginTop: 2 }}>
                  {responses.city as string}{responses.age ? ` · ${responses.age as string} ans` : ''}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
              {[
                { label: 'XP total',   value: gamification.xp_total.toLocaleString('fr-FR'), unit: 'pts' },
                { label: 'Série',      value: String(gamification.current_streak), unit: 'j' },
                { label: 'Jour',       value: String(jourX), unit: '/180' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' as const }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center' }}>
                    <span style={{ ...D, fontWeight: 900, fontSize: '28px', color: C.text, lineHeight: 1 }}>{s.value}</span>
                    <span style={{ ...M, fontSize: '11px', color: C.muted }}>{s.unit}</span>
                  </div>
                  <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Programme dates ───────────────────────────────────────────── */}
          {startDate && endDate && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              padding: '20px 28px', marginBottom: 32,
              display: 'flex', gap: 32, flexWrap: 'wrap' as const,
            }}>
              <div>
                <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 4 }}>
                  Début programme
                </div>
                <div style={{ ...M, fontSize: '14px', color: C.text }}>{fmt(startDate)}</div>
              </div>
              <div style={{ width: 1, background: C.border }} />
              <div>
                <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 4 }}>
                  Fin programme
                </div>
                <div style={{ ...M, fontSize: '14px', color: C.text }}>{fmt(endDate)}</div>
              </div>
              <div style={{ width: 1, background: C.border }} />
              <div>
                <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 4 }}>
                  Progression
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <div style={{ width: 120, height: 4, background: C.border }}>
                    <div style={{ height: '100%', width: `${daysPct}%`, background: C.accent }} />
                  </div>
                  <span style={{ ...M, fontSize: '12px', color: C.text }}>{daysPct}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Level progression ─────────────────────────────────────────── */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            padding: '24px 28px', marginBottom: 32,
          }}>
            <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 20 }}>
              Progression de niveau
            </div>
            <div style={{ display: 'flex', gap: 0, position: 'relative' as const }}>
              {LEVELS.map((lvl, i) => {
                const isActive  = i === levelIdx
                const isPast    = i < levelIdx
                const isMax     = i === LEVELS.length - 1
                return (
                  <div key={lvl.name} style={{ flex: 1, position: 'relative' as const }}>
                    {/* Connector */}
                    {i < LEVELS.length - 1 && (
                      <div style={{
                        position: 'absolute' as const, top: 6, left: '50%', right: '-50%',
                        height: 2,
                        background: isPast ? C.accent : i === levelIdx ? C.accent : C.dimmed,
                        zIndex: 0,
                      }} />
                    )}
                    {/* Node */}
                    <div style={{
                      width: 14, height: 14,
                      background: isPast ? C.accent : isActive ? C.accent : C.dimmed,
                      border: isActive ? `2px solid ${C.text}` : '2px solid transparent',
                      borderRadius: '50%',
                      position: 'relative' as const, zIndex: 1,
                      margin: '0 auto 10px',
                    }} />
                    {/* Label */}
                    <div style={{
                      ...D, fontWeight: 700, fontSize: '8px', letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const, textAlign: 'center' as const,
                      color: isActive ? C.text : isPast ? C.muted : C.dimmed,
                      lineHeight: 1.3,
                    }}>
                      {lvl.name}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* XP bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ ...M, fontSize: '11px', color: C.text }}>
                  {gamification.xp_total.toLocaleString('fr-FR')} XP
                </span>
                {level.max !== Infinity && (
                  <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                    → {level.max.toLocaleString('fr-FR')} XP pour {LEVELS[levelIdx + 1]?.name}
                  </span>
                )}
              </div>
              <div style={{ height: 4, background: C.border }}>
                <div style={{ height: '100%', width: `${levelPct}%`, background: C.accent, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          </div>

          {/* ── Scores d'entrée ───────────────────────────────────────────── */}
          {SCORE_FIELDS.some(f => responses[f.key] !== undefined) && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              padding: '24px 28px', marginBottom: 32,
            }}>
              <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 20 }}>
                Auto-évaluation d&apos;entrée
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
                {SCORE_FIELDS.map(f => {
                  const score = Number(responses[f.key]) || 0
                  return (
                    <div key={f.key} style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ ...D, fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted }}>
                          {f.label}
                        </span>
                        <span style={{ ...M, fontSize: '13px', color: C.text, fontWeight: 700 }}>{score}/10</span>
                      </div>
                      <div style={{ height: 3, background: C.border }}>
                        <div style={{
                          height: '100%',
                          width: `${score * 10}%`,
                          background: score >= 7 ? C.green : score >= 4 ? C.gold : C.accent,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Bilan hebdomadaire ──────────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: 32 }}>
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
              <h2 style={{ ...D, fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: C.text, margin: 0 }}>
                Bilan hebdomadaire
              </h2>
              <span style={{ ...M, fontSize: '10px', color: C.muted }}>
                Généré automatiquement chaque lundi
              </span>
            </div>

            {weeklyReports.length === 0 ? (
              <div style={{ padding: '32px 28px', ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted }}>
                Aucun bilan disponible pour l&apos;instant
              </div>
            ) : (
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {weeklyReports.map(report => {
                  const stats = report.responses ?? {}
                  const habitPct   = typeof stats.habit_completion_pct === 'number' ? stats.habit_completion_pct : null
                  const xp         = typeof stats.xp_total === 'number' ? stats.xp_total : null
                  const streak     = typeof stats.streak === 'number' ? stats.streak : null
                  const motiv      = report.motivation_score
                  const aiSummary  = typeof stats.ai_summary === 'string' && stats.ai_summary.trim() ? stats.ai_summary.trim() : null
                  const reportDate = new Date(report.submitted_at)
                  const weekLabel  = `Semaine ${report.week_number}`
                  const dateLabel  = fmt(reportDate)

                  return (
                    <div
                      key={report.id}
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        padding: '18px 22px',
                        display: 'flex',
                        flexDirection: 'column' as const,
                        gap: 14,
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
                        <div>
                          <span style={{ ...D, fontWeight: 800, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text }}>
                            {weekLabel}
                          </span>
                          <span style={{ ...M, fontSize: '11px', color: C.muted, marginLeft: 12 }}>
                            {dateLabel}
                          </span>
                        </div>
                        {motiv !== null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted }}>
                              Motivation
                            </span>
                            <span
                              style={{
                                ...D, fontWeight: 800, fontSize: '15px',
                                color: motiv >= 7 ? C.green : motiv >= 4 ? C.gold : '#E05252',
                              }}
                            >
                              {motiv}/10
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          { label: 'Habits', value: habitPct !== null ? `${habitPct}%` : '—' },
                          { label: 'XP semaine', value: xp !== null ? `+${xp}` : '—' },
                          { label: 'Streak', value: streak !== null ? `${streak}j` : '—' },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            style={{
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              padding: '10px 14px',
                            }}
                          >
                            <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 4 }}>
                              {label}
                            </div>
                            <div style={{ ...D, fontWeight: 800, fontSize: '20px', letterSpacing: '0.04em', color: C.text }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI summary */}
                      {aiSummary && (
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                          <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 8 }}>
                            Analyse IA
                          </div>
                          <p style={{ ...M, fontSize: '13px', color: C.text, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                            {aiSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Compilation des wins ──────────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: 32 }}>
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ ...D, fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: C.text, margin: 0 }}>
                Compilation des wins
              </h2>
            </div>

            {winWeeks.length === 0 ? (
              <div style={{ padding: '32px 28px', ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted }}>
                Aucun win posté pour l&apos;instant
              </div>
            ) : (
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                {winWeeks.map(([weekNum, weekWins]) => (
                  <div key={weekNum}>
                    <div style={{
                      ...D, fontWeight: 800, fontSize: '14px', letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const, color: C.text, marginBottom: 10,
                    }}>
                      Semaine {weekNum}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      {weekWins.map(win => (
                        <div
                          key={win.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 14px',
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <span style={{ ...D, fontSize: '14px', color: C.greenL, flexShrink: 0, lineHeight: 1.5 }}>
                            ◆
                          </span>
                          <span style={{ ...M, fontSize: '13px', color: C.text, lineHeight: 1.5 }}>
                            {win.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Questionnaire (accordéon) ─────────────────────────────────── */}
          <details style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <summary style={{
              ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: C.muted,
              padding: '16px 28px', cursor: 'pointer', userSelect: 'none' as const,
              listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              Questionnaire d&apos;entrée
              <span style={{ fontSize: '11px', letterSpacing: '0.1em' }}>▼</span>
            </summary>

            {/* Section tabs */}
            <div style={{
              display: 'flex', overflowX: 'auto' as const,
              borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            }}>
              {SECTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(i)}
                  style={{
                    ...D,
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase' as const,
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: i === activeSection ? `2px solid ${C.accent}` : '2px solid transparent',
                    color: i === activeSection ? C.text : C.muted,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap' as const,
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
                {SECTIONS[activeSection].fields.map(f => {
                  const val = responses[f.key]
                  if (!val && val !== 0) return null
                  return (
                    <div key={f.key} style={{ gridColumn: String(val).length > 80 ? '1 / -1' : 'auto' }}>
                      <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 4 }}>
                        {f.label}
                      </div>
                      <div style={{ ...M, fontSize: '13px', color: C.text, lineHeight: 1.5 }}>
                        {String(val)}
                      </div>
                    </div>
                  )
                })}
              </div>
              {SECTIONS[activeSection].fields.every(f => !responses[f.key] && responses[f.key] !== 0) && (
                <div style={{ ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', color: C.muted, textTransform: 'uppercase' as const }}>
                  Aucune réponse dans cette section
                </div>
              )}
            </div>
          </details>

          {/* ── Changer mot de passe (accordéon) ────────────────────────── */}
          <details style={{ background: C.surface, border: `1px solid ${C.border}`, marginTop: 32 }}>
            <summary style={{
              ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: C.muted,
              padding: '16px 28px', cursor: 'pointer', userSelect: 'none' as const,
              listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              Changer mon mot de passe
              <span style={{ fontSize: '11px', letterSpacing: '0.1em' }}>▼</span>
            </summary>

            <form onSubmit={handlePasswordChange} style={{ padding: '24px 28px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, maxWidth: 400 }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  <label style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted }}>
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{
                      ...M, fontSize: '14px',
                      padding: '10px 14px',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  <label style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted }}>
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{
                      ...M, fontSize: '14px',
                      padding: '10px 14px',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      outline: 'none',
                    }}
                  />
                </div>

                {pwError && (
                  <div style={{ ...M, fontSize: '12px', color: '#ff6b6b', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', padding: '10px 14px' }}>
                    {pwError}
                  </div>
                )}

                {pwSuccess && (
                  <div style={{ ...M, fontSize: '12px', color: C.greenL, background: 'rgba(34,197,94,0.12)', border: `1px solid rgba(34,197,94,0.25)`, padding: '10px 14px' }}>
                    {pwSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    padding: '12px 24px',
                    background: C.accent,
                    color: 'white',
                    border: 'none',
                    cursor: pwLoading ? 'not-allowed' : 'pointer',
                    opacity: pwLoading ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    alignSelf: 'flex-start',
                  }}
                >
                  {pwLoading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </details>

        </div>
      </main>
    </div>
  )
}
