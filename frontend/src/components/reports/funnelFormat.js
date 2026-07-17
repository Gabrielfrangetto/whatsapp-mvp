// src/components/reports/funnelFormat.js
export function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) { const m = Math.floor(seconds / 60), r = seconds % 60; return r ? `${m}m ${r}s` : `${m}m`; }
  if (seconds < 86400) { const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60); return m ? `${h}h ${m}m` : `${h}h`; }
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export function fmtPercent(v) {
  if (v === null || v === undefined) return '—';
  return `${v}%`;
}

export function fmtMoney(value, currency) {
  if (value === null || value === undefined) return '—';
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value); }
  catch { return `${value}`; }
}
