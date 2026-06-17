import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Loader2, RefreshCw } from 'lucide-react';

const STATUS_COLOR = {
  APPROVED: { bg: '#f0fdf4', color: '#15803d', label: 'Aprovado' },
  PENDING:  { bg: '#fefce8', color: '#854d0e', label: 'Pendente' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejeitado' },
};

export default function TemplateModal({ conversationId, onClose, onSent }) {
  const [templates, setTemplates]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [variables, setVariables]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => { loadTemplates(); }, []);

  useEffect(() => {
    if (selected) {
      const vars = JSON.parse(selected.variables || '[]');
      setVariables(vars.map(v => ({ ...v, value: '' })));
    }
  }, [selected]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch { setError('Erro ao carregar modelos de mensagem'); }
    finally { setLoading(false); }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      await api.post('/templates/sync');
      await loadTemplates();
    } catch { setError('Erro ao sincronizar. Verifique META_WABA_ID.'); }
    finally { setSyncing(false); }
  }

  async function handleSend() {
    if (!selected) return;
    const vals = variables.map(v => v.value);
    if (vals.some(v => !v.trim())) { setError('Preencha todas as variáveis'); return; }
    try {
      setSending(true);
      await api.post(`/templates/conversations/${conversationId}/send-template`, {
        templateId: selected.id,
        variables: vals,
      });
      onSent?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao enviar modelo de mensagem');
    } finally { setSending(false); }
  }

  function getPreview() {
    if (!selected) return '';
    let text = selected.body;
    variables.forEach((v, i) => {
      text = text.replace(`{{${i + 1}}}`, v.value || `{{${i + 1}}}`);
    });
    return text;
  }

  const approved = templates.filter(t => t.status === 'APPROVED');
  const others   = templates.filter(t => t.status !== 'APPROVED');

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background:'var(--theme-bg-secondary)', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.35)', fontFamily:"'Segoe UI', sans-serif" }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--theme-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h3 style={{ fontSize:16, fontWeight:600, color:'var(--theme-text)', margin:0 }}>Modelos de mensagens</h3>
            <p style={{ fontSize:12, color:'var(--theme-text-muted)', margin:'3px 0 0' }}>Modelos ativos aprovados pela Meta</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleSync} disabled={syncing} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--theme-border-strong)', background:'none', cursor:'pointer', fontSize:12, color:'var(--theme-text-secondary)', display:'flex', alignItems:'center', gap:5 }}>
              {syncing ? <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }} /> : <RefreshCw size={13} />} {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--theme-text-muted)' }}>×</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626' }}>{error}</div>
          )}

          {/* Lista de modelos */}
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--theme-text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
              Aprovados ({approved.length})
            </p>
            {loading ? (
              <div style={{ textAlign:'center', color:'var(--theme-text-muted)', padding:'20px 0', fontSize:13 }}>Carregando...</div>
            ) : approved.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--theme-text-muted)', padding:'20px 0', fontSize:13 }}>
                Nenhum modelo aprovado. Clique em Sincronizar ou crie modelos no painel da Meta.
              </div>
            ) : approved.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${selected?.id === t.id ? 'var(--theme-primary)' : 'var(--theme-border-strong)'}`, marginBottom:8, cursor:'pointer', background: selected?.id === t.id ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-input)', transition:'all 0.15s' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:13, color:'var(--theme-text)' }}>{t.name}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: STATUS_COLOR[t.status]?.bg, color: STATUS_COLOR[t.status]?.color, fontWeight:500 }}>
                    {STATUS_COLOR[t.status]?.label}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'var(--theme-text-secondary)', margin:0, lineHeight:1.5 }}>{t.body}</p>
                <p style={{ fontSize:11, color:'var(--theme-text-muted)', margin:'4px 0 0' }}>{t.language} · {t.category}</p>
              </div>
            ))}

            {others.length > 0 && (
              <>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--theme-text-muted)', margin:'12px 0 8px', textTransform:'uppercase', letterSpacing:.5 }}>
                  Outros ({others.length})
                </p>
                {others.map(t => (
                  <div key={t.id} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--theme-border)', marginBottom:6, opacity:.6, background:'var(--theme-bg-input)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, color:'var(--theme-text-secondary)' }}>{t.name}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: STATUS_COLOR[t.status]?.bg, color: STATUS_COLOR[t.status]?.color }}>
                        {STATUS_COLOR[t.status]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Variáveis do modelo selecionado */}
          {selected && variables.length > 0 && (
            <div style={{ background:'var(--theme-bg-tertiary)', borderRadius:10, padding:'14px 16px' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--theme-text-secondary)', marginBottom:12, textTransform:'uppercase', letterSpacing:.5 }}>Preencha as variáveis</p>
              {variables.map((v, i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12, color:'var(--theme-text-secondary)', display:'block', marginBottom:4 }}>
                    {`{{${i + 1}}}`} — variável {i + 1}
                  </label>
                  <input
                    type="text"
                    value={v.value}
                    onChange={e => {
                      const next = [...variables];
                      next[i] = { ...next[i], value: e.target.value };
                      setVariables(next);
                    }}
                    placeholder={`Ex: ${v.example}`}
                    style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid var(--theme-border-strong)', background:'var(--theme-bg-input)', color:'var(--theme-text)', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {selected && (
            <div style={{ background:'var(--theme-primary-subtle)', border:'1px solid var(--theme-primary)', borderRadius:12, padding:'12px 16px' }}>
              <p style={{ fontSize:11, color:'var(--theme-text-secondary)', marginBottom:6, fontWeight:600 }}>PREVIEW</p>
              <p style={{ fontSize:13, color:'var(--theme-text)', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{getPreview()}</p>
              {selected.footer && <p style={{ fontSize:11, color:'var(--theme-text-muted)', margin:'6px 0 0' }}>{selected.footer}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--theme-border)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--theme-border-strong)', background:'none', cursor:'pointer', fontSize:13, color:'var(--theme-text-secondary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!selected || sending}
            style={{ padding:'9px 18px', borderRadius:8, border:'none', background: selected && !sending ? 'var(--theme-primary-btn)' : 'var(--theme-border-strong)', color: selected && !sending ? 'var(--theme-primary-btn-text)' : 'var(--theme-text-muted)', cursor: selected && !sending ? 'pointer' : 'default', fontSize:13, fontWeight:600, transition:'background 0.2s' }}
          >
            {sending ? 'Enviando...' : 'Enviar modelo'}
          </button>
        </div>
      </div>
    </div>
  );
}
