export default function TypingIndicator({ name }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
      <div style={{ background: 'var(--theme-bg-bubble-in)', borderRadius: '0 12px 12px 12px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--theme-text-secondary)' }}>{name} está digitando</span>
        <span style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--theme-text-muted)', display: 'inline-block', animation: `bounce 1s ${i * 0.2}s infinite` }} />
          ))}
        </span>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
