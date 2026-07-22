import { fmtDuration } from './funnelFormat';

const TH = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--theme-border)', whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', fontSize: 12.5, color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)', verticalAlign: 'top' };

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
}

export default function ConversationsTable({ conversations, loading }) {
  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Carregando...</div>;
  if (!conversations?.length) return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 13 }}>Nenhuma conversa finalizada no período.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>ID</th>
            <th style={TH}>Contato</th>
            <th style={TH}>Canal</th>
            <th style={TH}>Origem</th>
            <th style={TH}>Aberta em</th>
            <th style={TH}>Fechada em</th>
            <th style={TH}>Duração</th>
            <th style={TH}>Motivo</th>
            <th style={TH}>Fechou</th>
            <th style={TH}>Mensagens</th>
            <th style={TH}>Atendentes envolvidos</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map(c => (
            <tr key={c.id}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 11 }} title={c.id}>{c.id.slice(0, 8)}</span></td>
              <td style={TD}>{c.contact?.name || c.contact?.phone || <span style={{ color: 'var(--theme-text-muted)' }}>Sem contato</span>}</td>
              <td style={TD}>{c.channelPhone || '—'}</td>
              <td style={TD}>{c.initiatedBy === 'NOS' ? 'Nós' : 'Cliente'}</td>
              <td style={TD}>{fmtDate(c.openedAt)}</td>
              <td style={TD}>{fmtDate(c.resolvedAt)}</td>
              <td style={TD}>{fmtDuration(c.durationSeconds)}</td>
              <td style={TD}>{c.resolutionReasonLabel || <span style={{ color: 'var(--theme-text-muted)' }}>Sem motivo</span>}</td>
              <td style={TD}>{c.resolvedByAgentName || '—'}</td>
              <td style={TD}>
                <div style={{ fontWeight: 600 }}>{c.totalMessages} total</div>
                <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{c.messagesFromClient} cliente · {c.messagesFromAgents} agente</div>
              </td>
              <td style={TD}>
                {c.agentBreakdown.length === 0 && '—'}
                {c.agentBreakdown.length === 1 && c.agentBreakdown[0].name}
                {c.multipleAgents && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {c.agentBreakdown.map(a => (
                      <span key={a.agentId} style={{ fontSize: 11.5 }}>{a.name}: <strong>{a.count}</strong> msg{a.count !== 1 ? 's' : ''}</span>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
