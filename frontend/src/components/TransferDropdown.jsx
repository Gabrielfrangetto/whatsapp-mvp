import { useState, useRef, useEffect } from 'react';
import { UserCheck, ChevronDown, Check } from 'lucide-react';

function AgentInitials({ name, color, avatarUrl, size = 24 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return avatarUrl
    ? <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>{initials}</div>;
}

export default function TransferDropdown({ agents, currentAgentId, onTransfer, disabled }) {
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = async (agentId) => {
    if (agentId === currentAgentId) { setOpen(false); return; }
    setTransferring(true);
    setOpen(false);
    try { await onTransfer(agentId); } finally { setTransferring(false); }
  };

  const current = agents.find(a => a.id === currentAgentId);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled || transferring}
        title={disabled ? 'Sem permissão para transferir' : 'Transferir atendimento'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none',
          borderRadius: 8, padding: '6px 10px', cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, color: 'var(--theme-text-secondary)',
          opacity: disabled || transferring ? 0.5 : 1, transition: 'opacity 0.15s',
        }}
      >
        {current
          ? <AgentInitials name={current.name} color={current.avatarColor} avatarUrl={current.avatarUrl} size={20} />
          : <UserCheck size={14} />}
        <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transferring ? 'Transferindo...' : current ? current.name : 'Transferir'}
        </span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400,
          background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: 200, maxHeight: 280, overflowY: 'auto', padding: '4px 0',
        }}>
          {agents.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--theme-text-secondary)' }}>Nenhum agente disponível</div>
          )}
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => handleSelect(a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
                color: 'var(--theme-text)', fontSize: 13,
                backgroundColor: a.id === currentAgentId ? 'var(--theme-bg-hover, rgba(0,0,0,0.06))' : 'transparent',
              }}
              onMouseEnter={e => { if (a.id !== currentAgentId) e.currentTarget.style.backgroundColor = 'var(--theme-bg-hover, rgba(0,0,0,0.06))'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = a.id === currentAgentId ? 'var(--theme-bg-hover, rgba(0,0,0,0.06))' : 'transparent'; }}
            >
              <AgentInitials name={a.name} color={a.avatarColor} avatarUrl={a.avatarUrl} size={26} />
              <span style={{ flex: 1, fontWeight: a.id === currentAgentId ? 600 : 400 }}>{a.name}</span>
              {a.id === currentAgentId && <Check size={13} style={{ color: 'var(--theme-primary)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
