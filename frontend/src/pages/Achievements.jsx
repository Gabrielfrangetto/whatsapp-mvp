import { Trophy } from 'lucide-react';
import AchievementsSection from '../components/achievements/AchievementsSection';
import XPBar from '../components/achievements/XPBar';

export default function Achievements({ xp }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg)', minWidth: 0 }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-bg-secondary)', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <Trophy size={22} style={{ color: 'var(--theme-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--theme-text)' }}>Conquistas</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 1 }}>Suas conquistas desbloqueadas e as que ainda faltam</div>
        </div>
        {xp && <XPBar xp={xp} />}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>
        <AchievementsSection />
      </div>
    </div>
  );
}
