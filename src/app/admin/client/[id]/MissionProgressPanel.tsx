'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
const M = { fontFamily: '"JetBrains Mono", monospace' } as const

interface Mission {
  id: string
  name: string
  is_active: boolean
  progress_percent: number
  description: string | null
}

export function MissionProgressPanel({ missions: initialMissions }: { missions: Mission[] }) {
  const supabase = createClient()
  const [missions, setMissions] = useState<Mission[]>(initialMissions)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function handleSliderChange(id: string, value: number) {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, progress_percent: value } : m))
  }

  async function handleSave(mission: Mission) {
    setSavingId(mission.id)
    setMsg(null)
    const { error } = await supabase
      .from('habits')
      .update({ progress_percent: mission.progress_percent })
      .eq('id', mission.id)
    if (error) {
      setMsg('Erreur lors de la sauvegarde.')
    } else {
      setMsg(`Progression de « ${mission.name} » mise à jour (${mission.progress_percent}%).`)
    }
    setSavingId(null)
  }

  return (
    <section>
      <h2 style={{ ...D, fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '1.25rem', color: S.label }}>
        Missions
      </h2>

      {msg && (
        <div style={{
          fontSize: '0.8rem',
          color: msg.startsWith('Erreur') ? '#f97373' : '#22c55e',
          background: msg.startsWith('Erreur') ? '#1a0000' : '#001a00',
          border: `1px solid ${msg.startsWith('Erreur') ? '#7f1d1d' : '#16a34a'}`,
          borderRadius: '0.75rem', padding: '0.6rem 1rem', marginBottom: '0.75rem',
        }}>
          {msg}
        </div>
      )}

      {missions.length === 0 ? (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: S.muted, fontSize: '0.875rem' }}>
          Aucune mission configurée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {missions.map(mission => {
            const isSaving = savingId === mission.id
            return (
              <div
                key={mission.id}
                style={{
                  background: S.surface,
                  border: `1px solid ${mission.is_active ? 'rgba(255,160,50,0.2)' : S.border}`,
                  borderRadius: '1rem',
                  padding: '1.25rem',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      fontSize: '0.875rem', fontWeight: 600,
                      color: mission.is_active ? S.text : S.muted,
                      textDecoration: mission.is_active ? 'none' : 'line-through',
                    }}>
                      {mission.name}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: 'rgba(255, 160, 50, 0.12)', color: '#FFA032',
                      border: '1px solid rgba(255,160,50,0.25)',
                    }}>
                      Mission
                    </span>
                    {!mission.is_active && (
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: S.muted,
                        padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)',
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      ...M, fontSize: '1rem', fontWeight: 800,
                      color: mission.progress_percent === 100 ? '#22c55e' : '#FFA032',
                      minWidth: 44, textAlign: 'right',
                    }}>
                      {mission.progress_percent}%
                    </span>
                    <button
                      onClick={() => handleSave(mission)}
                      disabled={isSaving}
                      style={{
                        padding: '5px 14px', borderRadius: 8,
                        background: isSaving ? '#0A1A3A' : S.accent,
                        border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: '#FFFFFF',
                        opacity: isSaving ? 0.6 : 1, transition: 'all 0.15s',
                      }}
                    >
                      {isSaving ? '…' : 'Sauver'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%', height: 6, borderRadius: 3,
                  background: '#1E1E1E', overflow: 'hidden', marginBottom: '0.65rem',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: mission.progress_percent === 100
                      ? '#22c55e'
                      : 'linear-gradient(90deg, #FFA032, #FF8C00)',
                    width: `${mission.progress_percent}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                {/* Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.62rem', color: S.muted, fontWeight: 700, flexShrink: 0 }}>0%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={mission.progress_percent}
                    onChange={e => handleSliderChange(mission.id, Number(e.target.value))}
                    style={{
                      flex: 1, height: 4, appearance: 'none',
                      background: '#1E1E1E', borderRadius: 2, outline: 'none',
                      cursor: 'pointer',
                      accentColor: '#FFA032',
                    }}
                  />
                  <span style={{ fontSize: '0.62rem', color: S.muted, fontWeight: 700, flexShrink: 0 }}>100%</span>
                </div>

                {mission.description && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: S.muted, lineHeight: 1.4 }}>
                    {mission.description}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
