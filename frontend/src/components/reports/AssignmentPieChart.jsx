const FALLBACK_COLORS = ['#25D366', '#128C7E', '#34B7F1', '#FFA000', '#8E44AD', '#E74C3C', '#16a34a', '#0891b2'];

export default function AssignmentPieChart({ data }) {
  if (!data?.length) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma atribuição automática no período.</div>;
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  let cursor = 0;
  const slices = data.map((d, i) => {
    const color = d.agent.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    const start = (cursor / total) * 100;
    cursor += d.count;
    const end = (cursor / total) * 100;
    return { ...d, color, start, end };
  });

  const gradient = slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ width: 160, height: 160, borderRadius: '50%', background: `conic-gradient(${gradient})`, flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', background: 'var(--theme-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 9.5, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>chats</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
        {slices.map(s => (
          <div key={s.agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--theme-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.agent.name}</span>
            <span style={{ color: 'var(--theme-text-muted)', marginLeft: 'auto', flexShrink: 0 }}>{s.count} ({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
