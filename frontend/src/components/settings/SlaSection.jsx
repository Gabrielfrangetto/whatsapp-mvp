import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../context/AuthContext';

const BTN = {
  base: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none' },
  primary: { background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' },
};
function btn(disabled) { return { ...BTN.base, ...BTN.primary, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }; }

const inputStyle = { width: 100, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function SlaSection() {
  const [currentSeconds, setCurrentSeconds] = useState(null);
  const [minutesInput, setMinutesInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'error', text }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/sla-target');
      setCurrentSeconds(data.targetSeconds);
      setMinutesInput(String(data.targetSeconds / 60));
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar meta de SLA.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const minutesValue = Number(minutesInput);
  const isValid = minutesInput.trim() !== '' && Number.isFinite(minutesValue) && minutesValue > 0 && minutesValue <= 1440;
  const isDirty = isValid && Math.round(minutesValue * 60) !== currentSeconds;

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true); setMessage(null);
    try {
      const { data } = await api.patch('/reports/sla-target', { targetSeconds: Math.round(minutesValue * 60) });
      setCurrentSeconds(data.targetSeconds);
      setMessage({ type: 'ok', text: 'Meta de SLA salva. Períodos anteriores mantêm a meta que valia na época.' });
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Erro ao salvar meta de SLA.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20, fontSize: 13, color: 'var(--theme-text-muted)' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--theme-bg)', borderRadius: 12, border: '1px solid var(--theme-border)', padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', marginBottom: 6 }}>Meta de SLA (1ª resposta)</div>
        <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          Tempo máximo para a primeira resposta de um agente ser considerada dentro do SLA nos relatórios de desempenho.
          Alterar essa meta não recalcula o SLA de períodos anteriores — cada período continua avaliado pela meta que estava vigente na época.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="number" min={1} max={1440} step={1} value={minutesInput} onChange={e => setMinutesInput(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 13, color: 'var(--theme-text-secondary)' }}>minutos</span>
        </div>

        {message && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: message.type === 'ok' ? '#16a34a' : '#ef4444', marginTop: 12 }}>
            {message.type === 'ok' ? <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
            {message.text}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button onClick={handleSave} disabled={saving || !isDirty} style={btn(saving || !isDirty)}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
