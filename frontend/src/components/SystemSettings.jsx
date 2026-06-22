// src/components/SystemSettings.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function toggleAutoclose() {
    if (!settings) return;
    const next = settings.autoclose_enabled !== 'true';
    setSaving(true);
    try {
      const { data } = await api.patch('/settings', { autoclose_enabled: String(next) });
      setSettings(data);
    } catch {}
    setSaving(false);
  }

  const enabled = settings?.autoclose_enabled === 'true';

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>Automações</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-text-muted)', margin: '3px 0 0' }}>Comportamentos automáticos do sistema</p>
      </div>

      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 12, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)' }}>
              Fechar chats por inatividade
            </div>
            <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 3 }}>
              Chats abertos ou pendentes são finalizados automaticamente após 24h sem mensagens, com IA selecionando o motivo
            </div>
          </div>

          <button
            onClick={toggleAutoclose}
            disabled={saving || settings === null}
            title={enabled ? 'Clique para desativar' : 'Clique para ativar'}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              cursor: saving || settings === null ? 'default' : 'pointer',
              background: enabled ? 'var(--theme-primary)' : 'var(--theme-border)',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.2s',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: enabled ? 23 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }} />
          </button>

          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: enabled ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
            minWidth: 48,
          }}>
            {settings === null ? '...' : enabled ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
    </div>
  );
}
