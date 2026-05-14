// src/components/TemplateModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

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

  useEffect(() => {
    loadTemplates();
  }, []);

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
    } catch { setError('Erro ao carregar templates'); }
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
      setError(e.response?.data?.error || 'Erro ao enviar template');
    } finally { setSending(false); }
  }

  // Preview do template com variáveis substituídas
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
      style={{ position:'fixed', inset:0, background:'#00000060', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:"'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h3 style={{ fontSize:16, fontWeight:600, color:'#111', margin:0 }}>Enviar template</h3>
            <p style={{ fontSize:12, color:'#888', margin:'3px 0 0' }}>Mensagens ativas aprovadas pela Meta</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleSync} disabled={syncing} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e0e0e0', background:'none', cursor:'pointer', fontSize:12, color:'#555', display:'flex', alignItems:'center', gap:5 }}>
              {syncing ? '⏳' : '🔄'} {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626' }}>{error}</div>
          )}

          {/* Lista de templates */}
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
              Aprovados ({approved.length})
            </p>
            {loading ? (
              <div style={{ textAlign:'center', color:'#aaa', padding:'20px 0', fontSize:13 }}>Carregando...</div>
            ) : approved.length === 0 ? (
              <div style={{ textAlign:'center', color:'#aaa', padding:'20px 0', fontSize:13 }}>
                Nenhum template aprovado. Clique em Sincronizar ou crie templates no painel da Meta.
              </div>
            ) : approved.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${selected?.id === t.id ? '#075E54' : '#e8e8e8'}`, marginBottom:8, cursor:'pointer', background: selected?.id === t.id ? '#f0fdf4' : '#fff', transition:'all 0.15s' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:13, color:'#111' }}>{t.name}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: STATUS_COLOR[t.status]?.bg, color: STATUS_COLOR[t.status]?.color, fontWeight:500 }}>
                    {STATUS_COLOR[t.status]?.label}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'#666', margin:0, lineHeight:1.5 }}>{t.body}</p>
                <p style={{ fontSize:11, color:'#aaa', margin:'4px 0 0' }}>{t.language} · {t.category}</p>
              </div>
            ))}

            {others.length > 0 && (
              <>
                <p style={{ fontSize:12, fontWeight:600, color:'#aaa', margin:'12px 0 8px', textTransform:'uppercase', letterSpacing:.5 }}>
                  Outros ({others.length})
                </p>
                {others.map(t => (
                  <div key={t.id} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #eee', marginBottom:6, opacity:.6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, color:'#555' }}>{t.name}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: STATUS_COLOR[t.status]?.bg, color: STATUS_COLOR[t.status]?.color }}>
                        {STATUS_COLOR[t.status]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Variáveis do template selecionado */}
          {selected && variables.length > 0 && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'14px 16px' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:12, textTransform:'uppercase', letterSpacing:.5 }}>Preencha as variáveis</p>
              {variables.map((v, i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>
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
                    style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {selected && (
            <div style={{ background:'#dcf8c6', borderRadius:12, padding:'12px 16px' }}>
              <p style={{ fontSize:11, color:'#555', marginBottom:6, fontWeight:600 }}>PREVIEW</p>
              <p style={{ fontSize:13, color:'#111', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{getPreview()}</p>
              {selected.footer && <p style={{ fontSize:11, color:'#888', margin:'6px 0 0' }}>{selected.footer}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #e0e0e0', background:'none', cursor:'pointer', fontSize:13, color:'#555' }}>
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!selected || sending}
            style={{ padding:'9px 18px', borderRadius:8, border:'none', background: selected && !sending ? '#075E54' : '#ccc', color:'#fff', cursor: selected && !sending ? 'pointer' : 'default', fontSize:13, fontWeight:600 }}
          >
            {sending ? 'Enviando...' : 'Enviar template'}
          </button>
        </div>
      </div>
    </div>
  );
}
