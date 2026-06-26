// src/controllers/reports.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function msToSeconds(ms) {
  return ms > 0 ? Math.round(ms / 1000) : null;
}

function clampToRange(ts, from, to) {
  return Math.min(Math.max(ts, from.getTime()), to.getTime());
}

async function computeAgentMetrics(agentId, from, to, slaTarget = 300) {
  const [
    chatsReceived,
    messagesSent,
    resolvedConvs,
    assignedConvs,
    transfersOut,
    statusLogs,
  ] = await Promise.all([
    // Chats recebidos via fluxo automático
    prisma.conversation.count({
      where: { assignedToId: agentId, assignmentSource: 'AUTO', openedAt: { gte: from, lte: to } },
    }),

    // Mensagens enviadas no período
    prisma.message.count({
      where: { sentByAgentId: agentId, direction: 'OUTBOUND', timestamp: { gte: from, lte: to } },
    }),

    // Conversas finalizadas pelo agente no período
    prisma.conversation.findMany({
      where: { resolvedByAgentId: agentId, resolvedAt: { gte: from, lte: to }, openedAt: { not: null } },
      select: { openedAt: true, resolvedAt: true, firstResponseAt: true, reopenCount: true },
    }),

    // Conversas atribuídas no período (para tempos de resposta)
    prisma.conversation.findMany({
      where: { assignedToId: agentId, openedAt: { gte: from, lte: to } },
      select: {
        id: true,
        openedAt: true,
        firstResponseAt: true,
        messages: {
          where: { direction: { in: ['INBOUND', 'OUTBOUND'] } },
          orderBy: { timestamp: 'asc' },
          select: { direction: true, timestamp: true, sentByAgentId: true },
        },
      },
    }),

    // Transferências saídas: conversas onde este agente era o dono e foi transferido para outro
    prisma.conversation.count({
      where: { transferredFromId: agentId, openedAt: { gte: from, lte: to } },
    }),

    // Logs de status do agente no período
    prisma.agentStatusLog.findMany({
      where: {
        agentId,
        startedAt: { lte: to },
        OR: [{ endedAt: null }, { endedAt: { gte: from } }],
      },
      orderBy: { startedAt: 'asc' },
    }),
  ]);

  // ─── Tempos de resolução e FCR ───────────────────────────────────────────────
  let resolutionTimeTotal = 0;
  let resolutionTimeCount = 0;
  let fcrCount = 0; // resolved without reopens

  for (const c of resolvedConvs) {
    const diff = new Date(c.resolvedAt) - new Date(c.openedAt);
    if (diff > 0) { resolutionTimeTotal += diff; resolutionTimeCount++; }
    if (c.reopenCount === 0) fcrCount++;
  }

  const resolutionTimeAvg = resolutionTimeCount > 0
    ? msToSeconds(resolutionTimeTotal / resolutionTimeCount) : null;
  const fcrRate = resolvedConvs.length > 0
    ? Math.round((fcrCount / resolvedConvs.length) * 100) : null;
  const reopenRate = resolvedConvs.length > 0
    ? Math.round(((resolvedConvs.length - fcrCount) / resolvedConvs.length) * 100) : null;

  // ─── SLA compliance (firstResponseAt - openedAt < SLA_TARGET) ───────────────
  const convsWithFirstResponse = assignedConvs.filter(c => c.firstResponseAt && c.openedAt);
  const slaOk = convsWithFirstResponse.filter(c => {
    const secs = (new Date(c.firstResponseAt) - new Date(c.openedAt)) / 1000;
    return secs <= slaTarget;
  }).length;
  const slaComplianceRate = convsWithFirstResponse.length > 0
    ? Math.round((slaOk / convsWithFirstResponse.length) * 100) : null;

  // ─── Tempos de resposta (primeira e geral) ───────────────────────────────────
  let firstResponseTotal = 0;
  let firstResponseCount = 0;
  let avgResponseTotal = 0;
  let avgResponseCount = 0;

  for (const conv of assignedConvs) {
    if (!conv.openedAt) continue;
    let lastInboundTime = null;
    let firstResponseDone = false;

    for (const msg of conv.messages) {
      const ts = new Date(msg.timestamp).getTime();
      if (msg.direction === 'INBOUND') {
        lastInboundTime = ts;
      } else if (msg.direction === 'OUTBOUND' && msg.sentByAgentId === agentId && lastInboundTime !== null) {
        const diff = ts - lastInboundTime;
        if (diff >= 0) {
          avgResponseTotal += diff;
          avgResponseCount++;
          if (!firstResponseDone) {
            firstResponseTotal += diff;
            firstResponseCount++;
            firstResponseDone = true;
          }
        }
        lastInboundTime = null;
      }
    }
  }

  const firstResponseTimeAvg = firstResponseCount > 0
    ? msToSeconds(firstResponseTotal / firstResponseCount) : null;
  const avgResponseTime = avgResponseCount > 0
    ? msToSeconds(avgResponseTotal / avgResponseCount) : null;

  // ─── Distribuição de status e disponibilidade ────────────────────────────────
  const statusDist = { ONLINE: 0, BUSY: 0, OFFLINE: 0 };

  for (const log of statusLogs) {
    const start = clampToRange(new Date(log.startedAt).getTime(), from, to);
    const end   = clampToRange(log.endedAt ? new Date(log.endedAt).getTime() : to.getTime(), from, to);
    const ms    = Math.max(0, end - start);
    if (statusDist[log.status] !== undefined) statusDist[log.status] += ms;
  }

  const onlineMs   = statusDist.ONLINE + statusDist.BUSY;
  const onlineHours = onlineMs / 3600000;
  const chatsPerHour = onlineHours > 0.1 ? Math.round((chatsReceived / onlineHours) * 10) / 10 : null;

  // Taxa de transferência saída (sobre os chats automáticos recebidos)
  const transferOutRate = chatsReceived > 0
    ? Math.round((transfersOut / chatsReceived) * 100) : null;

  // ─── Horário de pico (distribuição por hora) ─────────────────────────────────
  const peakHours = Array(24).fill(0);
  for (const conv of assignedConvs) {
    if (conv.openedAt) {
      peakHours[new Date(conv.openedAt).getHours()]++;
    }
  }

  return {
    chatsReceived,
    messagesSent,
    firstResponseTimeAvg,
    resolutionTimeAvg,
    avgResponseTime,
    fcrRate,
    reopenRate,
    slaComplianceRate,
    slaTargetSeconds: slaTarget,
    transfersOut,
    transferOutRate,
    chatsPerHour,
    statusDistributionMinutes: {
      ONLINE:  Math.round(statusDist.ONLINE  / 60000),
      BUSY:    Math.round(statusDist.BUSY    / 60000),
      OFFLINE: Math.round(statusDist.OFFLINE / 60000),
    },
    onlineMinutes: Math.round(onlineMs / 60000),
    peakHours,
  };
}

async function getReports(req, res) {
  try {
    const { from, to } = req.query;

    const dateTo   = to   ? new Date(to)   : new Date();
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dateTo.setHours(23, 59, 59, 999);

    const slaSetting = await prisma.systemSetting.findUnique({ where: { key: 'sla_target_seconds' } });
    const slaTarget  = slaSetting ? (parseInt(slaSetting.value) || 300) : 300;

    const isAdmin = req.agent.role === 'ADMIN';

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
        const metrics = await computeAgentMetrics(agent.id, dateFrom, dateTo, slaTarget);
        return { agent, ...metrics };
      })
    );

    res.json({ from: dateFrom, to: dateTo, slaTargetSeconds: slaTarget, agents: results });
  } catch (e) {
    console.error('[Reports] Error:', e.message);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
}

module.exports = { getReports };
