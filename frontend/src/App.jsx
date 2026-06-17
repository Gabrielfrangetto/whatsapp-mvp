// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, Sticker, MessageSquare, Users, Settings as SettingsIcon, LogOut, Phone, Calendar, Lock, ChevronDown, Pin, User, Paperclip, Send, Loader2, Check } from 'lucide-react';
import TemplateModal from './components/TemplateModal';
import { AuthProvider, useAuth, api } from './context/AuthContext';
import { useSocket, disconnectSocket } from './hooks/useSocket';
import Login from './pages/Login';
import Agents from './pages/Agents';
import MediaUpload from './components/MediaUpload';
import ResolveModal from './components/ResolveModal';
import StickerPanel from './components/StickerPanel';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Settings from './pages/Settings';
import metaLogo from './assets/images/meta_logo.svg';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (msgDay.getTime() === yesterday.getTime()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function getDateKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return 'Hoje';
  if (msgDay.getTime() === yesterday.getTime()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            <span style={{ fontSize:10, color:'var(--theme-text-muted)', marginTop:3, display:'block' }}>{formatMsgTime(message.timestamp)}</span>
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
        {isImage && message.direction === 'INBOUND' && (
          <a
            href={`${import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app'}/api/media/${message.mediaUrl}`}
            download target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, color:'var(--theme-text-muted)', textDecoration:'none', padding:'4px 8px', marginTop:2, borderRadius:6, background:'rgba(0,0,0,0.04)', width:'fit-content', marginLeft:'auto', marginRight:4 }}
          >
            ⬇ Salvar
          </a>
        )}
        <p style={{ margin: isImage ? '4px 8px 0' : 0, fontSize:14, color: isOut ? 'var(--theme-msg-text-out)' : 'var(--theme-msg-text-in)', lineHeight:1.5, wordBreak:'break-word', display: isImage && (message.content === '📷 Imagem' || message.content === '' || message.content === 'Sticker') ? 'none' : 'block' }}>
          {message.content}
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:3, marginTop:2, padding: isImage ? '0 8px' : 0 }}>
          <span style={{ fontSize:11, color:'var(--theme-text-muted)' }}>{formatMsgTime(message.timestamp)}</span>
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
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── DateSeparator ────────────────────────────────────────────────────────────
function DateSeparator({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', margin:'12px 0 6px' }}>
      <div style={{ background:'var(--theme-bg-bubble-in)', color:'var(--theme-text-secondary)', fontSize:12, fontWeight:500, padding:'4px 14px', borderRadius:20, boxShadow:'0 1px 2px rgba(0,0,0,0.1)' }}>
        {label}
      </div>
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────
function ConversationItem({ conv, selected, onClick, onPin }) {
  const name     = conv.contact?.name || conv.contact?.phone || 'Desconhecido';
  const hasNew   = conv.unreadCount > 0;
  const [hovered, setHovered]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinAnim, setPinAnim]   = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handlePin = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setPinAnim(true);
    setTimeout(() => setPinAnim(false), 800);
    onPin(conv.id);
  };

  const bg     = selected ? 'var(--theme-primary-subtle)' : hasNew ? 'var(--theme-primary-subtle)' : 'transparent';
  const border = selected || hasNew ? 'var(--theme-primary)' : conv.pinned ? 'var(--theme-primary)' : 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{ position:'relative', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', background:bg, borderLeft:`3px solid ${border}`, borderBottom:'1px solid var(--theme-border)', transition:'background 0.1s', boxShadow: hasNew && !selected ? 'inset 3px 0 20px -2px var(--theme-primary)' : 'none' }}
    >
      <style>{`
        @keyframes pinOverlay {
          0%   { opacity: 0; }
          20%  { opacity: 0.32; }
          70%  { opacity: 0.32; }
          100% { opacity: 0; }
        }
        @keyframes pinIconAnim {
          0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          28%  { opacity: 1; transform: scale(1.15) rotate(6deg); }
          65%  { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(0.85); }
        }
      `}</style>

      {/* Overlay + ícone pin ao fixar — dois elementos irmãos para opacidade independente */}
      {pinAnim && (
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:20 }}>
          <div style={{ position:'absolute', inset:0, background:'var(--theme-primary)', animation:'pinOverlay 0.8s ease-in-out forwards' }} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', animation:'pinIconAnim 0.8s ease-in-out forwards' }}>
            <Pin size={28} style={{ color:'#fff', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
          </div>
        </div>
      )}

      {/* Indicador de fixado — canto superior esquerdo, absoluto */}
      {conv.pinned && (
        <Pin size={10} style={{ position:'absolute', top:5, left:8, color:'var(--theme-primary)', display:'block', zIndex:5 }} />
      )}

      {/* Avatar */}
      <div style={{ width:44, height:44, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:15, flexShrink:0, opacity: pinAnim ? 0 : 1, transition:'opacity 0.15s' }}>
        {getInitials(name)}
      </div>

      {/* Conteúdo */}
      <div style={{ flex:1, minWidth:0, opacity: pinAnim ? 0 : 1, transition:'opacity 0.15s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight: hasNew ? 700 : 600, fontSize:14, color:'var(--theme-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
          <span style={{ fontSize:11, color: hasNew ? 'var(--theme-primary)' : 'var(--theme-text-muted)', fontWeight: hasNew ? 700 : 400, flexShrink:0, marginLeft:4, opacity: hovered ? 0 : 1, transition:'opacity 0.15s' }}>
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
          <span style={{ fontSize:13, color: hasNew ? 'var(--theme-text)' : 'var(--theme-text-secondary)', fontWeight: hasNew ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80%', display:'flex', alignItems:'center', gap:4 }}>
            {conv.lastMessageDirection === 'OUTBOUND'
              ? <ArrowUp size={12} strokeWidth={2.5} style={{ flexShrink:0, color:'var(--theme-primary)' }} />
              : <ArrowDown size={12} strokeWidth={2.5} style={{ flexShrink:0, color:'#F59E0B' }} />
            }
            {conv.lastMessage === 'Sticker'
              ? <span style={{ display:'flex', alignItems:'center', gap:3 }}><Sticker size={12} strokeWidth={1.8} style={{ flexShrink:0 }} />Sticker</span>
              : (conv.lastMessage || '—')
            }
          </span>
          {hasNew && (
            <span style={{ background:'var(--theme-primary)', color:'var(--theme-primary-text)', borderRadius:20, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{conv.unreadCount}</span>
          )}
        </div>
      </div>

      {/* Dropdown trigger */}
      {hovered && onPin && (
        <div ref={menuRef} style={{ position:'absolute', top:6, right:8, zIndex:10 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ width:22, height:22, borderRadius:5, border:'none', background:'var(--theme-bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-text-muted)', boxShadow:'0 1px 4px rgba(0,0,0,0.14)', transition:'background 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--theme-bg-secondary)'; }}
          >
            <ChevronDown size={13} strokeWidth={2.5} style={{ transition:'transform 0.15s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', top:26, right:0, background:'var(--theme-bg-secondary)', border:'1px solid var(--theme-border-strong)', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.18)', zIndex:100, minWidth:160, overflow:'hidden' }}>
              <button
                onClick={handlePin}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 14px', border:'none', background:'none', cursor:'pointer', color: conv.pinned ? 'var(--theme-primary)' : 'var(--theme-text)', fontSize:13, fontFamily:'inherit', textAlign:'left', fontWeight: conv.pinned ? 600 : 400 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <Pin size={13} style={{ color: conv.pinned ? 'var(--theme-primary)' : 'var(--theme-text-muted)', flexShrink:0 }} />
                {conv.pinned ? 'Remover fixação' : 'Fixar conversa'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NavRailButton ────────────────────────────────────────────────────────────
function NavRailButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width:44, height:44, borderRadius:10,
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        transition:'background 0.15s, color 0.15s',
      }}
    >
      {icon}
    </button>
  );
}

const STATUS_META = {
  ONLINE:  { color: '#4ade80', label: 'Online' },
  BUSY:    { color: '#fbbf24', label: 'Ocupado' },
  OFFLINE: { color: '#6b7280', label: 'Offline' },
};

// ─── NavRail ──────────────────────────────────────────────────────────────────
function NavRail({ section, onSection, agent, agentStatus = 'ONLINE', onStatusChange, onSettings, onLogout }) {
  const { color, mode } = useTheme();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e) => { if (!statusRef.current?.contains(e.target)) setStatusOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusOpen]);

  const navBg = (() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const offset = mode === 'dark' ? 75 : 55;
    return `rgb(${Math.max(0,r-offset)},${Math.max(0,g-offset)},${Math.max(0,b-offset)})`;
  })();

  return (
    <div style={{ width:64, background:navBg, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:12, paddingBottom:12, gap:2, flexShrink:0, borderRight:'1px solid rgba(0,0,0,0.3)', zIndex:10 }}>

      {/* App logo */}
      <div style={{ width:40, height:40, borderRadius:12, background:'var(--theme-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-primary-text)', marginBottom:12, flexShrink:0 }}>
        <MessageSquare size={20} />
      </div>

      {/* Navigation */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
        <NavRailButton
          icon={<MessageSquare size={20} />}
          label="Inbox"
          active={section === 'inbox'}
          onClick={() => onSection('inbox')}
        />
        {agent?.role === 'ADMIN' && (
          <NavRailButton
            icon={<Users size={20} />}
            label="Agentes"
            active={section === 'agents'}
            onClick={() => onSection('agents')}
          />
        )}
      </div>

      {/* Bottom: settings, logout, avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <NavRailButton icon={<SettingsIcon size={20} />} label="Configurações" onClick={onSettings} />
        <NavRailButton icon={<LogOut size={18} />} label="Sair" onClick={onLogout} />
        <div style={{ width:1, height:8, background:'rgba(255,255,255,0.12)', borderRadius:1, margin:'2px 0' }} />
        <div ref={statusRef} style={{ position:'relative' }}>
          <div
            onClick={() => setStatusOpen(v => !v)}
            style={{ width:40, height:40, borderRadius:'50%', background:agent?.avatarColor || 'var(--theme-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-primary-text)', fontWeight:700, fontSize:13, overflow:'hidden', position:'relative', border:`2px solid rgba(255,255,255,0.2)`, flexShrink:0, cursor:'pointer' }}
            title={`${agent?.name} • ${STATUS_META[agentStatus]?.label}`}
          >
            {agent?.avatarUrl
              ? <img src={agent.avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : getInitials(agent?.name || '')
            }
            <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background: STATUS_META[agentStatus]?.color, border:`2px solid ${navBg}` }} />
          </div>

          {statusOpen && (
            <div style={{ position:'absolute', bottom:0, left:48, background:'var(--theme-bg-secondary)', border:'1px solid var(--theme-border-strong)', borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:100, minWidth:140, overflow:'hidden' }}>
              {Object.entries(STATUS_META).map(([key, { color: dotColor, label }]) => (
                <button
                  key={key}
                  onClick={() => { onStatusChange(key); setStatusOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'none', background: key === agentStatus ? 'var(--theme-bg-hover)' : 'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--theme-text)', fontWeight: key === agentStatus ? 600 : 400 }}
                  onMouseEnter={e => { if (key !== agentStatus) e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                  onMouseLeave={e => { if (key !== agentStatus) e.currentTarget.style.background = 'none'; }}
                >
                  <span style={{ width:10, height:10, borderRadius:'50%', background: dotColor, flexShrink:0, display:'inline-block' }} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ContactDetailsPanel ──────────────────────────────────────────────────────
function ContactDetailsPanel({ conv }) {
  if (!conv) {
    return (
      <div style={{ width:260, background:'var(--theme-bg-sidebar)', borderLeft:'1px solid var(--theme-border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'0 24px', flexShrink:0 }}>
        <User size={44} style={{ opacity:.18, color:'var(--theme-text)' }} />
        <p style={{ color:'var(--theme-text-muted)', fontSize:13, textAlign:'center', margin:0, lineHeight:1.7 }}>
          Selecione uma conversa para ver os detalhes do contato
        </p>
      </div>
    );
  }

  const name  = conv.contact?.name || conv.contact?.phone || 'Desconhecido';
  const phone = conv.contact?.phone;

  return (
    <div style={{ width:260, background:'var(--theme-bg-sidebar)', borderLeft:'1px solid var(--theme-border)', display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0 }}>

      {/* Contact header */}
      <div style={{ padding:'28px 16px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10, borderBottom:'1px solid var(--theme-border)' }}>
        <div style={{ width:68, height:68, borderRadius:'50%', background:getAvatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:24 }}>
          {getInitials(name)}
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--theme-text)' }}>{name}</div>
          {phone && (
            <div style={{ fontSize:12, color:'var(--theme-text-muted)', marginTop:5, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <Phone size={11} />
              {phone}
            </div>
          )}
        </div>
        <StatusBadge status={conv.status} />
      </div>

      {/* Conversation details */}
      <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Conversa</div>

        {conv.createdAt && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <Calendar size={15} style={{ color:'var(--theme-text-muted)', flexShrink:0, marginTop:2 }} />
            <div>
              <div style={{ fontSize:11, color:'var(--theme-text-muted)' }}>Iniciada em</div>
              <div style={{ fontSize:13, color:'var(--theme-text-secondary)', marginTop:2 }}>
                {new Date(conv.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
              </div>
            </div>
          </div>
        )}

        {conv.lastMessageAt && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <MessageSquare size={15} style={{ color:'var(--theme-text-muted)', flexShrink:0, marginTop:2 }} />
            <div>
              <div style={{ fontSize:11, color:'var(--theme-text-muted)' }}>Última atividade</div>
              <div style={{ fontSize:13, color:'var(--theme-text-secondary)', marginTop:2 }}>
                {formatTime(conv.lastMessageAt)}
              </div>
            </div>
          </div>
        )}

        {conv.assignedAgent && (
          <>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Atendente</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:conv.assignedAgent.avatarColor || 'var(--theme-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--theme-primary-text)', fontWeight:700, fontSize:11, flexShrink:0 }}>
                {getInitials(conv.assignedAgent.name)}
              </div>
              <div>
                <div style={{ fontSize:13, color:'var(--theme-text)', fontWeight:600 }}>{conv.assignedAgent.name}</div>
                <div style={{ fontSize:11, color:'var(--theme-text-muted)' }}>Responsável</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
const WINDOW_MS = 24 * 60 * 60 * 1000;

function computeWindowOpen(msgs) {
  const lastInbound = [...msgs].reverse().find(m => m.direction === 'INBOUND');
  if (!lastInbound) return false;
  return Date.now() - new Date(lastInbound.timestamp).getTime() < WINDOW_MS;
}

function ChatPanel({ conversationId, socketControls, onMessageSent }) {
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
      setWindowOpen(computeWindowOpen(msgs));
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
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--theme-bg-chat)', gap:16 }}>
      <MessageSquare size={64} style={{ opacity:.3, color:'var(--theme-text)' }} />
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
          ? <button onClick={() => setShowResolve(true)} style={{ background:'rgba(255,255,255,0.2)', color:'var(--theme-primary-text)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}><Check size={13} /> Resolver</button>
          : <button onClick={() => handleStatus('OPEN')} style={{ background:'rgba(255,255,255,0.1)', color:'var(--theme-primary-text)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>Reabrir</button>
        }
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 8%', display:'flex', flexDirection:'column', gap:2 }}>
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
        {windowOpen ? (
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() || pastedImage) handleSend(); } }}
            onPaste={handlePaste}
            placeholder="Digite uma mensagem..."
            rows={1}
            style={{ flex:1, resize:'none', border:'1px solid var(--theme-border)', borderRadius:20, padding:'10px 16px', fontSize:14, outline:'none', background:'var(--theme-bg-input)', color:'var(--theme-text)', maxHeight:120, overflowY:'auto', lineHeight:1.5, fontFamily:'inherit' }}
          />
        ) : (
          <div style={{ flex:1, border:'1px solid var(--theme-primary)', borderRadius:16, padding:'10px 18px', background:'var(--theme-primary-subtle)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, boxShadow:'0 0 0 1px var(--theme-primary)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <img src={metaLogo} alt="Meta" style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:700, color:'var(--theme-text)' }}>Janela de 24h encerrada</span>
            </div>
            <span style={{ fontSize:12, color:'var(--theme-text-secondary)', textAlign:'center', lineHeight:1.5 }}>
              A Meta permite mensagens livres somente até 24h após a última mensagem do cliente. Use um modelo de mensagem aprovado para retomar o contato.
            </span>
            <button onClick={() => setShowTemplates(true)} style={{ marginTop:4, padding:'6px 20px', borderRadius:20, border:'2px solid var(--theme-primary)', background:'none', color:'var(--theme-primary)', fontSize:15, fontWeight:600, cursor:'pointer' }}>
              Enviar modelo de mensagem
            </button>
          </div>
        )}
        <button onClick={() => setShowMedia(true)} disabled={!windowOpen} title="Enviar arquivo"
          style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--theme-border)', background:'var(--theme-bg-input)', cursor: windowOpen ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: windowOpen ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)', opacity: windowOpen ? 1 : 0.4 }}>
          <Paperclip size={18} />
        </button>
        <div ref={stickerBtnRef} style={{ position:'relative', flexShrink:0 }}>
          <button
            onClick={() => windowOpen && setShowStickers(v => !v)}
            disabled={!windowOpen}
            title="Stickers"
            style={{ width:40, height:40, borderRadius:'50%', border:`1px solid ${showStickers ? 'var(--theme-primary)' : 'var(--theme-border)'}`, background: showStickers ? 'var(--theme-primary-subtle)' : 'var(--theme-bg-input)', cursor: windowOpen ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: windowOpen ? (showStickers ? 'var(--theme-primary)' : 'var(--theme-text-secondary)') : 'var(--theme-text-muted)', opacity: windowOpen ? 1 : 0.4, transition:'background 0.15s, border-color 0.15s, color 0.15s' }}
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
          style={{ width:40, height:40, borderRadius:'50%', border: (text.trim() || pastedImage) && !sending && windowOpen ? '2px solid var(--theme-primary)' : '2px solid var(--theme-border)', background: 'none', cursor: (text.trim() || pastedImage) && !sending && windowOpen ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color: (text.trim() || pastedImage) && !sending && windowOpen ? 'var(--theme-primary)' : 'var(--theme-text-muted)', flexShrink:0, opacity: windowOpen ? 1 : 0.4, transition:'border-color 0.2s, color 0.2s' }}>
          {sending ? <Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> : <Send size={16} />}
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
  const [filter, setFilter]               = useState(() => localStorage.getItem('conversationFilter') || '');
  const [search, setSearch]               = useState('');
  const [stats, setStats]                 = useState({ open:0, pending:0, resolved:0, totalToday:0 });
  const [section, setSection]             = useState('inbox');
  const [showSettings, setShowSettings]   = useState(false);
  const [agentStatus, setAgentStatusState] = useState('ONLINE');
  const { loadPreferences }               = useTheme();
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

  const socketControls = useSocket(accessToken, {
    onMessage: (msg) => {
      chatHandlersRef.current?.handleMessage(msg);
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversationId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], lastMessage: msg.content, lastMessageAt: msg.timestamp || new Date().toISOString(), lastMessageDirection: msg.direction || 'INBOUND' };
        return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    },
    onConversationUpdate: (conv) => {
      // Se é a conversa aberta e chegou mensagem inbound, garantir que o chat está sincronizado
      // (cobre o caso de message:new perdido por reconnect do socket)
      if (conv.id === selectedRef.current && conv.lastMessageDirection === 'INBOUND') {
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
        next[idx] = { ...next[idx], ...conv };
        return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
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
    onTyping:          (data) => chatHandlersRef.current?.handleTyping(data),
    onStoppedTyping:   (data) => chatHandlersRef.current?.handleStoppedTyping(data),
    onAgentStatus:     ({ agentId: id, onlineStatus }) => {
      if (id === agent?.id) setAgentStatusState(onlineStatus);
    },
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

  const handleTogglePin = async (convId) => {
    try {
      const { data } = await api.patch(`/conversations/${convId}/pin`);
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, pinned: data.pinned } : c));
    } catch {}
  };

  const handleMessageSent = (convId, content) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === convId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], lastMessage: content, lastMessageAt: new Date().toISOString(), lastMessageDirection: 'OUTBOUND' };
      return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });
  };

  const filtered = conversations.filter(c => {
    if (filter && c.status !== filter) return false;
    const name = c.contact?.name || c.contact?.phone || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selected) || null;

  const filterOptions = [
    { label:'Todas',     value:'' },
    { label:'Abertas',   value:'OPEN' },
    { label:'Pendentes', value:'PENDING' },
    { label:'Resolvidas',value:'RESOLVED' },
  ];

  const handleFilterChange = (value) => {
    setFilter(value);
    localStorage.setItem('conversationFilter', value);
  };

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter', 'Segoe UI', system-ui, sans-serif", overflow:'hidden', background:'var(--theme-bg)' }}>

      {/* Pane 1 — Nav Rail */}
      <NavRail
        section={section}
        onSection={setSection}
        agent={agent}
        agentStatus={agentStatus}
        onStatusChange={(s) => { setAgentStatusState(s); socketControls.setAgentStatus(s); }}
        onSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
      />

      {section === 'inbox' && (
        <>
          {/* Pane 2 — Conversation List */}
          <div style={{ width:300, minWidth:240, display:'flex', flexDirection:'column', background:'var(--theme-bg-sidebar)', borderRight:'1px solid var(--theme-border)', flexShrink:0 }}>

            {/* Header */}
            <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid var(--theme-border)' }}>
              <div style={{ fontWeight:700, fontSize:16, color:'var(--theme-text)' }}>Inbox</div>
            </div>

            {/* Stats */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--theme-border)' }}>
              {[['Abertas', stats.open, '#25D366'], ['Pendentes', stats.pending, '#F59E0B'], ['Hoje', stats.totalToday, 'var(--theme-text)']].map(([label, val, color]) => (
                <div key={label} style={{ flex:1, padding:'10px 0', textAlign:'center', borderRight:'1px solid var(--theme-border)' }}>
                  <div style={{ fontWeight:700, fontSize:16, color }}>{val}</div>
                  <div style={{ fontSize:10, color:'var(--theme-text-muted)', marginTop:1 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--theme-border)' }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
                style={{ width:'100%', padding:'8px 14px', borderRadius:20, border:'1px solid var(--theme-border)', outline:'none', fontSize:13, background:'var(--theme-bg-input)', color:'var(--theme-text)', boxSizing:'border-box' }}
              />
            </div>

            {/* Filter dropdown */}
            <div ref={filterDropdownRef} style={{ position:'relative', padding:'6px 12px', borderBottom:'1px solid var(--theme-border)' }}>
              <button
                onClick={() => setFilterOpen(v => !v)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, border:'none', background:'none', color:'var(--theme-text-secondary)', fontSize:13, fontWeight: filter ? 600 : 400, cursor:'pointer', fontFamily:'inherit', transition:'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <span>{filterOptions.find(o => o.value === filter)?.label}</span>
                <ChevronDown size={14} strokeWidth={2} style={{ transition:'transform 0.15s', transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {filterOpen && (
                <div style={{ position:'absolute', top:'100%', left:12, right:12, background:'var(--theme-bg-secondary)', border:'1px solid var(--theme-border-strong)', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', zIndex:50, overflow:'hidden' }}>
                  {filterOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { handleFilterChange(o.value); setFilterOpen(false); }}
                      style={{ width:'100%', display:'block', padding:'9px 14px', border:'none', background: o.value === filter ? 'var(--theme-bg-hover)' : 'none', color:'var(--theme-text)', fontSize:13, fontWeight: o.value === filter ? 600 : 400, cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'background 0.12s' }}
                      onMouseEnter={e => { if (o.value !== filter) e.currentTarget.style.background = 'var(--theme-bg-hover)'; }}
                      onMouseLeave={e => { if (o.value !== filter) e.currentTarget.style.background = 'none'; }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation list */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {filtered.length === 0
                ? <div style={{ textAlign:'center', color:'var(--theme-text-muted)', padding:'40px 20px', fontSize:13 }}>Nenhuma conversa</div>
                : filtered.map(c => (
                    <ConversationItem key={c.id} conv={c} selected={c.id === selected} onClick={() => {
                      setSelected(c.id);
                      if (c.unreadCount > 0) setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unreadCount: 0 } : x));
                    }} onPin={handleTogglePin} />
                  ))
              }
            </div>
          </div>

          {/* Pane 3 — Chat */}
          <ChatPanel conversationId={selected} socketControls={socketControls} onMessageSent={handleMessageSent} />

          {/* Pane 4 — Contact Details */}
          <ContactDetailsPanel conv={selectedConv} />
        </>
      )}

      {section === 'agents' && (
        <div style={{ flex:1, overflow:'hidden' }}>
          <Agents />
        </div>
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { agent, loading } = useAuth();
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--theme-bg, #0a0f0d)', flexDirection:'column', gap:16 }}>
      <MessageSquare size={40} style={{ color:'var(--theme-primary)' }} />
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
