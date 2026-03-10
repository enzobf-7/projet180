import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glc-app.vercel.app'
  const coachEmail = process.env.COACH_EMAIL || 'robin@gentlemanletal.club'

  // Get client's profile
  const { data: profile } = await admin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', user.id)
    .single()

  const clientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || user.email || 'Nouveau client'
  const clientEmail = profile?.email || user.email || ''

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GLC App', email: 'noreply@gentlemanletal.club' },
        to: [{ email: coachEmail, name: 'Robin' }],
        subject: `${clientName} vient de terminer son onboarding`,
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F2F2F5; background: #060606; padding: 40px 30px; border-radius: 16px;">
            <p style="color: #8B1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Nouveau client actif</p>
            <h1 style="font-size: 22px; margin-bottom: 16px;">${clientName} est prêt.</h1>
            <p style="color: #888; line-height: 1.7;">
              Ton client vient de compléter toutes les étapes d'onboarding et d'accéder au programme.
            </p>
            <div style="background: #0F0F0F; border: 1px solid #1E1E1E; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Client</p>
              <p style="margin: 0 0 12px; color: #F2F2F5; font-size: 16px;">${clientName}</p>
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</p>
              <p style="margin: 0; color: #F2F2F5; font-size: 16px;">${clientEmail}</p>
            </div>
            <a href="${appUrl}/admin" style="display: inline-block; background: #8B1A1A; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
              Voir dans l'admin
            </a>
            <p style="color: #484848; font-size: 13px; margin-top: 32px;">
              — GLC App
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Coach notification failed:', err)
    // Don't fail the request — notification is best-effort
  }

  return NextResponse.json({ ok: true })
}
