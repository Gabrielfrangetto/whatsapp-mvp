import { useState } from 'react';

export default function StickerItem({ sticker, sending, isAdmin, onSend, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', cursor: sending ? 'wait' : 'pointer', width: '100%' }}
      title={sticker.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={() => !sending && onSend(sticker)}
        style={{
          borderRadius: 8, overflow: 'hidden',
          border: `2px solid ${hovered && !sending ? 'var(--theme-primary)' : 'var(--theme-border)'}`,
          background: 'var(--theme-bg)', aspectRatio: '1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: sending ? 0.4 : 1, transition: 'border-color 0.15s, opacity 0.15s',
        }}
      >
        <img src={sticker.url} alt={sticker.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      {isAdmin && hovered && !sending && (
        <button
          onClick={e => onDelete(sticker.id, e)}
          style={{
            position: 'absolute', top: -5, right: -5, width: 17, height: 17,
            borderRadius: '50%', background: '#ef4444', border: '2px solid var(--theme-bg-secondary)',
            color: '#fff', cursor: 'pointer', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, lineHeight: 1, fontWeight: 700,
          }}
        >
          ×
        </button>
      )}
      <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', textAlign: 'center', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {sticker.name}
      </div>
    </div>
  );
}
