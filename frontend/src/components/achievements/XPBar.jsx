export default function XPBar({ xp }) {
  const pct = Math.round((xp.xpIntoLevel / xp.xpForNextLevel) * 100);
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Nível {xp.level}</span>
        <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{xp.xpIntoLevel}/{xp.xpForNextLevel} XP</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--theme-primary)', borderRadius: 4, transition: 'width 0.3s ease-out' }} />
      </div>
    </div>
  );
}
