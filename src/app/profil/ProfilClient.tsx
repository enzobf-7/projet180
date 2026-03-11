'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GlcLogo from '@/components/GlcLogo'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#060606',
  surface: '#0F0F0F',
  sidebar: '#060606',
  border:  '#1E1E1E',
  muted:   '#888888',
  dimmed:  '#1E1E1E',
  text:    '#F2F2F5',
  accent:  '#8B1A1A',
  gold:    '#C9A84C',
  green:   '#22C55E',
}
const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const
const M = { fontFamily: '"JetBrains Mono", monospace' }    as const

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

interface Props {
  jourX:          number
  email:          string
  responses:      Record<string, unknown>
  gamification:   Gamification
  onboardingDate: string | null
  weeklyReports:  WeeklyReport[]
}

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
function getLevelProgress(xp: number) {
  const lvl = getCurrentLevel(xp)
  if (lvl.max === Infinity) return 100
  return Math.round(((xp - lvl.min) / (lvl.max - lvl.min)) * 100)
}

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
      { key: 'why_us',      label: 'Pourquoi GLC ?' },
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

export default function ProfilClient({ jourX, email, responses, gamification, onboardingDate, weeklyReports }: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState(0)
  const [signOutLoading, setSignOutLoading] = useState(false)

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
    { label: 'Profil',     href: '/profil',     active: true  },
  ]

  async function handleSignOut() {
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const startDate = onboardingDate ? new Date(onboardingDate) : null
  const endDate   = startDate ? new Date(startDate.getTime() + 180 * 86400000) : null

  function fmt(d: Date) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0,
        background: C.sidebar, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: `1px solid ${C.border}` }}>
          <GlcLogo size="sm" showText />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' as const }}>
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
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            title="Déconnexion"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '18px', lineHeight: 1, padding: 4 }}
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(6,6,6,0.90)', backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 2, background: C.dimmed }}>
            <div style={{ height: '100%', width: `${daysPct}%`, background: C.accent, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ ...D, fontWeight: 900, fontSize: '26px', letterSpacing: '0.06em', color: C.text, lineHeight: 1 }}>
                PROFIL
              </span>
              <span style={{ ...M, fontSize: '11px', color: C.muted }}>— Jour {jourX} / 180</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: '40px', maxWidth: 900, width: '100%' }}>

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

          {/* ── Questionnaire ─────────────────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            {/* Section tabs */}
            <div style={{
              display: 'flex', overflowX: 'auto' as const,
              borderBottom: `1px solid ${C.border}`,
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
          </div>

        {/* ── Weekly Reports ────────────────────────────────────────────────── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginTop: 24 }}>
          <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ ...D, fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: C.text, margin: 0 }}>
              Bilans hebdomadaires
            </h2>
          </div>

          {weeklyReports.length === 0 ? (
            <div style={{ padding: '32px 28px', ...D, fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted }}>
              Aucun bilan disponible pour l'instant
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
                          Analyse Robin
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

        </div>
      </main>
    </div>
  )
}
