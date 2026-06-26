import { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw, Clock, MessageSquare, CheckCircle, Zap, Users, ArrowRightLeft, RotateCcw, ShieldCheck, TrendingUp, LayoutGrid, Table2 } from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/format';
import ReportsTable from '../components/ReportsTable';

const PERIODS = [
  { label: 'Hoje',    days: 0 },
  { label: '7 dias',  days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMinutes(min) {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function pct(val) {
  if (val === null || val === undefined) return '—';
  return `${val}%`;
}

function AgentAvatar({ name, color, avatarUrl, size = 42 }) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';
  const bg = color || 'var(--theme-primary)';
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {getInitials(name || '?')}
    </div>
  );
}

function Stat({ icon, label, value, sub, color, highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px', borderRadius: 10, background: highlight ? `${color}18` : 'var(--theme-bg-tertiary)', border: highlight ? `1px solid ${color}40` : '1px solid transparent', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: color || 'var(--theme-text-muted)' }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{sub}</div>}
    </div>
  );
}

function RateBar({ value, color = 'var(--theme-primary)' }) {
  if (value === null || value === undefined) return null;
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--theme-bg-tertiary)', overflow: 'hidden', marginTop: 2 }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

const Y_TICKS = [10, 20, 30, 40, 50];
const CHART_HEIGHT = 250; // px da área de barras — garante ≥5px para barra de valor 1 (yMax=50)

function PeakChart({ peakHours }) {
  const [hovered, setHovered] = useState(null);

  const isEmpty = !peakHours || peakHours.every(v => v === 0);
  const hours = peakHours || Array(24).fill(0);
  const max = isEmpty ? 0 : Math.max(...hours, 1);
  const yMax = Math.max(Y_TICKS[Y_TICKS.length - 1], max);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Eixo Y */}
      <div style={{ position: 'relative', width: 22, flexShrink: 0, height: CHART_HEIGHT + 4 }}>
        {Y_TICKS.map(t => (
          <div key={t} style={{
            position: 'absolute',
            bottom: `${(t / yMax) * CHART_HEIGHT}px`,
            right: 0,
            fontSize: 9,
            color: 'var(--theme-text-muted)',
            lineHeight: 1,
            transform: 'translateY(50%)',
            textAlign: 'right',
          }}>{t}</div>
        ))}
      </div>

      {/* Área do gráfico */}
      <div style={{ flex: 1, position: 'relative', height: CHART_HEIGHT }}>
        {/* Linhas de grade horizontais */}
        {Y_TICKS.map(t => (
          <div key={t} style={{
            position: 'absolute',
            bottom: `${(t / yMax) * CHART_HEIGHT}px`,
            left: 0, right: 0,
            borderTop: '1px dashed var(--theme-border)',
            opacity: 0.6,
            zIndex: 0,
          }} />
        ))}

        {/* Barras */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: CHART_HEIGHT, position: 'relative', zIndex: 1 }}>
          {hours.map((v, h) => {
            const isHovered = !isEmpty && hovered === h;
            const barH = isEmpty ? CHART_HEIGHT : Math.round((Math.min(v, yMax) / yMax) * CHART_HEIGHT);

            return (
              <div
                key={h}
                onMouseEnter={() => !isEmpty && setHovered(h)}
                onMouseLeave={() => setHovered(null)}
                style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', position: 'relative', cursor: !isEmpty && v > 0 ? 'pointer' : 'default' }}
              >
                {/* Linha vertical de crosshair */}
                {isHovered && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: 'var(--theme-primary)',
                    opacity: 0.35,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }} />
                )}

                {/* Tooltip */}
                {isHovered && (
                  <div style={{
                    position: 'absolute',
                    bottom: `${barH + 8}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--theme-bg)',
                    border: '1px solid var(--theme-border-strong)',
                    borderRadius: 7,
                    padding: '5px 9px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text)' }}>
                      {v} chat{v !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>
                      {String(h).padStart(2, '0')}:00 – {String(h + 1).padStart(2, '0')}:00
                    </div>
                  </div>
                )}

                {/* Barra */}
                <div style={{
                  width: '100%',
                  background: (isEmpty || v === 0) ? 'var(--theme-bg-tertiary)' : 'var(--theme-primary)',
                  borderRadius: '2px 2px 0 0',
                  height: isEmpty ? `${CHART_HEIGHT}px` : `${Math.max(barH, v > 0 ? 5 : 0)}px`,
                  opacity: isEmpty ? 0.08 : (v > 0 ? (isHovered ? 1 : Math.max(0.35, v / yMax)) : 0.15),
                  filter: isHovered && v > 0 ? 'brightness(1.3)' : 'none',
                  transition: 'opacity 0.15s, filter 0.15s',
                  position: 'relative',
                  zIndex: 3,
                }} />
              </div>
            );
          })}
        </div>

        {/* Sem dados overlay */}
        {isEmpty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--theme-text-muted)', background: 'var(--theme-bg-secondary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--theme-border)' }}>
              Sem dados
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBar({ dist }) {
  if (!dist) return null;
  const total = dist.ONLINE + dist.BUSY + dist.OFFLINE;
  if (total === 0) return <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Sem registro de status no período</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 8 }}>
        {dist.ONLINE  > 0 && <div style={{ flex: dist.ONLINE,  background: '#4ade80' }} title={`Online: ${formatMinutes(dist.ONLINE)}`} />}
        {dist.BUSY    > 0 && <div style={{ flex: dist.BUSY,    background: '#fbbf24' }} title={`Ocupado: ${formatMinutes(dist.BUSY)}`} />}
        {dist.OFFLINE > 0 && <div style={{ flex: dist.OFFLINE, background: 'var(--theme-bg-tertiary)' }} title={`Offline: ${formatMinutes(dist.OFFLINE)}`} />}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--theme-text-muted)' }}>
        {dist.ONLINE  > 0 && <span><span style={{ color: '#4ade80' }}>●</span> Online {formatMinutes(dist.ONLINE)}</span>}
        {dist.BUSY    > 0 && <span><span style={{ color: '#fbbf24' }}>●</span> Ocupado {formatMinutes(dist.BUSY)}</span>}
        {dist.OFFLINE > 0 && <span><span style={{ color: 'var(--theme-text-muted)' }}>●</span> Offline {formatMinutes(dist.OFFLINE)}</span>}
      </div>
    </div>
  );
}

function AgentCard({ data }) {
  const {
    agent,
    chatsReceived, messagesSent,
    firstResponseTimeAvg, resolutionTimeAvg, avgResponseTime,
    fcrRate, reopenRate, slaComplianceRate, slaTargetSeconds,
    transfersOut, transferOutRate, chatsPerHour,
    statusDistributionMinutes, onlineMinutes, peakHours,
  } = data;

  return (
    <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 16, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
      {/* Header do agente */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--theme-border)' }}>
        <AgentAvatar name={agent.name} color={agent.avatarColor} avatarUrl={agent.avatarUrl} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 2 }}>{agent.role === 'ADMIN' ? 'Admin' : 'Agente'}</div>
        </div>
        {chatsPerHour !== null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--theme-primary)' }}>{chatsPerHour}</div>
            <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>chats/hora</div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Volume */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Volume</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat icon={<Users size={12} />} label="Chats recebidos" value={chatsReceived} sub="fluxo automático" color="var(--theme-primary)" />
            <Stat icon={<MessageSquare size={12} />} label="Msgs enviadas" value={messagesSent} color="#6366f1" />
            <Stat icon={<ArrowRightLeft size={12} />} label="Transferências" value={transfersOut} sub={pct(transferOutRate) !== '—' ? `${pct(transferOutRate)} dos recebidos` : undefined} color="#f59e0b" />
          </div>
        </div>

        {/* Tempos */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tempos</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat icon={<Zap size={12} />} label="1ª resposta" value={formatDuration(firstResponseTimeAvg)} color="#f59e0b" />
            <Stat icon={<Clock size={12} />} label="Resp. geral" value={formatDuration(avgResponseTime)} color="#3b82f6" />
            <Stat icon={<CheckCircle size={12} />} label="Resolução" value={formatDuration(resolutionTimeAvg)} color="#10b981" />
          </div>
        </div>

        {/* Qualidade */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Qualidade</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, background: fcrRate >= 80 ? '#10b98118' : fcrRate >= 60 ? '#f59e0b18' : fcrRate !== null ? '#ef444418' : 'var(--theme-bg-tertiary)', border: fcrRate !== null ? `1px solid ${fcrRate >= 80 ? '#10b98140' : fcrRate >= 60 ? '#f59e0b40' : '#ef444440'}` : '1px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={12} style={{ color: '#10b981' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FCR</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{pct(fcrRate)}</div>
              <RateBar value={fcrRate} color="#10b981" />
              <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>Resolução no 1º contato</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, background: slaComplianceRate >= 90 ? '#10b98118' : slaComplianceRate >= 70 ? '#f59e0b18' : slaComplianceRate !== null ? '#ef444418' : 'var(--theme-bg-tertiary)', border: slaComplianceRate !== null ? `1px solid ${slaComplianceRate >= 90 ? '#10b98140' : slaComplianceRate >= 70 ? '#f59e0b40' : '#ef444440'}` : '1px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <TrendingUp size={12} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SLA</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{pct(slaComplianceRate)}</div>
              <RateBar value={slaComplianceRate} color="#3b82f6" />
              <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>1ª resp. em {Math.round(slaTargetSeconds / 60)}min</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, background: 'var(--theme-bg-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={12} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reabertura</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{pct(reopenRate)}</div>
              <RateBar value={reopenRate} color="#f59e0b" />
              <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>Clientes que voltaram</div>
            </div>
          </div>
        </div>

        {/* Disponibilidade */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Disponibilidade
            {onlineMinutes > 0 && <span style={{ fontWeight: 400, marginLeft: 6 }}>· {formatMinutes(onlineMinutes)} online</span>}
          </div>
          <StatusBar dist={statusDistributionMinutes} />
        </div>

        {/* Pico */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pico de atendimento (por hora)</div>
          <PeakChart peakHours={peakHours} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--theme-text-muted)', marginTop: 2, padding: '0 1px' }}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { agent } = useAuth();
  const storageKey = `reports-view-${agent?.id}`;

  const [periodIdx, setPeriodIdx] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [viewMode, setViewMode]   = useState(() => localStorage.getItem(storageKey) || 'cards');

  const setView = (mode) => { setViewMode(mode); localStorage.setItem(storageKey, mode); };

  const load = useCallback(async (idx) => {
    setLoading(true);
    setError(null);
    try {
      const period = PERIODS[idx];
      const to   = new Date();
      const from = new Date();
      if (period.days === 0) {
        from.setHours(0, 0, 0, 0);
      } else {
        from.setDate(from.getDate() - period.days);
        from.setHours(0, 0, 0, 0);
      }
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
      {/* Header */}
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <BarChart2 size={22} style={{ color: 'var(--theme-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--theme-text)' }}>Relatórios</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 1 }}>Desempenho por agente</div>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--theme-bg-tertiary)', borderRadius: 8, padding: 3 }}>
          {[
            { mode: 'cards', icon: <LayoutGrid size={15} />, title: 'Cards' },
            { mode: 'table', icon: <Table2 size={15} />,     title: 'Tabela' },
          ].map(({ mode, icon, title }) => (
            <button key={mode} onClick={() => setView(mode)} title={title} style={{
              width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === mode ? 'var(--theme-bg-secondary)' : 'transparent',
              color: viewMode === mode ? 'var(--theme-text)' : 'var(--theme-text-muted)',
              boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'background 0.15s, color 0.15s',
            }}>{icon}</button>
          ))}
        </div>

        <button onClick={() => load(periodIdx)} disabled={loading}
          style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-muted)' }}
          title="Atualizar">
          <RefreshCw size={15} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Period selector */}
      <div style={{ padding: '12px 28px', display: 'flex', gap: 8, flexShrink: 0, borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)' }}>
        {PERIODS.map((p, i) => (
          <button key={i} onClick={() => setPeriodIdx(i)} style={{
            padding: '5px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: i === periodIdx ? 700 : 400,
            background: i === periodIdx ? 'var(--theme-primary)' : 'transparent',
            color: i === periodIdx ? 'var(--theme-primary-text)' : 'var(--theme-text-secondary)',
            border: i === periodIdx ? 'none' : '1px solid var(--theme-border)',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>
        {loading && !data && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--theme-text-muted)', fontSize: 14 }}>
            Carregando...
          </div>
        )}
        {error && <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>}
        {!error && !loading && data?.agents?.length === 0 && (
          <div style={{ color: 'var(--theme-text-muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>Nenhum dado para o período selecionado.</div>
        )}
        {!error && data?.agents?.length > 0 && viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
            {data.agents.map(row => <AgentCard key={row.agent.id} data={{ ...row, slaTargetSeconds: data.slaTargetSeconds }} />)}
          </div>
        )}
        {!error && data?.agents?.length > 0 && viewMode === 'table' && (
          <ReportsTable agents={data.agents} slaTargetSeconds={data.slaTargetSeconds} />
        )}
      </div>
    </div>
  );
}
