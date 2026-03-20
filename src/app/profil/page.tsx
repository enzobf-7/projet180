import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ProfilClient from './ProfilClient'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  const [
    { data: onboarding },
    { data: questionnaire },
    { data: gamification },
    { data: weeklyReports },
    { data: wins },
    { data: settings },
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('client_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
    admin.from('weekly_reports').select('id, week_number, motivation_score, responses, submitted_at').eq('client_id', user.id).order('week_number', { ascending: false }),
    admin.from('wins').select('id, content, week_number, created_at').eq('client_id', user.id).order('week_number', { ascending: false }),
    admin.from('app_settings').select('robin_whatsapp').single(),
  ])

  // Jour X / 180
  let jourX = 1
  if (onboarding?.completed_at) {
    const diff = Math.floor((Date.now() - new Date(onboarding.completed_at).getTime()) / 86400000) + 1
    jourX = Math.min(Math.max(diff, 1), 180)
  }

  const responses = (questionnaire?.responses as Record<string, unknown>) ?? {}

  return (
    <ProfilClient
      jourX={jourX}
      email={user.email ?? ''}
      responses={responses}
      gamification={
        (gamification as { xp_total: number; current_streak: number; longest_streak: number; level: number })
        ?? { xp_total: 0, current_streak: 0, longest_streak: 0, level: 1 }
      }
      onboardingDate={onboarding?.completed_at ?? null}
      weeklyReports={(weeklyReports ?? []) as Array<{ id: string; week_number: number; motivation_score: number | null; responses: Record<string, unknown>; submitted_at: string }>}
      wins={(wins ?? []) as Array<{ id: string; content: string; week_number: number; created_at: string }>}
      robinWhatsapp={(settings as { robin_whatsapp?: string | null } | null)?.robin_whatsapp ?? null}
    />
  )
}
