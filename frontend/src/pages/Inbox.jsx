import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ImageIcon, Pencil, X } from 'lucide-react';
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
  const [bannerImg, setBannerImg]     = useState(null);
  const [bannerHover, setBannerHover] = useState(false);
  const [bannerModal, setBannerModal] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const bannerInputRef                = useRef(null);
  const [liveCalls, setLiveCalls]     = useState([]);

  useEffect(() => {
    if (!accessToken) return;
    api.get('/settings').then(({ data }) => setBannerImg(data.sidebar_banner || null)).catch(() => {});
    api.get('/calls/active').then(({ data }) => setLiveCalls(data.calls || [])).catch(() => {});
  }, [accessToken]);

  function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const data = ev.target.result;
      try {
        await api.put('/settings/banner', { image: data });
        setBannerImg(data);
        setBannerModal(false);
        setBannerError('');
      } catch (err) {
        setBannerError(err.response?.data?.error || 'Erro ao salvar banner');
        setBannerModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function removeBanner() {
    try {
      await api.delete('/settings/banner');
    } catch {}
    setBannerImg(null);
    setBannerModal(false);
    setBannerError('');
  }

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
    onCallIncoming: (call) => {
      setLiveCalls(prev => prev.some(c => c.id === call.id) ? prev.map(c => c.id === call.id ? call : c) : [...prev, call]);
    },
    onCallUpdate: (call) => {
      setLiveCalls(prev => prev.filter(c => c.id !== call.id));
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
        mineCount={conversations.filter(c => c.assignedAgent?.id === agent?.id && c.status === 'OPEN').length}
        liveCalls={liveCalls}
      />

      {(section === 'inbox' || section === 'mine') && (
        <>
          {/* Conversation List */}
          <div style={{ width: 300, minWidth: 240, display: 'flex', flexDirection: 'column', background: 'var(--theme-bg-sidebar)', borderRight: '1px solid var(--theme-border)', flexShrink: 0 }}>

            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--theme-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--theme-text)' }}>{section === 'mine' ? 'Meus' : 'Inbox'}</div>
            </div>

            {/* Banner de imagem */}
            <div
              style={{ position: 'relative', borderBottom: '1px solid var(--theme-border)', height: 96, overflow: 'hidden', flexShrink: 0, cursor: bannerImg ? 'pointer' : 'default' }}
              onMouseEnter={() => setBannerHover(true)}
              onMouseLeave={() => setBannerHover(false)}
              onClick={() => { if (bannerImg) setBannerModal(true); }}
            >
              {bannerImg ? (
                <img src={bannerImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div onClick={() => bannerInputRef.current?.click()}
                  style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: '1.5px dashed var(--theme-border)', boxSizing: 'border-box', color: 'var(--theme-text-muted)', opacity: 0.55 }}>
                  <ImageIcon size={20} />
                  <span style={{ fontSize: 11 }}>Adicionar banner</span>
                </div>
              )}
              {bannerImg && bannerHover && (
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <button onClick={e => { e.stopPropagation(); setBannerModal(true); }} title="Editar banner"
                    style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: 5, padding: '4px 6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
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
          <ContactDetailsPanel conv={selectedConv} onContactUpdate={(contactId, newName) => {
            setConversations(prev => prev.map(c =>
              c.contact?.id === contactId ? { ...c, contact: { ...c.contact, name: newName } } : c
            ));
          }} />
        </>
      )}

      {section === 'agents' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Agents />
        </div>
      )}

      {section === 'reports' && <Reports />}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {bannerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setBannerModal(false)}>
          <div style={{ background: 'var(--theme-bg)', borderRadius: 14, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 18 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text)' }}>Banner da sidebar</span>
              <button onClick={() => setBannerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', display: 'flex', padding: 2 }}>
                <X size={18} />
              </button>
            </div>
            {bannerImg && (
              <img src={bannerImg} alt="Banner atual" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            )}
            {bannerError && (
              <div style={{ fontSize: 12, color: '#ef4444' }}>{bannerError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setBannerModal(false); setTimeout(() => bannerInputRef.current?.click(), 50); }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--theme-primary)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Enviar
              </button>
              <button
                onClick={removeBanner}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
