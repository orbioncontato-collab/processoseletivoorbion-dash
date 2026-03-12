'use client';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'green' | 'blue' | 'teal' | 'yellow' | 'red';
}

const accentMap = {
  green:  { border: '#74FAA5', iconBg: 'rgba(116,250,165,0.12)', iconColor: '#74FAA5', glow: '#74FAA5' },
  blue:   { border: '#295D86', iconBg: 'rgba(41,93,134,0.3)',    iconColor: '#7ec8f0', glow: '#3a7ab8' },
  teal:   { border: '#265C58', iconBg: 'rgba(38,92,88,0.35)',    iconColor: '#5dd4c5', glow: '#2e7a6e' },
  yellow: { border: '#c8a020', iconBg: 'rgba(200,160,32,0.15)',  iconColor: '#f0c040', glow: '#c8a020' },
  red:    { border: '#b04040', iconBg: 'rgba(224,85,85,0.15)',   iconColor: '#e08888', glow: '#b04040' },
};

export function KpiCard({ title, value, subtitle, icon, accent = 'green' }: KpiCardProps) {
  const c = accentMap[accent];

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #0d1829 0%, #0f1e30 100%)',
        border: `1px solid ${c.border}28`,
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c.glow}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Label + icon row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            color: '#6b84a0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            lineHeight: 1.3,
          }}
        >
          {title}
        </span>
        <div
          aria-hidden="true"
          style={{
            background: c.iconBg,
            borderRadius: 9,
            padding: 7,
            color: c.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          color: '#eef4f8',
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ color: '#4a6070', fontSize: 11, lineHeight: 1.4 }}>{subtitle}</div>
      )}
    </div>
  );
}
