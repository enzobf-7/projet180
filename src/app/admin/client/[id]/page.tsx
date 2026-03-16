import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { MissionProgressPanel } from './MissionProgressPanel'

// ─── Design tokens ────────────────────────────────────────────────────────────
const S = {
  bg:      '#060606',
  surface: '#0F0F0F',
  border:  '#1E1E1E',
  muted:   '#484848',
  label:   '#888888',
  text:    '#F5F5F5',
  accent:  '#3A86FF',
} as const
const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const
const M = { fontFamily: '"JetBrains Mono", monospace' }    as const

import { getLevelName } from '@/lib/levels'

// ─── Questionnaire sections ────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: 'Identité',
    fields: [
      { key: 'full_name',  label: 'Nom complet' },
      { key: 'age',        label: 'Âge' },
      { key: 'city',       label: 'Ville' },
      { key: 'job',        label: 'Profession' },
      { key: 'income',     label: 'Revenus actuels' },
      { key: 'how_found',  label: 'Comment nous avez-vous trouvé ?' },
      { key: 'why_us',     label: 'Pourquoi Projet180 ?' },
    ],
  },
  {
    label: 'Corps & Santé',
    fields: [
      { key: 'daily_routine',     label: 'Routine quotidienne' },
      { key: 'body_relationship', label: 'Relation avec votre corps' },
      { key: 'training',          label: 'Entraînement actuel' },
      { key: 'nutrition',         label: 'Alimentation' },
      { key: 'sleep_hours',       label: 'Heures de sommeil' },
      { key: 'health_notes',      label: 'Notes de santé' },
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
      { key: 'relationship',  label: 'Relation amoureuse' },
      { key: 'social_circle', label: 'Cercle social' },
      { key: 'travel',        label: 'Voyages' },
      { key: 'hobbies',       label: 'Loisirs' },
    ],
  },
  {
    label: 'Vision & Engagement',
    fields: [
      { key: 'success_vision',    label: 'Vision du succès' },
      { key: 'main_goal',         label: 'Objectif principal 180j' },
      { key: 'tried_failed',      label: 'Ce qui a échoué par le passé' },
      { key: 'why_now',           label: 'Pourquoi maintenant' },
      { key: 'weekly_hours',      label: 'Heures/semaine disponibles' },
      { key: 'feedback_reaction', label: 'Réaction au feedback' },
      { key: 'anything_else',     label: 'Autres informations' },
    ],
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ClientFiche({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const [profileRes, questionnaireRes, gamiRes, habitsRes, reportsRes, onboardingRes] =
    await Promise.all([
      admin.from('profiles').select('first_name, last_name, email').eq('id', id).single(),
      admin.from('questionnaire_responses').select('responses, submitted_at').eq('client_id', id).single(),
      admin.from('gamification').select('xp_total, current_streak, longest_streak').eq('client_id', id).single(),
      admin.from('habits').select('id, name, category, is_active, progress_percent, description, xp_reward, period, sort_order').eq('client_id', id).order('sort_order'),
      admin.from('weekly_reports').select('id, week_number, motivation_score, submitted_at, responses').eq('client_id', id).order('week_number', { ascending: false }),
      admin.from('onboarding_progress').select('completed_at').eq('user_id', id).single(), // ← user_id, pas client_id
    ])

  if (!profileRes.data) notFound()

  const profile      = profileRes.data
  const questionnaire = (questionnaireRes.data?.responses ?? {}) as Record<string, unknown>
  const gami          = gamiRes.data
  const habits        = habitsRes.data ?? []
  const reports       = reportsRes.data ?? []
  const onboarding    = onboardingRes.data

  const jourX = onboarding?.completed_at
    ? Math.min(180, Math.ceil(
        (Date.now() - new Date(onboarding.completed_at).getTime()) / 86_400_000
      ))
    : null

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || id
  const levelName   = gami ? getLevelName(gami.xp_total) : null
  const hasQ        = Object.keys(questionnaire).length > 0

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.text, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <Link
            href="/admin"
            style={{ color: S.label, fontSize: '0.875rem', textDecoration: 'none' }}
          >
            ← Retour
          </Link>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...D, fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>
              {displayName}
            </div>
            {profile.email && (
              <div style={{ marginTop: '0.3rem', ...M, fontSize: '0.72rem', color: S.label }}>
                {profile.email}
              </div>
            )}
            {jourX !== null && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: S.label }}>
                Jour{' '}
                <span style={{ color: S.accent, fontWeight: 700 }}>{jourX}</span>
                {' '}/ 180
              </div>
            )}
          </div>
        </div>

        {/* ── Stats rapides ── */}
        {gami && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Jour',          val: jourX !== null ? `J${jourX}` : '—' },
              { label: 'XP total',      val: gami.xp_total.toLocaleString('fr-FR') },
              { label: 'Niveau',        val: levelName ?? '—' },
              { label: 'Streak actuel', val: `${gami.current_streak}j` },
            ].map(({ label, val }) => (
              <div
                key={label}
                style={{
                  background: S.surface,
                  border: `1px solid ${S.border}`,
                  borderRadius: '1rem',
                  padding: '1.25rem 1rem',
                }}
              >
                <div style={{ color: S.label, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
                  {label}
                </div>
                <div style={{ ...D, fontSize: '1.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: S.text }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Questionnaire d'onboarding ── */}
        <section>
          <h2 style={{ ...D, fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '1.25rem', color: S.label }}>
            Questionnaire d&apos;onboarding
            {questionnaireRes.data?.submitted_at && (
              <span style={{ ...M, fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem', marginLeft: '0.75rem', color: S.muted }}>
                soumis le {fmtDate(questionnaireRes.data.submitted_at)}
              </span>
            )}
          </h2>

          {!hasQ ? (
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: S.muted, fontSize: '0.875rem' }}>
              Questionnaire non rempli
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {SECTIONS.map(section => (
                <div
                  key={section.label}
                  style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', padding: '1.5rem' }}
                >
                  <div style={{ ...D, color: S.accent, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>
                    {section.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {section.fields.map(field => {
                      const raw  = questionnaire[field.key]
                      const str  = raw !== undefined && raw !== null && raw !== '' ? String(raw) : null
                      const long = str ? str.length > 80 : false
                      return (
                        <div
                          key={field.key}
                          style={{
                            background: S.bg,
                            borderRadius: '0.5rem',
                            padding: '0.6rem 0.875rem',
                            gridColumn: long ? '1 / -1' : undefined,
                          }}
                        >
                          <div style={{ color: S.label, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>
                            {field.label}
                          </div>
                          <div style={{ color: str ? S.text : S.muted, fontSize: '0.875rem', lineHeight: 1.55 }}>
                            {str ?? '—'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Missions (progression) ── */}
        <MissionProgressPanel
          missions={habits.filter((h: any) => h.category === 'mission').map((h: any) => ({
            id: h.id,
            name: h.name,
            is_active: h.is_active,
            progress_percent: h.progress_percent ?? 0,
            description: h.description ?? null,
          }))}
        />

        {/* ── Habitudes ── */}
        <section>
          <h2 style={{ ...D, fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '1.25rem', color: S.label }}>
            Habitudes
          </h2>
          {habits.filter((h: any) => h.category !== 'mission').length === 0 ? (
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: S.muted, fontSize: '0.875rem' }}>
              Aucune habitude configurée
            </div>
          ) : (
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', overflow: 'hidden' }}>
              {habits.filter((h: any) => h.category !== 'mission').map((h: any, i: number, arr: any[]) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem',
                    borderBottom: i < arr.length - 1 ? `1px solid ${S.border}` : undefined,
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: h.is_active ? S.text : S.muted }}>
                    {h.name}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: h.is_active ? '#22c55e' : S.muted,
                  }}>
                    {h.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Weekly Reports ── */}
        <section>
          <h2 style={{ ...D, fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '1.25rem', color: S.label }}>
            Weekly Reports
          </h2>
          {reports.length === 0 ? (
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: S.muted, fontSize: '0.875rem' }}>
              Aucun rapport disponible
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reports.map(r => (
                <details
                  key={r.id}
                  style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', overflow: 'hidden' }}
                >
                  <summary style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    listStyle: 'none',
                    userSelect: 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ ...D, fontWeight: 900, fontSize: '0.9rem', color: S.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Semaine {r.week_number}
                      </span>
                      {r.motivation_score !== null && (
                        <span style={{ ...M, fontSize: '0.68rem', color: S.label }}>
                          Motivation : {r.motivation_score}/10
                        </span>
                      )}
                    </div>
                    {r.submitted_at && (
                      <span style={{ color: S.muted, fontSize: '0.75rem' }}>
                        {fmtDate(r.submitted_at)}
                      </span>
                    )}
                  </summary>
                  <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${S.border}`, fontSize: '0.8rem', color: S.muted }}>
                    Rapport généré le {r.submitted_at ? fmtDate(r.submitted_at) : '—'}
                    {r.motivation_score !== null && ` · Motivation : ${r.motivation_score}/10`}.
                    {(r as any).responses?.ai_summary && (
                      <p style={{ marginTop: '0.75rem', color: '#C0C0C0', fontSize: '0.825rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                        {String((r as any).responses.ai_summary)}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
