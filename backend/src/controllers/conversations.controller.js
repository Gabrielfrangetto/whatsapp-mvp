// src/controllers/conversations.controller.js
const { PrismaClient } = require('@prisma/client');
const whatsappService = require('../services/whatsapp.service');
const { emitNewMessage, emitConversationUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();

async function listConversations(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: { contact: true, assignedAgent: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({ data: conversations, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
}

async function getMessages(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, conversation] = await Promise.all([
      prisma.message.findMany({ where: { conversationId: id }, orderBy: { timestamp: 'asc' }, skip, take: parseInt(limit) }),
      prisma.conversation.findUnique({ where: { id }, include: { contact: true, assignedAgent: { select: { id: true, name: true } } } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    await prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });

    res.json({ conversation, messages });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
}

async function sendMessage(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Texto obrigatório' });

    const conversation = await prisma.conversation.findUnique({ where: { id }, include: { contact: true } });
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    const waResponse = await whatsappService.sendTextMessage(conversation.contact.phone, text);
    const waMessageId = waResponse.messages?.[0]?.id;

    const message = await prisma.message.create({
      data: {
        waMessageId,
        conversationId: id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: text,
        status: 'SENT',
        sentByAgentId: req.agent?.sub || null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: text, lastMessageAt: new Date(), status: 'OPEN' },
    });

    // Emite em tempo real para outros agentes na mesma conversa
    emitNewMessage(id, message);
    const updatedConv = await prisma.conversation.findUnique({ where: { id }, include: { contact: true } });
    emitConversationUpdate(updatedConv);

    res.json(message);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
}

async function updateConversationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, assignedToId } = req.body;

    const valid = ['OPEN', 'PENDING', 'RESOLVED'];
    if (status && !valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
      include: { contact: true, assignedAgent: { select: { id: true, name: true } } },
    });

    res.json(conversation);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar conversa' });
  }
}

async function getStats(req, res) {
  try {
    const [open, pending, resolved, totalToday] = await Promise.all([
      prisma.conversation.count({ where: { status: 'OPEN' } }),
      prisma.conversation.count({ where: { status: 'PENDING' } }),
      prisma.conversation.count({ where: { status: 'RESOLVED' } }),
      prisma.message.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }, direction: 'INBOUND' },
      }),
    ]);
    res.json({ open, pending, resolved, totalToday });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar stats' });
  }
}

module.exports = { listConversations, getMessages, sendMessage, updateConversationStatus, getStats };
