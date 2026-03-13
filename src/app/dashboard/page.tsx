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
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

  // Compute jourX early so we can derive weekNumber for wins query
  // We'll refine jourX after we get onboarding data
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
  ] = await Promise.all([
    admin.from('onboarding_progress').select('completed_at').eq('user_id', user.id).single(),
    admin.from('questionnaire_responses').select('responses').eq('client_id', user.id).single(),
    admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', user.id).single(),
    admin.from('habits').select('id, name, category').eq('client_id', user.id).eq('is_active', true).order('sort_order, name'),
    admin.from('habit_logs').select('habit_id, completed').eq('client_id', user.id).eq('date', today),
    // Leaderboard: join with profiles to get first_name in one query (no sequential fetch)
    admin.from('gamification')
      .select('client_id, xp_total, current_streak, profiles!client_id(first_name)')
      .order('xp_total', { ascending: false })
      .limit(100),
    admin.from('app_settings').select('whatsapp_link').eq('id', 1).single(),
    admin.from('habit_logs').select('id', { count: 'exact', head: true }).eq('client_id', user.id).eq('completed', true).gte('date', weekStart).lte('date', today),
    // Todos: server-side (fixes RLS issues)
    admin.from('todos').select('id, title, is_system, completed_date').eq('client_id', user.id)
      .order('is_system', { ascending: true }).order('created_at', { ascending: true }),
  ])

  // Jour X / 180
  if (onboarding?.completed_at) {
    const diff = Math.floor((Date.now() - new Date(onboarding.completed_at).getTime()) / 86400000) + 1
    jourX = Math.min(Math.max(diff, 1), 180)
  }

  const weekNumber = Math.ceil(jourX / 7)

  // Wins: server-side (second batch, needs weekNumber)
  const { data: winsData } = await admin
    .from('wins')
    .select('id, content, created_at')
    .eq('client_id', user.id)
    .eq('week_number', weekNumber)
    .order('created_at', { ascending: true })

  // Weekly XP = nb habits completed this week × base 10 XP (approx)
  const weeklyXP = (weeklyLogsCount ?? 0) * 10

  // First name from questionnaire
  const responses = (questionnaire?.responses as Record<string, unknown>) ?? {}
  const rawName = (responses.full_name as string) ?? (responses.nom_complet as string) ?? (responses.prenom as string) ?? ''
  const firstName = rawName.split(' ')[0] || 'Client'

  // Today's completed habit IDs
  const completedHabitIds = ((habitLogs ?? []) as Array<{ habit_id: string; completed: boolean }>)
    .filter(l => l.completed)
    .map(l => l.habit_id)

  // Leaderboard — names from profiles join (PostgREST returns embedded as array)
  type GamRow = { client_id: string; xp_total: number; current_streak: number; profiles: { first_name: string | null }[] | null }
  const allXP = (leaderboardData ?? []) as unknown as GamRow[]

  const leaderboard = allXP.map((g, i) => ({
    rank: i + 1,
    clientId: g.client_id,
    firstName: g.profiles?.[0]?.first_name || 'Membre',
    xp: g.xp_total,
    streak: g.current_streak,
    isMe: g.client_id === user.id,
  }))

  return (
    <DashboardClient
      jourX={jourX}
      firstName={firstName}
      gamification={
        (gamification as { xp_total: number; current_streak: number; longest_streak: number; level: number })
        ?? { xp_total: 0, current_streak: 0, longest_streak: 0, level: 1 }
      }
      habits={(habits ?? []) as Array<{ id: string; name: string; category: 'habit' | 'mission' }>}
      completedHabitIds={completedHabitIds}
      responses={responses}
      leaderboard={leaderboard}
      onboardingDate={onboarding?.completed_at ?? null}
      whatsappLink={(settings as { whatsapp_link: string | null } | null)?.whatsapp_link ?? null}
      weeklyXP={weeklyXP}
      initialTodos={(todosData ?? []) as Array<{ id: string; title: string; is_system: boolean; completed_date: string | null }>}
      initialWins={(winsData ?? []) as Array<{ id: string; content: string; created_at: string }>}
      weekNumber={weekNumber}
    />
  )
}
