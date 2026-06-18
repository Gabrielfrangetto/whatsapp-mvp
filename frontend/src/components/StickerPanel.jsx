import { useState, useEffect, useRef } from 'react';
import { api, useAuth } from '../context/AuthContext';
import StickerItem from './StickerItem';
import StickerAddForm from './StickerAddForm';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

export default function StickerPanel({ conversationId, onClose, onSent }) {
  const { agent } = useAuth();
  const [tab, setTab]           = useState('favorites');
  const [stickers, setStickers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [addName, setAddName]   = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef    = useRef();
  const pendingFile = useRef(null);
  const isAdmin = agent?.role === 'ADMIN';

  async function load() {
    try {
      const [s, f] = await Promise.all([
        api.get('/stickers'),
        api.get('/favorites'),
      ]);
      setStickers(s.data);
      setFavorites(f.data);
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

  async function handleSendFavorite(fav) {
    if (sending) return;
    setSending(fav.id);
    try {
      await api.post(`/favorites/send/${conversationId}`, { favoriteId: fav.id });
      setFavorites(prev => {
        const updated = prev.find(f => f.id === fav.id);
        if (!updated) return prev;
        const rest = prev.filter(f => f.id !== fav.id);
        return [{ ...updated, lastUsedAt: new Date().toISOString() }, ...rest];
      });
      onSent?.();
      onClose();
    } catch (e) {
      console.error('[StickerPanel] sendFavorite error', e);
    } finally {
      setSending(null);
    }
  }

  async function handleUnfavorite(fav, e) {
    e.stopPropagation();
    if (!confirm('Remover dos favoritos?')) return;
    try {
      await api.post('/favorites/toggle', { mediaUrl: fav.mediaUrl });
      setFavorites(prev => prev.filter(f => f.id !== fav.id));
    } catch {}
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

  const emptyMsg = (msg) => (
    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 12, padding: '24px 0' }}>{msg}</div>
  );

  return (
    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, width: 300, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)', borderRadius: 12, boxShadow: '0 -4px 32px rgba(0,0,0,0.16)', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: 360, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--theme-border)', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Stickers</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isAdmin && !showAdd && tab === 'all' && (
            <>
              <button onClick={() => inputRef.current?.click()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '2px solid var(--theme-primary)', background: 'none', color: 'var(--theme-primary)', cursor: 'pointer', fontWeight: 700 }}>
                + Adicionar
              </button>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            </>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--theme-border)', flexShrink: 0 }}>
        {[['favorites', '★ Favoritos'], ['all', 'Todos']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '7px 0', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid var(--theme-primary)' : '2px solid transparent', color: tab === key ? 'var(--theme-primary)' : 'var(--theme-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'color 0.15s, border-color 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Add form (only in Todos tab) */}
      {showAdd && tab === 'all' && (
        <StickerAddForm previewUrl={previewUrl} addName={addName} setAddName={setAddName} onUpload={handleUpload} onCancel={cancelAdd} uploading={uploading} />
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignContent: 'start' }}>
        {loading ? emptyMsg('Carregando...') : tab === 'favorites' ? (
          favorites.length === 0
            ? emptyMsg('Nenhum sticker favoritado')
            : favorites.map(fav => (
              <StickerItem
                key={fav.id}
                sticker={{ id: fav.id, url: `${API_URL}/api/media/${fav.mediaUrl}`, name: fav.name || '—' }}
                sending={sending === fav.id}
                isAdmin={true}
                onSend={() => handleSendFavorite(fav)}
                onDelete={(_, e) => handleUnfavorite(fav, e)}
              />
            ))
        ) : (
          stickers.length === 0
            ? emptyMsg('Nenhum sticker cadastrado')
            : stickers.map(s => (
              <StickerItem key={s.id} sticker={s} sending={sending === s.id} isAdmin={isAdmin} onSend={handleSend} onDelete={handleDelete} />
            ))
        )}
      </div>
    </div>
  );
}
