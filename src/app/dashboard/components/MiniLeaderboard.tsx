'use client'

import { memo, type CSSProperties } from 'react'
import { C, D, M } from '@/lib/design-tokens'

interface LeaderEntry {
  rank: number
  firstName: string
  xp: number
  isMe: boolean
}

interface MiniLeaderboardProps {
  top3: LeaderEntry[]
}

const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '16px 18px',
}

const header: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.muted,
  marginBottom: 12,
}

const row = (isMe: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  borderRadius: 8,
  marginBottom: 4,
  background: isMe ? 'rgba(58,134,255,0.10)' : 'transparent',
})

const leftSide: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const medal: CSSProperties = {
  fontSize: 18,
  width: 24,
  textAlign: 'center',
}

const name = (isMe: boolean): CSSProperties => ({
  fontFamily: D.fontFamily,
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: isMe ? C.accent : C.text,
})

const xpText: CSSProperties = {
  fontFamily: M.fontFamily,
  fontSize: 13,
  color: C.muted,
  letterSpacing: '0.02em',
}

const link: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  marginTop: 12,
  fontFamily: D.fontFamily,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.accent,
  textDecoration: 'none',
}

const MEDALS = ['🥇', '🥈', '🥉']

export default memo(function MiniLeaderboard({ top3 }: MiniLeaderboardProps) {
  return (
    <div style={card}>
      <div style={header}>Classement</div>
      {top3.map((entry) => (
        <div key={entry.rank} style={row(entry.isMe)}>
          <div style={leftSide}>
            <span style={medal}>{MEDALS[entry.rank - 1] ?? entry.rank}</span>
            <span style={name(entry.isMe)}>{entry.firstName}</span>
          </div>
          <span style={xpText}>{entry.xp.toLocaleString('fr-FR')} XP</span>
        </div>
      ))}
      <a href="/classement" style={link}>
        VOIR TOUT
      </a>
    </div>
  )
})
