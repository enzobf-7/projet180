'use client'

import Image from 'next/image'

interface P180LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const HEIGHTS: Record<string, number> = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
  '2xl': 80,
}

export default function P180Logo({ size = 'md' }: P180LogoProps) {
  const h = HEIGHTS[size]
  // Image is 1440x400 → aspect ratio 3.6:1
  const w = Math.round(h * (1440 / 400))

  return (
    <Image
      src="/logo-projet180.png"
      alt="PROJET180"
      width={w}
      height={h}
      priority
      unoptimized
      className="select-none"
      style={{ height: h, width: 'auto' }}
    />
  )
}
