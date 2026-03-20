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
  robinWhatsapp?: string | null
}

export const NAV_ITEMS_CLIENT = [
  { label: 'Dashboard',  href: '/dashboard' },
  { label: 'Programme',  href: '/programme' },
  { label: 'Classement', href: '/classement' },
  { label: 'Profil',     href: '/profil' },
]

export function TopBar({ jourX, daysLeft, daysPct, firstName, navItems, onSignOut, onboardingDate, robinWhatsapp }: Props) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <P180Logo size="md" />
          </a>
          {robinWhatsapp && (
            <a
              href={`https://wa.me/${robinWhatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#25D366',
                borderRadius: 20,
                padding: '5px 12px 5px 8px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span style={{ ...D, fontWeight: 700, fontSize: '10px', color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Robin
              </span>
            </a>
          )}
        </div>

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
