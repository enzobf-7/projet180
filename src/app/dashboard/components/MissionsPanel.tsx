'use client'

import { memo, type CSSProperties } from 'react'
import { C, D, M } from '@/lib/design-tokens'

interface Mission {
  id: string
  name: string
  description?: string
  period?: string
  progress_percent?: number
  xp_reward?: number
}

interface MissionsPanelProps {
  missions: Mission[]
}

const section: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const sectionTitle: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.muted,
  marginBottom: 4,
}

const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '16px 18px',
}

const titleRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
}

const missionName: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 15,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.text,
}

const statusBadge = (done: boolean): CSSProperties => ({
  fontFamily: D.fontFamily,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: done ? C.greenL : C.accent,
  background: done ? 'rgba(34,197,94,0.12)' : 'rgba(58,134,255,0.12)',
  padding: '3px 8px',
  borderRadius: 6,
})

const desc: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 12,
  color: C.muted,
  letterSpacing: '0.04em',
  marginBottom: 10,
  lineHeight: 1.4,
}

const metaRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
}

const metaText: CSSProperties = {
  fontFamily: M.fontFamily,
  fontSize: 11,
  color: C.muted,
  letterSpacing: '0.04em',
}

const barOuter: CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: C.dimmed,
  overflow: 'hidden',
}

const barInner = (pct: number, done: boolean): CSSProperties => ({
  height: '100%',
  borderRadius: 3,
  width: `${Math.min(100, Math.max(0, pct))}%`,
  background: done ? C.greenL : C.accent,
  transition: 'width 0.4s ease',
})

export default memo(function MissionsPanel({ missions }: MissionsPanelProps) {
  if (!missions.length) return null

  return (
    <div style={section}>
      <div style={sectionTitle}>Missions</div>
      {missions.map((m) => {
        const pct = m.progress_percent ?? 0
        const done = pct >= 100
        return (
          <div key={m.id} style={card}>
            <div style={titleRow}>
              <span style={missionName}>{m.name}</span>
              <span style={statusBadge(done)}>
                {done ? '✓ TERMINÉE' : 'EN COURS'}
              </span>
            </div>
            {m.description && <div style={desc}>{m.description}</div>}
            <div style={metaRow}>
              {m.period && <span style={metaText}>{m.period}</span>}
              <span style={metaText}>
                {pct}% {m.xp_reward ? `· ${m.xp_reward} XP` : ''}
              </span>
            </div>
            <div style={barOuter}>
              <div style={barInner(pct, done)} />
            </div>
          </div>
        )
      })}
    </div>
  )
})
