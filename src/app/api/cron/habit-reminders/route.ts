import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Cron secret not configured' }, { status: 503 })
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'

  // Yesterday's date string (YYYY-MM-DD)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Fetch all clients who have completed onboarding
  const { data: onboardings, error: onbErr } = await admin
    .from('onboarding_progress')
    .select('client_id')
    .not('completed_at', 'is', null)

  if (onbErr) return NextResponse.json({ error: onbErr.message }, { status: 500 })
  if (!onboardings || onboardings.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  const errors: string[] = []

  for (const onb of onboardings) {
    const clientId = onb.client_id

    // Check if this client has any active habits
    const { data: habits } = await admin
      .from('habits')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)

    if (!habits || habits.length === 0) continue

    // Check if they logged anything yesterday
    const { count } = await admin
      .from('habit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('completed', true)
      .eq('date', yesterday)

    if ((count ?? 0) > 0) continue // Already checked in — no reminder needed

    // Get profile (email + first name)
    const { data: profile } = await admin
      .from('profiles')
      .select('email, first_name')
      .eq('id', clientId)
      .single()

    if (!profile?.email) continue

    const firstName = profile.first_name || 'toi'

    try {
      const ok = await sendEmail({
        to: profile.email,
        toName: firstName,
        subject: 'Tu as manqué tes habitudes hier',
        html: p180EmailTemplate(`
          <p>Salut ${firstName},</p>
          <p>Tu n'as coché aucune habitude hier. C'est une journée de perdue sur ta transformation.</p>
          <p>Le succès se construit dans la régularité. Pas dans la perfection — dans la constance.</p>
          ${p180CtaButton(`${appUrl}/dashboard`, "Reprendre aujourd'hui")}
        `),
      })
      if (ok) {
        sent++
      } else {
        errors.push(`${clientId}: Brevo send failed`)
      }
    } catch (err) {
      errors.push(`${clientId}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
