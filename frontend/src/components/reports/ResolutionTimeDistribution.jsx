const BUCKET_DEFS = [
  { key: 'b0_15', label: '0–15min', color: '#10b981' },
  { key: 'b15_30', label: '15–30min', color: '#3b82f6' },
  { key: 'b30_45', label: '30–45min', color: '#f59e0b' },
  { key: 'b45_60', label: '45–60min', color: '#f97316' },
  { key: 'b60plus', label: '> 1h', color: '#ef4444' },
];

export default function ResolutionTimeDistribution({ buckets }) {
  const total = buckets ? BUCKET_DEFS.reduce((s, b) => s + (buckets[b.key] || 0), 0) : 0;

  if (!total) {
    return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma conversa resolvida no período.</div>;
  }

  const max = Math.max(...BUCKET_DEFS.map(b => buckets[b.key] || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {BUCKET_DEFS.map(b => {
        const count = buckets[b.key] || 0;
        const widthPct = Math.max((count / max) * 100, count > 0 ? 6 : 2);
        const pct = Math.round((count / total) * 100);
        return (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 66, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--theme-text)' }}>{b.label}</div>
            <div style={{ flex: 1, position: 'relative', height: 22, background: 'var(--theme-bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${widthPct}%`, height: '100%', background: b.color, opacity: 0.85, borderRadius: 6, transition: 'width 0.25s' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>
                {count} ({pct}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
