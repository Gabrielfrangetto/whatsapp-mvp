// src/components/ResolveModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Check, AlertTriangle } from 'lucide-react';

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
      <div style={{ background:'var(--theme-bg-secondary)', borderRadius:16, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:"'Segoe UI', sans-serif", border:'1px solid var(--theme-border)' }}>
        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--theme-border)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--theme-primary-subtle)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-primary)', flexShrink:0 }}><Check size={18} strokeWidth={2.5} /></div>
          <div>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--theme-text)', margin:0 }}>Finalizar conversa</h3>
            <p style={{ fontSize:12, color:'var(--theme-text-muted)', margin:'2px 0 0' }}>Selecione o motivo de encerramento</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--theme-text-muted)' }}>×</button>
        </div>

        <div style={{ padding:'20px' }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
              <AlertTriangle size={14} style={{ flexShrink:0 }} /> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', color:'var(--theme-text-muted)', padding:'20px 0', fontSize:13 }}>Carregando motivos...</div>
          ) : reasons.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <p style={{ fontSize:14, color:'var(--theme-text-secondary)', margin:'0 0 8px' }}>Nenhum motivo cadastrado.</p>
              <p style={{ fontSize:13, color:'var(--theme-text-muted)', margin:0 }}>Peça ao administrador para cadastrar motivos em <strong>Gerenciar Agentes</strong>.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {reasons.map(r => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  style={{
                    padding:'12px 14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
                    border: `2px solid ${selected === r.id ? 'var(--theme-primary)' : 'var(--theme-border)'}`,
                    background: selected === r.id ? 'var(--theme-primary-subtle)' : 'var(--theme-bg)',
                    display:'flex', alignItems:'center', gap:10,
                  }}
                >
                  <div style={{
                    width:20, height:20, borderRadius:'50%', border:`2px solid ${selected === r.id ? 'var(--theme-primary)' : 'var(--theme-border)'}`,
                    background: selected === r.id ? 'var(--theme-primary)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    {selected === r.id && <Check size={11} strokeWidth={3} color="var(--theme-primary-text)" />}
                  </div>
                  <span style={{ fontSize:14, color:'var(--theme-text)', fontWeight: selected === r.id ? 500 : 400 }}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--theme-border)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--theme-border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--theme-text-secondary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleResolve}
            disabled={!selected || resolving || reasons.length === 0}
            style={{ padding:'9px 18px', borderRadius:8, border: selected && !resolving ? '2px solid var(--theme-primary)' : '2px solid var(--theme-border)', background:'none', color: selected && !resolving ? 'var(--theme-primary)' : 'var(--theme-text-muted)', cursor: selected && !resolving ? 'pointer' : 'default', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}
          >
            {resolving ? 'Finalizando...' : <><Check size={13} /> Finalizar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
