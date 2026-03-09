import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TEST_EMAIL =
  process.env.SEED_TEST_USER_EMAIL || 'demo+glc-client@example.com'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createAdminClient()

  // Get user by email
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const user = users.find((u) => u.email === TEST_EMAIL)
  if (!user) {
    return NextResponse.json({ error: 'Test user not found' }, { status: 404 })
  }

  const clientId = user.id

  // 1. Questionnaire responses
  await supabase.from('questionnaire_responses').upsert(
    {
      client_id: clientId,
      responses: {
        full_name: 'Alexandre Martin',
        age: '28',
        objectif_principal: 'Développer ma confiance sociale et ma présence masculine',
        situation_actuelle: 'Célibataire, je veux améliorer ma vie sociale et amoureuse',
      },
    },
    { onConflict: 'client_id' }
  )

  // 2. Gamification
  await supabase.from('gamification').upsert(
    {
      client_id: clientId,
      xp_total: 1240,
      current_streak: 5,
      longest_streak: 12,
      level: 3,
      badges: ['first_habit', 'week_streak'],
    },
    { onConflict: 'client_id' }
  )

  // 3. Habits — insert 5 demo habits
  const habitsToInsert = [
    { client_id: clientId, name: 'Douche froide', is_active: true, sort_order: 1 },
    { client_id: clientId, name: 'Sport 30min', is_active: true, sort_order: 2 },
    { client_id: clientId, name: 'Lecture 20min', is_active: true, sort_order: 3 },
    { client_id: clientId, name: 'Méditation', is_active: true, sort_order: 4 },
    { client_id: clientId, name: 'Approche sociale', is_active: true, sort_order: 5 },
  ]

  // Delete existing habits for this client first to avoid duplicates
  await supabase.from('habits').delete().eq('client_id', clientId)

  const { data: insertedHabits, error: habitsError } = await supabase
    .from('habits')
    .insert(habitsToInsert)
    .select('id')

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 })
  }

  // 4. Mark first 3 habits as completed today
  const today = new Date().toISOString().split('T')[0]
  const habitIds = (insertedHabits ?? []).map((h) => h.id)
  const logsToInsert = habitIds.slice(0, 3).map((habit_id) => ({
    client_id: clientId,
    habit_id,
    date: today,
    completed: true,
  }))

  if (logsToInsert.length > 0) {
    await supabase
      .from('habit_logs')
      .upsert(logsToInsert, { onConflict: 'habit_id,date' })
  }

  return NextResponse.json({
    status: 'ok',
    client_id: clientId,
    habits_created: habitIds.length,
    habits_completed_today: logsToInsert.length,
  })
}
