const { PrismaClient } = require('@prisma/client');
const whatsappService = require('../services/whatsapp.service');
const { emitNewMessage, emitConversationUpdate, emitPinUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();

async function listConversations(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};
    const agentId = req.agent.sub;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: true,
          assignedAgent: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } },
          pins: { include: { agent: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } } } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.conversation.count({ where }),
    ]);

    const data = conversations.map(({ pins, ...c }) => ({
      ...c,
      pinned:   pins.some(p => p.agentId === agentId),
      pinCount: pins.length,
      pinnedBy: pins.map(p => p.agent),
    }));

    // Pins do agente sobem para o topo, mantendo ordem por lastMessageAt dentro de cada grupo
    data.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json({ data, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
}

async function getMessages(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, conversation] = await Promise.all([
      prisma.message.findMany({ where: { conversationId: id }, orderBy: { timestamp: 'desc' }, skip, take: parseInt(limit) }),
      prisma.conversation.findUnique({ where: { id }, include: { contact: true, assignedAgent: { select: { id: true, name: true } } } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    await prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });

    const agentIds = [...new Set(messages.filter(m => m.sentByAgentId).map(m => m.sentByAgentId))];
    const agents = agentIds.length > 0 ? await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, avatarColor: true, avatarUrl: true },
    }) : [];
    const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

    const enriched = messages.map(m => ({
      ...m,
      agentName:      m.sentByAgentId ? agentMap[m.sentByAgentId]?.name       : null,
      agentColor:     m.sentByAgentId ? agentMap[m.sentByAgentId]?.avatarColor : null,
      agentAvatarUrl: m.sentByAgentId ? agentMap[m.sentByAgentId]?.avatarUrl   : null,
    }));

    res.json({ conversation, messages: enriched.reverse() });
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

    let waResponse;
    try {
      waResponse = await whatsappService.sendTextMessage(conversation.contact.phone, text);
    } catch (e) {
      console.error('[sendMessage] WhatsApp API error:', e.response?.data || e.message);
      return res.status(500).json({ error: 'Erro ao enviar via WhatsApp: ' + (e.response?.data?.error?.message || e.message) });
    }

    const message = await prisma.message.create({
      data: {
        waMessageId: waResponse.messages?.[0]?.id,
        conversationId: id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: text,
        status: 'SENT',
        sentByAgentId: req.agent?.sub ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: text, lastMessageAt: new Date(), lastMessageDirection: 'OUTBOUND', status: 'OPEN' },
    });

    const agentInfo = req.agent?.sub ? await prisma.agent.findUnique({
      where: { id: req.agent.sub },
      select: { name: true, avatarColor: true, avatarUrl: true },
    }) : null;

    emitNewMessage(id, { ...message, agentName: agentInfo?.name ?? null, agentColor: agentInfo?.avatarColor ?? null, agentAvatarUrl: agentInfo?.avatarUrl ?? null });

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
      data: { ...(status && { status }), ...(assignedToId !== undefined && { assignedToId }) },
      include: { contact: true, assignedAgent: { select: { id: true, name: true } } },
    });

    emitConversationUpdate(conversation);
    res.json(conversation);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar conversa' });
  }
}

async function getStats(req, res) {
  try {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const [open, pending, resolved, totalToday] = await Promise.all([
      prisma.conversation.count({ where: { status: 'OPEN' } }),
      prisma.conversation.count({ where: { status: 'PENDING' } }),
      prisma.conversation.count({ where: { status: 'RESOLVED' } }),
      prisma.conversation.count({ where: { createdAt: { gte: startOfDay } } }),
    ]);
    res.json({ open, pending, resolved, totalToday });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar stats' });
  }
}

async function togglePin(req, res) {
  try {
    const { id } = req.params;
    const agentId = req.agent.sub;

    const existing = await prisma.conversationPin.findUnique({
      where: { agentId_conversationId: { agentId, conversationId: id } },
    });

    if (existing) {
      await prisma.conversationPin.delete({ where: { agentId_conversationId: { agentId, conversationId: id } } });
    } else {
      const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
      if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
      await prisma.conversationPin.create({ data: { agentId, conversationId: id } });
    }

    const pins = await prisma.conversationPin.findMany({
      where: { conversationId: id },
      include: { agent: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } } },
    });

    const pinned   = pins.some(p => p.agentId === agentId);
    const pinCount = pins.length;
    const pinnedBy = pins.map(p => p.agent);

    emitPinUpdate(id, pinCount, pinnedBy);
    res.json({ pinned, pinCount, pinnedBy });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao fixar conversa' });
  }
}

module.exports = { listConversations, getMessages, sendMessage, updateConversationStatus, getStats, togglePin };
