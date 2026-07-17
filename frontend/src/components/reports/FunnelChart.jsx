import { TrendingDown } from 'lucide-react';
import { fmtDuration } from './funnelFormat';

export default function FunnelChart({ stages }) {
  if (!stages?.length) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhum estágio configurado no pipeline.</div>;
  }

  const maxEntered = Math.max(...stages.map(s => s.dealsEnteredCount), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stages.map((s, i) => {
        const widthPct = Math.max((s.dealsEnteredCount / maxEntered) * 100, s.dealsEnteredCount > 0 ? 6 : 2);
        const prev = i > 0 ? stages[i - 1] : null;
        const dropoff = prev && prev.dealsEnteredCount > 0
          ? Math.round(((prev.dealsEnteredCount - s.dealsEnteredCount) / prev.dealsEnteredCount) * 100)
          : null;

        return (
          <div key={s.id}>
            {dropoff !== null && dropoff > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#ef4444', margin: '0 0 4px 2px' }}>
                <TrendingDown size={11} /> {dropoff}% de queda em relação ao estágio anterior
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>
                {s.name}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 30, background: 'var(--theme-bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--theme-primary)', opacity: 0.85, borderRadius: 6, transition: 'width 0.25s' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>
                  {s.dealsEnteredCount} {s.dealsEnteredCount === 1 ? 'entrada' : 'entradas'}
                </div>
              </div>
              <div style={{ width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: 'var(--theme-text-muted)' }}>
                <span>{s.currentlyIn} em aberto agora</span>
                <span>Tempo médio: {fmtDuration(s.avgTimeInStageSeconds)}</span>
                {s.lostFromStage > 0 && <span style={{ color: '#ef4444' }}>{s.lostFromStage} perdidos aqui</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
