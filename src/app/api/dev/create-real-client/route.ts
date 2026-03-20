import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const email = 'contact@alchim-ia.com'
  const firstName = 'Enzo'
  const lastName = 'Test'
  const tempPassword = generateTempPassword()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'

  // Delete existing test user if exists
  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)
  if (existing) {
    // Clean up DB rows first
    await admin.from('personal_todos').delete().eq('client_id', existing.id)
    await admin.from('habit_logs').delete().eq('client_id', existing.id)
    await admin.from('habits').delete().eq('client_id', existing.id)
    await admin.from('todos').delete().eq('client_id', existing.id)
    await admin.from('wins').delete().eq('client_id', existing.id)
    await admin.from('weekly_reports').delete().eq('client_id', existing.id)
    await admin.from('milestone_emails_sent').delete().eq('client_id', existing.id)
    await admin.from('messages').delete().or(`sender_id.eq.${existing.id},receiver_id.eq.${existing.id}`)
    await admin.from('questionnaire_responses').delete().eq('client_id', existing.id)
    await admin.from('program_content').delete().eq('client_id', existing.id)
    await admin.from('gamification').delete().eq('client_id', existing.id)
    await admin.from('programs').delete().eq('client_id', existing.id)
    await admin.from('onboarding_progress').delete().eq('user_id', existing.id)
    await admin.from('profiles').delete().eq('id', existing.id)
    await admin.auth.admin.deleteUser(existing.id)
  }

  // Create fresh user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: 'client',
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authUser.user.id

  // Insert all required rows (same as Stripe webhook + admin/clients)
  await admin.from('profiles').insert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'client',
  })
  await admin.from('onboarding_progress').insert({ client_id: userId })
  await admin.from('programs').insert({ client_id: userId, content: [] })
  await admin.from('gamification').insert({ client_id: userId })
  await admin.from('todos').insert([
    { client_id: userId, title: 'Préparer to-do de demain', is_system: true, day_of_week: null },
    { client_id: userId, title: 'Poster wins de la semaine', is_system: true, day_of_week: 0 },
  ])

  // Send real welcome email
  const emailSent = await sendEmail({
    to: email,
    toName: firstName,
    subject: 'Bienvenue dans PROJET180',
    html: p180EmailTemplate(`
      <p>Salut ${firstName},</p>
      <p>Tu viens de rejoindre <span style="background: #0B0B0B; border-radius: 6px; padding: 3px 10px; display: inline-block;"><img src="https://i.imgur.com/PuZnBsX.png" alt="PROJET180" width="90" style="display: inline-block; vertical-align: middle;" /></span></p>
      <p>180 jours. Un engagement. Une transformation complète.<br/>Ton parcours commence maintenant.</p>
      <p>Connecte-toi, complète ton onboarding, et réserve ton premier call avec moi. C'est là que tout démarre.</p>
      <p style="margin-top: 24px;"><strong>Email :</strong> ${email}<br/><strong>Mot de passe temporaire :</strong> ${tempPassword}<br/><span style="color: #888;">Tu pourras le changer dès ta première connexion.</span></p>
      ${p180CtaButton(appUrl, "Entrer dans l'arène")}
    `),
  })

  return NextResponse.json({
    success: true,
    email,
    tempPassword,
    emailSent,
    message: 'Client créé + email envoyé. Connecte-toi et teste le flow complet !',
  })
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
