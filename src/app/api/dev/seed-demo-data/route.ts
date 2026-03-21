import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createAdminClient()

  // Get all client users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const { data: profiles } = await supabase.from('profiles').select('id, role, first_name')
  const clientProfiles = (profiles ?? []).filter(p => p.role === 'client')

  // If no clients exist, create 3 demo clients
  const demoClients = [
    { email: 'alex@demo.projet180.fr', firstName: 'Alexandre', lastName: 'Martin', xp: 2450, streak: 14, longest: 21, level: 3 },
    { email: 'thomas@demo.projet180.fr', firstName: 'Thomas', lastName: 'Dubois', xp: 890, streak: 5, longest: 12, level: 2 },
    { email: 'lucas@demo.projet180.fr', firstName: 'Lucas', lastName: 'Bernard', xp: 4200, streak: 32, longest: 32, level: 4 },
  ]

  const clientIds: string[] = []
  const today = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 45 * 86400000).toISOString()

  for (const demo of demoClients) {
    const existingUser = users.find(u => u.email === demo.email)
    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: 'Demo180!2026',
        email_confirm: true,
        user_metadata: { first_name: demo.firstName, last_name: demo.lastName, role: 'client' },
      })
      if (authError) continue
      userId = authUser.user.id

      // Create profile
      await supabase.from('profiles').upsert({
        id: userId, email: demo.email, first_name: demo.firstName, last_name: demo.lastName, role: 'client',
      }, { onConflict: 'id' })

      // Onboarding (completed 45 days ago)
      await supabase.from('onboarding_progress').upsert({
        client_id: userId, completed_at: startDate,
        step1_signature_name: demo.firstName, step1_signed_at: startDate,
      }, { onConflict: 'client_id' })

      await supabase.from('programs').upsert({ client_id: userId, content: [] }, { onConflict: 'client_id' })
    }

    clientIds.push(userId)

    // Gamification
    await supabase.from('gamification').upsert({
      client_id: userId, xp_total: demo.xp, current_streak: demo.streak,
      longest_streak: demo.longest, level: demo.level,
    }, { onConflict: 'client_id' })

    // Questionnaire
    await supabase.from('questionnaire_responses').upsert({
      client_id: userId,
      responses: {
        full_name: `${demo.firstName} ${demo.lastName}`,
        age: String(24 + demoClients.indexOf(demo) * 3),
        city: ['Paris', 'Lyon', 'Bordeaux'][demoClients.indexOf(demo)],
        objectif_principal: ['Développer mon leadership', 'Gagner en confiance', 'Transformer mon physique'][demoClients.indexOf(demo)],
        vision: ['Devenir un homme accompli et inspirant', 'Atteindre l\'excellence dans tous les domaines', 'Vivre une vie de discipline et de liberté'][demoClients.indexOf(demo)],
        score_body: [6, 4, 8][demoClients.indexOf(demo)],
        score_business: [7, 5, 6][demoClients.indexOf(demo)],
        score_mental: [5, 6, 7][demoClients.indexOf(demo)],
        score_social: [4, 7, 5][demoClients.indexOf(demo)],
      },
    }, { onConflict: 'client_id' })

    // Habits (5 habits + 2 missions)
    await supabase.from('habits').delete().eq('client_id', userId)
    const { data: insertedHabits } = await supabase.from('habits').insert([
      { client_id: userId, name: 'Douche froide', category: 'habit', is_active: true, sort_order: 1, created_by: 'admin' },
      { client_id: userId, name: 'Sport 45min', category: 'habit', is_active: true, sort_order: 2, created_by: 'admin' },
      { client_id: userId, name: 'Lecture 20min', category: 'habit', is_active: true, sort_order: 3, created_by: 'admin' },
      { client_id: userId, name: 'Méditation 10min', category: 'habit', is_active: true, sort_order: 4, created_by: 'admin' },
      { client_id: userId, name: 'Zéro écran 1h avant dodo', category: 'habit', is_active: true, sort_order: 5, created_by: 'admin' },
      { client_id: userId, name: 'Lancer son side project', category: 'mission', is_active: true, sort_order: 6, created_by: 'admin', description: 'Définir et lancer ton projet personnel', period: 'S3-S8', progress_percent: 35, xp_reward: 200 },
      { client_id: userId, name: 'Challenge social 30j', category: 'mission', is_active: true, sort_order: 7, created_by: 'admin', description: 'Parler à un inconnu chaque jour pendant 30 jours', period: 'S5-S9', progress_percent: 60, xp_reward: 150 },
    ]).select('id')

    // Mark some habits completed today
    const habitIds = (insertedHabits ?? []).map(h => h.id)
    const logsToInsert = habitIds.slice(0, 3).map(habit_id => ({
      client_id: userId, habit_id, date: today, completed: true,
    }))
    if (logsToInsert.length > 0) {
      await supabase.from('habit_logs').upsert(logsToInsert, { onConflict: 'habit_id,date' })
    }

    // System todos
    await supabase.from('todos').delete().eq('client_id', userId).eq('is_system', true)
    await supabase.from('todos').insert([
      { client_id: userId, title: 'Préparer to-do de demain', is_system: true, day_of_week: null },
      { client_id: userId, title: 'Poster wins de la semaine', is_system: true, day_of_week: 0 },
    ])

    // Personal todos for today
    await supabase.from('personal_todos').delete().eq('client_id', userId)
    await supabase.from('personal_todos').insert([
      { client_id: userId, title: 'Appeler le comptable', target_date: today, completed: false },
      { client_id: userId, title: 'Préparer le call coaching', target_date: today, completed: true },
    ])

    // Wins
    await supabase.from('wins').delete().eq('client_id', userId)
    const weekNum = Math.ceil(45 / 7)
    await supabase.from('wins').insert([
      { client_id: userId, content: 'Premier cold approach réussi', week_number: weekNum - 1 },
      { client_id: userId, content: 'Side project lancé — MVP en ligne', week_number: weekNum - 1 },
      { client_id: userId, content: '14 jours de streak sans interruption', week_number: weekNum },
    ])
  }

  // Seed program_content
  await supabase.from('program_content').upsert([
    { phase_number: 1, week_number: 1, title: 'Destruction — Semaine 1', objectives: 'Casser les anciennes habitudes. Identifier ce qui te freine.', focus_text: 'Table rase', robin_notes: 'On détruit pour mieux reconstruire.' },
    { phase_number: 1, week_number: 2, title: 'Destruction — Semaine 2', objectives: 'Cold shower + sport. Sortir de la zone de confort.', focus_text: 'Inconfort', robin_notes: 'Le confort est l\'ennemi.' },
    { phase_number: 1, week_number: 3, title: 'Destruction — Semaine 3', objectives: 'Identifier tes croyances limitantes. Les détruire une par une.', focus_text: 'Mental shift', robin_notes: 'Tes pensées créent ta réalité.' },
    { phase_number: 1, week_number: 4, title: 'Destruction — Bilan', objectives: 'Auto-évaluation. Premier call coaching.', focus_text: 'Review', robin_notes: 'On fait le point ensemble.' },
    { phase_number: 2, week_number: 5, title: 'Fondation — Semaine 1', objectives: 'Installer les habitudes de base. Routine matinale.', focus_text: 'Discipline', robin_notes: 'Concentre-toi sur la régularité.' },
    { phase_number: 2, week_number: 6, title: 'Fondation — Semaine 2', objectives: 'Challenge social. Sortir de ta zone de confort.', focus_text: 'Connexions', robin_notes: 'Parle à des inconnus. Chaque jour.' },
  ], { onConflict: 'phase_number,week_number' })

  // Set Robin's WhatsApp in settings
  await supabase.from('app_settings').update({
    robin_whatsapp: '33612345678',
    whatsapp_link: 'https://chat.whatsapp.com/demo',
  }).eq('id', 1)

  return NextResponse.json({
    status: 'ok',
    clients_seeded: clientIds.length,
    program_content_seeded: 6,
  })
}
