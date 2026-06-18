import { useState, useEffect, useRef } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import StickerItem from './StickerItem';

export default function StickerPanel({ conversationId, onClose, onSent }) {
  const { agent } = useAuth();
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [addName, setAddName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef();
  const pendingFile = useRef(null);
  const isAdmin = agent?.role === 'ADMIN';

  async function load() {
    try {
      const { data } = await api.get('/stickers');
      setStickers(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSend(sticker) {
    if (sending) return;
    setSending(sticker.id);
    try {
      await api.post(`/stickers/send/${conversationId}`, { stickerId: sticker.id });
      onSent?.();
      onClose();
    } catch (e) {
      console.error('[StickerPanel] send error', e);
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Remover este sticker?')) return;
    try {
      await api.delete(`/stickers/${id}`);
      setStickers(prev => prev.filter(s => s.id !== id));
    } catch {}
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFile.current = file;
    setPreviewUrl(URL.createObjectURL(file));
    setAddName(file.name.replace(/\.[^.]+$/, ''));
    setShowAdd(true);
    e.target.value = '';
  }

  function cancelAdd() {
    setShowAdd(false);
    setAddName('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    pendingFile.current = null;
  }

  async function handleUpload() {
    const file = pendingFile.current;
    if (!file || !addName.trim()) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await api.post('/stickers', { name: addName.trim(), url });
      cancelAdd();
      load();
    } catch (e) {
      console.error('[StickerPanel] upload error', e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      right: 0,
      width: 300,
      background: 'var(--theme-bg-secondary)',
      border: '1px solid var(--theme-border)',
      borderRadius: 12,
      boxShadow: '0 -4px 32px rgba(0,0,0,0.16)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 340,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid var(--theme-border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Stickers</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isAdmin && !showAdd && (
            <>
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '2px solid var(--theme-primary)',
                  background: 'none',
                  color: 'var(--theme-primary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                + Adicionar
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--theme-text-muted)',
              fontSize: 20,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--theme-border)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--theme-border)' }}
              />
            )}
            <input
              autoFocus
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpload()}
              placeholder="Nome do sticker"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 7,
                border: '1px solid var(--theme-border)',
                fontSize: 12,
                background: 'var(--theme-bg-input)',
                color: 'var(--theme-text)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleUpload}
              disabled={uploading || !addName.trim()}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 7,
                border: '2px solid var(--theme-primary)',
                background: 'none',
                color: 'var(--theme-primary)',
                cursor: uploading || !addName.trim() ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 700,
                opacity: !addName.trim() ? 0.5 : 1,
              }}
            >
              {uploading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={cancelAdd}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: '1px solid var(--theme-border)',
                background: 'none',
                color: 'var(--theme-text-muted)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        alignContent: 'start',
      }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 12, padding: '24px 0' }}>
            Carregando...
          </div>
        ) : stickers.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 12, padding: '24px 0' }}>
            Nenhum sticker cadastrado
          </div>
        ) : stickers.map(s => (
          <StickerItem
            key={s.id}
            sticker={s}
            sending={sending === s.id}
            isAdmin={isAdmin}
            onSend={handleSend}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
