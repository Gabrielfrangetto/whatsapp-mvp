import { Clock, MessageSquare, CheckCircle, Zap, Users, ArrowRightLeft, RotateCcw, ShieldCheck, TrendingUp } from 'lucide-react';
import { getInitials } from '../../utils/format';
import PeakChart from './PeakChart';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

function formatDuration(s) {
  if (s === null || s === undefined) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatMinutes(min) {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function pct(val) { return val === null || val === undefined ? '—' : `${val}%`; }

function AgentAvatar({ name, color, avatarUrl, size = 42 }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px', borderRadius: 10, background: highlight ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-tertiary)', border: highlight ? '1px solid var(--theme-primary)' : '1px solid transparent', flex: 1, minWidth: 0 }}>
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

function QualityCard({ icon, label, iconColor, value, bar, barColor, sub, highlight }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, background: highlight ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-tertiary)', border: highlight ? '1px solid var(--theme-primary)' : '1px solid transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: iconColor }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text)', lineHeight: 1 }}>{value}</div>
      {bar !== undefined && <RateBar value={bar} color={barColor} />}
      {sub && <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function AgentCard({ data, bests = {} }) {
  const { agent, chatsReceived, messagesSent, firstResponseTimeAvg, resolutionTimeAvg, avgResponseTime, fcrRate, reopenRate, slaComplianceRate, slaTargetSeconds, transfersOut, transferOutRate, chatsPerHour, statusDistributionMinutes, onlineMinutes, peakHours } = data;
  const isBest = (key) => bests[key] === agent.id;

  return (
    <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 16, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
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
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Volume</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat icon={<Users size={12} />} label="Chats recebidos" value={chatsReceived} sub="fluxo automático" color="var(--theme-primary)" highlight={isBest('chatsReceived')} />
            <Stat icon={<MessageSquare size={12} />} label="Msgs enviadas" value={messagesSent} color="#6366f1" highlight={isBest('messagesSent')} />
            <Stat icon={<ArrowRightLeft size={12} />} label="Transferências" value={transfersOut} sub={pct(transferOutRate) !== '—' ? `${pct(transferOutRate)} dos recebidos` : undefined} color="#f59e0b" highlight={isBest('transfersOut')} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tempos</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat icon={<Zap size={12} />} label="1ª resposta" value={formatDuration(firstResponseTimeAvg)} color="#f59e0b" highlight={isBest('firstResponseTimeAvg')} />
            <Stat icon={<Clock size={12} />} label="Resp. geral" value={formatDuration(avgResponseTime)} color="#3b82f6" highlight={isBest('avgResponseTime')} />
            <Stat icon={<CheckCircle size={12} />} label="Resolução" value={formatDuration(resolutionTimeAvg)} color="#10b981" highlight={isBest('resolutionTimeAvg')} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Qualidade</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <QualityCard icon={<ShieldCheck size={12} />} iconColor="#10b981" label="FCR" value={pct(fcrRate)} bar={fcrRate} barColor="#10b981" sub="Resolução no 1º contato" highlight={isBest('fcrRate')} />
            <QualityCard icon={<TrendingUp size={12} />} iconColor="#3b82f6" label="SLA" value={pct(slaComplianceRate)} bar={slaComplianceRate} barColor="#3b82f6" sub={`1ª resp. em ${Math.round(slaTargetSeconds / 60)}min`} highlight={isBest('slaComplianceRate')} />
            <QualityCard icon={<RotateCcw size={12} />} iconColor="#f59e0b" label="Reabertura" value={pct(reopenRate)} bar={reopenRate} barColor="#f59e0b" sub="Clientes que voltaram" highlight={isBest('reopenRate')} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Disponibilidade{onlineMinutes > 0 && <span style={{ fontWeight: 400, marginLeft: 6 }}>· {formatMinutes(onlineMinutes)} online</span>}
          </div>
          <StatusBar dist={statusDistributionMinutes} />
        </div>

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
