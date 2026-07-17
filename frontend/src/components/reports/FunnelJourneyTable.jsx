import { fmtDuration, fmtMoney } from './funnelFormat';

const STATUS_STYLE = {
  OPEN:  { bg: 'var(--theme-primary-subtle)', color: 'var(--theme-primary)', label: 'Em andamento' },
  WON:   { bg: '#f0fdf4', color: '#15803d', label: 'Convertido' },
  LOST:  { bg: '#fef2f2', color: '#dc2626', label: 'Perdido' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.OPEN;
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const TH = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--theme-border)', whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', fontSize: 12.5, color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' };

export default function FunnelJourneyTable({ deals, loading }) {
  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Carregando...</div>;
  if (!deals?.length) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhum contato no funil para o período.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Contato</th>
            <th style={TH}>Negócio</th>
            <th style={TH}>Estágio atual</th>
            <th style={TH}>Status</th>
            <th style={TH}>Tempo no estágio</th>
            <th style={TH}>Tempo total</th>
            <th style={TH}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(d => (
            <tr key={d.id}>
              <td style={TD}>{d.contact?.name || d.contact?.phone || <span style={{ color: 'var(--theme-text-muted)' }}>Sem contato vinculado</span>}</td>
              <td style={TD}>{d.title}</td>
              <td style={TD}>{d.stageName}</td>
              <td style={TD}><StatusBadge status={d.status} /></td>
              <td style={TD}>{d.status === 'OPEN' ? fmtDuration(d.timeInCurrentStageSeconds) : '—'}</td>
              <td style={TD}>{fmtDuration(d.totalAgeSeconds)}</td>
              <td style={TD}>{fmtMoney(d.value, d.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
