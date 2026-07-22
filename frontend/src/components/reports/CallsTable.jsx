import { fmtDuration } from './funnelFormat';

const STATUS_STYLE = {
  RINGING:  { bg: 'var(--theme-primary-subtle)', color: 'var(--theme-primary)', label: 'Tocando' },
  ANSWERED: { bg: '#f0fdf4', color: '#15803d', label: 'Atendida' },
  MISSED:   { bg: '#fef2f2', color: '#dc2626', label: 'Perdida' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejeitada' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.MISSED;
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const TH = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--theme-border)', whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', fontSize: 12.5, color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' };

export default function CallsTable({ calls, loading }) {
  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Carregando...</div>;
  if (!calls?.length) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma chamada registrada no período.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Cliente</th>
            <th style={TH}>ID interno</th>
            <th style={TH}>Número</th>
            <th style={TH}>Horário</th>
            <th style={TH}>Status</th>
            <th style={TH}>Duração</th>
          </tr>
        </thead>
        <tbody>
          {calls.map(c => (
            <tr key={c.id}>
              <td style={TD}>{c.contact?.name || <span style={{ color: 'var(--theme-text-muted)' }}>Sem contato vinculado</span>}</td>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.contact?.id || '—'}</span></td>
              <td style={TD}>{c.phone || '—'}</td>
              <td style={TD}>{new Date(c.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
              <td style={TD}><StatusBadge status={c.status} /></td>
              <td style={TD}>{c.status === 'ANSWERED' ? fmtDuration(c.durationSeconds) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
