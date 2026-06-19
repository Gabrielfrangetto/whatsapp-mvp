import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatMsgTime } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

function Ticks({ status }) {
  const color = status === 'READ' ? '#53bdeb' : 'var(--theme-text-muted)';
  if (status === 'FAILED') return <span style={{ fontSize: 12, color: '#ef4444' }}>✗</span>;
  if (status === 'DELIVERED' || status === 'READ') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', color }}>
      <span style={{ fontSize: 12 }}>✓</span><span style={{ fontSize: 12, marginLeft: -5 }}>✓</span>
    </span>
  );
  if (status === 'SENT') return <span style={{ fontSize: 12, color }}>✓</span>;
  return null;
}

function StickerModal({ message, onSaveSticker, onFavorite, isFavorited, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const btnBase = {
    flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--theme-border)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--theme-bg)',
          borderRadius: 18,
          padding: '20px 20px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          position: 'relative',
          minWidth: 230,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--theme-text-muted)', fontSize: 16, lineHeight: 1,
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >✕</button>

        <img
          src={`${API_URL}/api/media/${message.mediaUrl}`}
          alt="sticker"
          style={{ width: 200, height: 200, objectFit: 'contain' }}
        />

        {(onFavorite || onSaveSticker) && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {onFavorite && (
              <button
                onClick={() => onFavorite(message)}
                style={{
                  ...btnBase,
                  background: isFavorited ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-secondary)',
                  borderColor: isFavorited ? 'var(--theme-primary)' : 'var(--theme-border)',
                  color: isFavorited ? 'var(--theme-primary)' : 'var(--theme-text)',
                }}
                onMouseEnter={e => { if (!isFavorited) e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isFavorited ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-secondary)'; }}
              >
                {isFavorited ? '★ Favoritado' : '☆ Favoritar'}
              </button>
            )}
            {onSaveSticker && (
              <button
                onClick={() => { onSaveSticker(message); onClose(); }}
                style={{ ...btnBase, background: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--theme-bg-secondary)'; }}
              >
                💾 Adicionar ao pack
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function StickerBubble({ message, showAgentName, isOut, onSaveSticker, onFavorite, isFavorited }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start', gap: 3 }}>
      {isOut && showAgentName && message.agentName && (
        <div style={{ background: 'var(--theme-bg-bubble-out)', borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text)', alignSelf: 'flex-end' }}>
          {message.agentName}
        </div>
      )}

      <img
        src={`${API_URL}/api/media/${message.mediaUrl}`}
        alt="sticker"
        style={{ width: 120, height: 120, objectFit: 'contain', display: 'block', cursor: 'pointer' }}
        onClick={() => setShowModal(true)}
        onError={e => { e.target.style.display = 'none'; }}
      />

      <div style={{ background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)', borderRadius: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3, alignSelf: isOut ? 'flex-end' : 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{formatMsgTime(message.timestamp)}</span>
        {isOut && <Ticks status={message.status} />}
      </div>

      {showModal && (
        <StickerModal
          message={message}
          onSaveSticker={onSaveSticker}
          onFavorite={onFavorite}
          isFavorited={isFavorited}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
