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

/** Template wrapper P180 — dark design cohérent */
export function p180EmailTemplate(body: string): string {
  return `<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; color: #F2F2F5; background: #060606; padding: 40px 30px; border-radius: 16px;">${body}</div>`
}
