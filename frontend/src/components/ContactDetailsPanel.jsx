import { useState, useRef, useEffect } from 'react';
import { Phone, Calendar, MessageSquare, User, Pin, Pencil, Check, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatTime, getInitials, getAvatarColor } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

function AgentAvatar({ name, color, avatarUrl, size = 32 }) {
  const bg = color || 'var(--theme-primary)';
  const fallbackStyle = { width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.34, lineHeight: 1, flexShrink: 0 };
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
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

export default function ContactDetailsPanel({ conv, onContactUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

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

  function startEdit() {
    setEditName(name);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditName('');
  }

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === name) { cancelEdit(); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/contacts/${conv.contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      onContactUpdate?.(conv.contact.id, trimmed);
      setEditing(false);
    } catch {
      // silently revert on error
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <div style={{ width: 260, background: 'var(--theme-bg-sidebar)', borderLeft: '1px solid var(--theme-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

      <div style={{ padding: '28px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--theme-border)' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 24 }}>
          {getInitials(name)}
        </div>

        <div style={{ textAlign: 'center', width: '100%' }}>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <input
                ref={inputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={saving}
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text)', background: 'var(--theme-bg)', border: '1px solid var(--theme-primary)', borderRadius: 6, padding: '3px 7px', width: 130, outline: 'none', textAlign: 'center' }}
              />
              <button onClick={saveEdit} disabled={saving} title="Salvar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-primary)', padding: 2, display: 'flex' }}>
                <Check size={15} />
              </button>
              <button onClick={cancelEdit} disabled={saving} title="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', padding: 2, display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text)' }}>{name}</div>
              <button onClick={startEdit} title="Editar nome" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', padding: 2, display: 'flex', opacity: 0.6 }}>
                <Pencil size={13} />
              </button>
            </div>
          )}
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
