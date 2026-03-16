'use client'

import { memo, useState, type CSSProperties } from 'react'
import { C, D } from '@/lib/design-tokens'

interface TodoPrepFormProps {
  visible: boolean
  onAddTodo: (title: string) => void
  pendingTodos: { title: string }[]
  onRemovePending: (idx: number) => void
  onValidate: () => void
  loading: boolean
}

const base: CSSProperties = {
  overflow: 'hidden',
  transition: 'max-height 0.35s ease, opacity 0.3s ease',
}

const inputRow: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 10,
}

const inputStyle: CSSProperties = {
  flex: 1,
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: C.text,
  fontFamily: D.fontFamily,
  fontSize: 14,
  outline: 'none',
  letterSpacing: '0.04em',
}

const addBtn: CSSProperties = {
  background: C.accent,
  border: 'none',
  borderRadius: 8,
  width: 40,
  minWidth: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: 22,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.15s',
}

const pendingItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  background: C.dimmed,
  borderRadius: 6,
  marginBottom: 4,
}

const pendingText: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 13,
  color: C.text,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const removeBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: C.muted,
  fontSize: 18,
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
}

const validateBtn: CSSProperties = {
  width: '100%',
  padding: '10px 0',
  marginTop: 10,
  background: C.accent,
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontFamily: D.fontFamily,
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}

export default memo(function TodoPrepForm({
  visible,
  onAddTodo,
  pendingTodos,
  onRemovePending,
  onValidate,
  loading,
}: TodoPrepFormProps) {
  const [value, setValue] = useState('')

  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAddTodo(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div
      style={{
        ...base,
        maxHeight: visible ? 400 : 0,
        opacity: visible ? 1 : 0,
        padding: visible ? '12px 0 4px' : '0',
      }}
    >
      <div style={inputRow}>
        <input
          style={inputStyle}
          placeholder="Ajouter une tâche pour demain..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={addBtn} onClick={handleAdd} type="button">
          +
        </button>
      </div>

      {pendingTodos.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {pendingTodos.map((t, idx) => (
            <div key={idx} style={pendingItem}>
              <span style={pendingText}>{t.title}</span>
              <button
                style={removeBtn}
                onClick={() => onRemovePending(idx)}
                type="button"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingTodos.length > 0 && (
        <button
          style={{
            ...validateBtn,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onClick={onValidate}
          disabled={loading}
          type="button"
        >
          {loading ? 'EN COURS...' : 'VALIDER'}
        </button>
      )}
    </div>
  )
})
