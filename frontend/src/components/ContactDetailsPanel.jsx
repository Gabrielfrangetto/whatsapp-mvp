import { Phone, Calendar, MessageSquare, User, Pin } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatTime, getInitials, getAvatarColor } from '../utils/format';

function AgentAvatar({ name, color, avatarUrl, size = 32 }) {
  const bg = color || 'var(--theme-primary)';
  const fallbackStyle = { width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.34, lineHeight: 1, flexShrink: 0 };
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}${avatarUrl}`;
    return (
      <>
        <img src={src} alt={name} title={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <div title={name} style={{ ...fallbackStyle, display: 'none' }}>{getInitials(name)}</div>
      </>
    );
  }
  return <div title={name} style={fallbackStyle}>{getInitials(name)}</div>;
}

export default function ContactDetailsPanel({ conv }) {
  if (!conv) {
    return (
      <div style={{ width: 260, background: 'var(--theme-bg-sidebar)', borderLeft: '1px solid var(--theme-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px', flexShrink: 0 }}>
        <User size={44} style={{ opacity: .18, color: 'var(--theme-text)' }} />
        <p style={{ color: 'var(--theme-text-muted)', fontSize: 13, textAlign: 'center', margin: 0, lineHeight: 1.7 }}>
          Selecione uma conversa para ver os detalhes do contato
        </p>
      </div>
    );
  }

  const name  = conv.contact?.name || conv.contact?.phone || 'Desconhecido';
  const phone = conv.contact?.phone;

  return (
    <div style={{ width: 260, background: 'var(--theme-bg-sidebar)', borderLeft: '1px solid var(--theme-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

      <div style={{ padding: '28px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--theme-border)' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 24 }}>
          {getInitials(name)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text)' }}>{name}</div>
          {phone && (
            <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Phone size={11} />
              {phone}
            </div>
          )}
        </div>
        <StatusBadge status={conv.status} />
      </div>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conversa</div>

        {conv.createdAt && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Calendar size={15} style={{ color: 'var(--theme-text-muted)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Iniciada em</div>
              <div style={{ fontSize: 13, color: 'var(--theme-text-secondary)', marginTop: 2 }}>
                {new Date(conv.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        )}

        {conv.lastMessageAt && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <MessageSquare size={15} style={{ color: 'var(--theme-text-muted)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Última atividade</div>
              <div style={{ fontSize: 13, color: 'var(--theme-text-secondary)', marginTop: 2 }}>
                {formatTime(conv.lastMessageAt)}
              </div>
            </div>
          </div>
        )}

        {conv.assignedAgent && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Atendente</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AgentAvatar name={conv.assignedAgent.name} color={conv.assignedAgent.avatarColor} avatarUrl={conv.assignedAgent.avatarUrl} size={32} />
              <div>
                <div style={{ fontSize: 13, color: 'var(--theme-text)', fontWeight: 600 }}>{conv.assignedAgent.name}</div>
                <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Responsável</div>
              </div>
            </div>
          </>
        )}

        {conv.pinnedBy?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pin size={10} />
              Fixado por
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conv.pinnedBy.map(agent => (
                <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AgentAvatar name={agent.name} color={agent.avatarColor} avatarUrl={agent.avatarUrl} size={28} />
                  <div style={{ fontSize: 13, color: 'var(--theme-text-secondary)', fontWeight: 500 }}>{agent.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
