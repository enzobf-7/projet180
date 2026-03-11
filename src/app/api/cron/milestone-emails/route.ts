import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MILESTONES = [30, 60, 90, 180] as const

const MILESTONE_MESSAGES: Record<number, { subject: string; body: string }> = {
  30: {
    subject: 'J30 — Un mois dans la transformation',
    body: `Tu viens de passer 30 jours dans le programme. Un mois de travail sur toi-même, c'est déjà plus que ce que la plupart des hommes n'auront jamais fait.<br><br>
Regarde où tu étais il y a un mois. La différence est là, même si tu ne la vois pas encore clairement.<br><br>
Continue. La transformation se joue sur la durée.`,
  },
  60: {
    subject: 'J60 — Le cap des deux mois',
    body: `Deux mois. Tu es en train de prouver que tu fais partie des rares hommes qui tiennent leurs engagements.<br><br>
La plupart abandonnent avant même d'atteindre ce stade. Toi, tu es encore là.<br><br>
La moitié du chemin est derrière toi. La meilleure partie est devant.`,
  },
  90: {
    subject: 'J90 — 90 jours de discipline',
    body: `Trois mois. C'est le seuil à partir duquel les nouvelles habitudes deviennent une identité.<br><br>
Ce que tu fais chaque jour n'est plus une corvée — c'est qui tu es. Tu es devenu quelqu'un qui ne lâche pas.<br><br>
Il reste 90 jours. Utilise-les pour solidifier ce que tu as commencé.`,
  },
  180: {
    subject: 'J180 — Tu as terminé le programme',
    body: `C'est fait. 180 jours. Tu as terminé ce que tu as commencé.<br><br>
La plupart des hommes ne finissent jamais ce qu'ils commencent. Tu viens de prouver que tu n'es pas comme la plupart des hommes.<br><br>
Ce n'est pas la fin de la transformation — c'est le début de qui tu vas être pour le reste de ta vie.<br><br>
Fier de toi.`,
  },
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glc-app.vercel.app'

  // Fetch all clients with a completed onboarding
  const { data: onboardings, error: onbErr } = await admin
    .from('onboarding_progress')
    .select('user_id, completed_at')
    .not('completed_at', 'is', null)

  if (onbErr) return NextResponse.json({ error: onbErr.message }, { status: 500 })
  if (!onboardings || onboardings.length === 0) return NextResponse.json({ sent: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let sent = 0
  const errors: string[] = []

  for (const onb of onboardings) {
    const clientId = onb.user_id
    const startDate = new Date(onb.completed_at)
    startDate.setHours(0, 0, 0, 0)

    const dayX = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1

    if (!MILESTONES.includes(dayX as typeof MILESTONES[number])) continue

    const milestone = dayX as typeof MILESTONES[number]

    // Check if we already sent this milestone email
    const { data: alreadySent } = await admin
      .from('milestone_emails_sent')
      .select('id')
      .eq('client_id', clientId)
      .eq('milestone_day', milestone)
      .maybeSingle()

    if (alreadySent) continue

    // Get profile
    const { data: profile } = await admin
      .from('profiles')
      .select('email, first_name')
      .eq('id', clientId)
      .single()

    if (!profile?.email) continue

    const firstName = profile.first_name || 'toi'
    const msg = MILESTONE_MESSAGES[milestone]

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Robin — Gentleman Létal Club', email: 'noreply@gentlemanletal.club' },
          to: [{ email: profile.email, name: firstName }],
          subject: msg.subject,
          htmlContent: `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F2F2F5; background: #060606; padding: 40px 30px; border-radius: 16px;">
              <p style="color: #8B1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Jour ${milestone} / 180</p>
              <h1 style="font-size: 22px; margin-bottom: 24px;">${firstName}.</h1>
              <p style="color: #888; line-height: 1.8;">
                ${msg.body}
              </p>
              <a href="${appUrl}/dashboard" style="display: inline-block; background: #8B1A1A; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 24px;">
                Voir ma progression
              </a>
              <p style="color: #484848; font-size: 13px; margin-top: 32px;">
                — Robin, Gentleman Létal Club
              </p>
            </div>
          `,
        }),
      })

      if (res.ok) {
        // Record that we sent this milestone email
        await admin
          .from('milestone_emails_sent')
          .insert({ client_id: clientId, milestone_day: milestone })
        sent++
      } else {
        errors.push(`${clientId} J${milestone}: Brevo ${res.status}`)
      }
    } catch (err) {
      errors.push(`${clientId} J${milestone}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
