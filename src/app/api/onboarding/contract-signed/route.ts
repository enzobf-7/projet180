import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate } from '@/lib/email'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const coachEmail = process.env.COACH_EMAIL || 'robin@projet180.fr'

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
    await sendEmail({
      to: coachEmail,
      toName: 'Robin',
      subject: `${clientName} vient de signer son contrat`,
      senderName: 'Projet180',
      html: p180EmailTemplate(`
        <p style="color: #3A86FF; font-weight: 600; margin-bottom: 4px;">Contrat signé</p>
        <p><strong>${clientName}</strong> vient de signer son contrat d'engagement.</p>
        <p style="margin-top: 20px;">
          <strong>Client :</strong> ${clientName}<br/>
          <strong>Email :</strong> ${clientEmail}<br/>
          <strong>Signature :</strong> <em>${signatureName}</em><br/>
          <strong>Date :</strong> ${signedAt} (Paris)
        </p>
      `),
    })
  } catch (err) {
    console.error('Contract-signed notification failed:', err)
    // Best-effort — ne pas bloquer le client
  }

  return NextResponse.json({ ok: true })
}
