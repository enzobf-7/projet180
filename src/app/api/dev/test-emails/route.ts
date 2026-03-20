import { NextResponse } from 'next/server'
import { sendEmail, p180EmailTemplate } from '@/lib/email'

const TEST_TO = 'contact@alchim-ia.com'
const TEST_NAME = 'Enzo'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'
  const results: Record<string, boolean> = {}

  // 1. Email de bienvenue
  results['1_bienvenue'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Bienvenue dans Projet180',
    html: p180EmailTemplate(`
      <p>Salut ${TEST_NAME},</p>
      <p>Tu viens de rejoindre <span style="background: #0B0B0B; border-radius: 6px; padding: 3px 10px; display: inline-block;"><img src="https://i.imgur.com/PuZnBsX.png" alt="PROJET180" width="90" style="display: inline-block; vertical-align: middle;" /></span></p>
      <p>180 jours. Un engagement. Une transformation complète.<br/>Ton parcours commence maintenant.</p>
      <p>Connecte-toi, complète ton onboarding, et réserve ton premier call avec moi. C'est là que tout démarre.</p>
      <p style="margin-top: 24px;"><strong>Email :</strong> enzo@test.com<br/><strong>Mot de passe temporaire :</strong> Xk9mPr4vTn2w<br/><span style="color: #888;">Tu pourras le changer dès ta première connexion.</span></p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" style="display: inline-block; background: #0B0B0B; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Entrer dans l'arène
        </a>
      </div>
    `),
  })

  // 2. Rappel habitudes
  results['2_rappel_habitudes'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Tu as manqué tes habitudes hier',
    html: p180EmailTemplate(`
      <p>Salut ${TEST_NAME},</p>
      <p>Tu n'as coché aucune habitude hier. C'est une journée de perdue sur ta transformation.</p>
      <p>Le succès se construit dans la régularité. Pas dans la perfection — dans la constance.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #0B0B0B; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Reprendre aujourd'hui
        </a>
      </div>
    `),
  })

  // 3. Milestone J60
  const milestone = 60
  const progressPct = Math.round((milestone / 180) * 100)
  results['3_milestone_j60'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] J60 — Le cap des deux mois',
    html: p180EmailTemplate(`
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 42px; font-weight: 900; color: #1a1a1a; margin: 0; letter-spacing: -1px;">JOUR ${milestone}</p>
        <div style="background: #e5e5e5; border-radius: 20px; height: 8px; margin: 12px auto 0; max-width: 300px;">
          <div style="background: #3A86FF; border-radius: 20px; height: 8px; width: ${progressPct}%;"></div>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 6px;">${progressPct}% du parcours</p>
      </div>
      <p>Salut ${TEST_NAME},</p>
      <p>Deux mois. Tu es en train de prouver que tu fais partie des rares hommes qui tiennent leurs engagements.<br><br>
La plupart abandonnent avant même d'atteindre ce stade. Toi, tu es encore là.<br><br>
La moitié du chemin est derrière toi. La meilleure partie est devant.</p>
      <div style="background: #f5f5f5; border-radius: 10px; padding: 20px; margin: 24px 0; display: flex; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center;">
          <tr>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #1a1a1a; margin: 0;">2 450</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">XP total</p>
            </td>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #1a1a1a; margin: 0;">23j</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Meilleure série</p>
            </td>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #3A86FF; margin: 0;">Nv.3</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Le Bâtisseur</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #0B0B0B; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Voir ma progression
        </a>
      </div>
    `),
  })

  // 4. Rapport hebdo IA
  const weekNumber = 8
  const habitCompletionPct = 73
  const streak = 12
  const xpWeek = 180
  const aiSummary = `Semaine 8 derrière toi, ${TEST_NAME}. 73% de tes habitudes cochées — c'est honnête mais tu peux mieux.\n\n12 jours de série, ça montre que tu tiens le cap. Ne lâche pas maintenant, c'est dans ces moments que la plupart des mecs décrochent.\n\nSemaine 9 : monte à 80%. Un cran de plus, c'est tout ce qu'il faut.`
  results['4_rapport_hebdo'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: `[TEST] Ton bilan semaine ${weekNumber} — Projet180`,
    html: p180EmailTemplate(`
      <div style="border-left: 3px solid #3A86FF; padding-left: 16px; margin-bottom: 20px;">
        <p style="color: #3A86FF; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Semaine ${weekNumber} / 26</p>
        <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Ton bilan hebdomadaire</p>
      </div>
      <p>Salut ${TEST_NAME},</p>
      <p style="white-space: pre-line;">${aiSummary}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="background: #f5f5f5; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
            <p style="font-size: 28px; font-weight: 800; color: #FFA500; margin: 0;">${habitCompletionPct}%</p>
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

  // 5. Notification contrat signé (pour Robin)
  results['5_contrat_signe'] = await sendEmail({
    to: TEST_TO,
    toName: 'Robin',
    subject: '[TEST] Enzo Test vient de signer son contrat',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p style="color: #3A86FF; font-weight: 600; margin-bottom: 4px;">Contrat signé</p>
      <p><strong>Enzo Test</strong> vient de signer son contrat d'engagement.</p>
      <p style="margin-top: 20px;">
        <strong>Client :</strong> Enzo Test<br/>
        <strong>Email :</strong> enzo@test.com<br/>
        <strong>Signature :</strong> <em>Enzo Test</em><br/>
        <strong>Date :</strong> 20 mars 2026 à 10:30 (Paris)
      </p>
    `),
  })

  const allOk = Object.values(results).every(v => v)

  return NextResponse.json({
    success: allOk,
    results,
    message: allOk ? 'Les 5 emails ont été envoyés !' : 'Certains emails ont échoué.',
  })
}
