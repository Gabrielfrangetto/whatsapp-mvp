// src/controllers/conversationsReport.controller.js
// Relatório de conversas: motivos de fechamento, atribuição automática e lista detalhada.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseRange(query) {
  const dateTo = query.to ? new Date(query.to) : new Date();
  const dateFrom = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

// Agrupa mensagens (cliente/agente) por conversa, a partir de uma lista de IDs.
async function messageStatsByConversation(convIds) {
  const messages = await prisma.message.findMany({
    where: { conversationId: { in: convIds }, direction: { in: ['INBOUND', 'OUTBOUND'] } },
    select: { conversationId: true, direction: true, sentByAgentId: true },
  });

  const byConv = {};
  for (const m of messages) {
    const bucket = (byConv[m.conversationId] ||= { total: 0, fromClient: 0, byAgent: {} });
    bucket.total++;
    if (m.direction === 'INBOUND') bucket.fromClient++;
    else if (m.sentByAgentId) bucket.byAgent[m.sentByAgentId] = (bucket.byAgent[m.sentByAgentId] || 0) + 1;
  }
  return byConv;
}

async function getConversationsReport(req, res) {
  try {
    const { dateFrom, dateTo } = parseRange(req.query);
    const resolvedWhere = { status: 'RESOLVED', resolvedAt: { gte: dateFrom, lte: dateTo } };

    const [resolvedConvs, byReason, reasons, byAutoAssignee, agents] = await Promise.all([
      prisma.conversation.findMany({ where: resolvedWhere, select: { id: true, openedAt: true, resolvedAt: true } }),
      prisma.conversation.groupBy({ by: ['resolutionReasonId'], where: resolvedWhere, _count: { _all: true } }),
      prisma.resolutionReason.findMany({ select: { id: true, label: true } }),
      prisma.conversation.groupBy({
        by: ['assignedToId'],
        where: { assignmentSource: 'AUTO', openedAt: { gte: dateFrom, lte: dateTo }, assignedToId: { not: null } },
        _count: { _all: true },
      }),
      prisma.agent.findMany({ select: { id: true, name: true, avatarColor: true } }),
    ]);

    const reasonLabel = Object.fromEntries(reasons.map(r => [r.id, r.label]));
    const agentInfo = Object.fromEntries(agents.map(a => [a.id, a]));

    const closingReasons = byReason
      .map(r => ({
        id: r.resolutionReasonId,
        label: r.resolutionReasonId ? (reasonLabel[r.resolutionReasonId] || 'Motivo removido') : 'Sem motivo registrado',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const autoAssignments = byAutoAssignee
      .map(r => ({
        agent: agentInfo[r.assignedToId] ? { id: r.assignedToId, name: agentInfo[r.assignedToId].name, color: agentInfo[r.assignedToId].avatarColor } : { id: r.assignedToId, name: 'Agente removido', color: '#94a3b8' },
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const durations = resolvedConvs.filter(c => c.openedAt).map(c => (new Date(c.resolvedAt) - new Date(c.openedAt)) / 1000);
    const avgDurationSeconds = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    const msgStats = await messageStatsByConversation(resolvedConvs.map(c => c.id));
    const totalMsgs = Object.values(msgStats).reduce((sum, b) => sum + b.total, 0);
    const multiAgentCount = Object.values(msgStats).filter(b => Object.keys(b.byAgent).length > 1).length;

    res.json({
      from: dateFrom,
      to: dateTo,
      summary: {
        totalResolved: resolvedConvs.length,
        avgDurationSeconds,
        avgMessagesPerConversation: resolvedConvs.length ? Math.round((totalMsgs / resolvedConvs.length) * 10) / 10 : null,
        multiAgentCount,
      },
      closingReasons,
      autoAssignments,
    });
  } catch (e) {
    console.error('[ConversationsReport] Erro:', e.message);
    res.status(500).json({ error: 'Erro ao gerar relatório de conversas' });
  }
}

async function getConversationsList(req, res) {
  try {
    const { dateFrom, dateTo } = parseRange(req.query);
    const limit = Math.min(Number(req.query.limit) || 100, 300);

    const conversations = await prisma.conversation.findMany({
      where: { status: 'RESOLVED', resolvedAt: { gte: dateFrom, lte: dateTo } },
      include: { contact: { select: { name: true, phone: true } }, resolutionReason: { select: { label: true } } },
      orderBy: { resolvedAt: 'desc' },
      take: limit,
    });

    const [msgStats, agents] = await Promise.all([
      messageStatsByConversation(conversations.map(c => c.id)),
      prisma.agent.findMany({ select: { id: true, name: true } }),
    ]);
    const agentName = Object.fromEntries(agents.map(a => [a.id, a.name]));

    const rows = conversations.map(c => {
      const msgs = msgStats[c.id] || { total: 0, fromClient: 0, byAgent: {} };
      const agentBreakdown = Object.entries(msgs.byAgent)
        .map(([agentId, count]) => ({ agentId, name: agentName[agentId] || 'Agente removido', count }))
        .sort((a, b) => b.count - a.count);

      const durationSeconds = c.openedAt && c.resolvedAt
        ? Math.round((new Date(c.resolvedAt) - new Date(c.openedAt)) / 1000)
        : null;

      return {
        id: c.id,
        contact: c.contact,
        openedAt: c.openedAt,
        resolvedAt: c.resolvedAt,
        durationSeconds,
        totalMessages: msgs.total,
        messagesFromClient: msgs.fromClient,
        messagesFromAgents: msgs.total - msgs.fromClient,
        resolvedByAgentName: c.resolvedByAgentId ? (agentName[c.resolvedByAgentId] || 'Agente removido') : null,
        resolutionReasonLabel: c.resolutionReason?.label || null,
        channelPhone: c.channelPhone,
        initiatedBy: c.initiatedBy,
        multipleAgents: agentBreakdown.length > 1,
        agentBreakdown,
      };
    });

    res.json({ from: dateFrom, to: dateTo, total: rows.length, conversations: rows });
  } catch (e) {
    console.error('[ConversationsReport] Erro na lista:', e.message);
    res.status(500).json({ error: 'Erro ao gerar lista de conversas' });
  }
}

module.exports = { getConversationsReport, getConversationsList };
