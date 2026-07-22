import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Timer, MessageCircle, Users } from 'lucide-react';
import { api } from '../../context/AuthContext';
import ClosingReasonsChart from './ClosingReasonsChart';
import AssignmentPieChart from './AssignmentPieChart';
import ConversationsTable from './ConversationsTable';
import { fmtDuration } from './funnelFormat';

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

export default function ConversationsReport({ from, to }) {
  const [report, setReport] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListLoading(true);
    setError(null);
    try {
      const params = `from=${from.toISOString()}&to=${to.toISOString()}`;
      const [reportRes, listRes] = await Promise.all([
        api.get(`/reports/conversations?${params}`),
        api.get(`/reports/conversations/list?${params}&limit=150`),
      ]);
      setReport(reportRes.data);
      setConversations(listRes.data.conversations || []);
    } catch {
      setError('Erro ao carregar o relatório de conversas.');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--theme-text-muted)', fontSize: 14 }}>Carregando...</div>;
  }

  if (error) return <div style={{ color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</div>;

  const { summary, closingReasons, autoAssignments } = report || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard icon={<CheckCircle2 size={14} />} label="Conversas finalizadas" value={summary?.totalResolved ?? '—'} color="#16a34a" />
        <KpiCard icon={<Timer size={14} />} label="Duração média até o fechamento" value={fmtDuration(summary?.avgDurationSeconds)} />
        <KpiCard icon={<MessageCircle size={14} />} label="Mensagens por conversa (média)" value={summary?.avgMessagesPerConversation ?? '—'} />
        <KpiCard icon={<Users size={14} />} label="Conversas com +1 atendente" value={summary?.multiAgentCount ?? '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 16 }}>Motivos de fechamento</div>
          <ClosingReasonsChart reasons={closingReasons} />
        </div>

        <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 16 }}>Chats atribuídos automaticamente por atendente</div>
          <AssignmentPieChart data={autoAssignments} />
        </div>
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', padding: '16px 20px 4px' }}>Conversas finalizadas</div>
        <ConversationsTable conversations={conversations} loading={listLoading} />
      </div>
    </div>
  );
}
