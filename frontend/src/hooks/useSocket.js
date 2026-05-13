// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Singleton: garante apenas uma conexão Socket.io por sessão
 */
function getSocket(accessToken) {
  if (socketInstance?.connected) return socketInstance;

  socketInstance = io('/', {
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
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Mantém handlers sempre atualizados sem precisar reconectar
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);
    socketRef.current = socket;

    const on = (event, cb) => socket.on(event, (...args) => cb(...args));

    on('connect',    () => console.log('[Socket] 🟢 Conectado:', socket.id));
    on('disconnect', (reason) => console.log('[Socket] 🔴 Desconectado:', reason));
    on('connect_error', (err) => console.warn('[Socket] ⚠️ Erro:', err.message));

    on('message:new',          (msg)  => handlersRef.current.onMessage?.(msg));
    on('conversation:update',  (conv) => handlersRef.current.onConversationUpdate?.(conv));
    on('conversation:new',     (conv) => handlersRef.current.onNewConversation?.(conv));
    on('message:status',       (data) => handlersRef.current.onMessageStatus?.(data));
    on('agent:typing',         (data) => handlersRef.current.onTyping?.(data));
    on('agent:stopped_typing', (data) => handlersRef.current.onStoppedTyping?.(data));

    return () => {
      // Não desconecta ao desmontar — mantém conexão viva entre navegações
      // O socket só é desconectado no logout (disconnectSocket())
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
