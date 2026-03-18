import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getLevelByXp } from '@/lib/levels'
import type { LeaderboardEntry } from '@/lib/types'
import ClassementClient from './ClassementClient'

export default async function ClassementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  const [
    { data: leaderboardData },
    { data: onboarding },
    { data: questionnaire },
  ] = await Promise.all([
    admin.from('gamification')
      .select('client_id, xp_total, current_streak, profiles!client_id(first_name)')
      .order('xp_total', { ascending: false })
      .limit(100),
    admin.from('onboarding_progress').select('completed_at').eq('client_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
  ])

  // Jour X / 180
  let jourX = 1
  if (onboarding?.completed_at) {
    const diff = Math.floor((Date.now() - new Date(onboarding.completed_at).getTime()) / 86400000) + 1
    jourX = Math.min(Math.max(diff, 1), 180)
  }
  const daysLeft = 180 - jourX
  const daysPct = Math.round((jourX / 180) * 100)

  // First name from questionnaire or fallback
  const responses = (questionnaire?.responses ?? {}) as Record<string, string>
  const firstName = responses.prenom || responses.firstName || 'Toi'

  // Map to LeaderboardEntry[]
  const leaderboard: LeaderboardEntry[] = (leaderboardData ?? []).map((row: Record<string, unknown>, i: number) => {
    const xp = (row.xp_total as number) ?? 0
    const profiles = row.profiles as { first_name?: string } | null
    return {
      rank: i + 1,
      clientId: row.client_id as string,
      firstName: profiles?.first_name ?? 'Anonyme',
      xp,
      streak: (row.current_streak as number) ?? 0,
      level: getLevelByXp(xp),
      isMe: row.client_id === user.id,
    }
  })

  return (
    <ClassementClient
      leaderboard={leaderboard}
      jourX={jourX}
      daysLeft={daysLeft}
      daysPct={daysPct}
      firstName={firstName}
      onboardingDate={onboarding?.completed_at ?? null}
    />
  )
}
