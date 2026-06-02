// src/components/ResolveModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export default function ResolveModal({ conversationId, onClose, onResolved }) {
  const [reasons, setReasons]     = useState([]);
  const [selected, setSelected]   = useState('');
  const [loading, setLoading]     = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/resolution/reasons');
        setReasons(data);
      } catch {
        setError('Erro ao carregar motivos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleResolve() {
    if (!selected) { setError('Selecione um motivo para finalizar'); return; }
    setResolving(true);
    try {
      await api.post(`/resolution/conversations/${conversationId}/resolve`, { reasonId: selected });
      onResolved?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao finalizar');
      setResolving(false);
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'#00000060', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:"'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✓</div>
          <div>
            <h3 style={{ fontSize:15, fontWeight:600, color:'#111', margin:0 }}>Finalizar conversa</h3>
            <p style={{ fontSize:12, color:'#888', margin:'2px 0 0' }}>Selecione o motivo de encerramento</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>

        <div style={{ padding:'20px' }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626', marginBottom:14 }}>
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', color:'#aaa', padding:'20px 0', fontSize:13 }}>Carregando motivos...</div>
          ) : reasons.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <p style={{ fontSize:14, color:'#555', margin:'0 0 8px' }}>Nenhum motivo cadastrado.</p>
              <p style={{ fontSize:13, color:'#aaa', margin:0 }}>Peça ao administrador para cadastrar motivos em <strong>Gerenciar Agentes</strong>.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {reasons.map(r => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  style={{
                    padding:'12px 14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
                    border: `2px solid ${selected === r.id ? '#25D366' : '#e8e8e8'}`,
                    background: selected === r.id ? '#f0fdf4' : '#fff',
                    display:'flex', alignItems:'center', gap:10,
                  }}
                >
                  <div style={{
                    width:20, height:20, borderRadius:'50%', border:`2px solid ${selected === r.id ? '#25D366' : '#ddd'}`,
                    background: selected === r.id ? '#25D366' : '#fff',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    {selected === r.id && <span style={{ color:'#fff', fontSize:12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:14, color: selected === r.id ? '#15803d' : '#333', fontWeight: selected === r.id ? 500 : 400 }}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 20px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #e0e0e0', background:'none', cursor:'pointer', fontSize:13, color:'#555' }}>
            Cancelar
          </button>
          <button
            onClick={handleResolve}
            disabled={!selected || resolving || reasons.length === 0}
            style={{ padding:'9px 18px', borderRadius:8, border:'none', background: selected && !resolving ? '#25D366' : '#ccc', color:'#fff', cursor: selected && !resolving ? 'pointer' : 'default', fontSize:13, fontWeight:600 }}
          >
            {resolving ? 'Finalizando...' : '✓ Finalizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
