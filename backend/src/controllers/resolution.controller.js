// src/controllers/resolution.controller.js
const { PrismaClient } = require('@prisma/client');
const { emitNewMessage, emitConversationUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();

// ─── Motivos de finalização ───────────────────────────────────────────────────

async function listReasons(req, res) {
  try {
    const reasons = await prisma.resolutionReason.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' },
    });
    res.json(reasons);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar motivos' });
  }
}

async function listAllReasons(req, res) {
  try {
    const reasons = await prisma.resolutionReason.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(reasons);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar motivos' });
  }
}

async function createReason(req, res) {
  try {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Descrição obrigatória' });

    const reason = await prisma.resolutionReason.create({
      data: { label: label.trim() },
    });
    res.status(201).json(reason);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Motivo já existe' });
    res.status(500).json({ error: 'Erro ao criar motivo' });
  }
}

async function updateReason(req, res) {
  try {
    const { id } = req.params;
    const { label, isActive } = req.body;

    const reason = await prisma.resolutionReason.update({
      where: { id },
      data: {
        ...(label && { label: label.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(reason);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar motivo' });
  }
}

async function deleteReason(req, res) {
  try {
    const { id } = req.params;
    await prisma.resolutionReason.delete({ where: { id } });
    res.json({ message: 'Motivo removido' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao remover motivo' });
  }
}

// ─── Resolver conversa com motivo ─────────────────────────────────────────────

async function resolveConversation(req, res) {
  try {
    const { id } = req.params;
    const { reasonId } = req.body;

    if (!reasonId) return res.status(400).json({ error: 'Motivo de finalização obrigatório' });

    const [conversation, reason, agent] = await Promise.all([
      prisma.conversation.findUnique({ where: { id }, include: { contact: true } }),
      prisma.resolutionReason.findUnique({ where: { id: reasonId } }),
      prisma.agent.findUnique({ where: { id: req.agent.sub }, select: { name: true } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    if (!reason) return res.status(404).json({ error: 'Motivo não encontrado' });

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    
    const internalContent = `🔒 Conversa finalizada por ${agent.name} em ${dateStr} às ${timeStr}\nMotivo: ${reason.label}`;

    // Cria mensagem interna
    const internalMessage = await prisma.message.create({
      data: {
        conversationId: id,
        direction: 'INTERNAL',
        type: 'INTERNAL',
        content: internalContent,
        status: 'SENT',
        sentByAgentId: req.agent.sub,
      },
    });

    // Atualiza status da conversa
    const updatedConv = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        lastMessage: internalContent,
        lastMessageAt: now,
        resolvedAt: now,
        resolvedByAgentId: req.agent.sub,
        resolutionReasonId: reason.id,
      },
      include: { contact: true },
    });

    // Emite em tempo real
    emitNewMessage(id, internalMessage);
    emitConversationUpdate(updatedConv);

    res.json({ conversation: updatedConv, message: internalMessage });
  } catch (e) {
    console.error('[Resolution] Error:', e.message);
    res.status(500).json({ error: 'Erro ao finalizar conversa' });
  }
}

module.exports = {
  listReasons,
  listAllReasons,
  createReason,
  updateReason,
  deleteReason,
  resolveConversation,
};
