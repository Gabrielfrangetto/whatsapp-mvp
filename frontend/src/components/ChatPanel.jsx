import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Paperclip, Send, Loader2, Check, Sticker } from 'lucide-react';
import { useAuth, api } from '../context/AuthContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import DateSeparator from './DateSeparator';
import StatusBadge from './StatusBadge';
import MediaUpload from './MediaUpload';
import TemplateModal from './TemplateModal';
import ResolveModal from './ResolveModal';
import StickerPanel from './StickerPanel';
import { getInitials, getAvatarColor, getDateKey, formatDateLabel } from '../utils/format';
import metaLogo from '../assets/images/meta_logo.svg';

const WINDOW_MS = 24 * 60 * 60 * 1000;

function computeWindowOpen(msgs, conversation) {
  if (conversation?.lastMessageDirection === 'INBOUND' && conversation?.lastMessageAt) {
    return Date.now() - new Date(conversation.lastMessageAt).getTime() < WINDOW_MS;
  }
  const lastInbound = [...msgs].reverse().find(m => m.direction === 'INBOUND');
  if (!lastInbound) return false;
  return Date.now() - new Date(lastInbound.timestamp).getTime() < WINDOW_MS;
}

export default function ChatPanel({ conversationId, socketControls, onMessageSent }) {
  const { agent } = useAuth();
  const [messages, setMessages]           = useState([]);
  const [conversation, setConversation]   = useState(null);
  const [showMedia, setShowMedia]         = useState(false);
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);
  const [pastedImage, setPastedImage]     = useState(null);
  const [typingAgent, setTypingAgent]     = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showResolve, setShowResolve]     = useState(false);
  const [showStickers, setShowStickers]   = useState(false);
  const [windowOpen, setWindowOpen]       = useState(true);
  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const prevConvId   = useRef(null);
  const stickerBtnRef = useRef(null);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/conversations/${id}/messages`);
      const msgs = data.messages || [];
      setMessages(msgs);
      setConversation(data.conversation || null);
      setWindowOpen(computeWindowOpen(msgs, data.conversation));
    } catch {}
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setConversation(null); setWindowOpen(true); return; }
    if (prevConvId.current && prevConvId.current !== conversationId) {
      socketControls.leaveConversation(prevConvId.current);
    }
    prevConvId.current = conversationId;
    socketControls.joinConversation(conversationId);
    loadMessages(conversationId);
    setTypingAgent(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const handlers = {
      handleMessage: (msg) => {
        if (msg.conversationId !== conversationId) return;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          if (msg.direction === 'INBOUND') setWindowOpen(true);
          return next;
        });
        setTypingAgent(null);
      },
      handleStatus: ({ waMessageId, status }) => {
        setMessages(prev => prev.map(m => m.waMessageId === waMessageId ? { ...m, status } : m));
      },
      handleTyping: ({ agentName, conversationId: cid }) => {
        if (cid !== conversationId) return;
        setTypingAgent(agentName);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingAgent(null), 3000);
      },
      handleStoppedTyping: ({ conversationId: cid }) => {
        if (cid === conversationId) setTypingAgent(null);
      },
      reloadMessages: () => loadMessages(conversationId),
    };
    socketControls._registerChatHandlers(handlers);
    return () => { clearTimeout(typingTimer.current); socketControls._registerChatHandlers(null); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingAgent]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (conversationId) {
      socketControls.startTyping(conversationId);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socketControls.stopTyping(conversationId), 1500);
    }
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const ext = item.type.split('/')[1] || 'png';
        const namedFile = new File([file], `imagem_colada_${Date.now()}.${ext}`, { type: item.type });
        setPastedImage({ file: namedFile, preview: URL.createObjectURL(namedFile) });
        return;
      }
    }
  }, []);

  const handleSend = async () => {
    if ((!text.trim() && !pastedImage) || sending || !conversationId) return;
    const msg = text;
    setText('');
    setSending(true);
    socketControls.stopTyping(conversationId);
    try {
      if (pastedImage) {
        const formData = new FormData();
        formData.append('file', pastedImage.file);
        if (msg.trim()) formData.append('caption', msg.trim());
        await api.post(`/conversations/${conversationId}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        URL.revokeObjectURL(pastedImage.preview);
        setPastedImage(null);
        onMessageSent?.(conversationId, msg.trim() || '📎 Arquivo');
      } else {
        await api.post(`/conversations/${conversationId}/messages`, { text: msg });
        onMessageSent?.(conversationId, msg);
      }
      loadMessages(conversationId);
    } catch { setText(msg); }
    finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try {
      await api.patch(`/conversations/${conversationId}/status`, { status });
      setConversation(prev => prev ? { ...prev, status } : prev);
    } catch {}
  };

  if (!conversationId) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--theme-bg-chat)', gap: 16 }}>
      <MessageSquare size={64} style={{ opacity: .3, color: 'var(--theme-text)' }} />
      <p style={{ color: 'var(--theme-text)', fontSize: 16, fontWeight: 500, margin: 0 }}>Selecione uma conversa</p>
      <p style={{ color: 'var(--theme-text-secondary)', fontSize: 14, margin: 0 }}>Escolha uma conversa na lista ao lado</p>
    </div>
  );

  const name = conversation?.contact?.name || conversation?.contact?.phone || '...';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg-chat)', minWidth: 0 }}>
      {/* Header */}
      <div style={{ background: 'var(--theme-primary)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
          {getInitials(name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--theme-header-text)', fontSize: 15 }}>{name}</div>
          <div style={{ fontSize: 12, color: typingAgent ? '#a5f3d0' : 'var(--theme-header-sub)', fontStyle: typingAgent ? 'italic' : 'normal' }}>
            {typingAgent ? `${typingAgent} está digitando...` : conversation?.contact?.phone}
          </div>
        </div>
        {conversation && <StatusBadge status={conversation.status} />}
        {conversation?.status !== 'RESOLVED'
          ? <button onClick={() => setShowResolve(true)} style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--theme-primary-text)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Check size={13} /> Resolver</button>
          : <button onClick={() => handleStatus('OPEN')} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--theme-primary-text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reabrir</button>
        }
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 8%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((m, i) => {
          const showSep = i === 0 || getDateKey(m.timestamp) !== getDateKey(messages[i - 1].timestamp);
          return (
            <div key={m.id}>
              {showSep && <DateSeparator label={formatDateLabel(m.timestamp)} />}
              <MessageBubble message={m} />
            </div>
          );
        })}
        {typingAgent && <TypingIndicator name={typingAgent} />}
        <div ref={bottomRef} />
      </div>

      {/* Pasted image preview */}
      {pastedImage && windowOpen && (
        <div style={{ background: 'var(--theme-bg-tertiary)', padding: '8px 16px 0', display: 'flex', alignItems: 'flex-start', borderTop: '1px solid var(--theme-border)' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={pastedImage.preview} alt="preview" style={{ maxHeight: 100, maxWidth: 200, borderRadius: 8, display: 'block', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
            <button
              onClick={() => { URL.revokeObjectURL(pastedImage.preview); setPastedImage(null); }}
              style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#ff4444', border: '2px solid var(--theme-bg-tertiary)', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ background: 'var(--theme-bg-tertiary)', padding: '10px 16px', display: 'flex', alignItems: 'flex-end', gap: 8, borderTop: '1px solid var(--theme-border)' }}>
        {windowOpen ? (
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() || pastedImage) handleSend(); } }}
            onPaste={handlePaste}
            placeholder="Digite uma mensagem..."
            rows={1}
            style={{ flex: 1, resize: 'none', border: '1px solid var(--theme-border)', borderRadius: 20, padding: '10px 16px', fontSize: 14, outline: 'none', background: 'var(--theme-bg-input)', color: 'var(--theme-text)', maxHeight: 120, overflowY: 'auto', lineHeight: 1.5, fontFamily: 'inherit' }}
          />
        ) : (
          <div style={{ flex: 1, border: '1px solid var(--theme-primary)', borderRadius: 16, padding: '10px 18px', background: 'var(--theme-primary-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 0 0 1px var(--theme-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <img src={metaLogo} alt="Meta" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Janela de 24h encerrada</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--theme-text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
              A Meta permite mensagens livres somente até 24h após a última mensagem do cliente. Use um modelo de mensagem aprovado para retomar o contato.
            </span>
            <button onClick={() => setShowTemplates(true)} style={{ marginTop: 4, padding: '6px 20px', borderRadius: 20, border: '2px solid var(--theme-primary)', background: 'none', color: 'var(--theme-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Enviar modelo de mensagem
            </button>
          </div>
        )}
        <button onClick={() => setShowMedia(true)} disabled={!windowOpen} title="Enviar arquivo"
          style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--theme-border)', background: 'var(--theme-bg-input)', cursor: windowOpen ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: windowOpen ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)', opacity: windowOpen ? 1 : 0.4 }}>
          <Paperclip size={18} />
        </button>
        <div ref={stickerBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => windowOpen && setShowStickers(v => !v)}
            disabled={!windowOpen}
            title="Stickers"
            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${showStickers ? 'var(--theme-primary)' : 'var(--theme-border)'}`, background: showStickers ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-input)', cursor: windowOpen ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: windowOpen ? (showStickers ? 'var(--theme-primary)' : 'var(--theme-text-secondary)') : 'var(--theme-text-muted)', opacity: windowOpen ? 1 : 0.4, transition: 'background 0.15s, border-color 0.15s, color 0.15s' }}
          >
            <Sticker size={19} strokeWidth={1.8} />
          </button>
          {showStickers && (
            <StickerPanel
              conversationId={conversationId}
              onClose={() => setShowStickers(false)}
              onSent={() => { setShowStickers(false); loadMessages(conversationId); }}
            />
          )}
        </div>
        <button onClick={handleSend} disabled={(!text.trim() && !pastedImage) || sending || !windowOpen}
          style={{ width: 40, height: 40, borderRadius: '50%', border: (text.trim() || pastedImage) && !sending && windowOpen ? '2px solid var(--theme-primary)' : '2px solid var(--theme-border)', background: 'none', cursor: (text.trim() || pastedImage) && !sending && windowOpen ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: (text.trim() || pastedImage) && !sending && windowOpen ? 'var(--theme-primary)' : 'var(--theme-text-muted)', flexShrink: 0, opacity: windowOpen ? 1 : 0.4, transition: 'border-color 0.2s, color 0.2s' }}>
          {sending ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>

      {showMedia && <MediaUpload conversationId={conversationId} onClose={() => setShowMedia(false)} onSent={() => { setShowMedia(false); loadMessages(conversationId); }} />}
      {showTemplates && <TemplateModal conversationId={conversationId} onClose={() => setShowTemplates(false)} onSent={() => { setShowTemplates(false); loadMessages(conversationId); }} />}
      {showResolve && <ResolveModal conversationId={conversationId} onClose={() => setShowResolve(false)} onResolved={() => { setShowResolve(false); setConversation(prev => prev ? { ...prev, status: 'RESOLVED' } : prev); loadMessages(conversationId); }} />}
    </div>
  );
}
