import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// betterIsLower: true quando um valor menor é melhor (ex: tempos de resposta).
export function compareTrend(current, previous, betterIsLower = true) {
  if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) return null;
  const diffPct = Math.round(((current - previous) / previous) * 100);
  const isBetter = diffPct === 0 ? null : (betterIsLower ? diffPct < 0 : diffPct > 0);
  return { diffPct, isBetter };
}

export default function TrendArrow({ current, previous, betterIsLower = true, size = 11 }) {
  const trend = compareTrend(current, previous, betterIsLower);
  if (!trend) return null;
  const { diffPct, isBetter } = trend;

  if (diffPct === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size, fontWeight: 700, color: 'var(--theme-text-muted)' }} title="Igual ao período anterior de mesma duração">
        <Minus size={size} />igual
      </span>
    );
  }

  const color = isBetter ? '#10b981' : '#ef4444';
  const Icon = diffPct > 0 ? ArrowUp : ArrowDown;
  const speedLabel = diffPct > 0 ? 'mais lento' : 'mais rápido';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size, fontWeight: 700, color }} title={`${Math.abs(diffPct)}% ${speedLabel} que o período anterior de mesma duração`}>
      <Icon size={size} />{Math.abs(diffPct)}%
    </span>
  );
}
