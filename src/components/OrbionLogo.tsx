'use client';

import Image from 'next/image';

export function OrbionLogo({ height = 32 }: { height?: number }) {
  return (
    <Image
      src="/orbion-logo.png"
      alt="Orbion"
      height={height}
      width={height * 4}
      style={{ objectFit: 'contain', height, width: 'auto' }}
      priority
    />
  );
}
