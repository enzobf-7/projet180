'use client'

import { memo, type CSSProperties } from 'react'
import { C, D } from '@/lib/design-tokens'

interface ContactRobinButtonProps {
  robinWhatsapp: string | null
}

const card: CSSProperties = {
  background: 'rgba(21,128,61,0.12)',
  border: `1px solid rgba(34,197,94,0.2)`,
  borderRadius: 14,
  padding: '16px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background 0.2s ease',
}

const icon: CSSProperties = {
  fontSize: 24,
}

const textBlock: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const title: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: C.text,
}

const subtitle: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 11,
  color: C.muted,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export default memo(function ContactRobinButton({
  robinWhatsapp,
}: ContactRobinButtonProps) {
  if (!robinWhatsapp) return null

  return (
    <a
      href={`https://wa.me/${robinWhatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      style={card}
    >
      <span style={icon}>💬</span>
      <div style={textBlock}>
        <span style={title}>ÉCRIRE À ROBIN</span>
        <span style={subtitle}>WhatsApp direct</span>
      </div>
    </a>
  )
})
