'use client';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'green' | 'blue' | 'teal' | 'yellow' | 'red';
}

const accentMap = {
  green: { border: '#74FAA5', icon: 'rgba(116,250,165,0.12)', text: '#74FAA5' },
  blue:  { border: '#295D86', icon: 'rgba(41,93,134,0.25)',   text: '#7ec8f0' },
  teal:  { border: '#265C58', icon: 'rgba(38,92,88,0.3)',     text: '#5dd4c5' },
  yellow:{ border: '#f0c040', icon: 'rgba(240,192,64,0.15)',  text: '#f0c040' },
  red:   { border: '#e05555', icon: 'rgba(224,85,85,0.15)',   text: '#e05555' },
};

export function KpiCard({ title, value, subtitle, icon, accent = 'green' }: KpiCardProps) {
  const colors = accentMap[accent];
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: `1px solid ${colors.border}33`,
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent top-left */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.border}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: '#8ca0b8', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </span>
        <div
          style={{
            background: colors.icon,
            borderRadius: 10,
            padding: 8,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>

      <div style={{ color: '#f0f4f8', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>

      {subtitle && (
        <div style={{ color: '#6b84a0', fontSize: 12 }}>{subtitle}</div>
      )}
    </div>
  );
}
