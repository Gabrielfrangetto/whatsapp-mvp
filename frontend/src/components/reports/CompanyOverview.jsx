import { useMemo } from 'react';
import { Users, ShieldCheck, TrendingUp, RotateCcw, Zap, Clock, ArrowRightLeft } from 'lucide-react';
import TrendArrow from './TrendArrow';
import { TrendChart, PeakMini, TrendTable, PeakTable, AgentBar, WorkloadTable } from './CompanyOverviewCharts';

function avg(agents, key) {
  const vals = agents.map(a => a[key]).filter(v => v !== null && v !== undefined);
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

function weightedAvg(agents, key, weight) {
  let total = 0, wSum = 0;
  for (const a of agents) {
    const v = a[key], w = a[weight] || 0;
    if (v !== null && v !== undefined && w > 0) { total += v * w; wSum += w; }
  }
  return wSum > 0 ? Math.round(total / wSum) : null;
}

function fmt(s) {
  if (s === null || s === undefined) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtMin(min) {
  if (!min) return '0min';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function KpiCard({ icon, label, value, color, trend }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--theme-bg-tertiary)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: color || 'var(--theme-text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{value ?? '—'}</div>
        {trend}
      </div>
    </div>
  );
}

export default function CompanyOverview({ agents, dailyTrend, viewMode = 'cards' }) {
  const totalChats     = agents.reduce((s, a) => s + (a.chatsReceived || 0), 0);
  const totalOnlineMin = agents.reduce((s, a) => s + (a.onlineMinutes || 0), 0);
  const totalTransfers = agents.reduce((s, a) => s + (a.transfersOut || 0), 0);
  const slaGeral       = avg(agents, 'slaComplianceRate');
  const fcrGeral       = avg(agents, 'fcrRate');
  const reopenGeral    = avg(agents, 'reopenRate');
  const firstResp      = weightedAvg(agents, 'firstResponseTimeAvg', 'chatsReceived');
  const firstRespPrev  = weightedAvg(agents, 'firstResponseTimeAvgPrev', 'chatsReceived');
  const resolution     = weightedAvg(agents, 'resolutionTimeAvg', 'chatsReceived');

  const peakHoursTotal = useMemo(() => {
    const total = Array(24).fill(0);
    for (const a of agents) { if (a.peakHours) a.peakHours.forEach((v, i) => { total[i] += v; }); }
    return total;
  }, [agents]);

  const sorted   = [...agents].sort((a, b) => (b.chatsReceived || 0) - (a.chatsReceived || 0));
  const maxChats = Math.max(...agents.map(a => a.chatsReceived || 0), 1);

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{children}</div>
  );

  return (
    <div style={{ marginBottom: 24, background: 'var(--theme-bg-secondary)', borderRadius: 16, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--theme-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Visão Geral da Empresa</span>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          <KpiCard icon={<Users size={13} />}          label="Total Chats"    value={totalChats}                                    color="var(--theme-primary)" />
          <KpiCard icon={<ShieldCheck size={13} />}    label="SLA Geral"      value={slaGeral !== null ? `${slaGeral}%` : null}    color="#3b82f6" />
          <KpiCard icon={<TrendingUp size={13} />}     label="FCR Geral"      value={fcrGeral !== null ? `${fcrGeral}%` : null}    color="#10b981" />
          <KpiCard icon={<RotateCcw size={13} />}      label="Reabertura"     value={reopenGeral !== null ? `${reopenGeral}%` : null} color="#f59e0b" />
          <KpiCard icon={<Zap size={13} />}            label="1ª Resposta"    value={fmt(firstResp)}                               color="#f59e0b" trend={<TrendArrow current={firstResp} previous={firstRespPrev} />} />
          <KpiCard icon={<Clock size={13} />}          label="Resolução"      value={fmt(resolution)}                              color="#10b981" />
          <KpiCard icon={<ArrowRightLeft size={13} />} label="Transferências" value={totalTransfers}                               color="#6366f1" />
          <KpiCard icon={<Users size={13} />}          label="Online Total"   value={fmtMin(totalOnlineMin)}                       color="var(--theme-text-muted)" />
        </div>

        {viewMode === 'table' ? (
          <>
            <div><SectionLabel>Volume Diário</SectionLabel><TrendTable dailyTrend={dailyTrend} /></div>
            <div><SectionLabel>Pico de Demanda Agregado</SectionLabel><PeakTable peakHours={peakHoursTotal} /></div>
            <div><SectionLabel>Distribuição de Carga</SectionLabel><WorkloadTable agents={sorted} totalChats={totalChats} /></div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><SectionLabel>Volume Diário</SectionLabel><TrendChart dailyTrend={dailyTrend} /></div>
              <div><SectionLabel>Pico de Demanda Agregado</SectionLabel><PeakMini peakHours={peakHoursTotal} /></div>
            </div>
            <div>
              <SectionLabel>Distribuição de Carga</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map(a => <AgentBar key={a.agent.id} agent={a.agent} count={a.chatsReceived || 0} max={maxChats} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
