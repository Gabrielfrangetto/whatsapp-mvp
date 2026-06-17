import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';
import Modal from '../Modal';

const DAYS_CONFIG = [
  { key: 'MON', label: 'Segunda' },
  { key: 'TUE', label: 'Terça' },
  { key: 'WED', label: 'Quarta' },
  { key: 'THU', label: 'Quinta' },
  { key: 'FRI', label: 'Sexta' },
  { key: 'SAT', label: 'Sábado' },
  { key: 'SUN', label: 'Domingo' },
];

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS_CONFIG.map(({ key }, i) => [key, { enabled: i < 5, start: '08:00', end: '18:00' }])
);

const inputStyle = {
  padding: '5px 8px', border: '1px solid var(--theme-border)', borderRadius: 6,
  fontSize: 13, background: 'var(--theme-bg-input)', color: 'var(--theme-text)',
  fontFamily: 'inherit', outline: 'none', width: 80,
};

export default function WorkScheduleModal({ agent, onClose }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/auth/agents/${agent.id}/schedule`)
      .then(({ data }) => { if (data.workSchedule) setSchedule({ ...DEFAULT_SCHEDULE, ...data.workSchedule }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agent.id]);

  const setDay = (key, field, value) =>
    setSchedule(s => ({ ...s, [key]: { ...s[key], [field]: value } }));

  async function handleSave() {
    setError(''); setSaving(true);
    try {
      await api.patch(`/auth/agents/${agent.id}/schedule`, { workSchedule: schedule });
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={`Horário de trabalho — ${agent.name}`} onClose={onClose}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--theme-text-muted)' }}>Carregando...</div>
      ) : (
        <>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {DAYS_CONFIG.map(({ key, label }) => {
              const day = schedule[key] || { enabled: false, start: '08:00', end: '18:00' };
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 90 }}>
                    <input type="checkbox" checked={day.enabled} onChange={e => setDay(key, 'enabled', e.target.checked)} style={{ accentColor: 'var(--theme-primary)', width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, color: day.enabled ? 'var(--theme-text)' : 'var(--theme-text-muted)', fontWeight: day.enabled ? 600 : 400 }}>{label}</span>
                  </label>
                  <input type="time" value={day.start} disabled={!day.enabled} onChange={e => setDay(key, 'start', e.target.value)} style={{ ...inputStyle, opacity: day.enabled ? 1 : 0.35 }} />
                  <span style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>até</span>
                  <input type="time" value={day.end} disabled={!day.enabled} onChange={e => setDay(key, 'end', e.target.value)} style={{ ...inputStyle, opacity: day.enabled ? 1 : 0.35 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: '2px solid var(--theme-primary)', background: 'none', color: 'var(--theme-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
