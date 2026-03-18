import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getLevelByXp } from '@/lib/levels'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

  let jourX = 1

  const [
    { data: onboarding },
    { data: questionnaire },
    { data: gamification },
    { data: habits },
    { data: habitLogs },
    { data: leaderboardData },
    { data: settings },
    { count: weeklyLogsCount },
    { data: todosData },
    { data: personalTodosData },
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('client_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
    admin.from('habits').select('id, name, category, description, progress_percent, xp_reward, period').eq('client_id', user.id).eq('is_active', true).order('sort_order, name'),
    admin.from('habit_logs').select('habit_id, completed').eq('client_id', user.id).eq('date', today),
    admin.from('gamification')
      .select('client_id, xp_total, current_streak, profiles!client_id(first_name)')
      .order('xp_total', { ascending: false })
      .limit(100),
    admin.from('app_settings').select('whatsapp_link, robin_whatsapp').limit(1).single(),
    admin.from('habit_logs').select('id', { count: 'exact', head: true }).eq('client_id', user.id).eq('completed', true).gte('date', weekStart).lte('date', today),
    admin.from('todos').select('id, title, is_system, completed_date, day_of_week').eq('client_id', user.id)
      .order('is_system', { ascending: true }).order('created_at', { ascending: true }),
    admin.from('personal_todos').select('id, title, target_date, completed').eq('client_id', user.id).eq('target_date', today),
  ])

  if (onboarding?.completed_at) {
    const diff = Math.floor((Date.now() - new Date(onboarding.completed_at).getTime()) / 86400000) + 1
    jourX = Math.min(Math.max(diff, 1), 180)
  }

  const weekNumber = Math.ceil(jourX / 7)

  const { data: winsData } = await admin
    .from('wins')
    .select('id, content, created_at')
    .eq('client_id', user.id)
    .eq('week_number', weekNumber)
    .order('created_at', { ascending: true })

  const weeklyXP = (weeklyLogsCount ?? 0) * 10
  const responses = (questionnaire?.responses as Record<string, unknown>) ?? {}
  const rawName = (responses.full_name as string) ?? (responses.nom_complet as string) ?? (responses.prenom as string) ?? ''
  const firstName = rawName.split(' ')[0] || 'Client'

  const completedHabitIds = ((habitLogs ?? []) as Array<{ habit_id: string; completed: boolean }>)
    .filter(l => l.completed)
    .map(l => l.habit_id)

  type GamRow = { client_id: string; xp_total: number; current_streak: number; profiles: { first_name: string | null }[] | null }
  const allXP = (leaderboardData ?? []) as unknown as GamRow[]

  const leaderboard = allXP.map((g, i) => ({
    rank: i + 1,
    clientId: g.client_id,
    firstName: g.profiles?.[0]?.first_name || 'Membre',
    xp: g.xp_total,
    streak: g.current_streak,
    level: getLevelByXp(g.xp_total),
    isMe: g.client_id === user.id,
  }))

  const settingsObj = settings as { whatsapp_link: string | null; robin_whatsapp: string | null } | null

  return (
    <DashboardClient
      jourX={jourX}
      firstName={firstName}
      gamification={
        (gamification as { xp_total: number; current_streak: number; longest_streak: number; level: number })
        ?? { xp_total: 0, current_streak: 0, longest_streak: 0, level: 1 }
      }
      habits={(habits ?? []) as Array<{ id: string; name: string; category: 'habit' | 'mission'; description?: string; progress_percent?: number; xp_reward?: number; period?: string }>}
      completedHabitIds={completedHabitIds}
      responses={responses}
      leaderboard={leaderboard}
      onboardingDate={onboarding?.completed_at ?? null}
      whatsappLink={settingsObj?.whatsapp_link ?? null}
      robinWhatsapp={settingsObj?.robin_whatsapp ?? null}
      weeklyXP={weeklyXP}
      initialTodos={(todosData ?? []) as Array<{ id: string; title: string; is_system: boolean; completed_date: string | null; day_of_week: number | null }>}
      initialWins={(winsData ?? []) as Array<{ id: string; content: string; created_at: string }>}
      initialPersonalTodos={(personalTodosData ?? []) as Array<{ id: string; title: string; target_date: string; completed: boolean }>}
      weekNumber={weekNumber}
    />
  )
}
