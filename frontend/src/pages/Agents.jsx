// src/pages/Agents.jsx
import { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import ResolutionReasons from './ResolutionReasons';
import AvatarUpload from '../components/AvatarUpload';

function Avatar({ name = '', color = '#25D366', size = 36, avatarUrl }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 600, fontSize: size * 0.36, flexShrink: 0,
      overflow: 'hidden',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (initials || '?')
      }
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: role === 'ADMIN' ? '#eff6ff' : '#f0fdf4',
      color: role === 'ADMIN' ? '#1d4ed8' : '#15803d',
      border: `1px solid ${role === 'ADMIN' ? '#bfdbfe' : '#bbf7d0'}`,
    }}>
      {role === 'ADMIN' ? '👑 Admin' : '🎧 Agente'}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000060',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--theme-bg-secondary)', borderRadius: 16, padding: '28px 28px 24px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: '1px solid var(--theme-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--theme-text-muted)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AgentForm({ initial = {}, onSave, onClose, isNew }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--theme-border)',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: 'var(--theme-text)', background: 'var(--theme-bg-input)',
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
    style: fieldStyle,
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
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
        <input type="password" placeholder={isNew ? 'Mínimo 8 caracteres' : '••••••••'} {...field('password')} required={isNew} />
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
        <button type="submit" disabled={loading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--theme-primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {loading ? 'Salvando...' : (isNew ? 'Criar agente' : 'Salvar')}
        </button>
      </div>
    </form>
  );
}

export default function Agents() {
  const { agent: me, setAgent } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [avatarAgent, setAvatarAgent] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/agents');
      setAgents(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveAvatar(agentId, avatarUrl) {
    await api.patch(`/auth/agents/${agentId}/avatar`, { avatarUrl });
    if (agentId === me?.id) setAgent(prev => ({ ...prev, avatarUrl }));
    load();
  }

  async function toggleActive(ag) {
    try {
      await api.patch(`/auth/agents/${ag.id}`, { isActive: !ag.isActive });
      load();
    } catch {}
  }

  return (
    <div style={{ flex: 1, background: 'var(--theme-bg)', padding: 32, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--theme-text)' }}>Agentes</h2>
          <p style={{ fontSize: 13, color: 'var(--theme-text-muted)', marginTop: 2 }}>{agents.length} atendentes cadastrados</p>
        </div>
        <button
          onClick={() => setModal('new')}
          style={{ padding: '9px 18px', background: 'var(--theme-primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          + Novo Agente
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Carregando...</div>
        ) : agents.map((ag, i) => (
          <div key={ag.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
            borderBottom: i < agents.length - 1 ? '1px solid var(--theme-border)' : 'none',
            opacity: ag.isActive ? 1 : 0.5,
          }}>
            <Avatar name={ag.name} color={ag.avatarColor} avatarUrl={ag.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--theme-text)' }}>{ag.name}</span>
                {ag.id === me?.id && <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>(você)</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 2 }}>{ag.email}</div>
            </div>
            <RoleBadge role={ag.role} />
            <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', minWidth: 90, textAlign: 'right' }}>
              {ag.lastLoginAt ? new Date(ag.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca logou'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setAvatarAgent(ag)}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--theme-text)' }}
              >
                📷 Foto
              </button>
              <button
                onClick={() => setModal(ag)}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--theme-text)' }}
              >
                Editar
              </button>
              {ag.id !== me?.id && (
                <button
                  onClick={() => toggleActive(ag)}
                  style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${ag.isActive ? '#fecaca' : '#bbf7d0'}`, background: ag.isActive ? '#fef2f2' : '#f0fdf4', cursor: 'pointer', fontSize: 12, color: ag.isActive ? '#dc2626' : '#16a34a' }}
                >
                  {ag.isActive ? 'Desativar' : 'Ativar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {modal === 'new' && (
        <Modal title="Novo Agente" onClose={() => setModal(null)}>
          <AgentForm isNew onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal && modal !== 'new' && (
        <Modal title="Editar Agente" onClose={() => setModal(null)}>
          <AgentForm initial={modal} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
      <ResolutionReasons />
      {avatarAgent && <AvatarUpload agent={avatarAgent} onSaved={handleSaveAvatar} onClose={() => setAvatarAgent(null)} />}
    </div>
  );
}
