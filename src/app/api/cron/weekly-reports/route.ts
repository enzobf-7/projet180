import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, p180EmailTemplate } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(request: NextRequest) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Fetch all completed onboardings
  const { data: onboardings, error: onbErr } = await admin
    .from('onboarding_progress')
    .select('user_id, completed_at')
    .not('completed_at', 'is', null)

  if (onbErr) return NextResponse.json({ error: onbErr.message }, { status: 500 })
  if (!onboardings || onboardings.length === 0) {
    return NextResponse.json({ generated: 0 })
  }

  const now = Date.now()
  let generated = 0
  const errors: string[] = []

  for (const onb of onboardings) {
    const clientId  = onb.user_id
    const startMs   = new Date(onb.completed_at).getTime()
    const weekNumber = Math.floor((now - startMs) / (7 * 86400000)) + 1

    // Skip if programme hasn't started or beyond week 26
    if (weekNumber < 1 || weekNumber > 26) continue

    // Skip if report for this week already exists
    const { data: existing } = await admin
      .from('weekly_reports')
      .select('id')
      .eq('client_id', clientId)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (existing) continue

    // 2. Compute week date range (Mon–Sun of the completed week)
    const weekStartMs  = startMs + (weekNumber - 1) * 7 * 86400000
    const weekEndMs    = weekStartMs + 7 * 86400000
    const weekStartStr = new Date(weekStartMs).toISOString().slice(0, 10)
    const weekEndStr   = new Date(weekEndMs).toISOString().slice(0, 10)

    // 3. Fetch client first name for personalised AI message
    const { data: profileData } = await admin
      .from('profiles')
      .select('first_name, email')
      .eq('id', clientId)
      .maybeSingle()

    // 4. Fetch active habits for this client
    const { data: habits } = await admin
      .from('habits')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)

    const habitCount = habits?.length ?? 0

    // 5. Fetch completed habit logs for the week
    let completedLogs = 0
    if (habitCount > 0) {
      const { count } = await admin
        .from('habit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('completed', true)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr)

      completedLogs = count ?? 0
    }

    const habitCompletionPct = habitCount > 0
      ? Math.round((completedLogs / (habitCount * 7)) * 100)
      : 0

    // 6. Fetch gamification snapshot
    const { data: gam } = await admin
      .from('gamification')
      .select('xp_total, current_streak')
      .eq('client_id', clientId)
      .maybeSingle()

    // 7. Compute XP gained this week (we store total, so diff vs last report or rough estimate)
    // We store xp_total snapshot — consumer can diff between consecutive reports
    const xpTotal = gam?.xp_total ?? 0
    const streak  = gam?.current_streak ?? 0

    // 8. Generate AI summary with Claude Haiku
    let aiSummary: string | null = null
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const firstName = profileData?.first_name || 'toi'
        const prompt = `Tu es Robin Duplouis, coach du programme Projet180 (180 jours de transformation masculine). Tu dois écrire un bref message de bilan hebdomadaire personnalisé pour ton client.

Client : ${firstName}
Semaine ${weekNumber} sur 26
Taux de complétion des habitudes : ${habitCompletionPct}%
Streak actuel : ${streak} jours consécutifs
XP total accumulé : ${xpTotal} XP

Écris un message court (3-5 phrases maximum) directement adressé au client :
- Une phrase d'accroche qui reconnaît son effort cette semaine (basée sur son taux de complétion)
- Un point fort ou un encouragement concret lié à ses stats (streak ou XP)
- Une phrase de motivation pour la semaine suivante
- Ton de Robin : direct, bienveillant, viril, pas de superflu. Pas de "cher client", commence directement.`

        const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        })
        aiSummary = message.content[0].type === 'text' ? message.content[0].text : null
      } catch (aiErr) {
        console.error('AI summary failed:', aiErr)
        // Non-blocking — report is inserted without AI summary
      }
    }

    // 9. Insert report
    const { error: insertErr } = await admin
      .from('weekly_reports')
      .insert({
        client_id:        clientId,
        week_number:      weekNumber,
        motivation_score: null,
        responses: {
          habit_completion_pct: habitCompletionPct,
          xp_total:             xpTotal,
          streak,
          ...(aiSummary ? { ai_summary: aiSummary } : {}),
        },
      })

    if (insertErr) {
      errors.push(`${clientId}: ${insertErr.message}`)
    } else {
      generated++

      // Send weekly report email if AI summary was generated
      if (aiSummary && profileData?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'
        const firstName = profileData.first_name || 'toi'
        try {
          const xpWeek = habitCompletionPct > 0 ? Math.round(xpTotal * 0.1) : 0 // estimation XP semaine
          await sendEmail({
            to: profileData.email,
            toName: firstName,
            subject: `Ton bilan semaine ${weekNumber} — Projet180`,
            html: p180EmailTemplate(`
              <div style="border-left: 3px solid #3A86FF; padding-left: 16px; margin-bottom: 20px;">
                <p style="color: #3A86FF; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Semaine ${weekNumber} / 26</p>
                <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Ton bilan hebdomadaire</p>
              </div>
              <p>Salut ${firstName},</p>
              <p style="white-space: pre-line;">${aiSummary}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background: #f5f5f5; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                    <p style="font-size: 28px; font-weight: 800; color: ${habitCompletionPct >= 80 ? '#22C55E' : habitCompletionPct >= 50 ? '#FFA500' : '#EF4444'}; margin: 0;">${habitCompletionPct}%</p>
                    <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Habitudes</p>
                  </td>
                  <td width="8"></td>
                  <td style="background: #f5f5f5; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                    <p style="font-size: 28px; font-weight: 800; color: #1a1a1a; margin: 0;">${streak}j</p>
                    <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Série</p>
                  </td>
                  <td width="8"></td>
                  <td style="background: #f5f5f5; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                    <p style="font-size: 28px; font-weight: 800; color: #3A86FF; margin: 0;">+${xpWeek}</p>
                    <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">XP semaine</p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${appUrl}/dashboard" style="display: inline-block; background: #0B0B0B; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                  Voir mon dashboard
                </a>
              </div>
            `),
          })
        } catch (emailErr) {
          console.error(`Weekly report email failed for ${clientId}:`, emailErr)
        }
      }
    }
  }

  return NextResponse.json({ generated, errors: errors.length > 0 ? errors : undefined })
}
