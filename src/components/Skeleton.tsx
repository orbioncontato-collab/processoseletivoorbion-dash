'use client';

export function SkeletonBlock({
  width = '100%',
  height = 20,
  radius = 6,
  style: extraStyle,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #1a2a3a 25%, #1f3347 50%, #1a2a3a 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...extraStyle,
      }}
    />
  );
}

export function KpiSkeleton() {
  return (
    <div
      style={{
        background: '#0d1829',
        border: '1px solid #1a2a3a',
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonBlock width={100} height={12} />
        <SkeletonBlock width={36} height={36} radius={10} />
      </div>
      <SkeletonBlock width={80} height={40} radius={8} />
      <SkeletonBlock width={120} height={10} />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      style={{
        background: '#0d1829',
        border: '1px solid #1a2a3a',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <SkeletonBlock width={180} height={16} style={{ marginBottom: 24 }} />
      <SkeletonBlock width="100%" height={height} radius={8} />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div
      style={{
        background: '#0d1829',
        border: '1px solid #1a2a3a',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <SkeletonBlock width={200} height={16} style={{ marginBottom: 24 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
          <SkeletonBlock width="25%" height={12} />
          <SkeletonBlock width="20%" height={12} />
          <SkeletonBlock width="15%" height={22} radius={4} />
          <SkeletonBlock width="12%" height={22} radius={4} />
          <SkeletonBlock width="10%" height={12} />
        </div>
      ))}
    </div>
  );
}

// Inject shimmer keyframe globally once
if (typeof document !== 'undefined') {
  if (!document.getElementById('shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
