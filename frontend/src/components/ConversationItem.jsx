import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Sticker, Pin, ChevronDown } from 'lucide-react';
import { formatTime, getInitials, getAvatarColor } from '../utils/format';

export default function ConversationItem({ conv, selected, onClick, onPin }) {
  const name    = conv.contact?.name || conv.contact?.phone || 'Desconhecido';
  const hasNew  = conv.unreadCount > 0;
  const [hovered, setHovered]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinAnim, setPinAnim]   = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handlePin = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setPinAnim(true);
    setTimeout(() => setPinAnim(false), 800);
    onPin(conv.id);
  };

  const bg     = selected ? 'var(--theme-primary-subtle)' : hasNew ? 'var(--theme-primary-subtle)' : 'transparent';
  const border = selected || hasNew ? 'var(--theme-primary)' : conv.pinned ? 'var(--theme-primary)' : 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: bg, borderLeft: `3px solid ${border}`, borderBottom: '1px solid var(--theme-border)', transition: 'background 0.1s', boxShadow: hasNew && !selected ? 'inset 3px 0 20px -2px var(--theme-primary)' : 'none' }}
    >
      <style>{`
        @keyframes pinOverlay {
          0%   { opacity: 0; }
          20%  { opacity: 0.32; }
          70%  { opacity: 0.32; }
          100% { opacity: 0; }
        }
        @keyframes pinIconAnim {
          0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          28%  { opacity: 1; transform: scale(1.15) rotate(6deg); }
          65%  { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(0.85); }
        }
      `}</style>

      {pinAnim && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--theme-primary)', animation: 'pinOverlay 0.8s ease-in-out forwards' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pinIconAnim 0.8s ease-in-out forwards' }}>
            <Pin size={28} style={{ color: '#fff', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
          </div>
        </div>
      )}

      {conv.pinned && (
        <Pin size={10} style={{ position: 'absolute', top: 5, left: 8, color: 'var(--theme-primary)', display: 'block', zIndex: 5 }} />
      )}

      <div style={{ width: 44, height: 44, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 15, flexShrink: 0, opacity: pinAnim ? 0 : 1, transition: 'opacity 0.15s' }}>
        {getInitials(name)}
      </div>

      <div style={{ flex: 1, minWidth: 0, opacity: pinAnim ? 0 : 1, transition: 'opacity 0.15s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: hasNew ? 700 : 600, fontSize: 14, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: 11, color: hasNew ? 'var(--theme-primary)' : 'var(--theme-text-muted)', fontWeight: hasNew ? 700 : 400, flexShrink: 0, marginLeft: 4, opacity: hovered ? 0 : 1, transition: 'opacity 0.15s' }}>
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 13, color: hasNew ? 'var(--theme-text)' : 'var(--theme-text-secondary)', fontWeight: hasNew ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%', display: 'flex', alignItems: 'center', gap: 4 }}>
            {conv.lastMessageDirection === 'OUTBOUND'
              ? <ArrowUp size={12} strokeWidth={2.5} style={{ flexShrink: 0, color: 'var(--theme-primary)' }} />
              : <ArrowDown size={12} strokeWidth={2.5} style={{ flexShrink: 0, color: '#F59E0B' }} />
            }
            {conv.lastMessage === 'Sticker'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Sticker size={12} strokeWidth={1.8} style={{ flexShrink: 0 }} />Sticker</span>
              : (conv.lastMessage || '—')
            }
          </span>
          {hasNew && (
            <span style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{conv.unreadCount}</span>
          )}
        </div>
      </div>

      {hovered && onPin && (
        <div ref={menuRef} style={{ position: 'absolute', top: 6, right: 8, zIndex: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--theme-bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-muted)', boxShadow: '0 1px 4px rgba(0,0,0,0.14)', transition: 'background 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--theme-bg-secondary)'; }}
          >
            <ChevronDown size={13} strokeWidth={2.5} style={{ transition: 'transform 0.15s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 26, right: 0, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
              <button
                onClick={handlePin}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', color: conv.pinned ? 'var(--theme-primary)' : 'var(--theme-text)', fontSize: 13, fontFamily: 'inherit', textAlign: 'left', fontWeight: conv.pinned ? 600 : 400 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <Pin size={13} style={{ color: conv.pinned ? 'var(--theme-primary)' : 'var(--theme-text-muted)', flexShrink: 0 }} />
                {conv.pinned ? 'Remover fixação' : 'Fixar conversa'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
