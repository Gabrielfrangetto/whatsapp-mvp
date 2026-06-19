import { useState, useRef, useEffect } from 'react';
import { SmilePlus } from 'lucide-react';
import { getInitials, formatMsgTime, getAvatarColor } from '../utils/format';
import StickerBubble from './StickerBubble';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

function QuickReactBar({ onReact, isOut }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 6px)',
      [isOut ? 'right' : 'left']: 0,
      background: 'var(--theme-bg)',
      borderRadius: 24,
      boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      padding: '5px 8px',
      display: 'flex',
      gap: 2,
      zIndex: 20,
    }}>
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, padding: '2px 3px', borderRadius: '50%',
            lineHeight: 1, transition: 'transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function AgentAvatar({ name, color, avatarUrl, size = 26 }) {
  const bg = color || '#25D366';
  const fallbackStyle = { width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 700, lineHeight: 1, flexShrink: 0, userSelect: 'none' };
  if (avatarUrl) {
    return (
      <>
        <img
          src={avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}${avatarUrl}`}
          alt={name}
          title={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
        <div title={name} style={{ ...fallbackStyle, display: 'none' }}>
          {getInitials(name || 'A')}
        </div>
      </>
    );
  }
  return (
    <div title={name} style={fallbackStyle}>
      {getInitials(name || 'A')}
    </div>
  );
}

function emojiToTwemojiUrl(emoji) {
  const codePoints = [...emoji]
    .map(c => c.codePointAt(0).toString(16).toLowerCase())
    .filter(cp => cp !== 'fe0f');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints.join('-')}.svg`;
}

function ReactionBubble({ reactions, isOut }) {
  if (!reactions) return null;
  const entries = Object.values(reactions);
  if (entries.length === 0) return null;

  const counts = entries.reduce((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOut ? 'flex-end' : 'flex-start',
      gap: 2,
      marginTop: -5,
      position: 'relative',
      zIndex: 1,
    }}>
      {Object.entries(counts).map(([emoji, count]) => (
        <span key={emoji} style={{
          background: 'var(--theme-bg)',
          borderRadius: 10,
          padding: '2px 3px 3px',
          boxShadow: '0 0 0 1px var(--theme-border), 0 1px 3px rgba(0,0,0,0.10)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          <span style={{
            flex: '0 0 14px',
            height: 14,
            marginTop: 2,
            backgroundImage: `url(${emojiToTwemojiUrl(emoji)})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }} />
          {count > 1 && <span style={{ fontSize: 11, color: 'var(--theme-text-secondary)', lineHeight: 1 }}>{count}</span>}
        </span>
      ))}
    </div>
  );
}

function Ticks({ status }) {
  const color = status === 'READ' ? '#53bdeb' : 'var(--theme-text-muted)';
  if (status === 'FAILED') return <span style={{ fontSize: 12, color: '#ef4444' }}>✗</span>;
  if (status === 'DELIVERED' || status === 'READ') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', color }}>
      <span style={{ fontSize: 12 }}>✓</span>
      <span style={{ fontSize: 12, marginLeft: -5 }}>✓</span>
    </span>
  );
  if (status === 'SENT') return <span style={{ fontSize: 12, color }}>✓</span>;
  return null;
}

export default function MessageBubble({ message, showAvatar, showAgentName, showContactAvatar, contactName, contactProfilePic, onReact, onReply, onScrollToMessage, isHighlighted, onSaveSticker, onFavorite, isFavorited }) {
  const isOut      = message.direction === 'OUTBOUND';
  const isInternal = message.direction === 'INTERNAL' || message.type === 'INTERNAL';
  const isSticker  = (message.type === 'STICKER' || (message.type === 'IMAGE' && message.content === 'Sticker')) && !!message.mediaUrl;
  const isImage    = message.type === 'IMAGE' && !!message.mediaUrl && !isSticker;
  const API_URL    = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';
  const [hovered, setHovered]       = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [dotHovered, setDotHovered] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [imgModal, setImgModal]     = useState(false);
  const pickerRef  = useRef(null);
  const menuRef    = useRef(null);
  const bubbleRef  = useRef(null);
  const dotBtnRef  = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

  if (isInternal) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div style={{ background: 'var(--theme-primary-subtle)', border: '1px solid var(--theme-primary-subtle)', borderRadius: 10, padding: '10px 14px', maxWidth: '80%', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-primary-text)', fontSize: 11, fontWeight: 700, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
            {getInitials(message.agentName || 'A')}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message.content}</p>
            <span style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 3, display: 'block' }}>{formatMsgTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isSticker) {
    const stickerReplyBtn = hovered && (
      <button
        onClick={(e) => { e.stopPropagation(); onReply && onReply(message); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', lineHeight: 1, display: 'flex', color: 'var(--theme-text-muted)' }}
        title="Responder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
        </svg>
      </button>
    );
    return (
      <div
        style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!isOut && (
          <div style={{ width: 26, flexShrink: 0 }}>
            {showContactAvatar && <AgentAvatar name={contactName || '?'} color={getAvatarColor(contactName || '?')} avatarUrl={contactProfilePic} size={26} />}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOut && stickerReplyBtn}
          <StickerBubble message={message} showAgentName={showAgentName} isOut={isOut} onSaveSticker={onSaveSticker} onFavorite={onFavorite} isFavorited={isFavorited} />
          {!isOut && stickerReplyBtn}
        </div>
        {isOut && <div style={{ width: 26, flexShrink: 0 }}>{showAvatar && <AgentAvatar name={message.agentName} color={message.agentColor} avatarUrl={message.agentAvatarUrl} size={26} />}</div>}
      </div>
    );
  }

  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  const reactBtn = onReact && (hovered || showPicker) && (
    <div ref={pickerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {showPicker && (
        <QuickReactBar isOut={isOut} onReact={(emoji) => { onReact(emoji); setShowPicker(false); setHovered(false); }} />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setShowPicker(v => !v); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 3, borderRadius: '50%', lineHeight: 1, display: 'flex',
          color: 'var(--theme-text-muted)', transition: 'color 0.15s',
        }}
        title="Reagir"
      ><SmilePlus size={16} strokeWidth={1.5} /></button>
    </div>
  );

  const replyBtn = (hovered || showPicker || showMenu) && (
    <button
      onClick={(e) => { e.stopPropagation(); onReply && onReply(message); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 3, borderRadius: '50%', lineHeight: 1, display: 'flex',
        color: 'var(--theme-text-muted)', transition: 'color 0.15s',
      }}
      title="Responder"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 17 4 12 9 7"/>
        <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
      </svg>
    </button>
  );

  const hasMenuItems = isImage || !!(onSaveSticker || onFavorite);
  const showDotMenu  = isImage && (hovered || showMenu);
  const backdropVisible = isImage;

  const coloredBubble = (
    <div style={{ position: 'relative', transition: 'filter 0.3s', filter: isHighlighted ? 'brightness(0.82)' : 'none' }}>
      <div style={{ background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)', borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: isImage ? '4px 4px 5px' : '8px 12px 5px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {showAgentName && message.agentName && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 3, whiteSpace: 'nowrap', paddingLeft: isImage ? 6 : 0, paddingTop: isImage ? 4 : 0 }}>
            {message.agentName}
          </div>
        )}
        {message.quotedMessage && (() => {
          const q = message.quotedMessage;
          const isQSticker = q.type === 'STICKER' || q.content === 'Sticker';
          const isQImg = q.type === 'IMAGE' && !isQSticker;
          const hasMedia = (isQImg || isQSticker) && q.mediaUrl;
          return (
            <div
              onClick={() => onScrollToMessage && onScrollToMessage(q.id)}
              style={{ borderLeft: '3px solid var(--theme-primary)', borderRadius: '0 4px 4px 0', background: isOut ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)', padding: '4px 8px', marginLeft: isImage ? 4 : 0, marginRight: isImage ? 4 : 0, marginTop: isImage ? 4 : 0, marginBottom: 6, overflow: 'hidden', cursor: onScrollToMessage ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-primary)', marginBottom: hasMedia ? 4 : 2 }}>
                {q.senderName}
              </div>
              {hasMedia ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img
                    src={`${API_URL}/api/media/${q.mediaUrl}`}
                    alt=""
                    style={{ width: 48, height: 48, objectFit: isQImg ? 'cover' : 'contain', borderRadius: 4, display: 'block' }}
                  />
                  {isQImg && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', opacity: 0.8 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Foto
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isQImg ? '📷 Foto' : q.content}
                </div>
              )}
            </div>
          );
        })()}
        {isImage && (
          <img
            src={`${API_URL}/api/media/${message.mediaUrl}`}
            alt="imagem"
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'zoom-in' }}
            onClick={(e) => { e.stopPropagation(); setImgModal(true); }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        {imgModal && (
          <div
            onClick={() => setImgModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: 12, right: 16, display: 'flex', alignItems: 'center', gap: 20, zIndex: 10000 }}
            >
              <a
                href={`${API_URL}/api/media/${message.mediaUrl}`}
                download
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#fff', display: 'flex', alignItems: 'center', padding: 4,
                }}
                title="Baixar imagem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </a>
              <button
                onClick={() => setImgModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#fff', fontSize: 32, lineHeight: 1, padding: 4,
                }}
              >×</button>
            </div>
            <img
              src={`${API_URL}/api/media/${message.mediaUrl}`}
              alt="imagem"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 4 }}
            />
          </div>
        )}
        <p style={{ margin: isImage ? '4px 8px 0' : 0, fontSize: 14, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', lineHeight: 1.5, wordBreak: 'break-word', display: isImage && (message.content === '📷 Imagem' || message.content === '' || message.content === 'Sticker') ? 'none' : 'block' }}>
          {message.content}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2, padding: isImage ? '0 8px' : 0 }}>
          <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>{formatMsgTime(message.timestamp)}</span>
          {isOut && <Ticks status={message.status} />}
        </div>
      </div>

      {/* Corner backdrop — always in DOM for inbound images, fades in/out */}
      {backdropVisible && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 38, height: 38,
          borderRadius: '0 12px 0 38px',
          background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)',
          pointerEvents: 'none',
          zIndex: 4,
          opacity: (hovered || showMenu) ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }} />
      )}

      {/* 3-dot button */}
      {showDotMenu && (
        <button
          ref={dotBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!showMenu) {
              const rect = dotBtnRef.current?.getBoundingClientRect();
              setOpenUpward(rect ? rect.bottom + 110 > window.innerHeight : false);
            }
            setShowMenu(v => !v);
          }}
          onMouseEnter={() => setDotHovered(true)}
          onMouseLeave={() => setDotHovered(false)}
          style={{
            position: 'absolute', top: 4, right: 4,
            background: 'transparent',
            border: 'none', borderRadius: '50%',
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', fontSize: 15, lineHeight: 1, zIndex: 5,
          }}
        >⋮</button>
      )}

      {/* Dropdown menu — always in DOM when showDotMenu, fades in/out */}
      {showDotMenu && (
        <div
          style={{
            position: 'absolute',
            ...(openUpward ? { bottom: 30, top: 'auto' } : { top: 30, bottom: 'auto' }),
            right: 4,
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border)',
            borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            zIndex: 20, minWidth: 150, overflow: 'hidden',
            opacity: showMenu ? 1 : 0,
            transform: showMenu ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
            transition: 'opacity 0.1s ease, transform 0.1s ease',
            pointerEvents: showMenu ? 'auto' : 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowMenu(false); onReply && onReply(message); }}
            style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            ↩ Responder
          </button>
          <a
            href={`${API_URL}/api/media/${message.mediaUrl}`}
            download
            onClick={() => setShowMenu(false)}
            style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            ⬇️ Baixar imagem
          </a>
          {onSaveSticker && (
            <button
              onClick={() => { setShowMenu(false); onSaveSticker(message); }}
              style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              💾 Salvar sticker
            </button>
          )}
          {onFavorite && (
            <button
              onClick={() => { setShowMenu(false); onFavorite(message); }}
              style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: isFavorited ? 'var(--theme-primary)' : 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {isFavorited ? '★ Favoritado' : '☆ Favoritar'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const bubble = (
    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', marginBottom: hasReactions ? 8 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isOut && replyBtn}
        {isOut && reactBtn}
        {coloredBubble}
        {!isOut && reactBtn}
        {!isOut && replyBtn}
      </div>
      <ReactionBubble reactions={message.reactions} isOut={isOut} />
    </div>
  );

  if (isOut) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowPicker(false); }}
      >
        {bubble}
        <div style={{ width: 26, flexShrink: 0 }}>
          {showAvatar && (
            <AgentAvatar name={message.agentName} color={message.agentColor} avatarUrl={message.agentAvatarUrl} size={26} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowPicker(false); }}
    >
      <div style={{ width: 26, flexShrink: 0 }}>
        {showContactAvatar && (
          <AgentAvatar name={contactName || '?'} color={getAvatarColor(contactName || '?')} avatarUrl={contactProfilePic} size={26} />
        )}
      </div>
      {bubble}
    </div>
  );
}
