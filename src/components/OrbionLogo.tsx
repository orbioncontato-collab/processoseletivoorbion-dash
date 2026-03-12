'use client';

export function OrbionLogo({ height = 36 }: { height?: number }) {
  return (
    <svg
      height={height}
      viewBox="0 0 520 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Orbital icon */}
      <g transform="translate(0, 10)">
        {/* Outer ring */}
        <ellipse
          cx="52" cy="50" rx="46" ry="28"
          stroke="#74FAA5" strokeWidth="8" fill="none"
          transform="rotate(-20, 52, 50)"
        />
        {/* Inner ring */}
        <ellipse
          cx="52" cy="50" rx="22" ry="22"
          stroke="#74FAA5" strokeWidth="7" fill="none"
        />
        {/* Arrow tail */}
        <path
          d="M16 68 Q10 80 22 82"
          stroke="#74FAA5" strokeWidth="7" fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ORBION text */}
      <text
        x="115" y="78"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="62"
        fill="#74FAA5"
        letterSpacing="2"
      >
        ORBION
      </text>
    </svg>
  );
}
