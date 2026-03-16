'use client'

import { memo, type CSSProperties } from 'react'
import { C, D } from '@/lib/design-tokens'

interface WhatsAppButtonProps {
  allDone: boolean
  whatsappLink: string | null
  message: string
}

const wrapper: CSSProperties = {
  marginTop: 14,
  borderRadius: 12,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  border: `1px solid ${C.border}`,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background 0.3s ease, opacity 0.3s ease',
}

const leftSide: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const icon: CSSProperties = {
  fontSize: 22,
}

const label: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: C.text,
}

const badge: CSSProperties = {
  fontFamily: D.fontFamily,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.orange,
  background: C.orangeBg,
  padding: '3px 8px',
  borderRadius: 6,
  whiteSpace: 'nowrap',
}

export default memo(function WhatsAppButton({
  allDone,
  whatsappLink,
  message,
}: WhatsAppButtonProps) {
  const href =
    allDone && whatsappLink
      ? `https://wa.me/${whatsappLink}?text=${encodeURIComponent(message)}`
      : undefined

  const handleClick = () => {
    if (href) {
      window.open(href, '_blank', 'noopener')
    }
  }

  return (
    <div
      role="button"
      tabIndex={allDone ? 0 : -1}
      onClick={handleClick}
      style={{
        ...wrapper,
        background: allDone ? 'rgba(21,128,61,0.18)' : C.surface,
        opacity: allDone ? 1 : 0.35,
        cursor: allDone ? 'pointer' : 'not-allowed',
      }}
    >
      <div style={leftSide}>
        <span style={icon}>📱</span>
        <span style={label}>ENVOYER SUR WHATSAPP</span>
      </div>
      <span style={badge}>OBLIGATOIRE</span>
    </div>
  )
})
