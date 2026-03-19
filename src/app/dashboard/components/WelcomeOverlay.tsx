'use client'

import { useState, useEffect } from 'react'
import { C, D, M } from '@/lib/design-tokens'
import { LEVELS } from '@/lib/levels'
import { P180Button } from '@/components/P180Button'

const STORAGE_KEY = 'p180_welcome_seen'

const LEVEL_COLORS = [
  C.muted,    // L'Endormi
  '#22C55E',  // L'Éveillé
  C.accent,   // Le Bâtisseur
  '#C9A84C',  // Le Souverain
  '#FFA500',  // Le Point de Bascule
  '#F0F0F0',  // Le 180
]

export function WelcomeOverlay() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 520, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '40px 32px',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ ...D, fontWeight: 900, fontSize: '32px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.text, marginBottom: 8 }}>
            Bienvenue dans Projet<span style={{ color: C.accent }}>180</span>
          </h1>
          <p style={{ ...D, fontWeight: 500, fontSize: '15px', color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
            Voici comment fonctionne ta progression
          </p>
        </div>

        {/* Section 1: Niveaux */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 14, textAlign: 'center' as const }}>
            6 niveaux de progression
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {LEVELS.map((lvl, i) => (
              <div key={lvl.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: i === 0 ? `${LEVEL_COLORS[i]}15` : C.bg,
                border: `1px solid ${i === 0 ? LEVEL_COLORS[i] + '30' : C.border}`,
                borderRadius: 10,
              }}>
                <div style={{
                  ...M, fontWeight: 900, fontSize: '14px',
                  color: LEVEL_COLORS[i],
                  width: 24, textAlign: 'center',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...D, fontWeight: 700, fontSize: '14px', color: LEVEL_COLORS[i], letterSpacing: '0.04em' }}>
                    {lvl.name}
                  </div>
                </div>
                <div style={{ ...M, fontSize: '12px', color: C.muted, fontWeight: 600 }}>
                  {lvl.min === 0 ? 'Départ' : `${lvl.min.toLocaleString('fr-FR')} XP`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Comment gagner de l'XP */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 14, textAlign: 'center' as const }}>
            Comment gagner de l'XP
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '✅', text: 'Coche une habitude', xp: '+10 XP' },
              { icon: '⭐', text: 'Journée parfaite (tout coché)', xp: '+50 XP bonus' },
            ].map(item => (
              <div key={item.text} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span style={{ ...D, fontWeight: 600, fontSize: '14px', color: C.text, flex: 1 }}>{item.text}</span>
                <span style={{ ...M, fontSize: '13px', color: C.accent, fontWeight: 700 }}>{item.xp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Multiplicateurs de streak */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 14, textAlign: 'center' as const }}>
            Multiplicateurs de série
          </div>
          <p style={{ ...D, fontWeight: 500, fontSize: '15px', color: C.muted, marginBottom: 12, lineHeight: 1.5, textAlign: 'center' }}>
            Plus ta série de jours consécutifs est longue, plus tu gagnes d'XP par habitude.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { days: '7j', mult: '×1.5', color: C.accent },
              { days: '14j', mult: '×2', color: '#22C55E' },
              { days: '30j', mult: '×3', color: '#FFA500' },
            ].map(m => (
              <div key={m.days} style={{
                flex: 1, textAlign: 'center',
                padding: '12px 8px',
                background: C.bg,
                border: `1px solid ${m.color}30`,
                borderRadius: 10,
              }}>
                <div style={{ ...M, fontSize: '20px', fontWeight: 900, color: m.color }}>{m.mult}</div>
                <div style={{ ...M, fontSize: '11px', color: C.muted, marginTop: 4 }}>à partir de {m.days}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Installation mobile */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ ...D, fontWeight: 800, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 14, textAlign: 'center' as const }}>
            Installe l'app sur ton téléphone
          </div>
          <p style={{ ...D, fontWeight: 500, fontSize: '15px', color: C.muted, marginBottom: 12, lineHeight: 1.5, textAlign: 'center' }}>
            Projet180 s'installe comme une vraie app sur ton écran d'accueil.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              padding: '12px 14px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '18px' }}>🍎</span>
                <span style={{ ...D, fontWeight: 700, fontSize: '14px', color: C.text }}>iPhone / iPad</span>
              </div>
              <div style={{ ...D, fontSize: '13px', color: C.muted, lineHeight: 1.6, paddingLeft: 28 }}>
                Safari → <span style={{ color: C.text }}>Partager</span> (↑) → <span style={{ color: C.text }}>Sur l'écran d'accueil</span>
              </div>
            </div>
            <div style={{
              padding: '12px 14px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <span style={{ ...D, fontWeight: 700, fontSize: '14px', color: C.text }}>Android</span>
              </div>
              <div style={{ ...D, fontSize: '13px', color: C.muted, lineHeight: 1.6, paddingLeft: 28 }}>
                Chrome → <span style={{ color: C.text }}>Menu</span> (⋮) → <span style={{ color: C.text }}>Ajouter à l'écran d'accueil</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <P180Button onClick={handleDismiss} fullWidth size="lg">
          C'est parti !
        </P180Button>
      </div>
    </div>
  )
}
