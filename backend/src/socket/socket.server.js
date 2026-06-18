// src/socket/socket.server.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { pickupPendingConversations } = require('../services/assignment.service');

const prisma = new PrismaClient();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_change_me';

let io;

// Contador de conexões por agente (suporta múltiplas abas/dispositivos)
const agentConnections = new Map(); // agentId -> Set<socketId>

/**
 * Inicializa o servidor Socket.io atrelado ao HTTP server do Express
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean),
      credentials: true,
    },
    // Reconnection automática já vem habilitada no cliente
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // ─── Middleware de autenticação ──────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token não fornecido'));

    try {
      const payload = jwt.verify(token, ACCESS_SECRET);
      socket.agent = payload; // { sub, name, email, role }
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  // ─── Conexão ─────────────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const { sub: agentId, name } = socket.agent;
    console.log(`[Socket] 🟢 Agente conectado: ${name} (${socket.id})`);

    socket.join(`agent:${agentId}`);

    // Registra conexão e marca agente como ONLINE na primeira aba
    if (!agentConnections.has(agentId)) agentConnections.set(agentId, new Set());
    const wasOffline = agentConnections.get(agentId).size === 0;
    agentConnections.get(agentId).add(socket.id);

    if (wasOffline) {
      await prisma.agent.update({ where: { id: agentId }, data: { onlineStatus: 'ONLINE' } });
      io.emit('agent:status', { agentId, onlineStatus: 'ONLINE' });
      console.log(`[Assignment] ✅ ${name} ficou ONLINE`);
      const picked = await pickupPendingConversations();
      for (const { conv } of picked) emitConversationUpdate(conv);
    }

    // ─── Entrar na sala de uma conversa ────────────────────────────────────────
    socket.on('join:conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
      console.log(`[Socket] ${name} entrou em conv:${conversationId}`);
    });

    // ─── Sair da sala de uma conversa ──────────────────────────────────────────
    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ─── Status manual ─────────────────────────────────────────────────────────
    socket.on('agent:set_status', async ({ status }) => {
      if (!['ONLINE', 'BUSY', 'OFFLINE'].includes(status)) return;
      await prisma.agent.update({ where: { id: agentId }, data: { onlineStatus: status } });
      io.emit('agent:status', { agentId, onlineStatus: status });
      console.log(`[Status] ${name} → ${status} (manual)`);
      if (status === 'ONLINE') {
        const picked = await pickupPendingConversations();
        for (const { conv } of picked) emitConversationUpdate(conv);
      }
    });

    // ─── Inatividade (2h) — só age se o agente estiver ONLINE ─────────────────
    socket.on('agent:away', async () => {
      const current = await prisma.agent.findUnique({ where: { id: agentId }, select: { onlineStatus: true } });
      if (current?.onlineStatus !== 'ONLINE') return; // respeita status manual

      await prisma.agent.update({ where: { id: agentId }, data: { onlineStatus: 'OFFLINE' } });
      io.emit('agent:status', { agentId, onlineStatus: 'OFFLINE' });
      console.log(`[Inatividade] ⚪ ${name} → OFFLINE por inatividade`);
    });

    socket.on('agent:back', async () => {
      // Só volta para ONLINE se estava OFFLINE por inatividade (não por escolha manual)
      // O frontend garante isso — só emite agent:back se foi auto-offlinado
      await prisma.agent.update({ where: { id: agentId }, data: { onlineStatus: 'ONLINE' } });
      io.emit('agent:status', { agentId, onlineStatus: 'ONLINE' });
      console.log(`[Inatividade] 🟢 ${name} voltou — marcado ONLINE`);
      const picked = await pickupPendingConversations();
      for (const { conv } of picked) emitConversationUpdate(conv);
    });

    // ─── Indicador de digitação ────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('agent:typing', {
        agentId,
        agentName: name,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('agent:stopped_typing', {
        agentId,
        conversationId,
      });
    });

    // ─── Desconexão ────────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] 🔴 Agente desconectado: ${name} — ${reason}`);

      const sockets = agentConnections.get(agentId);
      if (sockets) {
        sockets.delete(socket.id);
        // Só marca OFFLINE quando não há mais nenhuma aba/conexão ativa
        if (sockets.size === 0) {
          agentConnections.delete(agentId);
          await prisma.agent.update({ where: { id: agentId }, data: { onlineStatus: 'OFFLINE' } });
          io.emit('agent:status', { agentId, onlineStatus: 'OFFLINE' });
          console.log(`[Assignment] ⚪ ${name} ficou OFFLINE`);
        }
      }
    });
  });

  console.log('[Socket] ✅ Socket.io inicializado');
  return io;
}

/**
 * Retorna a instância do io para usar nos controllers
 */
function getIO() {
  if (!io) throw new Error('Socket.io não foi inicializado. Chame initSocket() primeiro.');
  return io;
}

// ─── Helpers de emit ─────────────────────────────────────────────────────────

/**
 * Emite nova mensagem para todos na sala da conversa
 */
function emitNewMessage(conversationId, message) {
  getIO().to(`conv:${conversationId}`).emit('message:new', message);
}

/**
 * Emite atualização de status de uma mensagem
 */
function emitMessageStatus(conversationId, waMessageId, status) {
  getIO().to(`conv:${conversationId}`).emit('message:status', { waMessageId, status });
}

/**
 * Emite atualização de conversa para todos os agentes conectados
 * (nova mensagem recebida, status mudou, etc.)
 */
function emitConversationUpdate(conversation) {
  getIO().emit('conversation:update', conversation);
}

/**
 * Emite nova conversa criada para todos os agentes
 */
function emitNewConversation(conversation) {
  getIO().emit('conversation:new', conversation);
}

function emitPinUpdate(conversationId, pinCount, pinnedBy) {
  getIO().emit('pin:update', { conversationId, pinCount, pinnedBy });
}

function emitMessageReaction(conversationId, messageId, reactions) {
  getIO().to(`conv:${conversationId}`).emit('message:reaction', { messageId, reactions });
}

module.exports = { initSocket, getIO, emitNewMessage, emitMessageStatus, emitMessageReaction, emitConversationUpdate, emitNewConversation, emitPinUpdate };
