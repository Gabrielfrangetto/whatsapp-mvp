export default function ClosingReasonsChart({ reasons }) {
  if (!reasons?.length) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma conversa finalizada no período.</div>;
  }

  const total = reasons.reduce((s, r) => s + r.count, 0);
  const max = Math.max(...reasons.map(r => r.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reasons.map(r => {
        const widthPct = Math.max((r.count / max) * 100, r.count > 0 ? 6 : 2);
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.id || 'none'} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 160, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>
              {r.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 26, background: 'var(--theme-bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${widthPct}%`, height: '100%', background: r.id ? 'var(--theme-primary)' : 'var(--theme-text-muted)', opacity: 0.85, borderRadius: 6, transition: 'width 0.25s' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>
                {r.count} ({pct}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
