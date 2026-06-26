import { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw, Clock, MessageSquare, CheckCircle, Zap, Users } from 'lucide-react';
import { api } from '../context/AuthContext';
import { getInitials } from '../utils/format';

const PERIODS = [
  { label: 'Hoje',       days: 0 },
  { label: '7 dias',     days: 7 },
  { label: '30 dias',    days: 30 },
  { label: '90 dias',    days: 90 },
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

function AgentAvatar({ name, color, avatarUrl, size = 40 }) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';
  const bg = color || 'var(--theme-primary)';
  const fallback = (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {getInitials(name || '?')}
    </div>
  );
  if (!avatarUrl) return fallback;
  const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
  return (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none'; }} />
  );
}

function MetricCard({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, padding: '12px 8px', borderRadius: 10, background: 'var(--theme-bg-tertiary)' }}>
      <div style={{ color: color || 'var(--theme-primary)', opacity: 0.85 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function AgentCard({ data }) {
  const { agent, chatsReceived, messagesSent, firstResponseTimeAvg, resolutionTimeAvg, avgResponseTime } = data;
  return (
    <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid var(--theme-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AgentAvatar name={agent.name} color={agent.avatarColor} avatarUrl={agent.avatarUrl} size={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text)' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 2 }}>
            {agent.role === 'ADMIN' ? 'Admin' : 'Agente'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <MetricCard
          icon={<Users size={16} />}
          label="Chats recebidos"
          value={chatsReceived}
        />
        <MetricCard
          icon={<MessageSquare size={16} />}
          label="Msgs enviadas"
          value={messagesSent}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <MetricCard
          icon={<Zap size={16} />}
          label="1ª resposta"
          value={formatDuration(firstResponseTimeAvg)}
          color="#f59e0b"
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Resp. geral"
          value={formatDuration(avgResponseTime)}
          color="#3b82f6"
        />
        <MetricCard
          icon={<CheckCircle size={16} />}
          label="Resolução"
          value={formatDuration(resolutionTimeAvg)}
          color="#10b981"
        />
      </div>
    </div>
  );
}

export default function Reports() {
  const [periodIdx, setPeriodIdx] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);

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
      }
      const res = await api.get(`/reports?from=${from.toISOString()}&to=${to.toISOString()}`);
      setData(res.data);
    } catch (e) {
      setError('Erro ao carregar relatório.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(periodIdx); }, [periodIdx, load]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg)', minWidth: 0, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <BarChart2 size={22} style={{ color: 'var(--theme-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--theme-text)' }}>Relatórios</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 1 }}>Desempenho por agente</div>
        </div>
        <button
          onClick={() => load(periodIdx)}
          disabled={loading}
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-muted)' }}
          title="Atualizar"
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Period selector */}
      <div style={{ padding: '14px 28px', display: 'flex', gap: 8, flexShrink: 0 }}>
        {PERIODS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPeriodIdx(i)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: i === periodIdx ? 700 : 400,
              background: i === periodIdx ? 'var(--theme-primary)' : 'var(--theme-bg-secondary)',
              color: i === periodIdx ? 'var(--theme-primary-text)' : 'var(--theme-text-secondary)',
              border: i === periodIdx ? 'none' : '1px solid var(--theme-border)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >{p.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 28px 28px', overflowY: 'auto' }}>
        {error && (
          <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>
        )}

        {!error && !loading && data?.agents?.length === 0 && (
          <div style={{ color: 'var(--theme-text-muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
            Nenhum dado para o período selecionado.
          </div>
        )}

        {!error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, paddingTop: 4 }}>
            {(data?.agents || []).map(row => (
              <AgentCard key={row.agent.id} data={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
