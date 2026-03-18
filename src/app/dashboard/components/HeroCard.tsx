'use client'

import { memo } from 'react'
import { C, D, M } from '@/lib/design-tokens'
import { AnimatedCounter } from './AnimatedCounter'
import type { Level } from '@/lib/levels'

interface Props {
  xp: number
  levelNum: number
  level: Level
  nextLevel: { name: string; xpNeeded: number } | null
  displayedLevelPct: number
  weeklyXP: number
  streak: number
  record: number
  hotStreak: boolean
  myRank: number | null
  isMobile: boolean
}

export const HeroCard = memo(function HeroCard({
  xp, levelNum, level, nextLevel, displayedLevelPct,
  weeklyXP, streak, record, hotStreak, myRank, isMobile,
}: Props) {
  return (
    <div className="p180-fade p180-card" style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: isMobile ? '20px 16px' : '24px 28px',
      marginBottom: 20,
    }}>
      {/* Top row: level name + XP count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentL})`,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ ...D, fontWeight: 900, fontSize: '16px', color: 'white' }}>
              {levelNum}
            </span>
          </div>
          <div>
            <div style={{ ...D, fontWeight: 900, fontSize: '20px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, lineHeight: 1.1 }}>
              {level.name}
            </div>
            <div style={{ ...M, fontSize: '10px', color: C.muted, marginTop: 2 }}>
              Niveau {levelNum}{nextLevel ? ` → ${nextLevel.name}` : ' — MAX'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...M, fontWeight: 700, fontSize: '22px', color: C.accent, lineHeight: 1 }}>
            <AnimatedCounter to={xp} />
          </div>
          <div style={{ ...M, fontSize: '10px', color: C.muted, marginTop: 2 }}>XP total</div>
        </div>
      </div>

      {/* XP Progress bar */}
      <div style={{ position: 'relative', height: 6, background: C.dimmed, borderRadius: 3, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${displayedLevelPct}%`,
          background: `linear-gradient(90deg, ${C.accent}, ${C.accentL})`,
          borderRadius: 3,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* 4 stats inline */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 16 }}>
        {[
          { label: 'XP Semaine', value: weeklyXP, color: C.accent, prefix: '+' },
          { label: 'Série', value: streak, color: hotStreak ? '#F59E0B' : C.text, suffix: 'j' },
          { label: 'Record', value: record, color: C.muted, suffix: 'j' },
          { label: 'Classement', value: myRank, color: C.accent, prefix: '#' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: C.bg,
            borderRadius: 8,
            padding: '10px 14px',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ ...M, fontSize: '9px', letterSpacing: '0.15em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ ...M, fontWeight: 700, fontSize: '18px', color: stat.color, lineHeight: 1 }}>
              {stat.prefix ?? ''}{stat.value !== null ? <AnimatedCounter to={stat.value} /> : '—'}{stat.suffix ?? ''}
              {i === 1 && hotStreak && <span style={{ marginLeft: 6, fontSize: '14px' }}>🔥</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
