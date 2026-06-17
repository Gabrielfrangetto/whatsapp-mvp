export default function DateSeparator({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0 6px' }}>
      <div style={{ background: 'var(--theme-bg-bubble-in)', color: 'var(--theme-text-secondary)', fontSize: 12, fontWeight: 500, padding: '4px 14px', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        {label}
      </div>
    </div>
  );
}
