import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'

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

    // Get profile + gamification stats
    const [{ data: profile }, { data: gam }] = await Promise.all([
      admin.from('profiles').select('email, first_name').eq('id', clientId).single(),
      admin.from('gamification').select('xp_total, current_streak, longest_streak, level').eq('client_id', clientId).single(),
    ])

    if (!profile?.email) continue

    const firstName = profile.first_name || 'toi'
    const msg = MILESTONE_MESSAGES[milestone]
    const xpTotal = gam?.xp_total ?? 0
    const streak = gam?.current_streak ?? 0
    const longestStreak = gam?.longest_streak ?? 0
    const level = gam?.level ?? 1
    const levelNames = ['L\'Endormi', 'L\'Éveillé', 'Le Bâtisseur', 'Le Souverain', 'Le Point de Bascule', 'Le 180']
    const levelName = levelNames[level - 1] || levelNames[0]
    const progressPct = Math.round((milestone / 180) * 100)

    try {
      const ok = await sendEmail({
        to: profile.email,
        toName: firstName,
        subject: msg.subject,
        html: p180EmailTemplate(`
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; font-weight: 900; color: #fff; margin: 0; letter-spacing: -1px;">JOUR ${milestone}</p>
            <div style="background: #222; border-radius: 20px; height: 8px; margin: 12px auto 0; max-width: 300px;">
              <div style="background: #3A86FF; border-radius: 20px; height: 8px; width: ${progressPct}%;"></div>
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 6px;">${progressPct}% du parcours</p>
          </div>
          <p>Salut ${firstName},</p>
          <p>${msg.body}</p>
          <div style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; margin: 24px 0; display: flex; text-align: center;">
            <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center;">
              <tr>
                <td style="padding: 8px;">
                  <p style="font-size: 24px; font-weight: 800; color: #fff; margin: 0;">${xpTotal.toLocaleString('fr-FR')}</p>
                  <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">XP total</p>
                </td>
                <td style="padding: 8px;">
                  <p style="font-size: 24px; font-weight: 800; color: #fff; margin: 0;">${longestStreak}j</p>
                  <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Meilleure série</p>
                </td>
                <td style="padding: 8px;">
                  <p style="font-size: 24px; font-weight: 800; color: #3A86FF; margin: 0;">Nv.${level}</p>
                  <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">${levelName}</p>
                </td>
              </tr>
            </table>
          </div>
          ${p180CtaButton(`${appUrl}/dashboard`, 'Voir ma progression')}
        `),
      })

      if (ok) {
        // Record that we sent this milestone email
        await admin
          .from('milestone_emails_sent')
          .insert({ client_id: clientId, milestone_day: milestone })
        sent++
      } else {
        errors.push(`${clientId} J${milestone}: Brevo send failed`)
      }
    } catch (err) {
      errors.push(`${clientId} J${milestone}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
