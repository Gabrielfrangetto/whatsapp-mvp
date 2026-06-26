import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Inbox as InboxIcon, MessageSquareMore, Users, Settings as SettingsIcon, LogOut, BarChart2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getInitials } from '../utils/format';

export const STATUS_META = {
  ONLINE:  { color: '#4ade80', label: 'Online' },
  BUSY:    { color: '#fbbf24', label: 'Ocupado' },
  OFFLINE: { color: '#6b7280', label: 'Offline' },
};

function NavRailButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 44, height: 44, borderRadius: 10,
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {icon}
    </button>
  );
}

export default function NavRail({ section, onSection, agent, agentStatus = 'ONLINE', onStatusChange, onSettings, onLogout }) {
  const { color, mode } = useTheme();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e) => { if (!statusRef.current?.contains(e.target)) setStatusOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusOpen]);

  const navBg = (() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const offset = mode === 'dark' ? 75 : 55;
    return `rgb(${Math.max(0, r - offset)},${Math.max(0, g - offset)},${Math.max(0, b - offset)})`;
  })();

  return (
    <div style={{ width: 64, background: navBg, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 2, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.3)', zIndex: 10 }}>

      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-primary-text)', marginBottom: 8, flexShrink: 0 }}>
        <MessageSquare size={20} />
      </div>

      <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 1, marginBottom: 8, flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <NavRailButton icon={<InboxIcon size={20} />} label="Inbox" active={section === 'inbox'} onClick={() => onSection('inbox')} />
        <NavRailButton icon={<MessageSquareMore size={20} />} label="Meus" active={section === 'mine'} onClick={() => onSection('mine')} />
        <NavRailButton icon={<BarChart2 size={20} />} label="Relatórios" active={section === 'reports'} onClick={() => onSection('reports')} />
        {agent?.role === 'ADMIN' && (
          <NavRailButton icon={<Users size={20} />} label="Agentes" active={section === 'agents'} onClick={() => onSection('agents')} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <NavRailButton icon={<SettingsIcon size={20} />} label="Configurações" onClick={onSettings} />
        <NavRailButton icon={<LogOut size={18} />} label="Sair" onClick={onLogout} />
        <div style={{ width: 1, height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 1, margin: '2px 0' }} />
        <div ref={statusRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setStatusOpen(v => !v)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: agent?.avatarColor || 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-primary-text)', fontWeight: 700, fontSize: 13, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
            title={`${agent?.name} • ${STATUS_META[agentStatus]?.label}`}
          >
            {agent?.avatarUrl
              ? <img src={agent.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(agent?.name || '')
            }
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: STATUS_META[agentStatus]?.color, border: `2px solid ${navBg}`, pointerEvents: 'none' }} />

          {statusOpen && (
            <div style={{ position: 'absolute', bottom: 0, left: 48, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 100, minWidth: 140, overflow: 'hidden' }}>
              {Object.entries(STATUS_META).map(([key, { color: dotColor, label }]) => (
                <button
                  key={key}
                  onClick={() => { onStatusChange(key); setStatusOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: 'none', background: key === agentStatus ? 'var(--theme-bg-hover)' : 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--theme-text)', fontWeight: key === agentStatus ? 600 : 400 }}
                  onMouseEnter={e => { if (key !== agentStatus) e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                  onMouseLeave={e => { if (key !== agentStatus) e.currentTarget.style.background = 'none'; }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
