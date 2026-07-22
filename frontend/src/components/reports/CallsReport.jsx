import { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneMissed, Timer, TrendingUp } from 'lucide-react';
import { api } from '../../context/AuthContext';
import CallsTable from './CallsTable';
import { fmtDuration, fmtPercent } from './funnelFormat';

function KpiCard({ icon, label, value, color }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--theme-bg-tertiary)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: color || 'var(--theme-text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

export default function CallsReport({ from, to }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = `from=${from.toISOString()}&to=${to.toISOString()}&limit=50`;
      const { data } = await api.get(`/reports/calls?${params}`);
      setReport(data);
    } catch {
      setError('Erro ao carregar o relatório de chamadas.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--theme-text-muted)', fontSize: 14 }}>Carregando...</div>;
  }

  if (error) return <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>;

  const { summary, calls } = report || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard icon={<Phone size={14} />} label="Tentativas de ligação" value={summary?.totalCalls ?? '—'} />
        <KpiCard icon={<TrendingUp size={14} />} label="Taxa de atendimento" value={fmtPercent(summary?.answerRate)} color="#16a34a" />
        <KpiCard icon={<PhoneMissed size={14} />} label="Chamadas perdidas" value={summary?.missedCount ?? '—'} color="#ef4444" />
        <KpiCard icon={<Timer size={14} />} label="Duração média (atendidas)" value={fmtDuration(summary?.avgDurationSeconds)} />
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', padding: '16px 20px 4px' }}>Quem tentou ligar</div>
        <CallsTable calls={calls} loading={loading} />
      </div>
    </div>
  );
}
