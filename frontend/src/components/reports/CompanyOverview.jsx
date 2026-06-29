import { useState, useMemo } from 'react';
import { Users, ShieldCheck, TrendingUp, RotateCcw, Zap, Clock, ArrowRightLeft } from 'lucide-react';
import { getInitials } from '../../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

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

function KpiCard({ icon, label, value, color }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--theme-bg-tertiary)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: color || 'var(--theme-text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

const TREND_H = 110;
const TH_STYLE = { padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--theme-border)', borderRight: '1px solid var(--theme-border)', background: 'var(--theme-bg-tertiary)', whiteSpace: 'nowrap' };

// ── Chart versions ──────────────────────────────────────────────────────────

function TrendChart({ dailyTrend }) {
  const [hovered, setHovered] = useState(null);
  if (!dailyTrend?.length) return <div style={{ height: TREND_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-muted)', fontSize: 12 }}>Sem dados</div>;
  const max = Math.max(...dailyTrend.map(d => d.count), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: TREND_H }}>
        {dailyTrend.map((d, i) => {
          const barH = Math.max((d.count / max) * TREND_H, d.count > 0 ? 4 : 2);
          const isH = hovered === i;
          return (
            <div key={d.date} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', position: 'relative', cursor: d.count > 0 ? 'pointer' : 'default' }}>
              {isH && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: 1, background: 'var(--theme-primary)', opacity: 0.35, pointerEvents: 'none', zIndex: 2 }} />}
              {isH && d.count > 0 && (
                <div style={{ position: 'absolute', bottom: barH + 6, left: '50%', transform: 'translateX(-50%)', background: 'var(--theme-bg)', border: '1px solid var(--theme-border-strong)', borderRadius: 7, padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text)' }}>{d.count} conversas</div>
                  <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>{d.date.slice(5).replace('-', '/')}</div>
                </div>
              )}
              <div style={{ width: '100%', height: `${barH}px`, background: 'var(--theme-primary)', borderRadius: '2px 2px 0 0', opacity: d.count > 0 ? (isH ? 1 : 0.75) : 0.12, transition: 'opacity 0.12s' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--theme-text-muted)', marginTop: 4 }}>
        <span>{dailyTrend[0]?.date?.slice(5)?.replace('-', '/')}</span>
        {dailyTrend.length > 4 && <span>{dailyTrend[Math.floor(dailyTrend.length / 2)]?.date?.slice(5)?.replace('-', '/')}</span>}
        {dailyTrend.length > 1 && <span>{dailyTrend[dailyTrend.length - 1]?.date?.slice(5)?.replace('-', '/')}</span>}
      </div>
    </div>
  );
}

function PeakMini({ peakHours }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...peakHours, 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: TREND_H }}>
        {peakHours.map((v, h) => {
          const barH = Math.max((v / max) * TREND_H, v > 0 ? 4 : 2);
          const isH = hovered === h;
          return (
            <div key={h} onMouseEnter={() => setHovered(h)} onMouseLeave={() => setHovered(null)}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', position: 'relative', cursor: v > 0 ? 'pointer' : 'default' }}>
              {isH && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: 1, background: 'var(--theme-primary)', opacity: 0.35, pointerEvents: 'none', zIndex: 2 }} />}
              {isH && v > 0 && (
                <div style={{ position: 'absolute', bottom: barH + 6, left: '50%', transform: 'translateX(-50%)', background: 'var(--theme-bg)', border: '1px solid var(--theme-border-strong)', borderRadius: 7, padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text)' }}>{v} chats</div>
                  <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>{String(h).padStart(2, '0')}h</div>
                </div>
              )}
              <div style={{ width: '100%', height: `${barH}px`, background: 'var(--theme-primary)', borderRadius: '2px 2px 0 0', opacity: v > 0 ? (isH ? 1 : Math.max(0.3, v / max)) : 0.1, transition: 'opacity 0.12s' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--theme-text-muted)', marginTop: 4 }}>
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

// ── Table versions ──────────────────────────────────────────────────────────

function TrendTable({ dailyTrend }) {
  if (!dailyTrend?.length) return null;
  const max = Math.max(...dailyTrend.map(d => d.count), 1);
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--theme-border)' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>{dailyTrend.map(d => <th key={d.date} style={{ ...TH_STYLE, minWidth: 50 }}>{d.date.slice(5).replace('-', '/')}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            {dailyTrend.map(d => {
              const isPeak = d.count === max && max > 0;
              return (
                <td key={d.date} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: isPeak ? 800 : d.count > 0 ? 600 : 400, color: isPeak ? 'var(--theme-primary)' : d.count > 0 ? 'var(--theme-text)' : 'var(--theme-text-muted)', borderRight: '1px solid var(--theme-border)', whiteSpace: 'nowrap', background: isPeak ? 'var(--theme-primary-subtle)' : 'transparent' }}>
                  {d.count > 0 ? d.count : '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PeakTable({ peakHours }) {
  const max = Math.max(...peakHours, 1);
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--theme-border)' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>{peakHours.map((_, h) => <th key={h} style={{ ...TH_STYLE, minWidth: 44 }}>{String(h).padStart(2, '0')}h</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            {peakHours.map((v, h) => {
              const isPeak = v === max && max > 0;
              return (
                <td key={h} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: isPeak ? 800 : v > 0 ? 600 : 400, color: isPeak ? 'var(--theme-primary)' : v > 0 ? 'var(--theme-text)' : 'var(--theme-text-muted)', borderRight: '1px solid var(--theme-border)', whiteSpace: 'nowrap', background: isPeak ? 'var(--theme-primary-subtle)' : 'transparent' }}>
                  {v > 0 ? v : '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function AgentBar({ agent, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const src = agent.avatarUrl ? (agent.avatarUrl.startsWith('http') ? agent.avatarUrl : `${API_URL}${agent.avatarUrl}`) : null;
  const avatar = (
    <div style={{ width: 26, height: 26, borderRadius: '50%', background: agent.avatarColor || '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9, flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(agent.name || '?')}
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {avatar}
      <div style={{ width: 100, fontSize: 12, color: 'var(--theme-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{agent.name}</div>
      <div style={{ flex: 1, height: 10, background: 'var(--theme-bg-tertiary)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--theme-primary)', borderRadius: 5, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{count}</div>
    </div>
  );
}

function WorkloadTable({ agents, totalChats }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
            <th style={{ ...TH_STYLE, textAlign: 'left', borderRight: 'none' }}>Agente</th>
            <th style={{ ...TH_STYLE, minWidth: 70 }}>Chats</th>
            <th style={{ ...TH_STYLE, minWidth: 70, borderRight: 'none' }}>% do total</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => {
            const pct = totalChats > 0 ? Math.round((a.chatsReceived || 0) / totalChats * 100) : 0;
            const src = a.agent.avatarUrl ? (a.agent.avatarUrl.startsWith('http') ? a.agent.avatarUrl : `${API_URL}${a.agent.avatarUrl}`) : null;
            return (
              <tr key={a.agent.id} style={{ borderBottom: i < agents.length - 1 ? '1px solid var(--theme-border)' : 'none' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: a.agent.avatarColor || '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9, flexShrink: 0, overflow: 'hidden' }}>
                      {src ? <img src={src} alt={a.agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(a.agent.name || '?')}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)' }}>{a.agent.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', borderLeft: '1px solid var(--theme-border)' }}>{a.chatsReceived || 0}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--theme-text-muted)', borderLeft: '1px solid var(--theme-border)' }}>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function CompanyOverview({ agents, dailyTrend, viewMode = 'cards' }) {
  const totalChats     = agents.reduce((s, a) => s + (a.chatsReceived || 0), 0);
  const totalOnlineMin = agents.reduce((s, a) => s + (a.onlineMinutes || 0), 0);
  const totalTransfers = agents.reduce((s, a) => s + (a.transfersOut || 0), 0);
  const slaGeral       = avg(agents, 'slaComplianceRate');
  const fcrGeral       = avg(agents, 'fcrRate');
  const reopenGeral    = avg(agents, 'reopenRate');
  const firstResp      = weightedAvg(agents, 'firstResponseTimeAvg', 'chatsReceived');
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
          <KpiCard icon={<Zap size={13} />}            label="1ª Resposta"    value={fmt(firstResp)}                               color="#f59e0b" />
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
