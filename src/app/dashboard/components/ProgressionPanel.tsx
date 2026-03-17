'use client'

import { memo } from 'react'
import { C, D, M } from '@/lib/design-tokens'

const STREAK_MILESTONES = [
  { days: 7,  multiplier: '×1.5 XP' },
  { days: 14, multiplier: '×2 XP' },
  { days: 21, multiplier: '' },
  { days: 30, multiplier: '×3 XP' },
  { days: 60, multiplier: '' },
  { days: 90, multiplier: '' },
]

interface Badge {
  key: string
  label: string
  icon: string
  earned: boolean
  desc: string
  target: number
  current: number
  unit: string
}

interface Props {
  streak: number
  hotStreak: boolean
  legendStreak: boolean
  badges: Badge[]
  earnedCount: number
  objectifText: string | null
  visionText: string | null
  whatsappLink: string | null
}

export const ProgressionPanel = memo(function ProgressionPanel({
  streak, hotStreak, legendStreak,
  badges, earnedCount,
  objectifText, visionText, whatsappLink,
}: Props) {
  // Find next streak milestone
  const nextMilestone = STREAK_MILESTONES.find(m => streak < m.days)
  const daysToNext = nextMilestone ? nextMilestone.days - streak : null

  // Split badges into categories
  const streakBadges = badges.filter(b => ['week_fire', 'fortnight', 'month_king'].includes(b.key))
  const xpBadges = badges.filter(b => !['week_fire', 'fortnight', 'month_king'].includes(b.key))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Streak card */}
      <div className="p180-fade p180-card" style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        animationDelay: '0.05s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.text }}>
            Série en cours
          </div>
          <div style={{
            ...M, fontWeight: 700, fontSize: '24px',
            color: legendStreak ? '#F59E0B' : hotStreak ? '#F59E0B' : C.text,
            ...(hotStreak ? { textShadow: '0 0 12px rgba(245,158,11,0.3)' } : {}),
          }}>
            {streak}j {legendStreak ? '👑' : hotStreak ? '🔥' : ''}
          </div>
        </div>

        {/* Milestone bars */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STREAK_MILESTONES.map(m => (
            <div key={m.days} style={{
              flex: 1, height: 8, borderRadius: 4,
              background: streak >= m.days ? (m.days >= 30 ? '#F59E0B' : C.accent) : C.dimmed,
              transition: 'background 0.4s',
            }} />
          ))}
        </div>

        {/* Milestone labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {STREAK_MILESTONES.map(m => (
            <div key={m.days} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ ...M, fontSize: '11px', color: streak >= m.days ? C.text : C.muted, fontWeight: 700 }}>
                {m.days}j
              </div>
              {m.multiplier && (
                <div style={{ ...M, fontSize: '9px', color: streak >= m.days ? C.accent : C.muted, marginTop: 1 }}>
                  {m.multiplier}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Next milestone indicator */}
        {daysToNext != null && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: C.bg, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{ ...D, fontWeight: 600, fontSize: '13px', color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Prochain palier
            </span>
            <span style={{ ...M, fontWeight: 700, fontSize: '14px', color: C.accent }}>
              dans {daysToNext}j
            </span>
          </div>
        )}
      </div>

      {/* Badges card — redesigned with descriptions and progress */}
      <div className="p180-fade p180-card" style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        animationDelay: '0.1s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.text }}>
            Badges
          </div>
          <span style={{ ...M, fontSize: '12px', color: C.muted }}>{earnedCount}/{badges.length}</span>
        </div>

        {/* Streak badges */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Badges de série
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {streakBadges.map(b => (
              <BadgeRow key={b.key} badge={b} />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: C.border, margin: '0 0 14px' }} />

        {/* XP badges */}
        <div>
          <div style={{ ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Badges d&apos;XP
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {xpBadges.map(b => (
              <BadgeRow key={b.key} badge={b} />
            ))}
          </div>
        </div>
      </div>

      {/* Objectif + Vision */}
      {(objectifText || visionText) && (
        <div className="p180-fade p180-card" style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '18px 20px',
          animationDelay: '0.15s',
        }}>
          {objectifText && (
            <div style={{ marginBottom: visionText ? 14 : 0 }}>
              <div style={{ ...D, fontWeight: 800, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 6 }}>
                Objectif principal
              </div>
              <div style={{ ...D, fontWeight: 600, fontSize: '14px', color: C.text, lineHeight: 1.5 }}>
                {objectifText}
              </div>
            </div>
          )}
          {objectifText && visionText && <div style={{ height: 1, background: C.border, margin: '0 0 14px' }} />}
          {visionText && (
            <div>
              <div style={{ ...D, fontWeight: 800, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 6 }}>
                Vision
              </div>
              <div style={{ ...D, fontWeight: 500, fontSize: '13px', color: C.muted, lineHeight: 1.5, fontStyle: 'italic' }}>
                &ldquo;{visionText}&rdquo;
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp CTA */}
      {whatsappLink && (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="p180-fade" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: `${C.green}18`,
          border: `1px solid ${C.green}40`,
          borderRadius: 14,
          padding: '14px 20px',
          textDecoration: 'none',
          transition: 'background 0.2s',
          animationDelay: '0.2s',
        }}>
          <span style={{ fontSize: '20px' }}>💬</span>
          <div>
            <div style={{ ...D, fontWeight: 700, fontSize: '13px', color: C.greenL, letterSpacing: '0.06em' }}>
              Groupe WhatsApp
            </div>
            <div style={{ ...M, fontSize: '10px', color: `${C.greenL}90`, marginTop: 1 }}>
              Rejoindre le groupe de coaching
            </div>
          </div>
        </a>
      )}
    </div>
  )
})

// ── Badge row with progress ────────────────────────────────────────────────
function BadgeRow({ badge: b }: { badge: Badge }) {
  const pct = Math.round((b.current / b.target) * 100)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 10px',
      background: b.earned ? `${C.accent}08` : 'transparent',
      border: `1px solid ${b.earned ? `${C.accent}20` : 'transparent'}`,
      borderRadius: 8,
      ...(b.earned ? { boxShadow: `0 0 8px ${C.accent}15` } : {}),
    }}>
      <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, opacity: b.earned ? 1 : 0.4 }}>
        {b.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ ...D, fontWeight: 700, fontSize: '14px', color: b.earned ? C.text : C.muted, letterSpacing: '0.04em' }}>
            {b.label}
          </span>
          {b.earned ? (
            <span style={{ ...M, fontSize: '10px', color: C.greenL, fontWeight: 700 }}>✓</span>
          ) : (
            <span style={{ ...M, fontSize: '9px', color: C.muted }}>
              {b.current.toLocaleString('fr-FR')}/{b.target.toLocaleString('fr-FR')} {b.unit}
            </span>
          )}
        </div>
        <div style={{ ...M, fontSize: '11px', color: C.muted, marginTop: 2 }}>
          {b.desc}
        </div>
        {!b.earned && (
          <div style={{ height: 3, background: C.dimmed, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C.accent, borderRadius: 2, transition: 'width 0.6s' }} />
          </div>
        )}
      </div>
    </div>
  )
}
