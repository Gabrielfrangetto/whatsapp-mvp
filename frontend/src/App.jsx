// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import TemplateModal from './components/TemplateModal';
import { AuthProvider, useAuth, api } from './context/AuthContext';
import { useSocket, disconnectSocket } from './hooks/useSocket';
import Login from './pages/Login';
import Agents from './pages/Agents';
import MediaUpload from './components/MediaUpload';
import ResolveModal from './components/ResolveModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Settings from './pages/Settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
function getAvatarColor(name = '') {
  const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#9B59B6','#E67E22'];
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { OPEN:['#25D366','Aberta'], PENDING:['#F59E0B','Pendente'], RESOLVED:['#9CA3AF','Resolvida'] };
  const [color, label] = map[status] || ['#9CA3AF', status];
  return (
    <span style={{ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:600 }}>
      {label}
    </span>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isOut      = message.direction === 'OUTBOUND';
  const isInternal = message.direction === 'INTERNAL' || message.type === 'INTERNAL';
  const isImage    = (message.type === 'IMAGE' && message.mediaUrl) || (message.content === '🎭 Sticker' && message.mediaUrl);
  const icon       = { SENT:'✓', DELIVERED:'✓✓', READ:'✓✓', FAILED:'✗' }[message.status] || '';
  const tickColor  = message.status === 'READ' ? '#53bdeb' : 'var(--theme-text-muted)';

  if (isInternal) {
    return (
      <div style={{ display:'flex', justifyContent:'center', margin:'8px 0' }}>
        <div style={{ background:'var(--theme-primary-subtle)', border:'1px solid var(--theme-primary-subtle)', borderRadius:10, padding:'10px 14px', maxWidth:'80%', display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--theme-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-primary-text)', fontSize:11, fontWeight:700, flexShrink:0, marginTop:1 }}>
            {getInitials(message.agentName || 'A')}
          </div>
          <div>
            <p style={{ margin:0, fontSize:12, color:'var(--theme-text-secondary)', lineHeight:1.6, whiteSpace:'pre-line' }}>{message.content}</p>
            <span style={{ fontSize:10, color:'var(--theme-text-muted)', marginTop:3, display:'block' }}>{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom:4 }}>
      <div style={{ maxWidth:'65%', background: isOut ? 'var(--theme-bg-bubble-out)' : 'var(--theme-bg-bubble-in)', borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: isImage ? '4px 4px 5px' : '8px 12px 5px', boxShadow:'0 1px 2px rgba(0,0,0,0.08)', overflow:'hidden' }}>
        {isImage && (
          <img
            src={`${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}/api/media/${message.mediaUrl}`}
            alt="imagem"
            style={{ maxWidth:'100%', maxHeight:240, borderRadius:8, display:'block', cursor:'pointer' }}
            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}/api/media/${message.mediaUrl}`, '_blank')}
            onError={e => { e.target.style.display='none'; }}
          />
        )}
        <p style={{ margin: isImage ? '4px 8px 0' : 0, fontSize:14, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', lineHeight:1.5, wordBreak:'break-word', display: isImage && (message.content === '📷 Imagem' || message.content === '') ? 'none' : 'block' }}>
          {message.content}
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:3, marginTop:2, padding: isImage ? '0 8px' : 0 }}>
          <span style={{ fontSize:11, color:'var(--theme-text-muted)' }}>{formatTime(message.timestamp)}</span>
          {isOut && <span style={{ fontSize:12, color: tickColor }}>{icon}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TypingIndicator ─────────────────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:4 }}>
      <div style={{ background:'var(--theme-bg-bubble-in)', borderRadius:'0 12px 12px 12px', padding:'10px 14px', boxShadow:'0 1px 2px rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, color:'var(--theme-text-secondary)' }}>{name} está digitando</span>
        <span style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'var(--theme-text-muted)', display:'inline-block', animation:`bounce 1s ${i*0.2}s infinite` }} />
          ))}
        </span>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────
function ConversationItem({ conv, selected, onClick }) {
  const name = conv.contact?.name || conv.contact?.phone || 'Desconhecido';
  return (
    <div
      onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', background: selected ? 'var(--theme-primary-subtle)' : 'transparent', borderLeft: selected ? '3px solid var(--theme-primary)' : '3px solid transparent', borderBottom:'1px solid var(--theme-border)', transition:'background 0.1s' }}
    >
      <div style={{ width:44, height:44, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:15, flexShrink:0 }}>
        {getInitials(name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:600, fontSize:14, color:'var(--theme-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
          <span style={{ fontSize:11, color:'var(--theme-text-muted)', flexShrink:0 }}>{formatTime(conv.lastMessageAt)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
          <span style={{ fontSize:13, color:'var(--theme-text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80%' }}>{conv.lastMessage || '—'}</span>
          {conv.unreadCount > 0 && (
            <span style={{ background:'var(--theme-primary)', color:'var(--theme-primary-text)', borderRadius:20, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{conv.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
function ChatPanel({ conversationId, socketControls }) {
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
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);
  const prevConvId  = useRef(null);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/conversations/${id}/messages`);
      setMessages(data.messages || []);
      setConversation(data.conversation || null);
    } catch {}
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setConversation(null); return; }
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
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
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
    };
    socketControls._registerChatHandlers(handlers);
    return () => { clearTimeout(typingTimer.current); socketControls._registerChatHandlers(null); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typingAgent]);

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
      } else {
        await api.post(`/conversations/${conversationId}/messages`, { text: msg });
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
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--theme-bg-chat)', gap:16 }}>
      <div style={{ fontSize:64, opacity:.4 }}>💬</div>
      <p style={{ color:'var(--theme-text)', fontSize:16, fontWeight:500, margin:0 }}>Selecione uma conversa</p>
      <p style={{ color:'var(--theme-text-secondary)', fontSize:14, margin:0 }}>Escolha uma conversa na lista ao lado</p>
    </div>
  );

  const name = conversation?.contact?.name || conversation?.contact?.phone || '...';

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--theme-bg-chat)', minWidth:0 }}>
      {/* Header */}
      <div style={{ background:'var(--theme-primary)', padding:'12px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:14 }}>
          {getInitials(name)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, color:'var(--theme-header-text)', fontSize:15 }}>{name}</div>
          <div style={{ fontSize:12, color: typingAgent ? '#a5f3d0' : 'var(--theme-header-sub)', fontStyle: typingAgent ? 'italic' : 'normal' }}>
            {typingAgent ? `${typingAgent} está digitando...` : conversation?.contact?.phone}
          </div>
        </div>
        {conversation && <StatusBadge status={conversation.status} />}
        {conversation?.status !== 'RESOLVED'
          ? <button onClick={() => setShowResolve(true)} style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>✓ Resolver</button>
          : <button onClick={() => handleStatus('OPEN')} style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>Reabrir</button>
        }
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 8%', display:'flex', flexDirection:'column', gap:2 }}>
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {typingAgent && <TypingIndicator name={typingAgent} />}
        <div ref={bottomRef} />
      </div>

      {/* Agent strip */}
      <div style={{ padding:'5px 20px', background:'var(--theme-bg-tertiary)', borderTop:'1px solid var(--theme-border)', fontSize:12, color:'var(--theme-text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--theme-primary)' }} />
        Respondendo como <strong style={{ color:'var(--theme-text)', marginLeft:3 }}>{agent?.name}</strong>
      </div>

      {/* Pasted image preview */}
      {pastedImage && (
        <div style={{ background:'var(--theme-bg-tertiary)', padding:'8px 16px 0', display:'flex', alignItems:'flex-start', borderTop:'1px solid var(--theme-border)' }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={pastedImage.preview} alt="preview" style={{ maxHeight:100, maxWidth:200, borderRadius:8, display:'block', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }} />
            <button
              onClick={() => { URL.revokeObjectURL(pastedImage.preview); setPastedImage(null); }}
              style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%', background:'#ff4444', border:'2px solid var(--theme-bg-tertiary)', color:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}
            >×</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ background:'var(--theme-bg-tertiary)', padding:'10px 16px', display:'flex', alignItems:'flex-end', gap:8, borderTop:'1px solid var(--theme-border)' }}>
        <button onClick={() => setShowTemplates(true)} title="Enviar template"
          style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--theme-border)', background:'var(--theme-bg-input)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, color:'var(--theme-text-secondary)' }}>
          📋
        </button>
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() || pastedImage) handleSend(); } }}
          onPaste={handlePaste}
          placeholder="Digite uma mensagem..."
          rows={1}
          style={{ flex:1, resize:'none', border:'1px solid var(--theme-border)', borderRadius:20, padding:'10px 16px', fontSize:14, outline:'none', background:'var(--theme-bg-input)', color:'var(--theme-text)', maxHeight:120, overflowY:'auto', lineHeight:1.5, fontFamily:'inherit' }}
        />
        <button onClick={() => setShowMedia(true)} title="Enviar arquivo"
          style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--theme-border)', background:'var(--theme-bg-input)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, color:'var(--theme-text-secondary)' }}>
          📎
        </button>
        <button onClick={handleSend} disabled={(!text.trim() && !pastedImage) || sending}
          style={{ width:40, height:40, borderRadius:'50%', border:'none', background: (text.trim() || pastedImage) && !sending ? 'var(--theme-primary)' : 'var(--theme-border)', cursor: (text.trim() || pastedImage) && !sending ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color: (text.trim() || pastedImage) && !sending ? 'var(--theme-primary-text)' : 'var(--theme-text-muted)', flexShrink:0, transition:'background 0.2s' }}>
          {sending ? '⏳' : '➤'}
        </button>
      </div>

      {/* Modals */}
      {showMedia && <MediaUpload conversationId={conversationId} onClose={() => setShowMedia(false)} onSent={() => { setShowMedia(false); loadMessages(conversationId); }} />}
      {showTemplates && <TemplateModal conversationId={conversationId} onClose={() => setShowTemplates(false)} onSent={() => { setShowTemplates(false); loadMessages(conversationId); }} />}
      {showResolve && <ResolveModal conversationId={conversationId} onClose={() => setShowResolve(false)} onResolved={() => { setShowResolve(false); setConversation(prev => prev ? { ...prev, status: 'RESOLVED' } : prev); loadMessages(conversationId); }} />}
    </div>
  );
}

