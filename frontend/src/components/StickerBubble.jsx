import { useState } from 'react';
import { formatMsgTime } from '../utils/format';

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

export default function StickerBubble({ message, showAgentName, isOut, onSaveSticker, onFavorite, isFavorited }) {
  const [hovered, setHovered]       = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [dotHovered, setDotHovered] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';
  const showDot = !isOut && (hovered || showMenu);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start', gap: 3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
    >
      {/* Name bubble — only for outbound */}
      {isOut && showAgentName && message.agentName && (
        <div style={{ background: 'var(--theme-bg-bubble-out)', borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text)', alignSelf: 'flex-end' }}>
          {message.agentName}
        </div>
      )}

      {/* Raw sticker image */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={`${API_URL}/api/media/${message.mediaUrl}`}
          alt="sticker"
          style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }}
          onClick={() => window.open(`${API_URL}/api/media/${message.mediaUrl}`, '_blank')}
          onError={e => { e.target.style.display = 'none'; }}
        />

        {/* Corner backdrop for inbound */}
        {!isOut && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 38, height: 38,
            borderRadius: '0 0 0 38px',
            background: 'var(--theme-bg-bubble-in)',
            pointerEvents: 'none',
            zIndex: 4,
            opacity: (hovered || showMenu) ? 1 : 0,
            transition: 'opacity 0.18s ease',
          }} />
        )}

        {/* 3-dot button */}
        {showDot && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            onMouseEnter={() => setDotHovered(true)}
            onMouseLeave={() => setDotHovered(false)}
            style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--theme-text)', fontSize: 15, lineHeight: 1, zIndex: 5 }}
          >⋮</button>
        )}

        {/* Dropdown */}
        {showDot && (
          <div
            style={{ position: 'absolute', top: 30, right: 4, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 20, minWidth: 150, overflow: 'hidden', opacity: showMenu ? 1 : 0, transform: showMenu ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)', transition: 'opacity 0.1s ease, transform 0.1s ease', pointerEvents: showMenu ? 'auto' : 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {onSaveSticker && (
              <button onClick={() => { setShowMenu(false); onSaveSticker(message); }} style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                💾 Salvar sticker
              </button>
            )}
            {onFavorite && (
              <button onClick={() => { setShowMenu(false); onFavorite(message); }} style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: isFavorited ? 'var(--theme-primary)' : 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                {isFavorited ? '★ Favoritado' : '☆ Favoritar'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time bubble */}
      <div style={{ background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)', borderRadius: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3, alignSelf: isOut ? 'flex-end' : 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{formatMsgTime(message.timestamp)}</span>
        {isOut && <Ticks status={message.status} />}
      </div>
    </div>
  );
}
