import { useEffect } from 'react';

const AUTO_DISMISS_MS = 6000;

export default function AchievementToast({ achievement, index, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', right: 20, bottom: 20 + index * 84, zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', width: 320,
        background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)',
        borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.28)', cursor: 'pointer',
        animation: 'achievement-toast-in 0.25s ease-out',
      }}
    >
      <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{achievement.icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Conquista desbloqueada!</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text)', marginTop: 2 }}>{achievement.title}</div>
        <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{achievement.description}</div>
      </div>
      <style>{`@keyframes achievement-toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}
