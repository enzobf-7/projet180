'use client'

import { memo, useState } from 'react'
import { C, D, M } from '@/lib/design-tokens'
import type { Habit, Todo, PersonalTodo } from '@/lib/types'

interface Props {
  habits: Habit[]
  completed: Set<string>
  loadingId: string | null
  firstName: string
  isMobile: boolean
  celebrateRing: boolean
  onToggle: (habitId: string) => void
  todos: Todo[]
  todayDate: string
  onToggleTodo: (todoId: string, currentDate: string | null) => void
  personalTodos: PersonalTodo[]
  onTogglePersonalTodo: (id: string, completed: boolean) => void
  onAddPersonalTodos: (titles: string[]) => Promise<void>
  allDone: boolean
  whatsappLink: string | null
  whatsappMessage: string
  jourX: number
}

export const DailyCard = memo(function DailyCard({
  habits, completed, loadingId, firstName, isMobile, celebrateRing, onToggle,
  todos, todayDate, onToggleTodo,
  personalTodos, onTogglePersonalTodo, onAddPersonalTodos,
  allDone, whatsappLink, whatsappMessage,
}: Props) {
  const habitsOnly = habits.filter(h => h.category === 'habit')

  // Count all items for the unified counter
  const todayTodos = todos
  const totalItems = habitsOnly.length + todayTodos.length + personalTodos.length
  const completedHabits = habitsOnly.filter(h => completed.has(h.id)).length
  const completedTodos = todayTodos.filter(t => t.completed_date === todayDate).length
  const completedPersonal = personalTodos.filter(p => p.completed).length
  const completedItems = completedHabits + completedTodos + completedPersonal
  const completedPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // TodoPrepForm state
  const [showPrepForm, setShowPrepForm] = useState(false)
  const [prepInput, setPrepInput] = useState('')
  const [pendingTodos, setPendingTodos] = useState<string[]>([])
  const [prepLoading, setPrepLoading] = useState(false)

  const handleAddPending = () => {
    const t = prepInput.trim()
    if (!t) return
    setPendingTodos(prev => [...prev, t])
    setPrepInput('')
  }

  const handleRemovePending = (idx: number) => {
    setPendingTodos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleValidatePrep = async () => {
    if (pendingTodos.length === 0) return
    setPrepLoading(true)
    await onAddPersonalTodos(pendingTodos)
    setPendingTodos([])
    setShowPrepForm(false)
    setPrepLoading(false)
  }

  const renderHabitRow = (h: Habit) => {
    const done = completed.has(h.id)
    const loading = loadingId === h.id
    return (
      <button key={h.id} className="p180-habit-row" onClick={() => onToggle(h.id)} disabled={loading} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer',
        padding: '11px 24px',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 0.15s',
        opacity: loading ? 0.6 : 1,
      }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0,
          borderRadius: 6,
          border: `2px solid ${done ? C.greenL : C.muted}`,
          background: done ? C.greenL : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          ...(done ? { animation: 'p180-habit-check 0.35s cubic-bezier(0.34,1.56,0.64,1)' } : {}),
        }}>
          {done && <span style={{ color: 'white', fontSize: '13px', lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{
          ...D, fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em',
          color: done ? C.muted : C.text,
          textDecoration: done ? 'line-through' : 'none',
          textAlign: 'left',
          transition: 'color 0.2s, text-decoration 0.2s',
        }}>
          {h.name}
        </span>
      </button>
    )
  }

  const renderTodoRow = (todo: Todo) => {
    const isDone = todo.completed_date === todayDate
    const isPrepTodo = todo.title === 'Préparer to-do de demain'
    return (
      <div key={todo.id}>
        <button onClick={() => {
          onToggleTodo(todo.id, todo.completed_date)
          if (isPrepTodo && !isDone) setShowPrepForm(true)
        }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '11px 24px',
          borderBottom: `1px solid ${C.border}`,
          transition: 'opacity 0.15s',
        }}>
          <div style={{
            width: 22, height: 22, flexShrink: 0,
            borderRadius: 6,
            border: `2px solid ${isDone ? C.greenL : C.muted}`,
            background: isDone ? C.greenL : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {isDone && <span style={{ color: 'white', fontSize: '13px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{
            ...D, fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em',
            color: isDone ? C.muted : C.text,
            textDecoration: isDone ? 'line-through' : 'none',
            textAlign: 'left',
            flex: 1,
          }}>
            {todo.title}
          </span>
          <span style={{
            ...D, fontWeight: 700, fontSize: '8px', letterSpacing: '0.15em',
            color: C.orange, background: C.orangeBg,
            padding: '2px 8px', borderRadius: 4,
            textTransform: 'uppercase' as const,
          }}>
            OBLIGATOIRE
          </span>
        </button>

        {/* Prep form inline */}
        {isPrepTodo && (
          <div style={{
            maxHeight: showPrepForm ? 400 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}>
            <div style={{ padding: '12px 24px 16px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={prepInput}
                  onChange={e => setPrepInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPending()}
                  placeholder="Ajouter une tâche pour demain..."
                  style={{
                    flex: 1, background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '10px 14px',
                    color: C.text, ...D, fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button onClick={handleAddPending} style={{
                  background: C.accent, border: 'none', borderRadius: 8,
                  width: 40, cursor: 'pointer',
                  color: 'white', ...D, fontWeight: 700, fontSize: '18px',
                }}>
                  +
                </button>
              </div>

              {pendingTodos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {pendingTodos.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 12px', background: C.surface, borderRadius: 6,
                      border: `1px solid ${C.border}`,
                    }}>
                      <span style={{ ...D, fontSize: '13px', color: C.text }}>{t}</span>
                      <button onClick={() => handleRemovePending(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: C.muted, fontSize: '16px', padding: '0 4px',
                      }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleValidatePrep}
                disabled={pendingTodos.length === 0 || prepLoading}
                style={{
                  width: '100%', padding: '10px',
                  background: pendingTodos.length > 0 ? C.accent : C.dimmed,
                  border: 'none', borderRadius: 8, cursor: pendingTodos.length > 0 ? 'pointer' : 'default',
                  ...D, fontWeight: 700, fontSize: '12px', letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  color: pendingTodos.length > 0 ? 'white' : C.muted,
                  opacity: prepLoading ? 0.6 : 1,
                }}
              >
                {prepLoading ? 'Enregistrement...' : `Valider (${pendingTodos.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPersonalTodoRow = (pt: PersonalTodo) => {
    return (
      <button key={pt.id} onClick={() => onTogglePersonalTodo(pt.id, !pt.completed)} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '11px 24px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0,
          borderRadius: 6,
          border: `2px solid ${pt.completed ? C.greenL : C.muted}`,
          background: pt.completed ? C.greenL : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          {pt.completed && <span style={{ color: 'white', fontSize: '13px', lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{
          ...D, fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em',
          color: pt.completed ? C.muted : C.text,
          textDecoration: pt.completed ? 'line-through' : 'none',
          textAlign: 'left',
        }}>
          {pt.title}
        </span>
      </button>
    )
  }

  return (
    <div className="p180-fade p180-card" style={{
      background: C.surface,
      border: `1px solid ${allDone ? C.green : C.border}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header with ring + counter */}
      <div style={{
        padding: isMobile ? '18px 16px 14px' : '20px 24px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={celebrateRing ? 'p180-ring-done' : ''} style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
            <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={24} cy={24} r={20} fill="none" stroke={C.dimmed} strokeWidth={3} />
              <circle cx={24} cy={24} r={20} fill="none" stroke={allDone ? C.greenL : C.accent} strokeWidth={3}
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - completedPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...M, fontWeight: 700, fontSize: '13px', color: allDone ? C.greenL : C.text,
            }}>
              {allDone ? '✓' : `${completedPct}%`}
            </div>
          </div>
          <div>
            <div style={{ ...D, fontWeight: 800, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text }}>
              To-do du jour
            </div>
            <div style={{ ...M, fontSize: '10px', color: C.muted, marginTop: 2 }}>
              {completedItems}/{totalItems} — {allDone ? 'Tout validé !' : `${totalItems - completedItems} restant${totalItems - completedItems > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      {/* Habitudes */}
      {habitsOnly.length > 0 && (
        <div>
          <div style={{ padding: '12px 24px 6px', ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const }}>
            Habitudes
          </div>
          {habitsOnly.map(h => renderHabitRow(h))}
        </div>
      )}

      {/* Tâches obligatoires (system todos) */}
      {todayTodos.length > 0 && (
        <div>
          <div style={{ padding: '14px 24px 6px', ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.2em', color: C.orange, textTransform: 'uppercase' as const }}>
            Obligatoires
          </div>
          {todayTodos.map(renderTodoRow)}
        </div>
      )}

      {/* Tâches perso */}
      {personalTodos.length > 0 && (
        <div>
          <div style={{ padding: '14px 24px 6px', ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' as const }}>
            Mes tâches
          </div>
          {personalTodos.map(renderPersonalTodoRow)}
        </div>
      )}

      {/* WhatsApp button — locked until 100% */}
      {whatsappLink && (
        <div style={{ padding: '12px 24px 16px' }}>
          {allDone ? (
            <a
              href={`https://wa.me/${whatsappLink.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '14px',
                background: `${C.greenL}20`,
                border: `1px solid ${C.greenL}40`,
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>📱</span>
              <span style={{ ...D, fontWeight: 700, fontSize: '13px', color: C.greenL, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                Partager sur WhatsApp
              </span>
              <span style={{
                ...D, fontWeight: 700, fontSize: '8px', letterSpacing: '0.15em',
                color: C.orange, background: C.orangeBg,
                padding: '2px 8px', borderRadius: 4,
              }}>
                OBLIGATOIRE
              </span>
            </a>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '14px',
              background: C.dimmed,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              opacity: 0.35,
              cursor: 'not-allowed',
            }}>
              <span style={{ fontSize: '18px' }}>📱</span>
              <span style={{ ...D, fontWeight: 700, fontSize: '13px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                Partager sur WhatsApp
              </span>
              <span style={{
                ...D, fontWeight: 700, fontSize: '8px', letterSpacing: '0.15em',
                color: C.orange, background: C.orangeBg,
                padding: '2px 8px', borderRadius: 4,
              }}>
                OBLIGATOIRE
              </span>
            </div>
          )}
        </div>
      )}

      {/* All done + bonus message */}
      {allDone && (
        <div style={{ padding: '16px 24px', textAlign: 'center', background: `${C.green}10` }}>
          <span style={{ ...D, fontWeight: 700, fontSize: '13px', color: C.greenL, letterSpacing: '0.08em' }}>
            ✓ Journée parfaite — +50 XP bonus, bien joué {firstName} !
          </span>
        </div>
      )}
    </div>
  )
})
