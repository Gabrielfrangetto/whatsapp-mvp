export default function StatusBadge({ status }) {
  const map = {
    OPEN:     ['#25D366', 'Aberta'],
    PENDING:  ['#F59E0B', 'Pendente'],
    RESOLVED: ['#9CA3AF', 'Resolvida'],
  };
  const [color, label] = map[status] || ['#9CA3AF', status];
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}
