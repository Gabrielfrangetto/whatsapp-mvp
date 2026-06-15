// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 horas
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

let socketInstance = null;

/**
 * Singleton: garante apenas uma conexão Socket.io por sessão
 */
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

/**
 * Hook principal de WebSocket
 *
 * @param {string} accessToken - JWT do agente autenticado
 * @param {object} handlers - callbacks para eventos:
 *   onMessage(message)          - nova mensagem numa conversa
 *   onConversationUpdate(conv)  - conversa atualizada (lastMessage, status, unread)
 *   onNewConversation(conv)     - nova conversa criada por inbound
 *   onMessageStatus(data)       - atualização de status (DELIVERED, READ...)
 *   onTyping(data)              - agente digitando
 *   onStoppedTyping(data)       - agente parou de digitar
 */
export function useSocket(accessToken, handlers = {}) {
  const socketRef  = useRef(null);
  const handlersRef = useRef(handlers);
  const isAwayRef  = useRef(false);
  const timerRef   = useRef(null);

  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);
    socketRef.current = socket;

    const on = (event, cb) => socket.on(event, (...args) => cb(...args));

    on('connect',       () => console.log('[Socket] 🟢 Conectado:', socket.id));
    on('disconnect',    (reason) => console.log('[Socket] 🔴 Desconectado:', reason));
    on('connect_error', (err) => console.warn('[Socket] ⚠️ Erro:', err.message));

    on('message:new',          (msg)  => handlersRef.current.onMessage?.(msg));
    on('conversation:update',  (conv) => handlersRef.current.onConversationUpdate?.(conv));
    on('conversation:new',     (conv) => handlersRef.current.onNewConversation?.(conv));
    on('message:status',       (data) => handlersRef.current.onMessageStatus?.(data));
    on('agent:typing',         (data) => handlersRef.current.onTyping?.(data));
    on('agent:stopped_typing', (data) => handlersRef.current.onStoppedTyping?.(data));

    // ─── Inatividade: 2h sem atividade → offline ─────────────────────────────
    const resetTimer = () => {
      clearTimeout(timerRef.current);

      // Se voltou de ausência, notifica o servidor
      if (isAwayRef.current) {
        isAwayRef.current = false;
        socket.emit('agent:back');
        console.log('[Inatividade] 🟢 Agente voltou');
      }

      timerRef.current = setTimeout(() => {
        isAwayRef.current = true;
        socket.emit('agent:away');
        console.log('[Inatividade] ⚪ Agente ausente por 2h — marcando offline');
      }, INACTIVITY_MS);
    };

    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // inicia o timer ao conectar

    return () => {
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [accessToken]);

  /** Entra na sala de uma conversa para receber suas mensagens */
  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('join:conversation', conversationId);
  }, []);

  /** Sai da sala de uma conversa */
  const leaveConversation = useCallback((conversationId) => {
    socketRef.current?.emit('leave:conversation', conversationId);
  }, []);

  /** Emite "está digitando" */
  const startTyping = useCallback((conversationId) => {
    socketRef.current?.emit('typing:start', { conversationId });
  }, []);

  /** Emite "parou de digitar" */
  const stopTyping = useCallback((conversationId) => {
    socketRef.current?.emit('typing:stop', { conversationId });
  }, []);

  return { joinConversation, leaveConversation, startTyping, stopTyping };
}
