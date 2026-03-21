'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AppSettingsRow {
  id: string
  whatsapp_link: string
  skool_link: string
  iclosed_link: string
  contract_pdf_url: string
}

interface Client {
  id: string
  email: string
  first_name: string
  last_name: string
  xp_total: number
  level: string
  onboarding_completed: boolean
  jourX: number
  last_activity: string | null
}

interface Habit {
  id: string
  client_id: string
  name: string
  category: string
  is_active: boolean
  sort_order: number
  created_at: string
}

interface Todo {
  id: string
  client_id: string
  title: string
  is_system: boolean
  completed_date: string | null
  created_at: string
}

interface ProgramContentRow {
  id?: string
  phase_number: number
  week_number: number
  title: string
  objectives: string
  focus_text: string
  robin_notes: string
}

type Tab = 'clients' | 'missions' | 'todos' | 'programme' | 'classement' | 'configuration'

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays}j`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
  return `Il y a ${Math.floor(diffDays / 30)} mois`
}

function getClientStatus(c: Client): { label: string; color: string; bg: string; border: string; priority: number } {
  if (!c.onboarding_completed) return {
    label: 'Onboarding', color: '#FFA500', bg: 'rgba(255,165,0,0.1)', border: 'rgba(255,165,0,0.3)', priority: 1,
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10)
  const isInactive = !c.last_activity || c.last_activity < twoDaysAgo
  if (isInactive) return {
    label: 'Inactif', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', priority: 0,
  }
  return {
    label: 'Actif', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', priority: 2,
  }
}

function InitialsBadge({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8,
      background: 'linear-gradient(135deg, #080A1A 0%, #0A0F2A 100%)',
      border: '1px solid #0A1A3A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
      fontWeight: 800, fontSize: 13, color: '#3A86FF', letterSpacing: '0.04em',
    }}>
      {initials || '?'}
    </div>
  )
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('clients')

  // — Settings —
  const [settings, setSettings] = useState<AppSettingsRow | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)
  const [settingsErr, setSettingsErr] = useState<string | null>(null)

  // — Clients —
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [addingClient, setAddingClient] = useState(false)
  const [newClientFirstName, setNewClientFirstName] = useState('')
  const [newClientLastName, setNewClientLastName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientJourX, setNewClientJourX] = useState('')
  const [clientMsg, setClientMsg] = useState<string | null>(null)
  const [clientErr, setClientErr] = useState<string | null>(null)

  // — Habits —
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [loadingHabits, setLoadingHabits] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState<'habit' | 'mission'>('habit')
  const [addingHabit, setAddingHabit] = useState(false)
  const [habitErr, setHabitErr] = useState<string | null>(null)
  const [habitMsg, setHabitMsg] = useState<string | null>(null)

  // — Todos —
  const [todos, setTodos] = useState<Todo[]>([])
  const [loadingTodos, setLoadingTodos] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [todoErr, setTodoErr] = useState<string | null>(null)

  // — Programme —
  const [programClientId, setProgramClientId] = useState<string>('')
  const [programContent, setProgramContent] = useState<ProgramContentRow[]>([])
  const [loadingProgram, setLoadingProgram] = useState(false)
  const [savingWeek, setSavingWeek] = useState<string | null>(null)
  const [programMsg, setProgramMsg] = useState<string | null>(null)

  // ────────── Load settings ──────────
  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('id, whatsapp_link, skool_link, iclosed_link, contract_pdf_url')
        .limit(1)
        .single()
      if (!error && data) setSettings(data as AppSettingsRow)
      else if (error) setSettingsErr('Impossible de charger la configuration.')
      setLoadingSettings(false)
    }
    loadSettings()
  }, [supabase])

  // ────────── Load clients ──────────
  const loadClients = useCallback(async () => {
    setLoadingClients(true)
    const res = await fetch('/api/admin/clients')
    if (res.ok) {
      const json = await res.json()
      setClients(json.clients ?? [])
    }
    setLoadingClients(false)
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  // ────────── Load habits for selected client ──────────
  const loadHabits = useCallback(async (clientId: string) => {
    if (!clientId) { setHabits([]); return }
    setLoadingHabits(true)
    const res = await fetch(`/api/admin/habits?clientId=${clientId}`)
    if (res.ok) {
      const json = await res.json()
      setHabits(json.habits ?? [])
    }
    setLoadingHabits(false)
  }, [])

  useEffect(() => { loadHabits(selectedClientId) }, [selectedClientId, loadHabits])

  // ────────── Load todos for selected client ──────────
  const loadTodos = useCallback(async (clientId: string) => {
    if (!clientId) { setTodos([]); return }
    setLoadingTodos(true)
    const res = await fetch(`/api/admin/todos?clientId=${clientId}`)
    if (res.ok) {
      const json = await res.json()
      setTodos(json.todos ?? [])
    }
    setLoadingTodos(false)
  }, [])

  useEffect(() => { loadTodos(selectedClientId) }, [selectedClientId, loadTodos])

  // ────────── Load programme content ──────────
  const PHASES = [
    { num: 1, name: 'DESTRUCTION', weeks: [1, 2, 3, 4] },
    { num: 2, name: 'FONDATION', weeks: [5, 6, 7, 8, 9] },
    { num: 3, name: 'IGNITION', weeks: [10, 11, 12, 13] },
    { num: 4, name: 'ACCÉLÉRATION', weeks: [14, 15, 16, 17] },
    { num: 5, name: 'DOMINATION', weeks: [18, 19, 20, 21] },
    { num: 6, name: 'TRANSCENDANCE', weeks: [22, 23, 24, 25, 26] },
  ]

  const loadProgramContent = useCallback(async (clientId?: string) => {
    setLoadingProgram(true)
    let query = supabase
      .from('program_content')
      .select('id, phase_number, week_number, title, objectives, focus_text, robin_notes')
    if (clientId) {
      query = query.eq('client_id', clientId)
    } else {
      query = query.is('client_id', null)
    }
    const { data, error } = await query.order('week_number', { ascending: true })
    if (!error && data) {
      setProgramContent(data as ProgramContentRow[])
    }
    setLoadingProgram(false)
  }, [supabase])

  useEffect(() => {
    if (activeTab === 'programme') loadProgramContent(programClientId || undefined)
  }, [activeTab, programClientId, loadProgramContent])

  function getProgramWeek(phase: number, week: number): ProgramContentRow {
    const existing = programContent.find(p => p.phase_number === phase && p.week_number === week)
    return existing ?? { phase_number: phase, week_number: week, title: '', objectives: '', focus_text: '', robin_notes: '' }
  }

  function updateProgramWeek(phase: number, week: number, field: keyof ProgramContentRow, value: string) {
    setProgramContent(prev => {
      const idx = prev.findIndex(p => p.phase_number === phase && p.week_number === week)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], [field]: value }
        return updated
      }
      return [...prev, { phase_number: phase, week_number: week, title: '', objectives: '', focus_text: '', robin_notes: '', [field]: value }]
    })
  }

  async function handleSaveWeek(phase: number, week: number) {
    const key = `${phase}-${week}`
    setSavingWeek(key)
    setProgramMsg(null)
    const content = getProgramWeek(phase, week)
    const { error } = await supabase
      .from('program_content')
      .upsert({
        client_id: programClientId || null,
        phase_number: phase,
        week_number: week,
        title: content.title,
        objectives: content.objectives,
        focus_text: content.focus_text,
        robin_notes: content.robin_notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,phase_number,week_number' })
    if (error) {
      setProgramMsg('Erreur lors de la sauvegarde.')
    } else {
      setProgramMsg(`Semaine ${week} sauvegardée.`)
      await loadProgramContent(programClientId || undefined)
    }
    setSavingWeek(null)
  }

  // ────────── Settings save ──────────
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSavingSettings(true)
    setSettingsErr(null)
    setSettingsMsg(null)
    const { error } = await supabase
      .from('app_settings')
      .update({
        whatsapp_link: settings.whatsapp_link.trim(),
        skool_link: settings.skool_link.trim(),
        iclosed_link: settings.iclosed_link.trim(),
        contract_pdf_url: settings.contract_pdf_url.trim(),
      })
      .eq('id', settings.id)
    if (error) setSettingsErr("Échec de l'enregistrement.")
    else { setSettingsMsg('Configuration mise à jour.'); router.refresh() }
    setSavingSettings(false)
  }

  // ────────── Add client ──────────
  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setAddingClient(true)
    setClientErr(null)
    setClientMsg(null)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: newClientFirstName,
        last_name: newClientLastName,
        email: newClientEmail,
        jour_x: newClientJourX ? Number(newClientJourX) : 1,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setClientErr(json.error ?? 'Erreur lors de la création.')
    } else {
      const jourXLabel = newClientJourX && Number(newClientJourX) > 1 ? ` (démarré à J${newClientJourX})` : ''
      setClientMsg(`Client créé${jourXLabel}. Email de bienvenue envoyé à ${newClientEmail}.`)
      setNewClientFirstName('')
      setNewClientLastName('')
      setNewClientEmail('')
      setNewClientJourX('')
      await loadClients()
    }
    setAddingClient(false)
  }

  // ────────── Add habit ──────────
  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId || !newHabitName.trim()) return
    setAddingHabit(true)
    setHabitErr(null)
    const res = await fetch('/api/admin/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClientId, name: newHabitName, category: newHabitCategory }),
    })
    const json = await res.json()
    if (!res.ok) {
      setHabitErr(json.error ?? 'Erreur lors de la création.')
    } else {
      setNewHabitName('')
      setHabits(prev => [...prev, json.habit])
      setHabitMsg(`✓ Apparaîtra sur le dashboard de ${selectedClient?.first_name}`)
      setTimeout(() => setHabitMsg(null), 4000)
    }
    setAddingHabit(false)
  }

  // ────────── Toggle habit active ──────────
  async function handleToggleHabit(habit: Habit) {
    const res = await fetch(`/api/admin/habits?id=${habit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !habit.is_active }),
    })
    if (res.ok) {
      const json = await res.json()
      setHabits(prev => prev.map(h => h.id === habit.id ? json.habit : h))
    }
  }

  // ────────── Delete habit ──────────
  async function handleDeleteHabit(id: string) {
    const res = await fetch(`/api/admin/habits?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setHabits(prev => prev.filter(h => h.id !== id))
    }
  }

  // ────────── Add todo ──────────
  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId || !newTodoTitle.trim()) return
    setAddingTodo(true)
    setTodoErr(null)
    const res = await fetch('/api/admin/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClientId, title: newTodoTitle.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setTodoErr(json.error ?? 'Erreur lors de la création.')
    } else {
      setNewTodoTitle('')
      setTodos(prev => [...prev, json.todo])
    }
    setAddingTodo(false)
  }

  // ────────── Delete todo ──────────
  async function handleDeleteTodo(id: string) {
    const res = await fetch(`/api/admin/todos?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTodos(prev => prev.filter(t => t.id !== id))
    }
  }

  // ────────── Loading screen ──────────
  if (loadingSettings) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060606' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
            fontWeight: 900, fontSize: 28, letterSpacing: '0.3em',
            background: 'linear-gradient(135deg, #3A86FF, #6098FF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>P180</div>
          <div style={{ color: '#484848', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', animation: 'pulse 2s infinite' }}>
            Chargement…
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060606', color: '#F5F5F5' }}>
        <p style={{ fontSize: 13, color: '#484848' }}>
          Aucune configuration trouvée. Vérifie la table <code style={{ fontFamily: 'monospace' }}>app_settings</code>.
        </p>
      </div>
    )
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'clients', label: 'Clients' },
    { key: 'missions', label: 'Habitudes & Missions' },
    { key: 'todos', label: 'To-do' },
    { key: 'programme', label: 'Programme' },
    { key: 'classement', label: 'Classement' },
    { key: 'configuration', label: 'Config' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#060606', border: '1px solid #1E1E1E',
    borderRadius: 10, padding: '10px 14px', fontSize: 13,
    color: '#F5F5F5', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#F5F5F5' }}>

      {/* Radial glow top */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(58,134,255,0.13) 0%, transparent 65%)',
        zIndex: 0,
      }} />

      {/* ── HEADER ── */}
      <header style={{
        position: 'relative', zIndex: 10,
        borderBottom: '1px solid #1E1E1E',
        background: 'rgba(6,6,6,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#3A86FF', marginBottom: 4,
              }}>
                Projet180 — Admin
              </div>
              <h1 style={{
                fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
                fontWeight: 900, fontSize: 32, letterSpacing: '-0.01em',
                lineHeight: 1, color: '#F5F5F5', margin: 0,
                textTransform: 'uppercase',
              }}>
                Centre de contrôle
              </h1>
            </div>
            {!loadingClients && (() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const todayStr = today.toISOString().slice(0, 10)
              const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10)
              const activeClients = clients.filter(c => c.onboarding_completed)
              const checkedToday = activeClients.filter(c => c.last_activity === todayStr).length
              const inactiveCount = activeClients.filter(c => !c.last_activity || c.last_activity < twoDaysAgo).length
              const bestStreak = clients.reduce((max, c) => Math.max(max, (c as any).current_streak ?? 0), 0)
              return (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {[
                    { value: clients.length, label: 'clients', color: '#F5F5F5' },
                    { value: checkedToday, label: "aujourd'hui", color: '#3A86FF' },
                    { value: inactiveCount, label: inactiveCount > 1 ? 'inactifs' : 'inactif', color: inactiveCount > 0 ? '#EF4444' : '#22C55E' },
                  ].map((kpi, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {i > 0 && <div style={{ width: 1, height: 28, background: '#1E1E1E' }} />}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                        <div style={{ fontSize: 10, color: kpi.color === '#F5F5F5' ? '#484848' : kpi.color, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2, opacity: 0.8 }}>{kpi.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </header>

      {/* ── TAB BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        borderBottom: '1px solid #1E1E1E',
        background: 'rgba(6,6,6,0.97)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 18px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: activeTab === tab.key ? '#F5F5F5' : '#484848',
                position: 'relative',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 2, background: '#3A86FF', borderRadius: '2px 2px 0 0',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ══ Tab: Clients ══ */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Clients list */}
            <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #1E1E1E',
                display: 'grid', gridTemplateColumns: '1fr auto',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848' }}>
                  {loadingClients ? 'Chargement…' : `${clients.length} client${clients.length !== 1 ? 's' : ''} inscrits`}
                </span>
              </div>

              {loadingClients ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>
                  Chargement des clients…
                </div>
              ) : clients.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{ color: '#3A86FF', fontSize: 28, marginBottom: 10 }}>0</div>
                  <div style={{ color: '#484848', fontSize: 13 }}>Aucun client pour l&apos;instant.</div>
                </div>
              ) : (
                <div>
                  {[...clients]
                    .sort((a, b) => {
                      const sa = getClientStatus(a)
                      const sb = getClientStatus(b)
                      if (sa.priority !== sb.priority) return sa.priority - sb.priority
                      return b.jourX - a.jourX
                    })
                    .map((c, i) => {
                    const progress = Math.min(100, Math.round((c.jourX / 180) * 100))
                    const status = getClientStatus(c)
                    const lastAct = relativeTime(c.last_activity)
                    const isInactive = status.label === 'Inactif'
                    return (
                      <a
                        key={c.id}
                        href={`/admin/client/${c.id}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '34px 1fr auto auto',
                          alignItems: 'center',
                          gap: 14,
                          padding: '16px 20px',
                          borderBottom: i < clients.length - 1 ? '1px solid #111111' : 'none',
                          background: isInactive ? 'rgba(239,68,68,0.03)' : 'transparent',
                          transition: 'background 0.15s',
                          textDecoration: 'none', color: 'inherit',
                          borderLeft: isInactive ? '3px solid rgba(239,68,68,0.5)' : '3px solid transparent',
                        }}
                      >
                        <InitialsBadge firstName={c.first_name} lastName={c.last_name} />

                        {/* Name + email + progress bar */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#F5F5F5', lineHeight: 1.2 }}>
                              {c.first_name} {c.last_name}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 5,
                              background: status.bg, border: `1px solid ${status.border}`,
                              fontSize: 9, fontWeight: 700,
                              letterSpacing: '0.1em', textTransform: 'uppercase',
                              color: status.color, whiteSpace: 'nowrap',
                            }}>
                              {status.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: '#484848', fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.email}
                            </span>
                            <span style={{ fontSize: 10, color: isInactive ? '#EF4444' : '#333', fontWeight: 500 }}>
                              · {lastAct}
                            </span>
                          </div>
                          {c.jourX > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#1E1E1E', overflow: 'hidden', maxWidth: 140 }}>
                                <div style={{ height: '100%', borderRadius: 2, background: progress >= 100 ? '#22c55e' : '#3A86FF', width: `${progress}%`, transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: 10, color: '#3A86FF', fontWeight: 700, letterSpacing: '0.05em' }}>
                                J{c.jourX}/180
                              </span>
                            </div>
                          )}
                        </div>

                        {/* XP + Level stacked */}
                        <div style={{ textAlign: 'right', minWidth: 70 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5', fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', letterSpacing: '-0.02em' }}>
                            {c.xp_total.toLocaleString('fr')}
                            <span style={{ fontSize: 9, color: '#484848', marginLeft: 3, letterSpacing: '0.1em' }}>XP</span>
                          </div>
                          <div style={{
                            fontSize: 9, fontWeight: 800,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: '#6098FF', marginTop: 2,
                          }}>
                            {c.level || 'N/A'}
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add client — collapsible */}
            <details className="group" style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              <summary style={{
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', listStyle: 'none', userSelect: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(58,134,255,0.15)', border: '1px solid rgba(58,134,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#3A86FF', fontWeight: 800,
                  }}>+</div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                    Ajouter un client manuellement
                  </span>
                </div>
                <svg className="transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#484848" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </summary>
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1E1E1E' }}>
                <p style={{ fontSize: 12, color: '#484848', margin: '16px 0 16px', lineHeight: 1.5 }}>
                  Crée le compte + envoie l&apos;email de bienvenue. Pour un client existant, indique son Jour X actuel.
                </p>
                <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={newClientFirstName}
                      onChange={e => setNewClientFirstName(e.target.value)}
                      required
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Nom (optionnel)"
                      value={newClientLastName}
                      onChange={e => setNewClientLastName(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={newClientEmail}
                      onChange={e => setNewClientEmail(e.target.value)}
                      required
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="Jour X (défaut: 1)"
                      value={newClientJourX}
                      onChange={e => setNewClientJourX(e.target.value)}
                      min="1"
                      max="180"
                      style={inputStyle}
                    />
                  </div>
                  {clientErr && (
                    <div style={{ fontSize: 13, color: '#f97373', background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px' }}>{clientErr}</div>
                  )}
                  {clientMsg && (
                    <div style={{ fontSize: 13, color: '#22c55e', background: '#001a00', border: '1px solid #16a34a', borderRadius: 10, padding: '10px 14px' }}>{clientMsg}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="submit"
                      disabled={addingClient}
                      style={{
                        padding: '10px 22px', borderRadius: 10,
                        background: addingClient ? '#0A1A3A' : '#3A86FF',
                        border: 'none', cursor: addingClient ? 'not-allowed' : 'pointer',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: '#FFFFFF',
                        transition: 'all 0.15s', opacity: addingClient ? 0.6 : 1,
                      }}
                    >
                      {addingClient ? 'Création…' : 'Créer le compte + envoyer l\'email'}
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>
        )}

        {/* ══ Tab: Missions ══ */}
        {activeTab === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              {/* Client selector */}
              <div style={{ padding: '20px', borderBottom: '1px solid #1E1E1E' }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848', marginBottom: 8 }}>
                  Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Choisir un client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId ? (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Client context banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(58,134,255,0.08)', border: '1px solid rgba(58,134,255,0.2)',
                  }}>
                    <InitialsBadge firstName={selectedClient?.first_name ?? ''} lastName={selectedClient?.last_name ?? ''} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>
                        {selectedClient?.first_name} {selectedClient?.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#3A86FF', letterSpacing: '0.1em', fontWeight: 700 }}>
                        {habits.filter(h => h.is_active && h.category === 'habit').length} habitude{habits.filter(h => h.is_active && h.category === 'habit').length !== 1 ? 's' : ''} · {habits.filter(h => h.is_active && h.category === 'mission').length} mission{habits.filter(h => h.is_active && h.category === 'mission').length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Explication habitude vs mission */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid #1E1E1E',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <span style={{ fontSize: 12, color: '#6098FF', fontWeight: 600 }}>HABITUDE</span>
                      <span style={{ fontSize: 12, color: '#484848' }}>= action quotidienne récurrente (checkbox chaque jour)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>🎯</span>
                      <span style={{ fontSize: 12, color: '#FFA032', fontWeight: 600 }}>MISSION</span>
                      <span style={{ fontSize: 12, color: '#484848' }}>= objectif one-shot avec progression (0-100%)</span>
                    </div>
                  </div>

                  {/* Add habit */}
                  <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="Nom (ex : Froid 3 min, Lire 20 pages…)"
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      required
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <select
                      value={newHabitCategory}
                      onChange={e => setNewHabitCategory(e.target.value as 'habit' | 'mission')}
                      style={{
                        ...inputStyle,
                        width: 120, flexShrink: 0, cursor: 'pointer',
                        paddingRight: 10,
                      }}
                    >
                      <option value="habit">Habitude</option>
                      <option value="mission">Mission</option>
                    </select>
                    <button
                      type="submit"
                      disabled={addingHabit || !newHabitName.trim()}
                      style={{
                        padding: '10px 18px', borderRadius: 10,
                        background: '#3A86FF', border: 'none',
                        cursor: addingHabit || !newHabitName.trim() ? 'not-allowed' : 'pointer',
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#FFFFFF',
                        opacity: addingHabit || !newHabitName.trim() ? 0.5 : 1,
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {addingHabit ? 'Ajout…' : '+ Ajouter'}
                    </button>
                  </form>

                  {habitErr && (
                    <div style={{ fontSize: 13, color: '#f97373', background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px' }}>{habitErr}</div>
                  )}
                  {habitMsg && (
                    <div style={{ fontSize: 13, color: '#22c55e', background: '#001a00', border: '1px solid #16a34a', borderRadius: 10, padding: '10px 14px' }}>{habitMsg}</div>
                  )}

                  {/* Habits list */}
                  {loadingHabits ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#484848', fontSize: 13 }}>Chargement…</div>
                  ) : habits.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                      <div style={{ color: '#484848', fontSize: 13 }}>
                        Aucune mission pour {selectedClient?.first_name}.<br />
                        <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>Ajoute sa première mission ci-dessus.</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Habitudes */}
                      {habits.filter(h => h.category === 'habit').length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6098FF', marginBottom: 8 }}>
                            Habitudes quotidiennes
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {habits.filter(h => h.category === 'habit').map((habit, i) => (
                              <div
                                key={habit.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 14px', borderRadius: 10,
                                  border: `1px solid ${habit.is_active ? 'rgba(58,134,255,0.25)' : '#1A1A1A'}`,
                                  background: habit.is_active ? 'rgba(58,134,255,0.04)' : '#080808',
                                }}
                              >
                                <span style={{ fontSize: 10, color: '#333', fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0 }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span style={{
                                  flex: 1, fontSize: 13, fontWeight: 500,
                                  color: habit.is_active ? '#F5F5F5' : '#484848',
                                  textDecoration: habit.is_active ? 'none' : 'line-through',
                                }}>
                                  {habit.name}
                                </span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                                  letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
                                  background: 'rgba(58, 134, 255, 0.12)',
                                  color: '#6098FF',
                                  border: '1px solid rgba(58,134,255,0.25)',
                                }}>
                                  Habitude
                                </span>
                                <button
                                  onClick={() => handleToggleHabit(habit)}
                                  style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none',
                                    cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: habit.is_active ? 'rgba(58,134,255,0.2)' : '#1E1E1E',
                                    color: habit.is_active ? '#6098FF' : '#484848',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {habit.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  title="Supprimer"
                                  style={{
                                    width: 28, height: 28, borderRadius: 7, border: '1px solid transparent',
                                    background: 'transparent', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#333', transition: 'all 0.15s',
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Missions */}
                      {habits.filter(h => h.category === 'mission').length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#FFA032', marginBottom: 8 }}>
                            Missions
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {habits.filter(h => h.category === 'mission').map((habit, i) => (
                              <div
                                key={habit.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 14px', borderRadius: 10,
                                  border: `1px solid ${habit.is_active ? 'rgba(255,160,50,0.25)' : '#1A1A1A'}`,
                                  background: habit.is_active ? 'rgba(255,160,50,0.04)' : '#080808',
                                }}
                              >
                                <span style={{ fontSize: 10, color: '#333', fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0 }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span style={{
                                  flex: 1, fontSize: 13, fontWeight: 500,
                                  color: habit.is_active ? '#F5F5F5' : '#484848',
                                  textDecoration: habit.is_active ? 'none' : 'line-through',
                                }}>
                                  {habit.name}
                                </span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                                  letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
                                  background: 'rgba(255, 160, 50, 0.12)',
                                  color: '#FFA032',
                                  border: '1px solid rgba(255,160,50,0.25)',
                                }}>
                                  Mission
                                </span>
                                <button
                                  onClick={() => handleToggleHabit(habit)}
                                  style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none',
                                    cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: habit.is_active ? 'rgba(58,134,255,0.2)' : '#1E1E1E',
                                    color: habit.is_active ? '#6098FF' : '#484848',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {habit.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  title="Supprimer"
                                  style={{
                                    width: 28, height: 28, borderRadius: 7, border: '1px solid transparent',
                                    background: 'transparent', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#333', transition: 'all 0.15s',
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>
                  Sélectionne un client pour gérer ses missions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ Tab: To-do ══ */}
        {activeTab === 'todos' && (() => {
          const today = new Date().toISOString().slice(0, 10)
          const systemTodos = todos.filter(t => t.is_system)
          const customTodos = todos.filter(t => !t.is_system)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
                {/* Client selector */}
                <div style={{ padding: '20px', borderBottom: '1px solid #1E1E1E' }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848', marginBottom: 8 }}>
                    Client
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Choisir un client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClientId ? (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Client banner */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(58,134,255,0.08)', border: '1px solid rgba(58,134,255,0.2)',
                    }}>
                      <InitialsBadge firstName={selectedClient?.first_name ?? ''} lastName={selectedClient?.last_name ?? ''} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>
                          {selectedClient?.first_name} {selectedClient?.last_name}
                        </div>
                        <div style={{ fontSize: 10, color: '#3A86FF', letterSpacing: '0.1em', fontWeight: 700 }}>
                          {todos.length} to-do{todos.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* System todos — completion status */}
                    {systemTodos.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848', marginBottom: 10 }}>
                          To-do système (quotidiennes)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {systemTodos.map(todo => {
                            const doneToday = todo.completed_date === today
                            return (
                              <div
                                key={todo.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 14px', borderRadius: 10,
                                  border: `1px solid ${doneToday ? 'rgba(34,197,94,0.25)' : '#1A1A1A'}`,
                                  background: doneToday ? 'rgba(34,197,94,0.05)' : '#080808',
                                }}
                              >
                                <div style={{
                                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                  border: `2px solid ${doneToday ? '#22c55e' : '#333'}`,
                                  background: doneToday ? '#22c55e' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {doneToday && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#060606" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span style={{ flex: 1, fontSize: 13, color: doneToday ? '#F5F5F5' : '#484848' }}>
                                  {todo.title}
                                </span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, letterSpacing: '0.15em',
                                  textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5,
                                  background: doneToday ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                                  color: doneToday ? '#22c55e' : '#333',
                                }}>
                                  {doneToday ? 'Fait aujourd\'hui' : 'Non fait'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom todos */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848', marginBottom: 10 }}>
                        To-do personnalisées
                      </div>

                      {/* Add todo form */}
                      <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Titre de la to-do (ex : Lire 20 min ce soir)"
                          value={newTodoTitle}
                          onChange={e => setNewTodoTitle(e.target.value)}
                          required
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          type="submit"
                          disabled={addingTodo || !newTodoTitle.trim()}
                          style={{
                            padding: '10px 18px', borderRadius: 10,
                            background: '#3A86FF', border: 'none',
                            cursor: addingTodo || !newTodoTitle.trim() ? 'not-allowed' : 'pointer',
                            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: '#FFFFFF',
                            opacity: addingTodo || !newTodoTitle.trim() ? 0.5 : 1,
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}
                        >
                          {addingTodo ? 'Ajout…' : '+ To-do'}
                        </button>
                      </form>

                      {todoErr && (
                        <div style={{ fontSize: 13, color: '#f97373', background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>{todoErr}</div>
                      )}

                      {loadingTodos ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#484848', fontSize: 13 }}>Chargement…</div>
                      ) : customTodos.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#333', fontSize: 13 }}>
                          Aucune to-do personnalisée.<br />
                          <span style={{ fontSize: 11 }}>Ajoute une to-do spécifique pour ce client.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {customTodos.map(todo => (
                            <div
                              key={todo.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 14px', borderRadius: 10,
                                border: '1px solid #1A1A1A', background: '#080808',
                              }}
                            >
                              <span style={{ flex: 1, fontSize: 13, color: '#F5F5F5' }}>{todo.title}</span>
                              <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                title="Supprimer"
                                style={{
                                  width: 28, height: 28, borderRadius: 7, border: '1px solid transparent',
                                  background: 'transparent', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#333', transition: 'all 0.15s', flexShrink: 0,
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>
                    Sélectionne un client pour gérer ses to-dos.
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ══ Tab: Programme ══ */}
        {activeTab === 'programme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Client selector */}
            <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              <div style={{ padding: '20px' }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848', marginBottom: 8 }}>
                  Programme de
                </label>
                <select
                  value={programClientId}
                  onChange={e => setProgramClientId(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Template de base (global) —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#484848', marginTop: 8 }}>
                  {programClientId
                    ? `Programme personnalisé pour ${clients.find(c => c.id === programClientId)?.first_name || 'ce client'}.`
                    : 'Le template de base est visible par les clients qui n\'ont pas de programme personnalisé.'}
                </div>
              </div>
            </div>

            {programMsg && (
              <div style={{
                fontSize: 13,
                color: programMsg.startsWith('Erreur') ? '#f97373' : '#22c55e',
                background: programMsg.startsWith('Erreur') ? '#1a0000' : '#001a00',
                border: `1px solid ${programMsg.startsWith('Erreur') ? '#7f1d1d' : '#16a34a'}`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                {programMsg}
              </div>
            )}

            {loadingProgram ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>
                Chargement du programme…
              </div>
            ) : (
              PHASES.map(phase => (
                <div key={phase.num} style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
                  {/* Phase header */}
                  <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #1E1E1E',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: 'rgba(58,134,255,0.15)', border: '1px solid rgba(58,134,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900, color: '#3A86FF',
                      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    }}>
                      {phase.num}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 800, letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: '#F5F5F5',
                        fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
                      }}>
                        Phase {phase.num} — {phase.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#484848', marginTop: 2 }}>
                        Semaine{phase.weeks.length > 1 ? 's' : ''} {phase.weeks[0]}
                        {phase.weeks.length > 1 ? ` à ${phase.weeks[phase.weeks.length - 1]}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Weeks */}
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {phase.weeks.map(week => {
                      const content = getProgramWeek(phase.num, week)
                      const weekKey = `${phase.num}-${week}`
                      const isSaving = savingWeek === weekKey
                      return (
                        <div key={week} style={{
                          padding: '16px', borderRadius: 10,
                          border: '1px solid #1A1A1A', background: '#080808',
                        }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 14,
                          }}>
                            <span style={{
                              fontSize: 12, fontWeight: 800, letterSpacing: '0.18em',
                              textTransform: 'uppercase', color: '#3A86FF',
                              fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
                            }}>
                              Semaine {week}
                            </span>
                            <button
                              onClick={() => handleSaveWeek(phase.num, week)}
                              disabled={isSaving}
                              style={{
                                padding: '6px 16px', borderRadius: 8,
                                background: isSaving ? '#0A1A3A' : '#3A86FF',
                                border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                                textTransform: 'uppercase', color: '#FFFFFF',
                                opacity: isSaving ? 0.6 : 1, transition: 'all 0.15s',
                              }}
                            >
                              {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                            </button>
                          </div>

                          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                                Titre
                              </label>
                              <input
                                type="text"
                                value={content.title}
                                onChange={e => updateProgramWeek(phase.num, week, 'title', e.target.value)}
                                placeholder="Ex : L'art du matin"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                                Objectifs
                              </label>
                              <input
                                type="text"
                                value={content.objectives}
                                onChange={e => updateProgramWeek(phase.num, week, 'objectives', e.target.value)}
                                placeholder="Ex : Mettre en place la routine matinale"
                                style={inputStyle}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                              Focus
                            </label>
                            <input
                              type="text"
                              value={content.focus_text}
                              onChange={e => updateProgramWeek(phase.num, week, 'focus_text', e.target.value)}
                              placeholder="Phrase de focus pour la semaine"
                              style={inputStyle}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                              Notes Robin
                            </label>
                            <textarea
                              value={content.robin_notes}
                              onChange={e => updateProgramWeek(phase.num, week, 'robin_notes', e.target.value)}
                              placeholder="Notes personnelles, rappels, conseils…"
                              rows={3}
                              style={{
                                ...inputStyle,
                                resize: 'vertical',
                                minHeight: 60,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══ Tab: Classement ══ */}
        {activeTab === 'classement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #1E1E1E',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848' }}>
                  Classement par XP
                </span>
              </div>

              {loadingClients ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>Chargement…</div>
              ) : clients.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484848', fontSize: 13 }}>Aucun client.</div>
              ) : (
                <div>
                  {[...clients]
                    .filter(c => c.onboarding_completed)
                    .sort((a, b) => b.xp_total - a.xp_total)
                    .map((c, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                      const progress = Math.min(100, Math.round((c.jourX / 180) * 100))
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '32px 34px 1fr auto auto',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 20px',
                            borderBottom: '1px solid #111',
                            background: i < 3 ? 'rgba(58,134,255,0.03)' : 'transparent',
                          }}
                        >
                          {/* Rank */}
                          <div style={{
                            fontSize: medal ? 18 : 14,
                            fontWeight: 800,
                            color: medal ? undefined : '#333',
                            textAlign: 'center',
                            fontFamily: medal ? undefined : 'var(--font-mono, "JetBrains Mono", monospace)',
                          }}>
                            {medal ?? `#${i + 1}`}
                          </div>

                          <InitialsBadge firstName={c.first_name} lastName={c.last_name} />

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: i < 3 ? '#F5F5F5' : '#aaa' }}>
                              {c.first_name} {c.last_name}
                            </div>
                            <div style={{ fontSize: 10, color: '#484848', marginTop: 2 }}>
                              J{c.jourX}/180 · {c.level}
                            </div>
                          </div>

                          {/* XP bar */}
                          <div style={{ width: 80 }}>
                            <div style={{ height: 4, borderRadius: 2, background: '#1E1E1E', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 2,
                                background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#3A86FF',
                                width: `${Math.min(100, clients.length > 0 ? (c.xp_total / Math.max(...clients.map(cc => cc.xp_total))) * 100 : 0)}%`,
                              }} />
                            </div>
                          </div>

                          {/* XP */}
                          <div style={{
                            fontSize: 16, fontWeight: 800, color: i < 3 ? '#F5F5F5' : '#888',
                            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                            minWidth: 60, textAlign: 'right',
                          }}>
                            {c.xp_total.toLocaleString('fr')}
                            <span style={{ fontSize: 9, color: '#484848', marginLeft: 2 }}>XP</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══ Tab: Configuration ══ */}
        {activeTab === 'configuration' && (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 14, border: '1px solid #1E1E1E', background: '#0F0F0F', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E1E1E' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#484848' }}>
                  Liens onboarding
                </div>
                <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
                  Affichés aux clients pendant leur onboarding. À modifier uniquement si une URL change.
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                {[
                  { key: 'contract_pdf_url' as keyof AppSettingsRow, label: 'Contrat PDF', placeholder: 'https://.../contrat-projet180.pdf' },
                  { key: 'iclosed_link' as keyof AppSettingsRow, label: 'Lien de call (iClosed)', placeholder: 'https://app.iclosed.io/...' },
                  { key: 'skool_link' as keyof AppSettingsRow, label: 'Communauté Circle', placeholder: 'https://community.circle.so/...' },
                ].map(field => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#484848' }}>
                      {field.label}
                    </label>
                    <input
                      type="url"
                      value={settings[field.key] as string}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>

            {settingsErr && (
              <div style={{ fontSize: 13, color: '#f97373', background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10, padding: '12px 16px' }}>{settingsErr}</div>
            )}
            {settingsMsg && (
              <div style={{ fontSize: 13, color: '#22c55e', background: '#001a00', border: '1px solid #16a34a', borderRadius: 10, padding: '12px 16px' }}>{settingsMsg}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: '11px 28px', borderRadius: 10,
                  background: savingSettings ? '#0A1A3A' : '#3A86FF',
                  border: 'none', cursor: savingSettings ? 'not-allowed' : 'pointer',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: '#FFFFFF',
                  opacity: savingSettings ? 0.6 : 1, transition: 'all 0.15s',
                }}
              >
                {savingSettings ? 'Enregistrement…' : 'Enregistrer les liens'}
              </button>
            </div>
          </form>
        )}

      </main>
    </div>
  )
}
