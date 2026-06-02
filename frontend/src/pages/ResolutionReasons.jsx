// src/pages/ResolutionReasons.jsx
import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export default function ResolutionReasons() {
  const [reasons, setReasons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get('/resolution/reasons/all');
      setReasons(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAdding(true); setError('');
    try {
      await api.post('/resolution/reasons', { label: newLabel.trim() });
      setNewLabel('');
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao adicionar');
    } finally { setAdding(false); }
  }

  async function toggleActive(r) {
    try {
      await api.patch(`/resolution/reasons/${r.id}`, { isActive: !r.isActive });
      load();
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Remover este motivo?')) return;
    try {
      await api.delete(`/resolution/reasons/${id}`);
      load();
    } catch {}
  }

  return (
    <div style={{ marginTop:32 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h3 style={{ fontSize:16, fontWeight:600, color:'#111', margin:0 }}>Motivos de finalização</h3>
          <p style={{ fontSize:13, color:'#888', margin:'3px 0 0' }}>Aparecem no dropdown ao resolver uma conversa</p>
        </div>
      </div>

      {/* Adicionar */}
      <form onSubmit={handleAdd} style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Ex: Problema resolvido, Sem retorno do cliente..."
          style={{ flex:1, padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }}
        />
        <button
          type="submit"
          disabled={adding || !newLabel.trim()}
          style={{ padding:'9px 16px', background: newLabel.trim() ? '#075E54' : '#ccc', color:'#fff', border:'none', borderRadius:8, cursor: newLabel.trim() ? 'pointer' : 'default', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}
        >
          {adding ? 'Adicionando...' : '+ Adicionar'}
        </button>
      </form>

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#dc2626', marginBottom:12 }}>
          {error}
        </div>
      )}

      {/* Lista */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'#aaa', fontSize:13 }}>Carregando...</div>
        ) : reasons.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'#aaa', fontSize:13 }}>Nenhum motivo cadastrado ainda.</div>
        ) : reasons.map((r, i) => (
          <div key={r.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
            borderBottom: i < reasons.length - 1 ? '1px solid #f0f0f0' : 'none',
            opacity: r.isActive ? 1 : 0.5,
          }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: r.isActive ? '#25D366' : '#ccc', flexShrink:0 }} />
            <span style={{ flex:1, fontSize:14, color:'#333' }}>{r.label}</span>
            <span style={{ fontSize:11, color: r.isActive ? '#15803d' : '#999', background: r.isActive ? '#f0fdf4' : '#f5f5f5', padding:'2px 8px', borderRadius:20, border:`1px solid ${r.isActive ? '#bbf7d0' : '#e0e0e0'}` }}>
              {r.isActive ? 'Ativo' : 'Inativo'}
            </span>
            <button onClick={() => toggleActive(r)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #e0e0e0', background:'none', cursor:'pointer', fontSize:12, color:'#555' }}>
              {r.isActive ? 'Desativar' : 'Ativar'}
            </button>
            <button onClick={() => handleDelete(r.id)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', cursor:'pointer', fontSize:12, color:'#dc2626' }}>
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
