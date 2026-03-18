'use client'

import { C, D, M } from '@/lib/design-tokens'
import { useCountdown, p2 } from '@/lib/hooks/useCountdown'
import P180Logo from '@/components/P180Logo'

interface NavItem {
  label: string
  href: string
  active: boolean
}

interface Props {
  jourX: number
  daysLeft: number
  daysPct: number
  firstName: string
  navItems: NavItem[]
  onSignOut: () => void
  onboardingDate?: string | null
}

export const NAV_ITEMS_CLIENT = [
  { label: 'Dashboard',  href: '/dashboard' },
  { label: 'Programme',  href: '/programme' },
  { label: 'Classement', href: '/classement' },
  { label: 'Profil',     href: '/profil' },
]

export function TopBar({ jourX, daysLeft, daysPct, firstName, navItems, onSignOut, onboardingDate }: Props) {
  const countdown = useCountdown(onboardingDate ?? null)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(8,8,8,0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Main row: logo + nav + user */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        height: 64,
      }}>
        {/* Logo */}
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <P180Logo size="md" />
        </a>

        {/* Nav items — 4 onglets, tous surlignés */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {navItems.map(item => (
            <a key={item.href} href={item.href} style={{
              padding: '10px 20px',
              ...D,
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              color: item.active ? 'white' : C.accent,
              background: item.active ? 'rgba(58,134,255,0.25)' : 'rgba(58,134,255,0.08)',
              borderRadius: 8,
              transition: 'all 0.15s',
            }}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* User avatar + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30,
            background: C.accent,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ ...D, fontWeight: 900, fontSize: '13px', color: 'white' }}>
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <button onClick={onSignOut} title="Déconnexion" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: '16px', lineHeight: 1, padding: 4,
          }}>
            ⏻
          </button>
        </div>
      </div>

      {/* Jour X + Countdown live */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12,
        padding: '6px 20px 10px',
      }}>
        <span style={{ ...D, fontWeight: 900, fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, lineHeight: 1 }}>
          Jour {jourX}
        </span>

        {/* Countdown badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(58,134,255,0.12)',
          border: `1px solid rgba(58,134,255,0.25)`,
          borderRadius: 8,
          padding: '6px 14px',
        }}>
          <CountdownUnit value={countdown.d} label="j" />
          <span style={{ ...D, color: C.muted, fontSize: '14px', fontWeight: 700 }}>:</span>
          <CountdownUnit value={countdown.h} label="h" />
          <span style={{ ...D, color: C.muted, fontSize: '14px', fontWeight: 700 }}>:</span>
          <CountdownUnit value={countdown.m} label="m" />
          <span style={{ ...D, color: C.muted, fontSize: '14px', fontWeight: 700 }}>:</span>
          <CountdownUnit value={countdown.s} label="s" />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.dimmed }}>
        <div style={{
          height: '100%',
          width: `${daysPct}%`,
          background: `linear-gradient(90deg, ${C.accent}, ${C.accentL})`,
          transition: 'width 1.2s ease',
        }} />
      </div>
    </header>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
      <span style={{ ...M, fontWeight: 700, fontSize: '16px', color: C.accent, minWidth: 22, textAlign: 'center' }}>
        {p2(value)}
      </span>
      <span style={{ ...D, fontWeight: 600, fontSize: '10px', color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
        {label}
      </span>
    </span>
  )
}
