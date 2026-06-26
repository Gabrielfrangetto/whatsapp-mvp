// src/controllers/reports.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function msToSeconds(ms) {
  return ms > 0 ? Math.round(ms / 1000) : null;
}

async function computeAgentMetrics(agentId, from, to) {
  const [chatsReceived, messagesSent, resolvedConvs, assignedConvs] = await Promise.all([
    // Chats recebidos via fluxo automático no período
    prisma.conversation.count({
      where: {
        assignedToId: agentId,
        assignmentSource: 'AUTO',
        openedAt: { gte: from, lte: to },
      },
    }),

    // Mensagens enviadas pelo agente no período
    prisma.message.count({
      where: {
        sentByAgentId: agentId,
        direction: 'OUTBOUND',
        timestamp: { gte: from, lte: to },
      },
    }),

    // Conversas finalizadas pelo agente no período (para tempo de resolução)
    prisma.conversation.findMany({
      where: {
        resolvedByAgentId: agentId,
        resolvedAt: { gte: from, lte: to },
        openedAt: { not: null },
      },
      select: { openedAt: true, resolvedAt: true },
    }),

    // Conversas atribuídas ao agente no período (para tempos de resposta)
    prisma.conversation.findMany({
      where: {
        assignedToId: agentId,
        openedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        openedAt: true,
        messages: {
          where: { direction: { in: ['INBOUND', 'OUTBOUND'] } },
          orderBy: { timestamp: 'asc' },
          select: { direction: true, timestamp: true, sentByAgentId: true },
        },
      },
    }),
  ]);

  // Tempo médio de resolução (resolvedAt - openedAt)
  let resolutionTimeAvg = null;
  if (resolvedConvs.length > 0) {
    const totalMs = resolvedConvs.reduce((sum, c) => {
      const diff = new Date(c.resolvedAt) - new Date(c.openedAt);
      return sum + (diff > 0 ? diff : 0);
    }, 0);
    resolutionTimeAvg = msToSeconds(totalMs / resolvedConvs.length);
  }

  // Tempo médio de primeira resposta e tempo médio de resposta geral
  let firstResponseTotal = 0;
  let firstResponseCount = 0;
  let avgResponseTotal = 0;
  let avgResponseCount = 0;

  for (const conv of assignedConvs) {
    if (!conv.openedAt) continue;

    let firstInboundTime = null;
    let firstResponseDone = false;

    for (const msg of conv.messages) {
      const ts = new Date(msg.timestamp).getTime();

      if (msg.direction === 'INBOUND') {
        firstInboundTime = ts;
      } else if (msg.direction === 'OUTBOUND' && msg.sentByAgentId === agentId && firstInboundTime !== null) {
        const diff = ts - firstInboundTime;
        if (diff >= 0) {
          // Resposta geral: toda vez que o agente responde após uma mensagem do cliente
          avgResponseTotal += diff;
          avgResponseCount++;

          // Primeira resposta: apenas a primeira vez na conversa
          if (!firstResponseDone) {
            firstResponseTotal += diff;
            firstResponseCount++;
            firstResponseDone = true;
          }
        }
        firstInboundTime = null; // reset: aguarda próxima mensagem do cliente
      }
    }
  }

  const firstResponseTimeAvg = firstResponseCount > 0
    ? msToSeconds(firstResponseTotal / firstResponseCount)
    : null;

  const avgResponseTime = avgResponseCount > 0
    ? msToSeconds(avgResponseTotal / avgResponseCount)
    : null;

  return {
    chatsReceived,
    messagesSent,
    resolutionTimeAvg,
    firstResponseTimeAvg,
    avgResponseTime,
  };
}

async function getReports(req, res) {
  try {
    const { from, to } = req.query;

    // Padrão: últimos 30 dias
    const dateTo   = to   ? new Date(to)   : new Date();
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dateTo.setHours(23, 59, 59, 999);

    const isAdmin = req.agent.role === 'ADMIN';

    // Admin vê todos os agentes; outros veem só a si mesmos
    const agents = isAdmin
      ? await prisma.agent.findMany({
          where: { isActive: true },
          select: { id: true, name: true, avatarColor: true, avatarUrl: true, role: true },
          orderBy: { name: 'asc' },
        })
      : [await prisma.agent.findUnique({
          where: { id: req.agent.sub },
          select: { id: true, name: true, avatarColor: true, avatarUrl: true, role: true },
        })];

    const results = await Promise.all(
      agents.filter(Boolean).map(async (agent) => {
        const metrics = await computeAgentMetrics(agent.id, dateFrom, dateTo);
        return { agent, ...metrics };
      })
    );

    res.json({ from: dateFrom, to: dateTo, agents: results });
  } catch (e) {
    console.error('[Reports] Error:', e.message);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
}

module.exports = { getReports };
