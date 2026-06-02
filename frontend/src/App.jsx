// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import TemplateModal from './components/TemplateModal';
import { AuthProvider, useAuth, api } from './context/AuthContext';
import { useSocket, disconnectSocket } from './hooks/useSocket';
import Login from './pages/Login';
import Agents from './pages/Agents';
import MediaUpload from './components/MediaUpload';

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
  const isOut = message.direction === 'OUTBOUND';
  const icon  = { SENT:'✓', DELIVERED:'✓✓', READ:'✓✓', FAILED:'✗' }[message.status] || '';
  const color = message.status === 'READ' ? '#53bdeb' : '#aaa';

  const isImage = message.type === 'IMAGE' && message.mediaUrl;
  console.log('Message:', message.type, message.mediaUrl, isImage);
  return (
    <div style={{ display:'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom:4 }}>
      <div style={{ maxWidth:'65%', background: isOut ? '#dcf8c6' : '#fff', borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: isImage ? '4px 4px 5px' : '8px 12px 5px', boxShadow:'0 1px 2px rgba(0,0,0,0.1)', overflow:'hidden' }}>
        {isImage ? (
          <img
            src={`${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}/api/media/${message.mediaUrl}`}
            alt="imagem"
            style={{ maxWidth:'100%', maxHeight:240, borderRadius:8, display:'block', cursor:'pointer' }}
            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}/api/media/${message.mediaUrl}`, '_blank')}
            onError={e => { 
  console.error('Erro ao carregar imagem:', e.target.src);
  e.target.style.display='none'; 
}}
          />
        ) : null}
        <p style={{ margin: isImage ? '4px 8px 0' : 0, fontSize:14, color:'#111', lineHeight:1.5, wordBreak:'break-word', display: isImage && message.content === '📷 Imagem' ? 'none' : 'block' }}>
          {message.content}
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:3, marginTop:2, padding: isImage ? '0 8px' : 0 }}>
          <span style={{ fontSize:11, color:'#aaa' }}>{formatTime(message.timestamp)}</span>
          {isOut && <span style={{ fontSize:12, color }}>{icon}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TypingIndicator ─────────────────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:4 }}>
      <div style={{ background:'#fff', borderRadius:'0 12px 12px 12px', padding:'10px 14px', boxShadow:'0 1px 2px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, color:'#888' }}>{name} está digitando</span>
        <span style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#aaa', display:'inline-block', animation:`bounce 1s ${i*0.2}s infinite` }} />
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
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', background: selected ? '#f0fdf4' : 'transparent', borderLeft: selected ? '3px solid #25D366' : '3px solid transparent', borderBottom:'1px solid #f0f0f0', transition:'background 0.1s' }}>
      <div style={{ width:44, height:44, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:15, flexShrink:0 }}>
        {getInitials(name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:600, fontSize:14, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
          <span style={{ fontSize:11, color:'#aaa', flexShrink:0 }}>{formatTime(conv.lastMessageAt)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
          <span style={{ fontSize:13, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80%' }}>{conv.lastMessage || '—'}</span>
          {conv.unreadCount > 0 && (
            <span style={{ background:'#25D366', color:'#fff', borderRadius:20, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{conv.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
function ChatPanel({ conversationId, socketControls }) {
  const { agent } = useAuth();
  const [messages, setMessages]         = useState([]);
  const [conversation, setConversation] = useState(null);
  const [showMedia, setShowMedia] = useState(false);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [typingAgent, setTypingAgent]   = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
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

  // Registra handlers de socket para esta conversa
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

  const handleSend = async () => {
    if (!text.trim() || sending || !conversationId) return;
    const msg = text;
    setText(''); setSending(true);
    socketControls.stopTyping(conversationId);
    try { await api.post(`/conversations/${conversationId}/messages`, { text: msg }); }
    catch { setText(msg); } finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try {
      await api.patch(`/conversations/${conversationId}/status`, { status });
      setConversation(prev => prev ? { ...prev, status } : prev);
    } catch {}
  };

  if (!conversationId) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f0f2f5', gap:16 }}>
      <div style={{ fontSize:64 }}>💬</div>
      <p style={{ color:'#666', fontSize:16, fontWeight:500, margin:0 }}>Selecione uma conversa</p>
      <p style={{ color:'#aaa', fontSize:14, margin:0 }}>Escolha uma conversa na lista ao lado</p>
    </div>
  );

  const name = conversation?.contact?.name || conversation?.contact?.phone || '...';

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#efeae2', minWidth:0 }}>
      <div style={{ background:'#075E54', padding:'12px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:14 }}>{getInitials(name)}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, color:'#fff', fontSize:15 }}>{name}</div>
          <div style={{ fontSize:12, color: typingAgent ? '#a5f3d0' : '#9de3d5', fontStyle: typingAgent ? 'italic' : 'normal' }}>
            {typingAgent ? `${typingAgent} está digitando...` : conversation?.contact?.phone}
          </div>
        </div>
        {conversation && <StatusBadge status={conversation.status} />}
        {conversation?.status !== 'RESOLVED'
          ? <button onClick={() => handleStatus('RESOLVED')} style={{ background:'#25D366', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>✓ Resolver</button>
          : <button onClick={() => handleStatus('OPEN')} style={{ background:'#fff3', color:'#fff', border:'1px solid #fff5', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>Reabrir</button>
        }
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 8%', display:'flex', flexDirection:'column', gap:2 }}>
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {typingAgent && <TypingIndicator name={typingAgent} />}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding:'5px 20px', background:'#f0f2f5', borderTop:'1px solid #e0e0e0', fontSize:12, color:'#888', display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#25D366' }} />
        Respondendo como <strong style={{ color:'#555', marginLeft:3 }}>{agent?.name}</strong>
      </div>

      <div style={{ background:'#f0f2f5', padding:'10px 16px', display:'flex', alignItems:'flex-end', gap:10, borderTop:'1px solid #ddd' }}>
        {/* Botão de templates */}
      <button
        onClick={() => setShowTemplates(true)}
        title="Enviar template"
        style={{ width:44, height:44, borderRadius:'50%', border:'1px solid #ddd', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}
      >
        📋
      </button>
        <textarea
          value={text} onChange={handleTextChange}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Digite uma mensagem..."
          rows={1}
          style={{ flex:1, resize:'none', border:'none', borderRadius:24, padding:'10px 16px', fontSize:14, outline:'none', background:'#fff', maxHeight:120, overflowY:'auto', lineHeight:1.5, fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}
        />
        <button onClick={() => setShowMedia(true)} title="Enviar arquivo"
  style={{ width:44, height:44, borderRadius:'50%', border:'1px solid #ddd', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
  📎
</button>
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ width:44, height:44, borderRadius:'50%', border:'none', background: text.trim() && !sending ? '#25D366' : '#ccc', cursor: text.trim() && !sending ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', flexShrink:0, transition:'background 0.2s' }}>
          {sending ? '⏳' : '➤'}
        </button>
      </div>
      {showMedia && (
  <MediaUpload
    conversationId={conversationId}
    onClose={() => setShowMedia(false)}
    onSent={() => { setShowMedia(false); loadMessages(conversationId); }}
  />
)}
      {showTemplates && (
          <TemplateModal
            conversationId={conversationId}
            onClose={() => setShowTemplates(false)}
            onSent={() => { setShowTemplates(false); loadMessages(conversationId); }}
          />
        )}
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
  const chatHandlersRef = useRef(null);

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
    onNewConversation: (conv) => setConversations(prev => [conv, ...prev]),
    onMessageStatus:   (data) => chatHandlersRef.current?.handleStatus(data),
    onTyping:          (data) => chatHandlersRef.current?.handleTyping(data),
    onStoppedTyping:   (data) => chatHandlersRef.current?.handleStoppedTyping(data),
  });

  socketControls._registerChatHandlers = (handlers) => { chatHandlersRef.current = handlers; };

  const loadConvs = async (f = filter) => {
  try {
    const { data } = await api.get('/conversations', {
      params: f ? { status: f } : {},
      headers: { Authorization: `Bearer ${accessToken}` }, // força o token
    });
    setConversations(data.data || []);
  } catch {}
};

const loadStats = async () => {
  try {
    const { data } = await api.get('/conversations/stats', {
      headers: { Authorization: `Bearer ${accessToken}` }, // força o token
    });
    setStats(data);
  } catch {}
};

  useEffect(() => {
  if (!accessToken) return;
  // Pequeno delay para garantir que o interceptor do axios registrou o token
  const timer = setTimeout(() => {
    loadConvs(filter);
    loadStats();
  }, 300);
  return () => clearTimeout(timer);
}, [filter, accessToken]);

  const handleLogout = async () => { disconnectSocket(); await logout(); };

  const filtered = conversations.filter(c => {
    if (filter && c.status !== filter) return false;
    const name = c.contact?.name || c.contact?.phone || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const tabs = [
    { label:'Todas', value:'' },
    { label:'Abertas', value:'OPEN' },
    { label:'Pendentes', value:'PENDING' },
    { label:'Resolvidas', value:'RESOLVED' },
  ];

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Segoe UI', system-ui, sans-serif", overflow:'hidden' }}>
      <div style={{ width:340, minWidth:280, display:'flex', flexDirection:'column', background:'#fff', borderRight:'1px solid #e8e8e8' }}>
        <div style={{ background:'#075E54', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>💬</span>
            <div>
              <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>WhatsApp MVP</div>
              <div style={{ color:'#9de3d5', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#25D366', display:'inline-block' }} />
                Tempo real ativo
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'#9de3d5', fontWeight:500 }}>{agent?.name}</div>
              <div style={{ fontSize:10, color:'#7bbfb5' }}>{agent?.role === 'ADMIN' ? 'Admin' : 'Agente'}</div>
            </div>
            <div onClick={handleLogout} title="Sair" style={{ width:32, height:32, borderRadius:'50%', background: agent?.avatarColor || '#25D366', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:700, color:'#fff', fontSize:12 }}>
              {getInitials(agent?.name || '')}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', borderBottom:'1px solid #eee' }}>
          {[['Abertas', stats.open, '#25D366'], ['Pendentes', stats.pending, '#F59E0B'], ['Hoje', stats.totalToday, '#075E54']].map(([label, val, color]) => (
            <div key={label} style={{ flex:1, padding:'8px 0', textAlign:'center', borderRight:'1px solid #eee' }}>
              <div style={{ fontWeight:700, fontSize:15, color }}>{val}</div>
              <div style={{ fontSize:10, color:'#aaa' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding:'8px 12px', background:'#f6f6f6', borderBottom:'1px solid #eee' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Pesquisar..."
            style={{ width:'100%', padding:'8px 14px', borderRadius:20, border:'1px solid #ddd', outline:'none', fontSize:13, background:'#fff', boxSizing:'border-box' }} />
        </div>

        <div style={{ display:'flex', borderBottom:'1px solid #eee' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)} style={{ flex:1, padding:'9px 4px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight: filter===t.value ? 700 : 400, color: filter===t.value ? '#075E54' : '#888', borderBottom: filter===t.value ? '2px solid #075E54' : '2px solid transparent', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0
            ? <div style={{ textAlign:'center', color:'#aaa', padding:'40px 20px', fontSize:14 }}>Nenhuma conversa</div>
            : filtered.map(c => <ConversationItem key={c.id} conv={c} selected={c.id === selected} onClick={() => setSelected(c.id)} />)
          }
        </div>

        {agent?.role === 'ADMIN' && (
          <div style={{ borderTop:'1px solid #eee', padding:'10px 16px' }}>
            <button onClick={() => setSelected('__agents__')} style={{ width:'100%', padding:'8px 14px', borderRadius:8, border:'1px solid #e8e8e8', background: selected==='__agents__' ? '#f0fdf4' : 'none', cursor:'pointer', fontSize:13, color:'#075E54', fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
              👥 Gerenciar Agentes
            </button>
          </div>
        )}
      </div>

      {selected === '__agents__'
        ? <Agents />
        : <ChatPanel conversationId={selected} socketControls={socketControls} />
      }
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { agent, loading } = useAuth();
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f0d', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:40 }}>💬</div>
      <div style={{ color:'#25D366', fontSize:14, fontWeight:500 }}>Carregando...</div>
    </div>
  );
  return agent ? <Inbox /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}
