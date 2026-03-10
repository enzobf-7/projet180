import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const coachEmail = process.env.COACH_EMAIL || 'robin@gentlemanletal.club'

  // Fetch client profile + signature data
  const { data: profile } = await admin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', user.id)
    .single()

  const { data: prog } = await admin
    .from('onboarding_progress')
    .select('step1_signature_name, step1_signed_at')
    .eq('user_id', user.id)
    .single()

  const clientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Client'
  const clientEmail = profile?.email || user.email || ''
  const signatureName = prog?.step1_signature_name || clientName
  const signedAt = prog?.step1_signed_at
    ? new Date(prog.step1_signed_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })
    : new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })

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
        subject: `${clientName} vient de signer son contrat`,
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F2F2F5; background: #060606; padding: 40px 30px; border-radius: 16px;">
            <p style="color: #8B1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Contrat signé</p>
            <h1 style="font-size: 22px; margin-bottom: 16px;">${clientName} a signé.</h1>
            <p style="color: #888; line-height: 1.7;">
              Ton client vient de lire et signer son contrat d'engagement dans GLC.
            </p>
            <div style="background: #0F0F0F; border: 1px solid #1E1E1E; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Client</p>
              <p style="margin: 0 0 12px; color: #F2F2F5; font-size: 16px;">${clientName}</p>
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</p>
              <p style="margin: 0 0 12px; color: #F2F2F5; font-size: 16px;">${clientEmail}</p>
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Signature</p>
              <p style="margin: 0 0 12px; color: #F2F2F5; font-size: 16px; font-style: italic;">${signatureName}</p>
              <p style="margin: 0 0 4px; color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>
              <p style="margin: 0; color: #F2F2F5; font-size: 14px;">${signedAt} (Paris)</p>
            </div>
            <p style="color: #484848; font-size: 13px; margin-top: 32px;">
              — GLC App
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Contract-signed notification failed:', err)
    // Best-effort — ne pas bloquer le client
  }

  return NextResponse.json({ ok: true })
}
