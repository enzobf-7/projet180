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
  senderName = 'Robin — PROJET180',
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
        sender: { name: senderName, email: process.env.BREVO_SENDER_EMAIL || 'noreply@projet180.fr' },
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

/** CTA button centré via table (fiable tous clients mail) */
export function p180CtaButton(href: string, text: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 0;">
  <tr>
    <td align="center">
      <a href="${href}" style="display: inline-block; background: #3A86FF; color: #fff; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`
}

/** Template wrapper P180 — dark premium, logo centré */
export function p180EmailTemplate(body: string): string {
  const logoUrl = 'https://i.imgur.com/PuZnBsX.png'

  return `
<div style="background: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 520px; margin: 0 auto; padding: 0;">
    <div style="text-align: center; padding: 40px 40px 32px;">
      <img src="${logoUrl}" alt="PROJET180" width="140" style="display: inline-block;" />
    </div>
    <div style="height: 2px; background: linear-gradient(90deg, transparent, #3A86FF, transparent); margin: 0 40px;"></div>
    <div style="padding: 36px 40px 44px; color: #e0e0e0; font-size: 15px; line-height: 1.8; text-align: center;">
      ${body}
    </div>
    <div style="text-align: center; padding: 28px 40px 36px; border-top: 1px solid #1a1a1a;">
      <p style="color: #555; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">180 jours · Un engagement · Une transformation</p>
    </div>
  </div>
</div>`
}
