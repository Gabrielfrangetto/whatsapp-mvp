import { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, TrendingDown, Timer, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../../context/AuthContext';
import FunnelChart from './FunnelChart';
import FunnelJourneyTable from './FunnelJourneyTable';
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

export default function SalesFunnel({ from, to }) {
  const [report, setReport] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setDealsLoading(true);
    setError(null);
    try {
      const params = `from=${from.toISOString()}&to=${to.toISOString()}`;
      const [reportRes, dealsRes] = await Promise.all([
        api.get(`/reports/funnel?${params}`),
        api.get(`/reports/funnel/deals?limit=50`),
      ]);
      setReport(reportRes.data);
      setDeals(dealsRes.data.deals || []);
    } catch {
      setError('Erro ao carregar o funil de vendas.');
    } finally {
      setLoading(false);
      setDealsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--theme-text-muted)', fontSize: 14 }}>Carregando...</div>;
  }

  if (error) return <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>;

  if (report && !report.configured) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)' }}>
        <SettingsIcon size={28} style={{ color: 'var(--theme-text-muted)', marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text)', marginBottom: 4 }}>Integração com Pipedrive não configurada</div>
        <div style={{ fontSize: 12.5, color: 'var(--theme-text-muted)', maxWidth: 420, margin: '0 auto' }}>
          Configure o token de API e o pipeline de vendas em Configurações → Avançado → Vendas para ver o funil aqui.
        </div>
      </div>
    );
  }

  const { summary, stages } = report || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard icon={<TrendingUp size={14} />} label="Taxa de conversão" value={fmtPercent(summary?.conversionRate)} color="#16a34a" />
        <KpiCard icon={<TrendingDown size={14} />} label="Taxa de abandono" value={fmtPercent(summary?.abandonmentRate)} color="#ef4444" />
        <KpiCard icon={<Timer size={14} />} label="Tempo médio p/ conversão" value={fmtDuration(summary?.avgTimeToConversionSeconds)} />
        <KpiCard icon={<Target size={14} />} label="Negócios convertidos" value={summary?.wonCount ?? '—'} />
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 16 }}>Jornada por estágio</div>
        <FunnelChart stages={stages} />
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', padding: '16px 20px 4px' }}>Jornada dos contatos</div>
        <FunnelJourneyTable deals={deals} loading={dealsLoading} />
      </div>
    </div>
  );
}
