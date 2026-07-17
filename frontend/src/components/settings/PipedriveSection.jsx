import { useState, useEffect } from 'react';
import { Link2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../context/AuthContext';

const BTN = {
  base: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none' },
  primary: { background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' },
  ghost:   { background: 'none', border: '1px solid var(--theme-border)', color: 'var(--theme-text-secondary)' },
};
function btn(variant, disabled) { return { ...BTN.base, ...BTN[variant], opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }; }

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function PipedriveSection() {
  const [config, setConfig] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'error', text }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/pipedrive/config');
      setConfig(data);
      setPipelineId(data.pipelineId || '');
      setEnabled(data.enabled);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar configuração.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleConnect() {
    if (!tokenInput.trim()) return;
    setSaving(true); setMessage(null);
    try {
      await api.patch('/pipedrive/config', { apiToken: tokenInput.trim(), enabled: false });
      setTokenInput('');
      await load();
      setMessage({ type: 'ok', text: 'Token salvo. Selecione o pipeline de vendas abaixo.' });
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Token inválido.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true); setMessage(null);
    try {
      await api.patch('/pipedrive/config', { pipelineId: pipelineId ? Number(pipelineId) : undefined, enabled });
      await load();
      setMessage({ type: 'ok', text: enabled ? 'Integração ativada com sucesso.' : 'Configuração salva.' });
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true); setMessage(null);
    try {
      const { data } = await api.post('/pipedrive/sync');
      setMessage({ type: 'ok', text: `Sincronização concluída: ${data.synced} negócio(s) atualizados.` });
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Erro ao sincronizar.' });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div style={{ padding: 20, fontSize: 13, color: 'var(--theme-text-muted)' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--theme-bg)', borderRadius: 12, border: '1px solid var(--theme-border)', padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', marginBottom: 6 }}>Funil de vendas (Pipedrive)</div>
        <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          Sincroniza os estágios do seu pipeline de vendas no Pipedrive para calcular o funil, taxa de conversão e tempo por estágio no relatório.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--theme-text-secondary)', marginBottom: 6, display: 'block' }}>
              Token de API {config?.hasToken && <span style={{ color: '#16a34a', fontWeight: 600 }}>· conectado</span>}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                placeholder={config?.hasToken ? 'Já configurado — cole um novo token para substituir' : 'Cole o token de API do Pipedrive'}
                style={inputStyle} />
              <button onClick={handleConnect} disabled={saving || !tokenInput.trim()} style={btn('ghost', saving || !tokenInput.trim())}>
                <Link2 size={13} /> Conectar
              </button>
            </div>
          </div>

          {config?.hasToken && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--theme-text-secondary)', marginBottom: 6, display: 'block' }}>Pipeline de vendas</label>
              <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} style={inputStyle}>
                <option value="">Selecione um pipeline</option>
                {(config.pipelines || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {config?.hasToken && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={() => setEnabled(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, cursor: 'pointer', background: enabled ? 'var(--theme-primary)' : 'var(--theme-border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--theme-text)' }}>Ativar sincronização (webhook em tempo real)</span>
            </div>
          )}

          {message && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: message.type === 'ok' ? '#16a34a' : '#ef4444' }}>
              {message.type === 'ok' ? <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !config?.hasToken} style={btn('primary', saving || !config?.hasToken)}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {config?.enabled && (
              <button onClick={handleSync} disabled={syncing} style={btn('ghost', syncing)}>
                <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} /> {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
