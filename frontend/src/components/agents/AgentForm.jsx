import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../../context/AuthContext';

const PASSWORD_RULES = [
  { test: v => v.length >= 8,          label: 'Mínimo 8 caracteres' },
  { test: v => /[A-Z]/.test(v),        label: 'Uma letra maiúscula' },
  { test: v => /[a-z]/.test(v),        label: 'Uma letra minúscula' },
  { test: v => /[0-9]/.test(v),        label: 'Um número' },
  { test: v => /[^A-Za-z0-9]/.test(v), label: 'Um símbolo (!@#$…)' },
];

function validatePassword(v) {
  const failed = PASSWORD_RULES.filter(r => !r.test(v)).map(r => r.label);
  return failed.length === 0 ? '' : `A senha precisa ter: ${failed.join(', ')}.`;
}

export default function AgentForm({ initial = {}, onSave, onClose, isNew }) {
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'AGENT', ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [pwError, setPwError] = useState('');

  const fieldStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--theme-border)',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: 'var(--theme-text)', background: 'var(--theme-bg-input)',
  };
  const field = (key) => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })), style: fieldStyle });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password) {
      const err = validatePassword(form.password);
      if (err) { setPwError(err); return; }
    } else if (isNew) {
      setPwError('A senha é obrigatória.');
      return;
    }
    setLoading(true);
    try {
      if (isNew) {
        await api.post('/auth/agents', form);
      } else {
        const { email: _, ...data } = form;
        if (!data.password) delete data.password;
        await api.patch(`/auth/agents/${initial.id}`, data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--theme-text-muted)', marginBottom: 6, fontWeight: 500 }}>NOME</label>
        <input placeholder="Nome completo" required {...field('name')} />
      </div>

      {isNew && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--theme-text-muted)', marginBottom: 6, fontWeight: 500 }}>E-MAIL</label>
          <input type="email" placeholder="agente@empresa.com" required {...field('email')} />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--theme-text-muted)', marginBottom: 6, fontWeight: 500 }}>
          {isNew ? 'SENHA' : 'NOVA SENHA (deixe em branco para manter)'}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder={isNew ? 'Mínimo 8 caracteres' : '••••••••'}
            value={form.password}
            onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setPwError(''); }}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            style={{ ...fieldStyle, paddingRight: 38, border: pwError ? '1px solid #ef4444' : '1px solid var(--theme-border)' }}
          />
          <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', display: 'flex', padding: 0 }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {(pwFocused || form.password.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
            {PASSWORD_RULES.map(rule => {
              const ok = rule.test(form.password);
              return (
                <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? '#22c55e' : 'var(--theme-border)', transition: 'background 0.2s' }}>
                    {ok && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1,4 3,6 7,2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 11, color: ok ? '#22c55e' : 'var(--theme-text-muted)', transition: 'color 0.2s' }}>{rule.label}</span>
                </div>
              );
            })}
          </div>
        )}
        {pwError && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{pwError}</p>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--theme-text-muted)', marginBottom: 6, fontWeight: 500 }}>PERFIL</label>
        <select {...field('role')} style={fieldStyle}>
          <option value="AGENT">Agente</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-muted)' }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{ padding: '9px 18px', borderRadius: 8, border: '2px solid var(--theme-primary)', background: 'none', color: 'var(--theme-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {loading ? 'Salvando...' : (isNew ? 'Criar agente' : 'Salvar')}
        </button>
      </div>
    </form>
  );
}
