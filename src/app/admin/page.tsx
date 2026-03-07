'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AppSettingsRow {
  id: string
  whatsapp_link: string
  skool_link: string
  iclosed_link: string
  contract_pdf_url: string
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [settings, setSettings] = useState<AppSettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const {
        data,
        error,
      } = await supabase
        .from('app_settings')
        .select('id, whatsapp_link, skool_link, iclosed_link, contract_pdf_url')
        .limit(1)
        .single()

      if (error) {
        setError("Impossible de charger la configuration.")
      } else if (data) {
        setSettings(data as AppSettingsRow)
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return

    setSaving(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase
      .from('app_settings')
      .update({
        whatsapp_link: settings.whatsapp_link.trim(),
        skool_link: settings.skool_link.trim(),
        iclosed_link: settings.iclosed_link.trim(),
        contract_pdf_url: settings.contract_pdf_url.trim(),
      })
      .eq('id', settings.id)

    if (error) {
      setError("Échec de l'enregistrement. Réessaie dans un instant.")
    } else {
      setMessage('Configuration mise à jour.')
      router.refresh()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="space-y-3 text-center">
          <div className="text-[#C41E2A] font-black tracking-widest text-lg uppercase">GLC</div>
          <div className="text-[#555555] text-xs animate-pulse">Chargement de ton espace admin…</div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-[#F5F5F5]">
        <p className="text-sm text-[#888888]">
          Aucune configuration d&apos;application trouvée. Vérifie la table <span className="font-mono">app_settings</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(196,30,42,0.12)_0%,_transparent_55%)] pointer-events-none" />

      <header className="relative border-b border-[#1F1F1F] bg-[#050505]/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] border border-[#2A2A2A] flex items-center justify-center">
              <span className="text-sm font-black text-[#C41E2A]">GL</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#777777]">Admin</span>
              <span className="text-sm font-medium text-[#F5F5F5]">Centre de contrôle Robin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 py-10 space-y-8">
        <section className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Onboarding & accès clients</h1>
            <p className="text-sm text-[#888888]">
              C&apos;est ici que tu branches WhatsApp, Skool, ton lien de call et ton contrat. Tu peux tout ajuster à tout moment.
            </p>
          </div>

          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-[#1F1F1F] bg-[#080808] p-6 space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#777777] uppercase tracking-[0.18em]">
                  Lien du groupe WhatsApp
                </label>
                <input
                  type="url"
                  value={settings.whatsapp_link}
                  onChange={(e) => setSettings({ ...settings, whatsapp_link: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-[#050505] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none focus:border-[#C41E2A] transition-colors"
                />
                <p className="text-[11px] text-[#555555]">
                  Lien d&apos;invitation vers ton groupe privé GLC.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#777777] uppercase tracking-[0.18em]">
                  Lien de la communauté Skool
                </label>
                <input
                  type="url"
                  value={settings.skool_link}
                  onChange={(e) => setSettings({ ...settings, skool_link: e.target.value })}
                  placeholder="https://app.skool.com/..."
                  className="w-full bg-[#050505] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none focus:border-[#C41E2A] transition-colors"
                />
                <p className="text-[11px] text-[#555555]">
                  Page d&apos;accueil Skool pour tes membres.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#777777] uppercase tracking-[0.18em]">
                  Lien de réservation de call
                </label>
                <input
                  type="url"
                  value={settings.iclosed_link}
                  onChange={(e) => setSettings({ ...settings, iclosed_link: e.target.value })}
                  placeholder="Lien Calendly / iClosed"
                  className="w-full bg-[#050505] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none focus:border-[#C41E2A] transition-colors"
                />
                <p className="text-[11px] text-[#555555]">
                  Utilisé pour débloquer l&apos;étape &quot;Premier call&quot; de l&apos;onboarding.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#777777] uppercase tracking-[0.18em]">
                  URL du contrat PDF
                </label>
                <input
                  type="url"
                  value={settings.contract_pdf_url}
                  onChange={(e) => setSettings({ ...settings, contract_pdf_url: e.target.value })}
                  placeholder="https://.../contracts/contrat-glc.pdf"
                  className="w-full bg-[#050505] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none focus:border-[#C41E2A] transition-colors"
                />
                <p className="text-[11px] text-[#555555]">
                  Héberge le contrat dans le bucket <span className="font-mono">contracts</span>, puis colle ici l&apos;URL publique.
                </p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#f97373] bg-[#3b0b0b] border border-[#7f1d1d] rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-[#22c55e] bg-[#052e16] border border-[#16a34a] rounded-xl px-4 py-3">
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C41E2A] hover:bg-[#E63946] text-sm font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer les changements'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

