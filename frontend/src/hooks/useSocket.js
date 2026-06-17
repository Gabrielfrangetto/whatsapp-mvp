// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 horas
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

let socketInstance = null;

function getSocket(accessToken) {
  if (socketInstance?.connected) return socketInstance;

  socketInstance = io(import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app', {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    transports: ['websocket', 'polling'],
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function useSocket(accessToken, handlers = {}) {
  const socketRef       = useRef(null);
  const handlersRef     = useRef(handlers);
  const timerRef        = useRef(null);
  const isAutoAwayRef   = useRef(false);
  const currentRoomRef  = useRef(null); // room atual para re-join após reconnect
  // null = auto-ONLINE, 'BUSY' | 'OFFLINE' = override manual ativo
  const manualOverrideRef = useRef(null);

  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  // Agenda o timer de inatividade — só roda se não houver override manual
  const scheduleAutoAway = useCallback(() => {
    clearTimeout(timerRef.current);
    if (manualOverrideRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      isAutoAwayRef.current = true;
      socketRef.current?.emit('agent:away');
      console.log('[Inatividade] ⚪ 2h sem atividade — marcando offline');
    }, INACTIVITY_MS);
  }, []);

  // Chamado em qualquer evento de atividade do usuário
  const handleActivity = useCallback(() => {
    if (isAutoAwayRef.current) {
      isAutoAwayRef.current = false;
      socketRef.current?.emit('agent:back');
      console.log('[Inatividade] 🟢 Agente voltou');
    }
    scheduleAutoAway();
  }, [scheduleAutoAway]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);
    socketRef.current = socket;

    const on = (event, cb) => socket.on(event, (...args) => cb(...args));

    on('connect', () => {
      console.log('[Socket] 🟢 Conectado:', socket.id);
      scheduleAutoAway();
      // Re-join a room atual após reconnect (socket perde memberships ao reconectar)
      if (currentRoomRef.current) {
        socket.emit('join:conversation', currentRoomRef.current);
        console.log('[Socket] 🔄 Re-join room:', currentRoomRef.current);
      }
    });
    on('disconnect',    (reason) => console.log('[Socket] 🔴 Desconectado:', reason));
    on('connect_error', (err) => console.warn('[Socket] ⚠️ Erro:', err.message));

    on('message:new',          (msg)  => handlersRef.current.onMessage?.(msg));
    on('conversation:update',  (conv) => handlersRef.current.onConversationUpdate?.(conv));
    on('conversation:new',     (conv) => handlersRef.current.onNewConversation?.(conv));
    on('message:status',       (data) => handlersRef.current.onMessageStatus?.(data));
    on('agent:typing',         (data) => handlersRef.current.onTyping?.(data));
    on('agent:stopped_typing', (data) => handlersRef.current.onStoppedTyping?.(data));
    on('agent:status',         (data) => handlersRef.current.onAgentStatus?.(data));
    on('pin:update',           (data) => handlersRef.current.onPinUpdate?.(data));

    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    scheduleAutoAway();

    return () => {
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handleActivity));
      clearTimeout(timerRef.current);
    };
  }, [accessToken, handleActivity, scheduleAutoAway]);

  // Permite ao agente setar status manualmente
  const setAgentStatus = useCallback((status) => {
    if (status === 'ONLINE') {
      manualOverrideRef.current = null;
      isAutoAwayRef.current = false;
      scheduleAutoAway(); // reinicia o timer de inatividade
    } else {
      manualOverrideRef.current = status;
      clearTimeout(timerRef.current); // pausa o timer enquanto manual ativo
    }
    socketRef.current?.emit('agent:set_status', { status });
  }, [scheduleAutoAway]);

  const joinConversation = useCallback((id) => {
    currentRoomRef.current = id;
    socketRef.current?.emit('join:conversation', id);
  }, []);

  const leaveConversation = useCallback((id) => {
    if (currentRoomRef.current === id) currentRoomRef.current = null;
    socketRef.current?.emit('leave:conversation', id);
  }, []);
  const startTyping       = useCallback((id) => socketRef.current?.emit('typing:start', { conversationId: id }), []);
  const stopTyping        = useCallback((id) => socketRef.current?.emit('typing:stop', { conversationId: id }), []);

  return { joinConversation, leaveConversation, startTyping, stopTyping, setAgentStatus };
}
