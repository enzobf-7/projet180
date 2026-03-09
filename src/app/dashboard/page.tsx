import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: onboarding },
    { data: questionnaire },
    { data: gamification },
    { data: habits },
    { data: habitLogs },
    { data: allGamification },
    { data: settings },
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('user_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
    admin.from('habits').select('id, name').eq('client_id', user.id).eq('is_active', true).order('sort_order, name'),
    admin.from('habit_logs').select('habit_id, completed').eq('client_id', user.id).eq('date', today),
    admin.from('gamification').select('client_id, xp_total, current_streak').order('xp_total', { ascending: false }).limit(100),
    admin.from('app_settings').select('whatsapp_link').eq('id', 1).single(),
  ])

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

  // Today's completed habit IDs
  const completedHabitIds = ((habitLogs ?? []) as Array<{ habit_id: string; completed: boolean }>)
    .filter(l => l.completed)
    .map(l => l.habit_id)

  // Leaderboard — join gamification + questionnaire_responses for first names
  type GamRow = { client_id: string; xp_total: number; current_streak: number }
  const allXP = (allGamification ?? []) as GamRow[]

  type LeaderboardEntry = {
    rank: number; clientId: string; firstName: string
    xp: number; streak: number; isMe: boolean
  }
  let leaderboard: LeaderboardEntry[] = []

  if (allXP.length > 0) {
    const { data: allNames } = await admin
      .from('questionnaire_responses')
      .select('client_id, responses')
      .in('client_id', allXP.map(g => g.client_id))

    const nameMap = new Map<string, string>()
    for (const q of (allNames ?? [])) {
      const r = (q.responses as Record<string, unknown>) ?? {}
      const raw = (r.full_name as string) ?? (r.nom_complet as string) ?? (r.prenom as string) ?? ''
      nameMap.set(q.client_id, raw.split(' ')[0] || 'Membre')
    }

    leaderboard = allXP.map((g, i) => ({
      rank: i + 1,
      clientId: g.client_id,
      firstName: nameMap.get(g.client_id) ?? 'Membre',
      xp: g.xp_total,
      streak: g.current_streak,
      isMe: g.client_id === user.id,
    }))
  }

  return (
    <DashboardClient
      jourX={jourX}
      firstName={firstName}
      gamification={
        (gamification as { xp_total: number; current_streak: number; longest_streak: number; level: number })
        ?? { xp_total: 0, current_streak: 0, longest_streak: 0, level: 1 }
      }
      habits={(habits ?? []) as Array<{ id: string; name: string }>}
      completedHabitIds={completedHabitIds}
      responses={responses}
      leaderboard={leaderboard}
      onboardingDate={onboarding?.completed_at ?? null}
      whatsappLink={(settings as { whatsapp_link: string | null } | null)?.whatsapp_link ?? null}
    />
  )
}
