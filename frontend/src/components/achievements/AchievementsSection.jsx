import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function AchievementCard({ a }) {
  const pct = Math.round((a.progress / a.threshold) * 100);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10,
      border: '1px solid var(--theme-border)', background: a.unlocked ? 'var(--theme-primary-subtle)' : 'var(--theme-bg)',
      opacity: a.unlocked ? 1 : 0.75,
    }}>
      <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text)' }}>{a.title}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-primary)', background: 'var(--theme-primary-subtle)', borderRadius: 8, padding: '1px 7px', flexShrink: 0 }}>+{a.xp} XP</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{a.description}</div>
        {a.unlocked ? (
          <div style={{ fontSize: 11, color: 'var(--theme-primary)', fontWeight: 600, marginTop: 6 }}>
            Desbloqueada em {formatDate(a.unlockedAt)}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--theme-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--theme-primary)', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 4 }}>{a.progress}/{a.threshold}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AchievementsSection() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/achievements/me')
      .then(({ data }) => setAchievements(data.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, fontSize: 13, color: 'var(--theme-text-muted)' }}>Carregando...</div>;

  const categories = [...new Set(achievements.map(a => a.category))];
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const earnedXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>
        {unlockedCount} de {achievements.length} conquistas desbloqueadas · {earnedXp} XP conquistado
      </div>
      {categories.map(cat => (
        <div key={cat}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 10px' }}>{cat}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievements.filter(a => a.category === cat).map(a => <AchievementCard key={a.key} a={a} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
