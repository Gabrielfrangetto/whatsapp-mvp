import { useState } from 'react';

const Y_TICKS = [10, 20, 30, 40, 50];
export const CHART_HEIGHT = 250;

export default function PeakChart({ peakHours }) {
  const [hovered, setHovered] = useState(null);

  const isEmpty = !peakHours || peakHours.every(v => v === 0);
  const hours = peakHours || Array(24).fill(0);
  const max = isEmpty ? 0 : Math.max(...hours, 1);
  const yMax = Math.max(Y_TICKS[Y_TICKS.length - 1], max);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', width: 22, flexShrink: 0, height: CHART_HEIGHT + 4 }}>
        {Y_TICKS.map(t => (
          <div key={t} style={{ position: 'absolute', bottom: `${(t / yMax) * CHART_HEIGHT}px`, right: 0, fontSize: 9, color: 'var(--theme-text-muted)', lineHeight: 1, transform: 'translateY(50%)', textAlign: 'right' }}>{t}</div>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative', height: CHART_HEIGHT }}>
        {Y_TICKS.map(t => (
          <div key={t} style={{ position: 'absolute', bottom: `${(t / yMax) * CHART_HEIGHT}px`, left: 0, right: 0, borderTop: '1px dashed var(--theme-border)', opacity: 0.6, zIndex: 0 }} />
        ))}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: CHART_HEIGHT, position: 'relative', zIndex: 1 }}>
          {hours.map((v, h) => {
            const isHovered = !isEmpty && hovered === h;
            const barH = isEmpty ? CHART_HEIGHT : Math.round((Math.min(v, yMax) / yMax) * CHART_HEIGHT);
            return (
              <div key={h} onMouseEnter={() => !isEmpty && setHovered(h)} onMouseLeave={() => setHovered(null)} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', position: 'relative', cursor: !isEmpty && v > 0 ? 'pointer' : 'default' }}>
                {isHovered && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: 1, background: 'var(--theme-primary)', opacity: 0.35, pointerEvents: 'none', zIndex: 2 }} />}
                {isHovered && (
                  <div style={{ position: 'absolute', bottom: `${barH + 8}px`, left: '50%', transform: 'translateX(-50%)', background: 'var(--theme-bg)', border: '1px solid var(--theme-border-strong)', borderRadius: 7, padding: '5px 9px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text)' }}>{v} chat{v !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>{String(h).padStart(2, '0')}:00 – {String(h + 1).padStart(2, '0')}:00</div>
                  </div>
                )}
                <div style={{ width: '100%', background: (isEmpty || v === 0) ? 'var(--theme-bg-tertiary)' : 'var(--theme-primary)', borderRadius: '2px 2px 0 0', height: isEmpty ? `${CHART_HEIGHT}px` : `${Math.max(barH, v > 0 ? 5 : 0)}px`, opacity: isEmpty ? 0.08 : (v > 0 ? (isHovered ? 1 : Math.max(0.35, v / yMax)) : 0.15), filter: isHovered && v > 0 ? 'brightness(1.3)' : 'none', transition: 'opacity 0.15s, filter 0.15s', position: 'relative', zIndex: 3 }} />
              </div>
            );
          })}
        </div>

        {isEmpty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--theme-text-muted)', background: 'var(--theme-bg-secondary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--theme-border)' }}>Sem dados</span>
          </div>
        )}
      </div>
    </div>
  );
}