// ─── Inbox ────────────────────────────────────────────────────────────────────
function Inbox() {
  const { agent, accessToken, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [filter, setFilter]               = useState('');
  const [search, setSearch]               = useState('');
  const [stats, setStats]                 = useState({ open:0, pending:0, resolved:0, totalToday:0 });
  const { loadPreferences }               = useTheme();
  const [showSettings, setShowSettings]   = useState(false);
  const chatHandlersRef = useRef(null);

  useEffect(() => { if (agent) loadPreferences(agent); }, [agent]);

  const socketControls = useSocket(accessToken, {
    onMessage:            (msg)  => chatHandlersRef.current?.handleMessage(msg),
    onConversationUpdate: (conv) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conv.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...conv };
        return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    },
    onNewConversation: (conv) => {
      setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
    },
    onMessageStatus:   (data) => chatHandlersRef.current?.handleStatus(data),
    onTyping:          (data) => chatHandlersRef.current?.handleTyping(data),
    onStoppedTyping:   (data) => chatHandlersRef.current?.handleStoppedTyping(data),
  });

  socketControls._registerChatHandlers = (handlers) => { chatHandlersRef.current = handlers; };

  const loadConvs = async (f = filter) => {
    try {
      const { data } = await api.get('/conversations', { params: f ? { status: f } : {}, headers: { Authorization: `Bearer ${accessToken}` } });
      setConversations(data.data || []);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/conversations/stats', { headers: { Authorization: `Bearer ${accessToken}` } });
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    if (!accessToken) return;
    const timer = setTimeout(() => { loadConvs(filter); loadStats(); }, 300);
    return () => clearTimeout(timer);
  }, [filter, accessToken]);

  const handleLogout = async () => { disconnectSocket(); await logout(); };

  const filtered = conversations.filter(c => {
    if (filter && c.status !== filter) return false;
    const name = c.contact?.name || c.contact?.phone || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const statItems = [
    ['Abertas', stats.open, '#25D366'],
    ['Pendentes', stats.pending, '#F59E0B'],
    ['Hoje', stats.totalToday, 'var(--theme-primary)'],
  ];

  const tabs = [
    { label:'Todas', value:'' },
    { label:'Abertas', value:'OPEN' },
    { label:'Pendentes', value:'PENDING' },
    { label:'Resolvidas', value:'RESOLVED' },
  ];

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter', 'Segoe UI', system-ui, sans-serif", overflow:'hidden', background:'var(--theme-bg)' }}>
      {/* Sidebar */}
      <div style={{ width:320, minWidth:260, display:'flex', flexDirection:'column', background:'var(--theme-bg-sidebar)', borderRight:'1px solid var(--theme-border)' }}>
        {/* Header */}
        <div style={{ background:'var(--theme-primary)', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div onClick={handleLogout} title="Sair" style={{ width:44, height:44, borderRadius:'50%', background: agent?.avatarColor || 'var(--theme-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:700, color:'#fff', fontSize:14, flexShrink:0, border:'2px solid rgba(255,255,255,0.3)', overflow:'hidden' }}>
              {agent?.avatarUrl
                ? <img src={agent.avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : getInitials(agent?.name || '')
              }
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'var(--theme-header-text)' }}>WhatsApp MVP</div>
              <div style={{ fontSize:10, color:'var(--theme-header-sub)', display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', display:'inline-block' }} />
                Tempo real ativo
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ textAlign:'right', marginRight:4 }}>
              <div style={{ fontSize:12, color:'var(--theme-header-text)', fontWeight:500, opacity:.9 }}>{agent?.name}</div>
              <div style={{ fontSize:10, color:'var(--theme-header-sub)' }}>{agent?.role === 'ADMIN' ? 'Admin' : 'Agente'}</div>
            </div>
            <button onClick={() => setShowSettings(true)} title="Aparência"
              style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', color:'var(--theme-header-text)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              ⚙
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--theme-border)', background:'var(--theme-bg-sidebar)' }}>
          {statItems.map(([label, val, color]) => (
            <div key={label} style={{ flex:1, padding:'10px 0', textAlign:'center', borderRight:'1px solid var(--theme-border)' }}>
              <div style={{ fontWeight:600, fontSize:16, color }}>{val}</div>
              <div style={{ fontSize:10, color:'var(--theme-text-muted)', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding:'10px 12px', background:'var(--theme-bg-tertiary)', borderBottom:'1px solid var(--theme-border)' }}>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
            style={{ width:'100%', padding:'8px 14px', borderRadius:20, border:'1px solid var(--theme-border)', outline:'none', fontSize:13, background:'var(--theme-bg-input)', color:'var(--theme-text)', boxSizing:'border-box' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--theme-border)', background:'var(--theme-bg-sidebar)' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              style={{ flex:1, padding:'9px 4px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight: filter===t.value ? 600 : 400, color: filter===t.value ? 'var(--theme-primary)' : 'var(--theme-text-secondary)', borderBottom: filter===t.value ? '2px solid var(--theme-primary)' : '2px solid transparent', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0
            ? <div style={{ textAlign:'center', color:'var(--theme-text-muted)', padding:'40px 20px', fontSize:13 }}>Nenhuma conversa</div>
            : filtered.map(c => <ConversationItem key={c.id} conv={c} selected={c.id === selected} onClick={() => setSelected(c.id)} />)
          }
        </div>

        {/* Admin nav */}
        {agent?.role === 'ADMIN' && (
          <div style={{ borderTop:'1px solid var(--theme-border)', padding:'10px 12px', background:'var(--theme-bg-sidebar)' }}>
            <button onClick={() => setSelected('__agents__')}
              style={{ width:'100%', padding:'8px 14px', borderRadius:8, border:'1px solid var(--theme-border)', background: selected==='__agents__' ? 'var(--theme-primary-subtle)' : 'transparent', cursor:'pointer', fontSize:13, color: selected==='__agents__' ? 'var(--theme-primary)' : 'var(--theme-text-secondary)', fontWeight: selected==='__agents__' ? 600 : 400, display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              👥 Gerenciar Agentes
            </button>
          </div>
        )}
      </div>

      {/* Main panel */}
      {selected === '__agents__'
        ? <Agents />
        : <ChatPanel conversationId={selected} socketControls={socketControls} />
      }
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { agent, loading } = useAuth();
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--theme-bg, #0a0f0d)', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:40 }}>💬</div>
      <div style={{ color:'var(--theme-primary, #25D366)', fontSize:14, fontWeight:500 }}>Carregando...</div>
    </div>
  );
  return agent ? <Inbox /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </ThemeProvider>
  );
}
