import { getInitials, formatMsgTime } from '../utils/format';

function AgentAvatar({ name, color, avatarUrl, size = 26 }) {
  const bg = color || '#25D366';
  const fallbackStyle = { width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 700, lineHeight: 1, flexShrink: 0, userSelect: 'none' };
  if (avatarUrl) {
    return (
      <>
        <img
          src={avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}${avatarUrl}`}
          alt={name}
          title={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
        <div title={name} style={{ ...fallbackStyle, display: 'none' }}>
          {getInitials(name || 'A')}
        </div>
      </>
    );
  }
  return (
    <div title={name} style={fallbackStyle}>
      {getInitials(name || 'A')}
    </div>
  );
}

function ReactionBubble({ reactions, isOut }) {
  if (!reactions) return null;
  const entries = Object.values(reactions);
  if (entries.length === 0) return null;

  const counts = entries.reduce((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOut ? 'flex-start' : 'flex-end',
      gap: 2,
      marginTop: 3,
    }}>
      {Object.entries(counts).map(([emoji, count]) => (
        <span key={emoji} style={{
          background: 'var(--theme-bg)',
          border: '1px solid var(--theme-border)',
          borderRadius: 10,
          padding: '3px 6px',
          fontSize: 13,
          lineHeight: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
        }}>
          {emoji}{count > 1 ? <span style={{ fontSize: 11, color: 'var(--theme-text-secondary)', lineHeight: 1 }}>{count}</span> : ''}
        </span>
      ))}
    </div>
  );
}

function Ticks({ status }) {
  const color = status === 'READ' ? '#53bdeb' : 'var(--theme-text-muted)';
  if (status === 'FAILED') return <span style={{ fontSize: 12, color: '#ef4444' }}>✗</span>;
  if (status === 'DELIVERED' || status === 'READ') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', color }}>
      <span style={{ fontSize: 12 }}>✓</span>
      <span style={{ fontSize: 12, marginLeft: -5 }}>✓</span>
    </span>
  );
  if (status === 'SENT') return <span style={{ fontSize: 12, color }}>✓</span>;
  return null;
}

export default function MessageBubble({ message, showAvatar, showAgentName }) {
  const isOut      = message.direction === 'OUTBOUND';
  const isInternal = message.direction === 'INTERNAL' || message.type === 'INTERNAL';
  const isImage    = (message.type === 'IMAGE' && message.mediaUrl) || (message.content === '🎭 Sticker' && message.mediaUrl);
  const API_URL    = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

  if (isInternal) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div style={{ background: 'var(--theme-primary-subtle)', border: '1px solid var(--theme-primary-subtle)', borderRadius: 10, padding: '10px 14px', maxWidth: '80%', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-primary-text)', fontSize: 11, fontWeight: 700, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
            {getInitials(message.agentName || 'A')}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message.content}</p>
            <span style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 3, display: 'block' }}>{formatMsgTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  const bubble = (
    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)', borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: isImage ? '4px 4px 5px' : '8px 12px 5px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      {showAgentName && message.agentName && (
        <div style={{ fontSize: 11, fontWeight: 700, color: message.agentColor || 'var(--theme-primary)', marginBottom: 3, whiteSpace: 'nowrap' }}>
          {message.agentName}
        </div>
      )}
      {isImage && (
        <img
          src={`${API_URL}/api/media/${message.mediaUrl}`}
          alt="imagem"
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }}
          onClick={() => window.open(`${API_URL}/api/media/${message.mediaUrl}`, '_blank')}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      {isImage && message.direction === 'INBOUND' && (
        <a
          href={`${API_URL}/api/media/${message.mediaUrl}`}
          download target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--theme-text-muted)', textDecoration: 'none', padding: '4px 8px', marginTop: 2, borderRadius: 6, background: 'rgba(0,0,0,0.04)', width: 'fit-content', marginLeft: 'auto', marginRight: 4 }}
        >
          ⬇ Salvar
        </a>
      )}
      <p style={{ margin: isImage ? '4px 8px 0' : 0, fontSize: 14, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', lineHeight: 1.5, wordBreak: 'break-word', display: isImage && (message.content === '📷 Imagem' || message.content === '' || message.content === 'Sticker') ? 'none' : 'block' }}>
        {message.content}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2, padding: isImage ? '0 8px' : 0 }}>
        <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{formatMsgTime(message.timestamp)}</span>
        {isOut && <Ticks status={message.status} />}
      </div>
    </div>
    <ReactionBubble reactions={message.reactions} isOut={isOut} />
    </div>
  );

  if (isOut) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
        {bubble}
        <div style={{ width: 26, flexShrink: 0 }}>
          {showAvatar && (
            <AgentAvatar
              name={message.agentName}
              color={message.agentColor}
              avatarUrl={message.agentAvatarUrl}
              size={26}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 2 }}>
      {bubble}
    </div>
  );
}
