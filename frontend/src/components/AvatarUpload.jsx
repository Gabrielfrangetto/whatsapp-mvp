// src/components/AvatarUpload.jsx
import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';

const CLOUD_NAME   = 'dvbah3xab';
const UPLOAD_PRESET = 'whatsapp_mvp_agents';

export default function AvatarUpload({ agent, onSaved, onClose }) {
  const [preview, setPreview]   = useState(agent?.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande. Máximo 5MB'); return; }
    setError('');
    setPreview(URL.createObjectURL(file));
    handleUpload(file);
  }

  async function handleUpload(file) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', UPLOAD_PRESET);
      form.append('folder', 'agents');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error('Falha no upload');
      const data = await res.json();

      // URL otimizada: face crop, 200x200
      const url = data.secure_url.replace('/upload/', '/upload/c_fill,g_face,h_200,w_200,q_auto,f_auto/');
      await onSaved(agent.id, url);
      onClose();
    } catch (e) {
      setError('Erro ao fazer upload. Tente novamente.');
      setPreview(agent?.avatarUrl || null);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'var(--theme-bg-secondary)', borderRadius:16, width:'100%', maxWidth:380, boxShadow:'0 24px 64px rgba(0,0,0,0.3)', border:'0.5px solid var(--theme-border)', fontFamily:"'Inter','Segoe UI',sans-serif", overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'0.5px solid var(--theme-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--theme-text)', margin:0 }}>Foto do agente</h3>
            <p style={{ fontSize:12, color:'var(--theme-text-secondary)', margin:'3px 0 0' }}>{agent?.name}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--theme-text-muted)', fontSize:20, lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'24px 20px' }}>
          {/* Avatar preview + upload zone */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{ position:'relative', cursor: uploading ? 'default' : 'pointer' }}
            >
              {/* Avatar circle */}
              <div style={{ width:96, height:96, borderRadius:'50%', overflow:'hidden', border:`3px solid var(--theme-primary)`, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', position:'relative' }}>
                {preview ? (
                  <img src={preview} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <div style={{ width:'100%', height:'100%', background: agent?.avatarColor || 'var(--theme-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:700, color:'var(--theme-primary-text)' }}>
                    {(agent?.name || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                  </div>
                )}
                {/* Overlay on hover */}
                {!uploading && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s', borderRadius:'50%' }}
                    onMouseEnter={e => e.currentTarget.style.opacity=1}
                    onMouseLeave={e => e.currentTarget.style.opacity=0}
                  >
                    <Camera size={22} color="#fff" />
                  </div>
                )}
              </div>

              {/* Loading spinner */}
              {uploading && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:24, height:24, border:'3px solid rgba(255,255,255,0.3)', borderTop:'3px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
            </div>

            <p style={{ fontSize:13, color:'var(--theme-text-secondary)', textAlign:'center', margin:0 }}>
              {uploading ? 'Enviando...' : 'Clique ou arraste uma imagem'}
            </p>
            <p style={{ fontSize:11, color:'var(--theme-text-muted)', textAlign:'center', margin:'-8px 0 0' }}>
              JPG, PNG ou WebP · Máx. 5MB
            </p>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#dc2626', width:'100%', textAlign:'center', boxSizing:'border-box' }}>
                {error}
              </div>
            )}

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleFile(e.target.files[0])} style={{ display:'none' }} />

            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ width:'100%', padding:'10px', borderRadius:8, border:'1px solid var(--theme-border)', background: uploading ? 'var(--theme-border)' : 'var(--theme-primary)', color: uploading ? 'var(--theme-text-muted)' : 'var(--theme-primary-text)', cursor: uploading ? 'default' : 'pointer', fontSize:13, fontWeight:600 }}
            >
              {uploading ? 'Enviando...' : <span style={{ display:'flex', alignItems:'center', gap:6 }}><Camera size={14} /> Escolher foto</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
