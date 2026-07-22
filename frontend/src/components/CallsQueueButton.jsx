import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

function elapsed(startedAt) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallsQueueButton({ calls, navBg }) {
  const [open, setOpen] = useState(false);
  const [, forceTick] = useState(0);
  const ref = useRef(null);
  const count = calls.length;

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Chamadas de voz tocando"
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: open ? 'rgba(255,255,255,0.18)' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#fff' : 'rgba(255,255,255,0.5)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Phone size={20} style={count > 0 ? { animation: 'call-ring 1s ease-in-out infinite' } : undefined} />
          {count > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -8, background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 4px', fontSize: 9, fontWeight: 700, border: `2px solid ${navBg}`, lineHeight: '13px', minWidth: 14, textAlign: 'center', pointerEvents: 'none' }}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 0, left: 48, zIndex: 200,
          background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)',
          borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 240, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
            {count > 0 ? `${count} chamada${count > 1 ? 's' : ''} tocando` : 'Nenhuma chamada no momento'}
          </div>
          {calls.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: 13, color: 'var(--theme-text)' }}>
              <Phone size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.contact?.name || c.phone}
              </div>
              <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', flexShrink: 0 }}>{elapsed(c.startedAt)}</div>
            </div>
          ))}
          {count === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px', fontSize: 12, color: 'var(--theme-text-muted)' }}>
              <PhoneOff size={14} />
              Sem tentativas de ligação agora
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes call-ring { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }`}</style>
    </div>
  );
}
