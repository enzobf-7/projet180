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
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('user_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
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
    />
  )
}
