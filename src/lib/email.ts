const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  html: string
  senderName?: string
}

export async function sendEmail({
  to,
  toName,
  subject,
  html,
  senderName = 'Robin — Projet180',
}: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured')
    return false
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: 'noreply@projet180.fr' },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      console.error(`Brevo error ${res.status}:`, await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error('sendEmail failed:', err)
    return false
  }
}

/** Template wrapper P180 — bandeau noir + logo blanc, style naturel */
export function p180EmailTemplate(body: string): string {
  // TODO: remplacer par l'URL du domaine prod quand configuré (app.projet180.fr/logo-projet180.png)
  const logoUrl = 'https://i.imgur.com/PuZnBsX.png'

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 0;">
  <div style="padding: 32px 24px 40px; color: #1a1a1a; font-size: 15px; line-height: 1.7;">
    ${body}
  </div>
</div>`
}
