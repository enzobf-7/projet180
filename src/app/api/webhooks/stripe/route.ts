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

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const email = session.customer_details?.email
    const name = session.customer_details?.name || ''
    
    if (!email) {
      console.error('No email in Stripe session')
      return NextResponse.json({ error: 'No email' }, { status: 400 })
    }

    // Split name into first/last
    const nameParts = name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Generate temporary password
    const tempPassword = generateTempPassword()

    const supabase = createAdminClient()

    // 1. Create auth user
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
      // User might already exist
      if (authError.message.includes('already been registered')) {
        console.log('User already exists:', email)
        return NextResponse.json({ status: 'user_exists' })
      }
      console.error('Error creating user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authUser.user.id

    // 2. Create onboarding progress
    await supabase.from('onboarding_progress').insert({
      client_id: userId,
    })

    // 3. Create empty program
    await supabase.from('programs').insert({
      client_id: userId,
      content: [],
    })

    // 4. Create gamification record
    await supabase.from('gamification').insert({
      client_id: userId,
    })

    // 5. Send welcome email via Brevo
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glc-app.vercel.app'

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Robin — Gentleman Létal Club', email: 'noreply@glc-app.com' },
        to: [{ email, name: firstName }],
        subject: 'Bienvenue dans le Gentleman Létal Club',
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F5F5F5; background: #0A0A0A; padding: 40px 30px; border-radius: 16px;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Bienvenue ${firstName}.</h1>
            <p style="color: #888; line-height: 1.7;">
              Tu viens de rejoindre le Gentleman Létal Club. La transformation commence maintenant.
            </p>
            <p style="color: #888; line-height: 1.7;">
              Connecte-toi à ta plateforme et complète tes étapes de pré-onboarding. 
              Une fois terminé, le lien pour réserver ton premier call avec moi se débloque.
            </p>
            <div style="background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Tes accès</p>
              <p style="margin: 4px 0; color: #F5F5F5;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 4px 0; color: #F5F5F5;"><strong>Mot de passe :</strong> ${password}</p>
              <p style="margin: 8px 0 0; color: #888; font-size: 12px;">Change ton mot de passe après ta première connexion.</p>
            </div>
            <a href="${appUrl}" style="display: inline-block; background: #C41E2A; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 8px;">
              Accéder à ma plateforme →
            </a>
            <p style="color: #555; font-size: 13px; margin-top: 32px;">
              — Robin, Gentleman Létal Club
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Error sending welcome email:', err)
  }
}
