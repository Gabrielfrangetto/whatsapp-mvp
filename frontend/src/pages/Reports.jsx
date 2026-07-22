import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart2, RefreshCw, LayoutGrid, Table2, Users, Filter, Phone, MessageSquare } from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';
import AgentCard from '../components/reports/AgentCard';
import CompanyOverview from '../components/reports/CompanyOverview';
import ReportsTable from '../components/ReportsTable';
import SalesFunnel from '../components/reports/SalesFunnel';
import CallsReport from '../components/reports/CallsReport';
import ConversationsReport from '../components/reports/ConversationsReport';

const PERIODS = [
  { label: 'Hoje',    days: 0 },
  { label: '7 dias',  days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function periodRange(idx) {
  const period = PERIODS[idx];
  const to   = new Date();
  const from = new Date();
  if (period.days === 0) { from.setHours(0, 0, 0, 0); }
  else { from.setDate(from.getDate() - period.days); from.setHours(0, 0, 0, 0); }
  return { from, to };
}

function computeBests(agents) {
  const METRICS = [
    { key: 'chatsReceived',        high: true  },
    { key: 'messagesSent',         high: true  },
    { key: 'fcrRate',              high: true  },
    { key: 'slaComplianceRate',    high: true  },
    { key: 'chatsPerHour',         high: true  },
    { key: 'onlineMinutes',        high: true  },
    { key: 'firstResponseTimeAvg', high: false },
    { key: 'avgResponseTime',      high: false },
    { key: 'resolutionTimeAvg',    high: false },
    { key: 'reopenRate',           high: false },
    { key: 'transferOutRate',      high: false },
    { key: 'transfersOut',         high: false },
  ];

  const tied = {};
  for (const { key, high } of METRICS) {
    const vals = agents.map(a => ({ id: a.agent.id, v: a[key] })).filter(x => x.v !== null && x.v !== undefined);
    if (!vals.length) continue;
    const best = high ? Math.max(...vals.map(x => x.v)) : Math.min(...vals.map(x => x.v));
    tied[key] = vals.filter(x => x.v === best).map(x => x.id);
  }

  const wins = Object.fromEntries(agents.map(a => [a.agent.id, 0]));
  for (const ids of Object.values(tied)) { if (ids.length === 1) wins[ids[0]]++; }

  const bests = {};
  for (const [key, ids] of Object.entries(tied)) {
    if (ids.length === 1) { bests[key] = ids[0]; continue; }
    let maxW = -1, winner = null;
    for (const id of ids) {
      if (wins[id] > maxW) { maxW = wins[id]; winner = id; }
      else if (wins[id] === maxW) { winner = null; }
    }
    if (winner) bests[key] = winner;
  }
  return bests;
}

export default function Reports() {
  const { agent } = useAuth();
  const storageKey = `reports-view-${agent?.id}`;

  const [periodIdx, setPeriodIdx] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [viewMode, setViewMode]   = useState(() => localStorage.getItem(storageKey) || 'cards');
  const [tab, setTab]             = useState('performance'); // 'performance' | 'funnel' | 'calls' | 'conversas'

  const setView = (mode) => { setViewMode(mode); localStorage.setItem(storageKey, mode); };
  const bests = data?.agents?.length > 1 ? computeBests(data.agents) : {};
  const multiAgent = (data?.agents?.length || 0) > 1;
  const { from: periodFrom, to: periodTo } = useMemo(() => periodRange(periodIdx), [periodIdx]);

  const load = useCallback(async (idx) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = periodRange(idx);
      const res = await api.get(`/reports?from=${from.toISOString()}&to=${to.toISOString()}`);
      setData(res.data);
    } catch {
      setError('Erro ao carregar relatório.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(periodIdx); }, [periodIdx, load]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg)', minWidth: 0 }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <BarChart2 size={22} style={{ color: 'var(--theme-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--theme-text)' }}>Relatórios</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 1 }}>
            {tab === 'performance' ? 'Desempenho por agente' : tab === 'funnel' ? 'Ciclo de vida e conversão dos contatos' : tab === 'calls' ? 'Quem tentou ligar via WhatsApp' : 'Motivos de fechamento e detalhes das conversas'}
          </div>
        </div>
        {tab === 'performance' && (
          <div style={{ display: 'flex', gap: 2, background: 'var(--theme-bg-tertiary)', borderRadius: 8, padding: 3 }}>
            {[{ mode: 'cards', icon: <LayoutGrid size={15} />, title: 'Cards' }, { mode: 'table', icon: <Table2 size={15} />, title: 'Tabela' }].map(({ mode, icon, title }) => (
              <button key={mode} onClick={() => setView(mode)} title={title} style={{ width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === mode ? 'var(--theme-bg-secondary)' : 'transparent', color: viewMode === mode ? 'var(--theme-text)' : 'var(--theme-text-muted)', boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'background 0.15s, color 0.15s' }}>{icon}</button>
            ))}
          </div>
        )}
        <button onClick={() => load(periodIdx)} disabled={loading} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-muted)' }} title="Atualizar">
          <RefreshCw size={15} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0, borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setPeriodIdx(i)} style={{ padding: '5px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: i === periodIdx ? 700 : 400, background: i === periodIdx ? 'var(--theme-primary)' : 'transparent', color: i === periodIdx ? 'var(--theme-primary-text)' : 'var(--theme-text-secondary)', border: i === periodIdx ? 'none' : '1px solid var(--theme-border)' }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--theme-bg-tertiary)', borderRadius: 8, padding: 3 }}>
          {[{ key: 'performance', icon: <Users size={13} />, label: 'Desempenho' }, { key: 'funnel', icon: <Filter size={13} />, label: 'Funil de Vendas' }, { key: 'calls', icon: <Phone size={13} />, label: 'Chamadas' }, { key: 'conversas', icon: <MessageSquare size={13} />, label: 'Conversas' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400, background: tab === t.key ? 'var(--theme-bg-secondary)' : 'transparent', color: tab === t.key ? 'var(--theme-text)' : 'var(--theme-text-muted)', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'background 0.15s, color 0.15s' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>
        {tab === 'funnel' && <SalesFunnel from={periodFrom} to={periodTo} />}
        {tab === 'calls' && <CallsReport from={periodFrom} to={periodTo} />}
        {tab === 'conversas' && <ConversationsReport from={periodFrom} to={periodTo} />}

        {tab === 'performance' && (
          <>
            {loading && !data && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--theme-text-muted)', fontSize: 14 }}>Carregando...</div>}
            {error && <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>}
            {!error && !loading && data?.agents?.length === 0 && <div style={{ color: 'var(--theme-text-muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>Nenhum dado para o período selecionado.</div>}

            {!error && data?.agents?.length > 0 && (
              <>
                {multiAgent && <CompanyOverview agents={data.agents} dailyTrend={data.dailyTrend} viewMode={viewMode} />}

                {viewMode === 'cards' && (
                  <>
                    {multiAgent && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Por Agente</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
                      {data.agents.map(row => <AgentCard key={row.agent.id} data={{ ...row, slaTargetSeconds: data.slaTargetSeconds }} bests={bests} />)}
                    </div>
                  </>
                )}

                {viewMode === 'table' && <ReportsTable agents={data.agents} slaTargetSeconds={data.slaTargetSeconds} bests={bests} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
