'use client'

import { useRouter } from 'next/navigation'
import { C, D, M } from '@/lib/design-tokens'
import { getLevelName, getLevelProgress, getCurrentLevel } from '@/lib/levels'
import { TopBar } from '@/app/dashboard/components/TopBar'
import { createClient } from '@/lib/supabase/client'
import type { LeaderboardEntry } from '@/lib/types'

interface Props {
  leaderboard: LeaderboardEntry[]
  jourX: number
  daysLeft: number
  daysPct: number
  firstName: string
  onboardingDate: string | null
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Programme', href: '/programme', active: false },
  { label: 'Classement', href: '/classement', active: true },
  { label: 'Profil', href: '/profil', active: false },
]

const PODIUM_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
} as const

export default function ClassementClient({ leaderboard, jourX, daysLeft, daysPct, firstName, onboardingDate }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const top3 = leaderboard.slice(0, 3)
  const me = leaderboard.find(e => e.isMe)
  const totalXP = leaderboard.reduce((sum, e) => sum + e.xp, 0)

  // Reorder for podium: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <TopBar
        jourX={jourX}
        daysLeft={daysLeft}
        daysPct={daysPct}
        firstName={firstName}
        navItems={navItems}
        onSignOut={handleSignOut}
        onboardingDate={onboardingDate}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
        {/* Page title */}
        <h1 style={{
          ...D,
          fontWeight: 900,
          fontSize: '20px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Classement
        </h1>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 32,
          justifyContent: 'center',
        }}>
          {[
            { label: 'Participants', value: String(leaderboard.length), color: C.accent },
            { label: 'Ton rang', value: me ? `#${me.rank}` : '—', color: C.accent },
            { label: 'XP collectif', value: totalXP.toLocaleString('fr-FR'), color: C.greenL },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center',
              padding: '14px 8px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <div style={{ ...M, fontWeight: 700, fontSize: '18px', color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Podium */}
        {top3.length >= 3 && (
          <div style={{
            position: 'relative',
            padding: '24px 16px 0',
            marginBottom: 40,
            background: `radial-gradient(ellipse at 50% 100%, ${C.accent}08 0%, transparent 70%)`,
            borderRadius: 16,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 12,
            }}>
              {podiumOrder.map((entry, i) => {
                const isFirst = i === 1
                const podiumRank = isFirst ? 1 : i === 0 ? 2 : 3
                const color = PODIUM_COLORS[podiumRank as keyof typeof PODIUM_COLORS]
                const height = isFirst ? 180 : podiumRank === 2 ? 150 : 130
                const avatarSize = isFirst ? 64 : 50

                return (
                  <div key={entry.clientId} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    maxWidth: 160,
                  }}>
                    {/* Crown for 1st */}
                    {isFirst && (
                      <div style={{ fontSize: 28, marginBottom: 4, lineHeight: 1 }}>
                        {'\u{1F451}'}
                      </div>
                    )}

                    {/* Avatar with glow */}
                    <div style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${color}, ${color}88)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `3px solid ${color}`,
                      marginBottom: 8,
                      boxShadow: `0 0 ${isFirst ? 30 : 16}px ${color}${isFirst ? '55' : '30'}`,
                    }}>
                      <span style={{
                        ...D,
                        fontWeight: 900,
                        fontSize: isFirst ? '24px' : '20px',
                        color: '#000',
                      }}>
                        {entry.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Name */}
                    <span style={{
                      ...D,
                      fontWeight: 700,
                      fontSize: '14px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: C.text,
                      textAlign: 'center',
                      marginBottom: 4,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.firstName}
                    </span>

                    {/* XP */}
                    <span style={{
                      ...M,
                      fontSize: '13px',
                      color,
                      fontWeight: 700,
                      marginBottom: 4,
                      textShadow: `0 0 8px ${color}40`,
                    }}>
                      {entry.xp.toLocaleString('fr-FR')} XP
                    </span>

                    {/* Level */}
                    <span style={{
                      ...D,
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: C.muted,
                    }}>
                      {getLevelName(entry.xp)}
                    </span>

                    {/* Podium block */}
                    <div style={{
                      width: '100%',
                      height,
                      background: `linear-gradient(180deg, ${color}22, ${color}06)`,
                      borderTop: `3px solid ${color}`,
                      borderRadius: '8px 8px 0 0',
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      paddingTop: 16,
                      boxShadow: `inset 0 1px 0 ${color}30`,
                    }}>
                      <span style={{
                        ...D,
                        fontWeight: 900,
                        fontSize: isFirst ? '36px' : '28px',
                        color,
                        textShadow: `0 0 12px ${color}30`,
                      }}>
                        {podiumRank}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Full list */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
        }}>
          {leaderboard.map((entry, i) => {
            const levelName = getLevelName(entry.xp)
            const levelPct = getLevelProgress(entry.xp)
            const isEven = i % 2 === 0
            const rankColor = entry.rank <= 3
              ? PODIUM_COLORS[entry.rank as keyof typeof PODIUM_COLORS]
              : null

            return (
              <div key={entry.clientId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: entry.isMe
                  ? `${C.accent}18`
                  : isEven ? C.surface : C.bg,
                borderLeft: entry.isMe
                  ? `3px solid ${C.accent}`
                  : rankColor
                    ? `3px solid ${rankColor}40`
                    : '3px solid transparent',
                borderBottom: i < leaderboard.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.15s',
              }}>
                {/* Rank */}
                <span style={{
                  ...M,
                  fontWeight: 700,
                  fontSize: '14px',
                  color: rankColor ?? C.muted,
                  width: 32,
                  textAlign: 'center',
                  flexShrink: 0,
                  ...(rankColor ? { textShadow: `0 0 6px ${rankColor}30` } : {}),
                }}>
                  {entry.rank}
                </span>

                {/* Avatar */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: entry.isMe ? C.accent : C.dimmed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: rankColor
                    ? `2px solid ${rankColor}`
                    : `2px solid ${C.border}`,
                  ...(rankColor ? { boxShadow: `0 0 8px ${rankColor}20` } : {}),
                }}>
                  <span style={{
                    ...D,
                    fontWeight: 900,
                    fontSize: '14px',
                    color: entry.isMe ? '#000' : C.text,
                  }}>
                    {entry.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + level */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      ...D,
                      fontWeight: 700,
                      fontSize: '14px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: entry.isMe ? C.accent : C.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.firstName}
                      {entry.isMe && ' (toi)'}
                    </span>
                    <span style={{
                      ...D,
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: C.muted,
                      background: C.dimmed,
                      padding: '2px 8px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}>
                      {levelName}
                    </span>
                    {entry.streak >= 7 && (
                      <span style={{
                        ...M,
                        fontSize: '11px',
                        color: C.orange,
                        flexShrink: 0,
                      }}>
                        {'\uD83D\uDD25'} {entry.streak}j
                      </span>
                    )}
                  </div>

                  {/* XP bar */}
                  <div style={{
                    height: 4,
                    background: C.dimmed,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${levelPct}%`,
                      background: entry.isMe
                        ? `linear-gradient(90deg, ${C.accent}, ${C.accentL})`
                        : rankColor
                          ? `linear-gradient(90deg, ${rankColor}, ${rankColor}88)`
                          : `linear-gradient(90deg, ${C.muted}, ${C.muted}88)`,
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* XP */}
                <span style={{
                  ...M,
                  fontWeight: 700,
                  fontSize: '13px',
                  color: entry.isMe ? C.accent : rankColor ?? C.text,
                  flexShrink: 0,
                  textAlign: 'right',
                  minWidth: 60,
                }}>
                  {entry.xp.toLocaleString('fr-FR')}
                  <span style={{ fontSize: '10px', color: C.muted, marginLeft: 2 }}>XP</span>
                </span>
              </div>
            )
          })}

          {leaderboard.length === 0 && (
            <div style={{
              padding: '48px 16px',
              textAlign: 'center',
              ...D,
              fontSize: '14px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.muted,
            }}>
              Aucun participant pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
