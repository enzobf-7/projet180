import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'

  const email = 'contact@alchim-ia.com'
  const firstName = 'Robin'
  const lastName = 'Duplouis'
  const tempPassword = 'P180admin!test'

  // Create auth user as admin
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authUser.user.id

  // Create admin profile
  await admin.from('profiles').insert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'admin',
  })

  // Send admin welcome email
  await sendEmail({
    to: email,
    toName: firstName,
    subject: 'Ton espace admin est prêt — PROJET180',
    senderName: 'PROJET180',
    html: p180EmailTemplate(`
      <p>Yo big G !</p>
      <p>On y est ! Voici l'accès à ton espace admin.</p>
      <p>Tu vas pouvoir bien gérer tes clients, assigner des habitudes, suivre leur progression etc. J'espère tout ce qu'il faut pour en faire des machines de guerre !</p>
      <p style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <strong style="color: #fff;">Email :</strong> <span style="color: #e0e0e0;">${email}</span><br/>
        <strong style="color: #fff;">Mot de passe temporaire :</strong> <span style="color: #3A86FF;">${tempPassword}</span><br/>
        <span style="color: #888; font-size: 13px;">Tu pourras le changer dès ta première connexion.</span>
      </p>
      ${p180CtaButton(`${appUrl}/admin`, 'Accéder à mon espace admin')}
    `),
  })

  return NextResponse.json({ success: true, userId, email, tempPassword })
}
