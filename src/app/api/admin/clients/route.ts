import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate } from '@/lib/email'

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { user, admin }
}

export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { admin } = auth

  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  const clientUsers = users.filter(u => u.user_metadata?.role === 'client')
  const clientIds = clientUsers.map(u => u.id)

  if (clientIds.length === 0) return NextResponse.json({ clients: [] })

  const [{ data: gamification }, { data: onboarding }] = await Promise.all([
    admin.from('gamification').select('client_id, xp_total, level').in('client_id', clientIds),
    admin.from('onboarding_progress').select('client_id, completed_at').in('client_id', clientIds),
  ])

  const gamMap = Object.fromEntries((gamification ?? []).map(g => [g.client_id, g]))
  const onbMap = Object.fromEntries((onboarding ?? []).map(o => [o.client_id, o]))

  const clients = clientUsers.map(u => {
    const gam = gamMap[u.id]
    const onb = onbMap[u.id]
    let jourX = 0
    if (onb?.completed_at) {
      const diff = Math.floor((Date.now() - new Date(onb.completed_at).getTime()) / 86400000) + 1
      jourX = Math.min(Math.max(diff, 1), 180)
    }
    return {
      id: u.id,
      email: u.email ?? '',
      first_name: u.user_metadata?.first_name ?? '',
      last_name: u.user_metadata?.last_name ?? '',
      xp_total: gam?.xp_total ?? 0,
      level: gam?.level ?? 'RECRUE',
      onboarding_completed: !!onb?.completed_at,
      jourX,
    }
  })

  return NextResponse.json({ clients })
}

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { admin } = auth

  const body = await request.json()
  const { first_name, last_name, email, jour_x } = body

  if (!email?.trim() || !first_name?.trim()) {
    return NextResponse.json({ error: 'Email et prénom requis.' }, { status: 400 })
  }

  const startDay = Math.max(1, Math.floor(Number(jour_x) || 1))

  const tempPassword = generateTempPassword()

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: first_name.trim(),
      last_name: (last_name ?? '').trim(),
      role: 'client',
    },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Ce client existe déjà.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authUser.user.id

  // Calculer completed_at si jour_x > 1 (client existant importé)
  const completedAt = startDay > 1
    ? new Date(Date.now() - (startDay - 1) * 86400000).toISOString()
    : null

  await admin.from('onboarding_progress').insert({
    client_id: userId,
    // Si client existant (jour_x > 1), auto-compléter l'onboarding
    ...(completedAt ? {
      step1_contract: true,
      step2_questionnaire: true,
      step3_whatsapp: true,
      step4_skool: true,
      step5_call: true,
      completed_at: completedAt,
    } : {}),
  })
  await admin.from('programs').insert({ client_id: userId, content: [] })
  await admin.from('gamification').insert({ client_id: userId })
  // 2 system todos (identique au webhook Stripe)
  await admin.from('todos').insert([
    { client_id: userId, title: 'Préparer to-do de demain', is_system: true, day_of_week: null },
    { client_id: userId, title: 'Poster wins de la semaine', is_system: true, day_of_week: 0 },
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'
  await sendEmail({
    to: email.trim(),
    toName: first_name.trim(),
    subject: 'Bienvenue dans Projet180',
    html: p180EmailTemplate(`
      <p>Salut ${first_name.trim()},</p>
      <p>Tu viens de rejoindre <span style="background: #0B0B0B; border-radius: 6px; padding: 3px 10px; display: inline-block;"><img src="https://i.imgur.com/PuZnBsX.png" alt="PROJET180" width="90" style="display: inline-block; vertical-align: middle;" /></span></p>
      <p>180 jours. Un engagement. Une transformation complète.<br/>Ton parcours commence maintenant.</p>
      <p>Connecte-toi, complète ton onboarding, et réserve ton premier call avec moi. C'est là que tout démarre.</p>
      <p style="margin-top: 24px;"><strong>Email :</strong> ${email.trim()}<br/><strong>Mot de passe temporaire :</strong> ${tempPassword}<br/><span style="color: #888;">Tu pourras le changer dès ta première connexion.</span></p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" style="display: inline-block; background: #0B0B0B; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Entrer dans l'arène
        </a>
      </div>
    `),
  })

  return NextResponse.json({ success: true, userId })
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
