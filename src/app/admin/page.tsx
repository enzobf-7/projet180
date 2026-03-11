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
}

interface Habit {
  id: string
  client_id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

type Tab = 'clients' | 'missions' | 'configuration' | 'messagerie'

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
  const [clientMsg, setClientMsg] = useState<string | null>(null)
  const [clientErr, setClientErr] = useState<string | null>(null)

  // — Habits —
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [loadingHabits, setLoadingHabits] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [addingHabit, setAddingHabit] = useState(false)
  const [habitErr, setHabitErr] = useState<string | null>(null)

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
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setClientErr(json.error ?? 'Erreur lors de la création.')
    } else {
      setClientMsg(`Client créé. Email de bienvenue envoyé à ${newClientEmail}.`)
      setNewClientFirstName('')
      setNewClientLastName('')
      setNewClientEmail('')
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
      body: JSON.stringify({ client_id: selectedClientId, name: newHabitName }),
    })
    const json = await res.json()
    if (!res.ok) {
      setHabitErr(json.error ?? 'Erreur lors de la création.')
    } else {
      setNewHabitName('')
      setHabits(prev => [...prev, json.habit])
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

  // ────────── Loading screen ──────────
  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060606]">
        <div className="space-y-3 text-center">
          <div className="text-[#8B1A1A] font-black tracking-widest text-lg uppercase">GLC</div>
          <div className="text-[#484848] text-xs animate-pulse">Chargement de ton espace admin…</div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060606] text-[#F5F5F5]">
        <p className="text-sm text-[#484848]">
          Aucune configuration d&apos;application trouvée. Vérifie la table <span className="font-mono">app_settings</span>.
        </p>
      </div>
    )
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'clients', label: 'Clients' },
    { key: 'missions', label: 'Missions' },
    { key: 'configuration', label: 'Configuration' },
    { key: 'messagerie', label: 'Messagerie' },
  ]

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,26,26,0.10)_0%,_transparent_55%)] pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-[#1E1E1E] bg-[#060606]/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#484848]">Admin</span>
          <h1 className="text-xl font-black tracking-tight text-[#F5F5F5]">Centre de contrôle Robin</h1>
        </div>
      </header>

      {/* Tab bar */}
      <div className="relative border-b border-[#1E1E1E] bg-[#060606]/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3.5 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-[#F5F5F5]'
                    : 'text-[#484848] hover:text-[#888888]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B1A1A] rounded-t-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="relative max-w-4xl mx-auto px-4 py-8">

        {/* ── Tab: Clients ── */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Clients table */}
            <div className="rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#484848]">
                  {loadingClients ? 'Chargement…' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              {loadingClients ? (
                <div className="px-6 py-8 text-center text-[#484848] text-sm animate-pulse">Chargement des clients…</div>
              ) : clients.length === 0 ? (
                <div className="px-6 py-8 text-center text-[#484848] text-sm">Aucun client pour l&apos;instant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1E1E1E]">
                        <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">Client</th>
                        <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">Email</th>
                        <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">Jour</th>
                        <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">XP</th>
                        <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">Niveau</th>
                        <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#484848]">Onboarding</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-b border-[#1E1E1E] last:border-0 ${i % 2 === 0 ? '' : 'bg-[#060606]/40'}`}
                        >
                          <td className="px-5 py-3 font-medium text-[#F5F5F5]">
                            {c.first_name} {c.last_name}
                          </td>
                          <td className="px-5 py-3 text-[#484848] font-mono text-xs">{c.email}</td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {c.jourX > 0 ? (
                              <span className="text-[#F5F5F5]">J{c.jourX}</span>
                            ) : (
                              <span className="text-[#484848]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-[#F5F5F5]">{c.xp_total.toLocaleString('fr')}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-black uppercase tracking-wider text-[#8B1A1A]">{c.level}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {c.onboarding_completed ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]" title="Terminé" />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-[#484848]" title="En cours" />
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <a
                              href={`/admin/client/${c.id}`}
                              className="text-xs text-[#484848] hover:text-[#F5F5F5] transition-colors"
                            >
                              Voir fiche →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add client form */}
            <details className="group rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] overflow-hidden">
              <summary className="px-5 py-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-[#111111] transition-colors">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#484848]">Ajouter un client manuellement</span>
                <svg className="w-4 h-4 text-[#484848] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 pt-2 border-t border-[#1E1E1E]">
                <p className="text-xs text-[#484848] mb-4">Fallback si Stripe ne déclenche pas le webhook. Crée le compte + envoie l&apos;email de bienvenue.</p>
                <form onSubmit={handleAddClient} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={newClientFirstName}
                      onChange={e => setNewClientFirstName(e.target.value)}
                      required
                      className="bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Nom (optionnel)"
                      value={newClientLastName}
                      onChange={e => setNewClientLastName(e.target.value)}
                      className="bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={newClientEmail}
                      onChange={e => setNewClientEmail(e.target.value)}
                      required
                      className="bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    />
                  </div>
                  {clientErr && (
                    <div className="text-sm text-[#f97373] bg-[#3b0b0b] border border-[#7f1d1d] rounded-xl px-4 py-3">{clientErr}</div>
                  )}
                  {clientMsg && (
                    <div className="text-sm text-[#22c55e] bg-[#052e16] border border-[#16a34a] rounded-xl px-4 py-3">{clientMsg}</div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={addingClient}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#A32020] text-sm font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                      {addingClient ? 'Création…' : 'Créer le compte + envoyer l\'email'}
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>
        )}

        {/* ── Tab: Missions ── */}
        {activeTab === 'missions' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-[0.18em] text-[#484848]">
                  Sélectionner un client
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                >
                  <option value="">— Choisir un client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <>
                  <form onSubmit={handleAddHabit} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Nom de la mission (ex: Froid 3 min)"
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      required
                      className="flex-1 bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={addingHabit || !newHabitName.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#A32020] text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      {addingHabit ? 'Ajout…' : '+ Ajouter'}
                    </button>
                  </form>
                  {habitErr && (
                    <div className="text-sm text-[#f97373] bg-[#3b0b0b] border border-[#7f1d1d] rounded-xl px-4 py-3">{habitErr}</div>
                  )}

                  {loadingHabits ? (
                    <div className="text-center text-[#484848] text-sm py-4 animate-pulse">Chargement…</div>
                  ) : habits.length === 0 ? (
                    <div className="text-center text-[#484848] text-sm py-4">
                      Aucune mission pour {selectedClient?.first_name}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {habits.map(habit => (
                        <div
                          key={habit.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1E1E1E] bg-[#060606]"
                        >
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${habit.is_active ? 'text-[#F5F5F5]' : 'text-[#484848] line-through'}`}>
                              {habit.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleHabit(habit)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                              habit.is_active
                                ? 'bg-[#8B1A1A]/20 text-[#8B1A1A] hover:bg-[#8B1A1A]/30'
                                : 'bg-[#1E1E1E] text-[#484848] hover:bg-[#2A2A2A]'
                            }`}
                          >
                            {habit.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-1.5 rounded-lg text-[#484848] hover:text-[#f97373] hover:bg-[#3b0b0b] transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Configuration ── */}
        {activeTab === 'configuration' && (
          <form onSubmit={handleSaveSettings} className="rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] p-6 space-y-5">
            <p className="text-xs text-[#484848]">Ces liens sont affichés aux clients pendant l&apos;onboarding. À modifier uniquement si une URL change.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">Groupe WhatsApp</label>
                <input
                  type="url"
                  value={settings.whatsapp_link}
                  onChange={(e) => setSettings({ ...settings, whatsapp_link: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">Communauté Skool</label>
                <input
                  type="url"
                  value={settings.skool_link}
                  onChange={(e) => setSettings({ ...settings, skool_link: e.target.value })}
                  placeholder="https://app.skool.com/..."
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">Lien de call (iClosed)</label>
                <input
                  type="url"
                  value={settings.iclosed_link}
                  onChange={(e) => setSettings({ ...settings, iclosed_link: e.target.value })}
                  placeholder="https://app.iclosed.io/..."
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">Contrat PDF</label>
                <input
                  type="url"
                  value={settings.contract_pdf_url}
                  onChange={(e) => setSettings({ ...settings, contract_pdf_url: e.target.value })}
                  placeholder="https://.../contrat-glc.pdf"
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>
            </div>
            {settingsErr && (
              <div className="text-sm text-[#f97373] bg-[#3b0b0b] border border-[#7f1d1d] rounded-xl px-4 py-3">{settingsErr}</div>
            )}
            {settingsMsg && (
              <div className="text-sm text-[#22c55e] bg-[#052e16] border border-[#16a34a] rounded-xl px-4 py-3">{settingsMsg}</div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#A32020] text-sm font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {savingSettings ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Messagerie ── */}
        {activeTab === 'messagerie' && (
          <div className="space-y-4">
            <Link
              href="/admin/messagerie"
              className="group flex items-center gap-4 rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] p-5 hover:border-[#8B1A1A] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#060606] border border-[#1E1E1E] flex items-center justify-center shrink-0 group-hover:border-[#8B1A1A] transition-colors">
                <svg className="w-5 h-5 text-[#8B1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5F5F5]">Messagerie</p>
                <p className="text-xs text-[#484848] mt-0.5">Conversations avec tes clients</p>
              </div>
              <svg className="w-4 h-4 text-[#484848] ml-auto group-hover:text-[#8B1A1A] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        )}

      </main>
    </div>
  )
}
