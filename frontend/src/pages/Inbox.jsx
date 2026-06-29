import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth, api } from '../context/AuthContext';
import { useSocket, disconnectSocket } from '../hooks/useSocket';
import { useTheme } from '../context/ThemeContext';
import NavRail, { STATUS_META } from '../components/NavRail';
import ConversationItem from '../components/ConversationItem';
import ContactDetailsPanel from '../components/ContactDetailsPanel';
import ChatPanel from '../components/ChatPanel';
import Agents from './Agents';
import Settings from './Settings';
import Reports from './Reports';

export default function Inbox() {
  const { agent, accessToken, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [inboxFilter, setInboxFilter]     = useState(() => {
    const saved = localStorage.getItem('inboxFilter') || localStorage.getItem('conversationFilter') || '';
    return ['OPEN', 'PENDING', 'RESOLVED'].includes(saved) ? saved : '';
  });
  const [mineFilter, setMineFilter]       = useState(() => {
    const saved = localStorage.getItem('mineFilter') || '';
    return ['OPEN', 'RESOLVED'].includes(saved) ? saved : '';
  });
  const [search, setSearch]               = useState('');
  const [stats, setStats]                 = useState({ open: 0, pending: 0, resolved: 0, totalToday: 0 });
  const [section, setSection]             = useState('inbox');
  const [showSettings, setShowSettings]   = useState(false);
  const [agentStatus, setAgentStatusState] = useState('ONLINE');
  const { loadPreferences }               = useTheme();
  const activeFilter = section === 'mine' ? mineFilter : inboxFilter;
  const chatHandlersRef    = useRef(null);
  const selectedRef        = useRef(null);
  const filterDropdownRef  = useRef(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e) => { if (!filterDropdownRef.current?.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { if (agent) loadPreferences(agent); }, [agent]);

  useEffect(() => {
    const n = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    document.title = n > 0 ? `(${n}) WhatsApp MVP` : 'WhatsApp MVP';
  }, [conversations]);

  const socketControls = useSocket(accessToken, {
    onMessage: (msg) => {
      chatHandlersRef.current?.handleMessage(msg);
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversationId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], lastMessage: msg.content, lastMessageAt: msg.timestamp || new Date().toISOString(), lastMessageDirection: msg.direction || 'INBOUND' };
        return next.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
      });
    },
    onConversationUpdate: (conv) => {
      if (conv.id === selectedRef.current) {
        chatHandlersRef.current?.reloadMessages?.();
      }
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conv.id);
        if (idx === -1) return prev;
        const oldStatus = prev[idx].status;
        if (oldStatus !== conv.status) {
          const key = { OPEN: 'open', PENDING: 'pending', RESOLVED: 'resolved' };
          setStats(s => {
            const next = { ...s };
            if (key[oldStatus] !== undefined) next[key[oldStatus]] = Math.max(0, next[key[oldStatus]] - 1);
            if (key[conv.status] !== undefined) next[key[conv.status]] = next[key[conv.status]] + 1;
            return next;
          });
        }
        const next = [...prev];
        next[idx] = { ...next[idx], ...conv, pinned: prev[idx].pinned };
        return next.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
      });
    },
    onNewConversation: (conv) => {
      setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev;
        const isToday = new Date(conv.createdAt).toDateString() === new Date().toDateString();
        const key = { OPEN: 'open', PENDING: 'pending', RESOLVED: 'resolved' };
        setStats(s => ({
          ...s,
          totalToday: isToday ? s.totalToday + 1 : s.totalToday,
          ...(key[conv.status] !== undefined ? { [key[conv.status]]: s[key[conv.status]] + 1 } : {}),
        }));
        return [conv, ...prev];
      });
    },
    onMessageStatus:   (data) => chatHandlersRef.current?.handleStatus(data),
    onMessageReaction: (data) => chatHandlersRef.current?.handleReaction(data),
    onTyping:          (data) => chatHandlersRef.current?.handleTyping(data),
    onStoppedTyping:   (data) => chatHandlersRef.current?.handleStoppedTyping(data),
    onAgentStatus:     ({ agentId: id, onlineStatus }) => {
      if (id === agent?.id) setAgentStatusState(onlineStatus);
    },
    onPinUpdate: ({ conversationId, pinCount, pinnedBy }) => {
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, pinCount, pinnedBy } : c
      ));
    },
  });

  socketControls._registerChatHandlers = (handlers) => { chatHandlersRef.current = handlers; };

  const loadConvs = async (f = activeFilter) => {
    try {
      const params = f ? { status: f } : {};
      const { data } = await api.get('/conversations', { params, headers: { Authorization: `Bearer ${accessToken}` } });
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
    const timer = setTimeout(() => { loadConvs(activeFilter); loadStats(); }, 300);
    return () => clearTimeout(timer);
  }, [activeFilter, accessToken]);

  const handleLogout = async () => { disconnectSocket(); await logout(); };

  const handleTogglePin = async (convId) => {
    try {
      const { data } = await api.patch(`/conversations/${convId}/pin`);
      setConversations(prev => {
        const next = prev.map(c => c.id === convId ? { ...c, pinned: data.pinned, pinCount: data.pinCount, pinnedBy: data.pinnedBy } : c);
        return next.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
      });
    } catch {}
  };

  const handleMessageSent = (convId, content) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === convId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], lastMessage: content, lastMessageAt: new Date().toISOString(), lastMessageDirection: 'OUTBOUND' };
      return next.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
    });
  };

  const filtered = conversations.filter(c => {
    if (section === 'mine' && c.assignedAgent?.id !== agent?.id) return false;
    if (activeFilter && c.status !== activeFilter) return false;
    const name = c.contact?.name || c.contact?.phone || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selected) || null;

  const filterOptions = section === 'mine'
    ? [{ label: 'Todas', value: '' }, { label: 'Abertas', value: 'OPEN' }, { label: 'Resolvidas', value: 'RESOLVED' }]
    : [{ label: 'Todas', value: '' }, { label: 'Abertas', value: 'OPEN' }, { label: 'Pendentes', value: 'PENDING' }, { label: 'Resolvidas', value: 'RESOLVED' }];

  const handleFilterChange = (value) => {
    if (section === 'mine') {
      setMineFilter(value);
      localStorage.setItem('mineFilter', value);
    } else {
      setInboxFilter(value);
      localStorage.setItem('inboxFilter', value);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", overflow: 'hidden', background: 'var(--theme-bg)' }}>

      <NavRail
        section={section}
        onSection={setSection}
        agent={agent}
        agentStatus={agentStatus}
        onStatusChange={(s) => { setAgentStatusState(s); socketControls.setAgentStatus(s); }}
        onSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        inboxCount={stats.open}
      />

      {(section === 'inbox' || section === 'mine') && (
        <>
          {/* Conversation List */}
          <div style={{ width: 300, minWidth: 240, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg-sidebar)', borderRight: '1px solid var(--theme-border)', flexShrink: 0 }}>

            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--theme-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--theme-text)' }}>{section === 'mine' ? 'Meus' : 'Inbox'}</div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--theme-border)' }}>
              {[['Abertas', stats.open, '#25D366'], ['Pendentes', stats.pending, '#F59E0B'], ['Hoje', stats.totalToday, 'var(--theme-text)']].map(([label, val, color]) => (
                <div key={label} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--theme-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--theme-border)' }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
                style={{ width: '100%', padding: '8px 14px', borderRadius: 20, border: '1px solid var(--theme-border)', outline: 'none', fontSize: 13, background: 'var(--theme-bg-input)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
              />
            </div>

            <div ref={filterDropdownRef} style={{ position: 'relative', padding: '6px 12px', borderBottom: '1px solid var(--theme-border)' }}>
              <button
                onClick={() => setFilterOpen(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--theme-text-secondary)', fontSize: 13, fontWeight: activeFilter ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <span>{filterOptions.find(o => o.value === activeFilter)?.label}</span>
                <ChevronDown size={14} strokeWidth={2} style={{ transition: 'transform 0.15s', transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {filterOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden' }}>
                  {filterOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { handleFilterChange(o.value); setFilterOpen(false); }}
                      style={{ width: '100%', display: 'block', padding: '9px 14px', border: 'none', background: o.value === activeFilter ? 'var(--theme-bg-hover)' : 'none', color: 'var(--theme-text)', fontSize: 13, fontWeight: o.value === activeFilter ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (o.value !== activeFilter) e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                      onMouseLeave={e => { if (o.value !== activeFilter) e.currentTarget.style.background = 'none'; }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--theme-text-muted)', padding: '40px 20px', fontSize: 13 }}>Nenhuma conversa</div>
                : filtered.map(c => (
                    <ConversationItem key={c.id} conv={c} selected={c.id === selected} onClick={() => {
                      setSelected(c.id);
                      if (c.unreadCount > 0) setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unreadCount: 0 } : x));
                    }} onPin={handleTogglePin} />
                  ))
              }
            </div>
          </div>

          <ChatPanel conversationId={selected} socketControls={socketControls} onMessageSent={handleMessageSent} />
          <ContactDetailsPanel conv={selectedConv} />
        </>
      )}

      {section === 'agents' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Agents />
        </div>
      )}

      {section === 'reports' && <Reports />}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
