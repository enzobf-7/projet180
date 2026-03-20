import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ProgrammeClient, { type ProgramContentRow } from './ProgrammeClient'

export default async function ProgrammePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  const [
    { data: onboarding },
    { data: questionnaire },
    { data: gamification },
    { data: programContent },
    { data: settings },
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('client_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
    admin.from('program_content').select('phase_number, week_number, title, objectives, focus_text, robin_notes').eq('client_id', user.id).order('week_number', { ascending: true }),
    admin.from('app_settings').select('robin_whatsapp').single(),
  ])

  // Fallback vers le template global si aucun programme personnalisé
  let finalProgramContent = programContent
  if (!programContent || programContent.length === 0) {
    const { data: template } = await admin
      .from('program_content')
      .select('phase_number, week_number, title, objectives, focus_text, robin_notes')
      .is('client_id', null)
      .order('week_number', { ascending: true })
    finalProgramContent = template
  }

  // Jour X / 180
  let jourX = 1
  if (onboarding?.completed_at) {
    const diff = Math.floor((Date.now() - new Date(onboarding.completed_at).getTime()) / 86400000) + 1
    jourX = Math.min(Math.max(diff, 1), 180)
  }

  // First name from questionnaire
  const responses = (questionnaire?.responses as Record<string, unknown>) ?? {}
  const rawName = (responses.full_name as string) ?? (responses.nom_complet as string) ?? (responses.prenom as string) ?? ''
  const firstName = rawName.split(' ')[0] || 'Client'

  return (
    <ProgrammeClient
      jourX={jourX}
      firstName={firstName}
      gamification={
        (gamification as { xp_total: number; current_streak: number; longest_streak: number; level: number })
        ?? { xp_total: 0, current_streak: 0, longest_streak: 0, level: 1 }
      }
      programContent={(finalProgramContent ?? []) as ProgramContentRow[]}
      onboardingDate={onboarding?.completed_at ?? null}
      robinWhatsapp={(settings as { robin_whatsapp?: string | null } | null)?.robin_whatsapp ?? null}
    />
  )
}
