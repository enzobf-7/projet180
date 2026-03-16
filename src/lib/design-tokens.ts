// ─── PROJET180 Design Tokens ─────────────────────────────────────────────────
// Source unique pour toutes les constantes visuelles de l'app.

/** Couleurs */
export const C = {
  bg:      '#0B0B0B',
  surface: '#0F0F0F',
  sidebar: '#0A0A0A',
  border:  '#1E1E1E',
  muted:   '#484848',
  dimmed:  '#161616',
  text:    '#F0F0F0',
  accent:  '#3A86FF',
  accentL: '#2B75EE',
  green:   '#15803D',
  greenL:  '#22C55E',
  gold:    '#C9A84C',
  orange:  '#FFA500',
  orangeBg: 'rgba(255,165,0,0.12)',
} as const

/** Barlow Condensed — titres, labels, boutons */
export const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const

/** JetBrains Mono — chiffres, XP, données mono */
export const M = { fontFamily: '"JetBrains Mono", monospace' } as const
