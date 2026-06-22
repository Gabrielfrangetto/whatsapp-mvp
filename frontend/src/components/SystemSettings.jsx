// src/components/SystemSettings.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar configurações');
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleAutoclose() {
    if (!settings || saving) return;
    const next = settings.autoclose_enabled !== 'true';
    setError('');

    // optimistic update
    setSettings(prev => ({ ...prev, autoclose_enabled: String(next) }));
    setSaving(true);

    try {
      const { data } = await api.patch('/settings', { autoclose_enabled: String(next) });
      setSettings(data);
    } catch (e) {
      // revert
      setSettings(prev => ({ ...prev, autoclose_enabled: String(!next) }));
      setError(e.response?.data?.error || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const enabled = settings?.autoclose_enabled === 'true';

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>Automações</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-text-muted)', margin: '3px 0 0' }}>Comportamentos automáticos do sistema</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
          {error}
        </div>
      )}

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

          <div
            onClick={settings !== null ? toggleAutoclose : undefined}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              cursor: settings === null ? 'default' : 'pointer',
              background: enabled ? 'var(--theme-primary)' : 'var(--theme-border)',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.2s',
              opacity: saving ? 0.7 : 1,
              userSelect: 'none',
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
              pointerEvents: 'none',
            }} />
          </div>

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
