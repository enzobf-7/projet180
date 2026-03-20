import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY)

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const email = session.customer_details?.email
    const name = session.customer_details?.name || ''
    
    if (!email) {
      console.error('No email in Stripe session')
      return NextResponse.json({ error: 'No email' }, { status: 400 })
    }

    const nameParts = name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const tempPassword = generateTempPassword()

    const supabase = createAdminClient()

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
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
      if (authError.message.includes('already been registered')) {
        console.log('User already exists:', email)
        return NextResponse.json({ status: 'user_exists' })
      }
      console.error('Error creating user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authUser.user.id

    await supabase.from('onboarding_progress').insert({ client_id: userId })
    await supabase.from('programs').insert({ client_id: userId, content: [] })
    await supabase.from('gamification').insert({ client_id: userId })
    await supabase.from('todos').insert([
      { client_id: userId, title: 'Préparer to-do de demain', is_system: true, day_of_week: null },
      { client_id: userId, title: 'Poster wins de la semaine', is_system: true, day_of_week: 0 },
    ])

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'
    await sendEmail({
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

    console.log(`New client created: ${email} (${firstName} ${lastName})`)
  }

  return NextResponse.json({ received: true })
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
