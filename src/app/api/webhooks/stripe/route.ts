import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    await supabase.from('onboarding_progress').insert({ user_id: userId })
    await supabase.from('programs').insert({ client_id: userId, content: [] })
    await supabase.from('gamification').insert({ client_id: userId })
    await supabase.from('todos').insert([
      { client_id: userId, title: 'Préparer to-do de demain', is_system: true, day_of_week: null },
      { client_id: userId, title: 'Poster wins de la semaine', is_system: true, day_of_week: 0 },
    ])

    await sendWelcomeEmail(email, firstName, tempPassword)

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
