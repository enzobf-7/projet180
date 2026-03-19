'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import P180Logo from '@/components/P180Logo'
import { P180Button } from '@/components/P180Button'
import { P180Input } from '@/components/P180Input'
import { C, D } from '@/lib/design-tokens'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Minimum 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { password_changed: true },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '48px 32px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <P180Logo size="lg" />
        </div>

        <h1 style={{
          ...D,
          fontWeight: 800,
          fontSize: 22,
          color: C.text,
          textAlign: 'center',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}>
          Choisis ton mot de passe
        </h1>

        <p style={{
          ...D,
          fontWeight: 500,
          fontSize: 14,
          color: C.muted,
          textAlign: 'center',
          marginBottom: 32,
        }}>
          Remplace le mot de passe temporaire par le tien.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <P180Input
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <P180Input
            label="Confirmer le mot de passe"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && (
            <p style={{ ...D, color: '#EF4444', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
              {error}
            </p>
          )}

          <P180Button type="submit" loading={loading} fullWidth size="lg">
            Valider
          </P180Button>
        </form>
      </div>
    </div>
  )
}
