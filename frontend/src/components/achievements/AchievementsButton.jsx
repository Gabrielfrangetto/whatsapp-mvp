import { useState, useRef, useEffect } from 'react';
import { Trophy } from 'lucide-react';

export default function AchievementsButton({ achievements, unseenCount, onOpen, navBg }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unlocked = achievements.filter(a => a.unlocked).sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    setOpen(o => !o);
    if (!open && unseenCount > 0) onOpen(unlocked.filter(a => !a.seenAt).map(a => a.key));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        title="Conquistas"
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
          <Trophy size={20} />
          {unseenCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -8, background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', borderRadius: 20, padding: '1px 4px', fontSize: 9, fontWeight: 700, border: `2px solid ${navBg}`, lineHeight: '13px', minWidth: 14, textAlign: 'center', pointerEvents: 'none' }}>
              {unseenCount > 99 ? '99+' : unseenCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 0, left: 48, zIndex: 200,
          background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)',
          borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 280, maxHeight: 360, overflowY: 'auto',
        }}>
          <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)', position: 'sticky', top: 0, background: 'var(--theme-bg-secondary)' }}>
            {unlocked.length > 0 ? `${unlocked.length} conquista${unlocked.length > 1 ? 's' : ''} desbloqueada${unlocked.length > 1 ? 's' : ''}` : 'Nenhuma conquista ainda'}
          </div>
          {unlocked.map(a => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--theme-border)' }}>
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{a.description}</div>
              </div>
            </div>
          ))}
          {unlocked.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--theme-text-muted)' }}>
              Continue atendendo para desbloquear suas primeiras conquistas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
