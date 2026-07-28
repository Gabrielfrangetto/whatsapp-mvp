import { useState } from 'react';

const BUCKET_DEFS = [
  { key: 'b0_15', label: '0–15min', color: '#10b981' },
  { key: 'b15_30', label: '15–30min', color: '#3b82f6' },
  { key: 'b30_45', label: '30–45min', color: '#f59e0b' },
  { key: 'b45_60', label: '45–60min', color: '#f97316' },
  { key: 'b60plus', label: '> 1h', color: '#ef4444' },
];

const SIZE = 190, CX = 95, CY = 95, R_OUTER = 90, R_INNER = 52;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startAngle, endAngle) {
  const angle = Math.min(endAngle - startAngle, 359.99);
  const end = startAngle + angle;
  const startOuter = polarToCartesian(CX, CY, R_OUTER, end);
  const endOuter = polarToCartesian(CX, CY, R_OUTER, startAngle);
  const startInner = polarToCartesian(CX, CY, R_INNER, end);
  const endInner = polarToCartesian(CX, CY, R_INNER, startAngle);
  const largeArc = angle > 180 ? 1 : 0;
  return [
    'M', startOuter.x, startOuter.y,
    'A', R_OUTER, R_OUTER, 0, largeArc, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', R_INNER, R_INNER, 0, largeArc, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

export default function ResolutionTimePieChart({ agents }) {
  const [hoverKey, setHoverKey] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const totals = { b0_15: 0, b15_30: 0, b30_45: 0, b45_60: 0, b60plus: 0 };
  for (const a of agents) {
    if (!a.resolutionTimeBuckets) continue;
    for (const b of BUCKET_DEFS) totals[b.key] += a.resolutionTimeBuckets[b.key] || 0;
  }
  const total = BUCKET_DEFS.reduce((s, b) => s + totals[b.key], 0);

  if (!total) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma conversa resolvida no período.</div>;
  }

  let cumulative = 0;
  const slices = BUCKET_DEFS.map(b => {
    const value = totals[b.key];
    const startAngle = cumulative;
    const angle = (value / total) * 360;
    cumulative += angle;
    return { ...b, value, startAngle, endAngle: cumulative };
  });

  const hovered = slices.find(s => s.key === hoverKey);
  const breakdown = hovered
    ? agents
        .map(a => ({ name: a.agent.name, color: a.agent.avatarColor, count: a.resolutionTimeBuckets?.[hovered.key] || 0 }))
        .filter(x => x.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }} onMouseMove={handleMove} onMouseLeave={() => setHoverKey(null)}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {slices.filter(s => s.value > 0).map(s => (
            <path
              key={s.key}
              d={arcPath(s.startAngle, s.endAngle)}
              fill={s.color}
              opacity={hoverKey === null || hoverKey === s.key ? 0.9 : 0.3}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHoverKey(s.key)}
            />
          ))}
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--theme-text)' }}>{total}</div>
          <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>resolvidas</div>
        </div>

        {hovered && (
          <div style={{
            position: 'absolute', left: Math.min(mouse.x + 14, SIZE - 10), top: mouse.y + 14, zIndex: 10, pointerEvents: 'none',
            background: 'var(--theme-bg)', border: '1px solid var(--theme-border-strong)', borderRadius: 8, padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)', minWidth: 150, maxWidth: 220,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 4 }}>
              {hovered.label} · {hovered.value} ({Math.round((hovered.value / total) * 100)}%)
            </div>
            {breakdown.length ? breakdown.map(a => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--theme-text-secondary)', padding: '2px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color || 'var(--theme-primary)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--theme-text)' }}>{a.count}</span>
              </div>
            )) : <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Sem agentes</div>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 160 }}>
        {slices.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 6px' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--theme-text)', flex: 1 }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: 'var(--theme-text)' }}>{s.value}</span>
            <span style={{ color: 'var(--theme-text-muted)', width: 34, textAlign: 'right' }}>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
