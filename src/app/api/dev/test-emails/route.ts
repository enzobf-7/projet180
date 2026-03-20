import { NextResponse } from 'next/server'
import { sendEmail, p180EmailTemplate, p180CtaButton } from '@/lib/email'

const TEST_TO = 'contact@alchim-ia.com'
const TEST_NAME = 'Enzo'

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const only = url.searchParams.get('only') // ?only=8 pour envoyer uniquement le n°8

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.projet180.fr'
  const results: Record<string, boolean> = {}
  const s = (n: string) => !only || only === n // helper: skip si ?only= spécifié

  // 1. Email de bienvenue
  if (s('1')) results['1_bienvenue'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Bienvenue dans PROJET180',
    html: p180EmailTemplate(`
      <p>Salut ${TEST_NAME},</p>
      <p>Tu viens de rejoindre <span style="background: #0B0B0B; border-radius: 6px; padding: 3px 10px; display: inline-block;"><img src="https://i.imgur.com/PuZnBsX.png" alt="PROJET180" width="90" style="display: inline-block; vertical-align: middle;" /></span></p>
      <p>180 jours. Un engagement. Une transformation complète.<br/>Ton parcours commence maintenant.</p>
      <p>Connecte-toi, complète ton onboarding, et réserve ton premier call avec moi. C'est là que tout démarre.</p>
      <p style="margin-top: 24px;"><strong>Email :</strong> enzo@test.com<br/><strong>Mot de passe temporaire :</strong> Xk9mPr4vTn2w<br/><span style="color: #888;">Tu pourras le changer dès ta première connexion.</span></p>
      ${p180CtaButton(appUrl, "Entrer dans l'arène")}
    `),
  })

  // 2. Rappel habitudes
  if (s('2')) results['2_rappel_habitudes'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Tu as manqué tes habitudes hier',
    html: p180EmailTemplate(`
      <p>Salut ${TEST_NAME},</p>
      <p>Tu n'as coché aucune habitude hier. C'est une journée de perdue sur ta transformation.</p>
      <p>Le succès se construit dans la régularité. Pas dans la perfection — dans la constance.</p>
      ${p180CtaButton(`${appUrl}/dashboard`, 'Reprendre aujourd\'hui')}
    `),
  })

  // 3. Milestone J60
  const milestone = 60
  const progressPct = Math.round((milestone / 180) * 100)
  if (s('3')) results['3_milestone_j60'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] J60 — Le cap des deux mois',
    html: p180EmailTemplate(`
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 32px; font-weight: 900; color: #fff; margin: 0; letter-spacing: -1px;">JOUR ${milestone}</p>
        <div style="background: #222; border-radius: 20px; height: 8px; margin: 12px auto 0; max-width: 300px;">
          <div style="background: #3A86FF; border-radius: 20px; height: 8px; width: ${progressPct}%;"></div>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 6px;">${progressPct}% du parcours</p>
      </div>
      <p>Salut ${TEST_NAME},</p>
      <p>Deux mois. Tu es en train de prouver que tu fais partie des rares hommes qui tiennent leurs engagements.<br><br>
La plupart abandonnent avant même d'atteindre ce stade. Toi, tu es encore là.<br><br>
La moitié du chemin est derrière toi. La meilleure partie est devant.</p>
      <div style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; margin: 24px 0; display: flex; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center;">
          <tr>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #fff; margin: 0;">2 450</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">XP total</p>
            </td>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #fff; margin: 0;">23j</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Meilleure série</p>
            </td>
            <td style="padding: 8px;">
              <p style="font-size: 24px; font-weight: 800; color: #3A86FF; margin: 0;">Nv.3</p>
              <p style="font-size: 12px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Le Bâtisseur</p>
            </td>
          </tr>
        </table>
      </div>
      ${p180CtaButton(`${appUrl}/dashboard`, 'Voir ma progression')}
    `),
  })

  // 4. Rapport hebdo IA
  const weekNumber = 8
  const habitCompletionPct = 73
  const streak = 12
  const xpWeek = 180
  const aiSummary = `Semaine 8 derrière toi, ${TEST_NAME}. 73% de tes habitudes cochées — c'est honnête mais tu peux mieux.\n\n12 jours de série, ça montre que tu tiens le cap. Ne lâche pas maintenant, c'est dans ces moments que la plupart des mecs décrochent.\n\nSemaine 9 : monte à 80%. Un cran de plus, c'est tout ce qu'il faut.`
  if (s('4')) results['4_rapport_hebdo'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: `[TEST] Ton bilan semaine ${weekNumber} — PROJET180`,
    html: p180EmailTemplate(`
      <div style="border-left: 3px solid #3A86FF; padding-left: 16px; margin-bottom: 20px;">
        <p style="color: #3A86FF; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Semaine ${weekNumber} / 26</p>
        <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Ton bilan hebdomadaire</p>
      </div>
      <p>Salut ${TEST_NAME},</p>
      <p style="white-space: pre-line;">${aiSummary}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
            <p style="font-size: 28px; font-weight: 800; color: #FFA500; margin: 0;">${habitCompletionPct}%</p>
            <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Habitudes</p>
          </td>
          <td width="8"></td>
          <td style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
            <p style="font-size: 28px; font-weight: 800; color: #fff; margin: 0;">${streak}j</p>
            <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Série</p>
          </td>
          <td width="8"></td>
          <td style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
            <p style="font-size: 28px; font-weight: 800; color: #3A86FF; margin: 0;">+${xpWeek}</p>
            <p style="font-size: 11px; color: #888; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">XP semaine</p>
          </td>
        </tr>
      </table>
      ${p180CtaButton(`${appUrl}/dashboard`, 'Voir mon dashboard')}
    `),
  })

  // 5. Email admin (pour Robin)
  if (s('5')) results['5_admin_bienvenue'] = await sendEmail({
    to: TEST_TO,
    toName: 'Robin',
    subject: '[TEST] Ton espace admin est prêt — PROJET180',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p>Yo big G !</p>
      <p>On y est ! Voici l'accès à ton espace admin.</p>
      <p>Tu vas pouvoir bien gérer tes clients, assigner des habitudes, suivre leur progression etc. J'espère tout ce qu'il faut pour en faire des machines de guerre !</p>
      <p style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <strong style="color: #fff;">Email :</strong> <span style="color: #e0e0e0;">contact@alchim-ia.com</span><br/>
        <strong style="color: #fff;">Mot de passe temporaire :</strong> <span style="color: #3A86FF;">P180admin!test</span><br/>
        <span style="color: #888; font-size: 13px;">Tu pourras le changer dès ta première connexion.</span>
      </p>
      ${p180CtaButton(`${appUrl}/admin`, 'Accéder à mon espace admin')}
    `),
  })

  // 6. Notification contrat signé (pour Robin)
  if (s('6')) results['6_contrat_signe'] = await sendEmail({
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

  // 7. Reset password (template Supabase)
  const fakeResetUrl = `${appUrl}/set-password?token=fake-token-preview`
  if (s('7')) results['7_reset_password'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Réinitialise ton mot de passe — PROJET180',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p>Tu as demandé à réinitialiser ton mot de passe.</p>
      <p>Clique sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans 24h.</p>
      ${p180CtaButton(fakeResetUrl, 'Choisir un nouveau mot de passe')}
      <p style="color: #666; font-size: 13px; margin-top: 20px; text-align: center;">Si tu n'as pas fait cette demande, ignore cet email.</p>
    `),
  })

  // 8. Confirm signup (template Supabase)
  const fakeConfirmUrl = `${appUrl}?token=fake-confirm-preview`
  if (s('8')) results['8_confirm_signup'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Confirme ton inscription — PROJET180',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p>Salut,</p>
      <p>Confirme ton adresse email pour activer ton compte</p>
      <div style="text-align: center; margin: 16px 0;">
        <img src="https://i.imgur.com/PuZnBsX.png" alt="PROJET180" width="160" style="display: inline-block;" />
      </div>
      ${p180CtaButton(fakeConfirmUrl, 'Confirmer mon email')}
      <p style="color: #666; font-size: 13px; margin-top: 20px; text-align: center;">Si tu n'as pas créé de compte, ignore cet email.</p>
    `),
  })

  // 9. Magic link (template Supabase)
  const fakeMagicUrl = `${appUrl}/dashboard?token=fake-magic-preview`
  if (s('9')) results['9_magic_link'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Ton lien de connexion — PROJET180',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p>Salut,</p>
      <p>Voici ton lien de connexion. Il expire dans 10 minutes.</p>
      ${p180CtaButton(fakeMagicUrl, 'Se connecter')}
      <p style="color: #666; font-size: 13px; margin-top: 20px; text-align: center;">Si tu n'as pas demandé ce lien, ignore cet email.</p>
    `),
  })

  // 10. Change email (template Supabase)
  const fakeChangeUrl = `${appUrl}?token=fake-change-email-preview`
  if (s('10')) results['10_change_email'] = await sendEmail({
    to: TEST_TO,
    toName: TEST_NAME,
    subject: '[TEST] Confirme ton nouvel email — PROJET180',
    senderName: 'Projet180',
    html: p180EmailTemplate(`
      <p>Salut,</p>
      <p>Tu as demandé à changer ton adresse email. Confirme ta nouvelle adresse en cliquant ci-dessous.</p>
      ${p180CtaButton(fakeChangeUrl, 'Confirmer mon nouvel email')}
      <p style="color: #666; font-size: 13px; margin-top: 20px; text-align: center;">Si tu n'as pas fait cette demande, ignore cet email.</p>
    `),
  })

  const allOk = Object.values(results).every(v => v)

  return NextResponse.json({
    success: allOk,
    results,
    message: allOk ? 'Les 10 emails ont été envoyés !' : 'Certains emails ont échoué.',
  })
}
