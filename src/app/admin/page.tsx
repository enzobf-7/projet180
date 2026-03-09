'use client'

import { useEffect, useState } from 'react'
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

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(196,30,42,0.12)_0%,_transparent_55%)] pointer-events-none" />

      <header className="relative border-b border-[#1E1E1E] bg-[#060606]/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] border border-[#1E1E1E] flex items-center justify-center">
              <span className="text-sm font-black text-[#8B1A1A]">GL</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#484848]">Admin</span>
              <span className="text-sm font-medium text-[#F5F5F5]">Centre de contrôle Robin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 py-10 space-y-8">
        <section className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Onboarding & accès clients</h1>
            <p className="text-sm text-[#484848]">
              C&apos;est ici que tu branches WhatsApp, Skool, ton lien de call et ton contrat. Tu peux tout ajuster à tout moment.
            </p>
          </div>

          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-[#1E1E1E] bg-[#0F0F0F] p-6 space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">
                  Lien du groupe WhatsApp
                </label>
                <input
                  type="url"
                  value={settings.whatsapp_link}
                  onChange={(e) => setSettings({ ...settings, whatsapp_link: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
                <p className="text-[11px] text-[#484848]">
                  Lien d&apos;invitation vers ton groupe privé GLC.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">
                  Lien de la communauté Skool
                </label>
                <input
                  type="url"
                  value={settings.skool_link}
                  onChange={(e) => setSettings({ ...settings, skool_link: e.target.value })}
                  placeholder="https://app.skool.com/..."
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
                <p className="text-[11px] text-[#484848]">
                  Page d&apos;accueil Skool pour tes membres.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">
                  Lien de réservation de call
                </label>
                <input
                  type="url"
                  value={settings.iclosed_link}
                  onChange={(e) => setSettings({ ...settings, iclosed_link: e.target.value })}
                  placeholder="Lien Calendly / iClosed"
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
                <p className="text-[11px] text-[#484848]">
                  Utilisé pour débloquer l&apos;étape &quot;Premier call&quot; de l&apos;onboarding.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#484848] uppercase tracking-[0.18em]">
                  URL du contrat PDF
                </label>
                <input
                  type="url"
                  value={settings.contract_pdf_url}
                  onChange={(e) => setSettings({ ...settings, contract_pdf_url: e.target.value })}
                  placeholder="https://.../contracts/contrat-glc.pdf"
                  className="w-full bg-[#060606] border border-[#1E1E1E] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#484848] focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
                <p className="text-[11px] text-[#484848]">
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8B1A1A] hover:bg-[#A32020] text-sm font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer les changements'}
              </button>
            </div>
          </form>
        </section>

        {/* Admin tools nav */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tight">Outils</h2>
            <p className="text-sm text-[#484848]">
              Accède aux différentes sections de gestion.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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
        </section>
      </main>
    </div>
  )
}

