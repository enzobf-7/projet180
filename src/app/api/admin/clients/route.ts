import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const { first_name, last_name, email } = body

  if (!email?.trim() || !first_name?.trim()) {
    return NextResponse.json({ error: 'Email et prénom requis.' }, { status: 400 })
  }

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

  await admin.from('onboarding_progress').insert({ client_id: userId })
  await admin.from('programs').insert({ client_id: userId, content: [] })
  await admin.from('gamification').insert({ client_id: userId })

  await sendWelcomeEmail(email.trim(), first_name.trim(), tempPassword)

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

async function sendWelcomeEmail(email: string, firstName: string, password: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://projet180.vercel.app'
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Robin — Projet180', email: 'noreply@projet180.fr' },
        to: [{ email, name: firstName }],
        subject: 'Bienvenue dans Projet180',
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F5F5F5; background: #060606; padding: 40px 30px; border-radius: 16px;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Bienvenue ${firstName}.</h1>
            <p style="color: #888; line-height: 1.7;">
              Tu viens de rejoindre Projet180. La transformation commence maintenant.
            </p>
            <p style="color: #888; line-height: 1.7;">
              Connecte-toi et complète tes étapes de pré-onboarding.
              Une fois terminé, le lien pour réserver ton premier call avec moi se débloque.
            </p>
            <div style="background: #0F0F0F; border: 1px solid #1E1E1E; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Tes accès</p>
              <p style="margin: 4px 0; color: #F5F5F5;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 4px 0; color: #F5F5F5;"><strong>Mot de passe :</strong> ${password}</p>
              <p style="margin: 8px 0 0; color: #888; font-size: 12px;">Change ton mot de passe après ta première connexion.</p>
            </div>
            <a href="${appUrl}" style="display: inline-block; background: #3A86FF; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 8px;">
              Accéder à ma plateforme
            </a>
            <p style="color: #555; font-size: 13px; margin-top: 32px;">
              — Robin, Projet180
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Error sending welcome email:', err)
  }
}
