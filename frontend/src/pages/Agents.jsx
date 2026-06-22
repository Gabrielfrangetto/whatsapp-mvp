import { useState, useEffect } from 'react';
import { Shield, Headphones, Camera, Clock } from 'lucide-react';
import { useAuth, api } from '../context/AuthContext';
import Modal from '../components/Modal';
import AgentForm from '../components/agents/AgentForm';
import WorkScheduleModal from '../components/agents/WorkScheduleModal';
import AvatarUpload from '../components/AvatarUpload';
import ResolutionReasons from './ResolutionReasons';

function Avatar({ name = '', color = '#25D366', size = 36, avatarUrl }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: size * 0.36, flexShrink: 0, overflow: 'hidden' }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (initials || '?')
      }
    </div>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, background: isAdmin ? '#eff6ff' : '#f0fdf4', color: isAdmin ? '#1d4ed8' : '#15803d', border: `1px solid ${isAdmin ? '#bfdbfe' : '#bbf7d0'}` }}>
      {isAdmin ? <><Shield size={11} style={{ flexShrink: 0 }} /> Admin</> : <><Headphones size={11} style={{ flexShrink: 0 }} /> Agente</>}
    </span>
  );
}

export default function Agents() {
  const { agent: me, setAgent } = useAuth();
  const [agents, setAgents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [avatarAgent, setAvatarAgent]   = useState(null);
  const [scheduleAgent, setScheduleAgent] = useState(null);

  async function load() {
    try { setLoading(true); const { data } = await api.get('/auth/agents'); setAgents(data); }
    catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveAvatar(agentId, avatarUrl) {
    await api.patch(`/auth/agents/${agentId}/avatar`, { avatarUrl });
    if (agentId === me?.id) setAgent(prev => ({ ...prev, avatarUrl }));
    load();
  }

  async function toggleActive(ag) {
    try { await api.patch(`/auth/agents/${ag.id}`, { isActive: !ag.isActive }); load(); }
    catch {}
  }

  return (
    <div style={{ flex: 1, background: 'var(--theme-bg)', padding: 32, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--theme-text)' }}>Agentes</h2>
          <p style={{ fontSize: 13, color: 'var(--theme-text-muted)', marginTop: 2 }}>{agents.length} atendentes cadastrados</p>
        </div>
        <button onClick={() => setModal('new')} style={{ padding: '9px 18px', background: 'none', border: '2px solid var(--theme-primary)', color: 'var(--theme-primary)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Novo Agente
        </button>
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 14, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Carregando...</div>
        ) : agents.map((ag, i) => (
          <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < agents.length - 1 ? '1px solid var(--theme-border)' : 'none', opacity: ag.isActive ? 1 : 0.5 }}>
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
              <button onClick={() => setAvatarAgent(ag)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Camera size={12} /> Foto
              </button>
              <button onClick={() => setScheduleAgent(ag)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} /> Horário
              </button>
              <button onClick={() => setModal(ag)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--theme-text)' }}>
                Editar
              </button>
              {ag.id !== me?.id && (
                <button onClick={() => toggleActive(ag)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${ag.isActive ? '#fecaca' : '#bbf7d0'}`, background: ag.isActive ? '#fef2f2' : '#f0fdf4', cursor: 'pointer', fontSize: 12, color: ag.isActive ? '#dc2626' : '#16a34a' }}>
                  {ag.isActive ? 'Desativar' : 'Ativar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

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
      {scheduleAgent && <WorkScheduleModal agent={scheduleAgent} onClose={() => setScheduleAgent(null)} />}
    </div>
  );
}
