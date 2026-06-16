// src/components/MediaUpload.jsx
import { useState, useRef } from 'react';
import { api } from '../context/AuthContext';
import { Paperclip, Image, Music, Video, FileText } from 'lucide-react';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/ogg,video/mp4,application/pdf,.doc,.docx,.xls,.xlsx,.txt';

function getFileIcon(mimetype) {
  if (mimetype.startsWith('image/')) return <Image size={20} />;
  if (mimetype.startsWith('audio/')) return <Music size={20} />;
  if (mimetype.startsWith('video/')) return <Video size={20} />;
  if (mimetype === 'application/pdf') return <FileText size={20} />;
  return <Paperclip size={20} />;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaUpload({ conversationId, onSent, onClose }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    if (f.size > 16 * 1024 * 1024) { setError('Arquivo muito grande. Máximo: 16MB'); return; }
    setFile(f);
    setError('');

    // Preview para imagens
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSend() {
    if (!file || sending) return;
    setSending(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(40);
      await api.post(`/conversations/${conversationId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(40 + pct * 0.5);
        },
      });

      setProgress(100);
      onSent?.();
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao enviar arquivo');
      setSending(false);
      setProgress(0);
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'#00000060', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{ background:'var(--theme-bg-secondary)', borderRadius:16, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:"'Segoe UI', sans-serif", overflow:'hidden', border:'1px solid var(--theme-border)' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--theme-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--theme-text)', margin:0 }}>Enviar arquivo</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--theme-text-muted)' }}>×</button>
        </div>

        <div style={{ padding:'20px' }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626', marginBottom:14 }}>
              {error}
            </div>
          )}

          {/* Drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              style={{ border:'2px dashed #ddd', borderRadius:12, padding:'36px 20px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#075E54'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd'}
            >
              <Paperclip size={40} style={{ marginBottom:12, color:'var(--theme-text-muted)' }} />
              <p style={{ fontSize:14, fontWeight:500, color:'var(--theme-text)', margin:'0 0 6px' }}>Clique ou arraste um arquivo</p>
              <p style={{ fontSize:12, color:'var(--theme-text-muted)', margin:0 }}>Imagens, áudio, vídeo, PDF, documentos — máx. 16MB</p>
              <input ref={inputRef} type="file" accept={ACCEPT} onChange={e => handleFile(e.target.files[0])} style={{ display:'none' }} />
            </div>
          ) : (
            <div style={{ border:'1px solid var(--theme-border)', borderRadius:12, overflow:'hidden' }}>
              {/* Preview imagem */}
              {preview && (
                <div style={{ background:'#f8f8f8', display:'flex', justifyContent:'center', padding:'16px', maxHeight:200, overflow:'hidden' }}>
                  <img src={preview} alt="preview" style={{ maxHeight:168, maxWidth:'100%', borderRadius:8, objectFit:'contain' }} />
                </div>
              )}

              {/* Info do arquivo */}
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'var(--theme-primary-subtle)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--theme-primary)' }}>
                  {getFileIcon(file.type)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:500, color:'var(--theme-text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</p>
                  <p style={{ fontSize:12, color:'var(--theme-text-muted)', margin:'2px 0 0' }}>{formatSize(file.size)}</p>
                </div>
                <button onClick={() => { setFile(null); setPreview(null); setProgress(0); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--theme-text-muted)', fontSize:18 }}>×</button>
              </div>

              {/* Progress bar */}
              {sending && (
                <div style={{ height:3, background:'#e0e0e0' }}>
                  <div style={{ height:'100%', background:'#25D366', width:`${progress}%`, transition:'width 0.3s' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--theme-border)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--theme-border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--theme-text-secondary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!file || sending}
            style={{ padding:'9px 18px', borderRadius:8, border:'none', background: file && !sending ? 'var(--theme-primary)' : 'var(--theme-border)', color: file && !sending ? 'var(--theme-primary-text)' : 'var(--theme-text-muted)', cursor: file && !sending ? 'pointer' : 'default', fontSize:13, fontWeight:600 }}
          >
            {sending ? `Enviando... ${Math.round(progress)}%` : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
