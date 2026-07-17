// src/controllers/funnel.controller.js
// Métricas do funil de vendas (Pipedrive): jornada dos contatos, tempo por
// estágio, taxa de conversão e de abandono.
const { PrismaClient } = require('@prisma/client');
const sync = require('../services/pipedriveSync.service');

const prisma = new PrismaClient();

function avgSeconds(diffsMs) {
  if (!diffsMs.length) return null;
  const total = diffsMs.reduce((a, b) => a + b, 0);
  return Math.round(total / diffsMs.length / 1000);
}

async function getFunnelReport(req, res) {
  try {
    const settings = await sync.getSettings();
    if (!settings.enabled || !settings.pipelineId) {
      return res.json({ configured: false, stages: [], summary: null });
    }

    const { from, to } = req.query;
    const dateTo = to ? new Date(to) : new Date();
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dateTo.setHours(23, 59, 59, 999);

    const stages = await prisma.pipedriveStage.findMany({
      where: { pipelineId: settings.pipelineId },
      orderBy: { orderNr: 'asc' },
    });

    const [resolvedDeals, openCounts, enteredLogs, closedLogs, lostByStage] = await Promise.all([
      prisma.pipedriveDeal.findMany({
        where: {
          status: { in: ['WON', 'LOST'] },
          OR: [{ wonAt: { gte: dateFrom, lte: dateTo } }, { lostAt: { gte: dateFrom, lte: dateTo } }],
        },
        select: { status: true, wonAt: true, lostAt: true, pipedriveAddedAt: true },
      }),
      prisma.pipedriveDeal.groupBy({ by: ['stageId'], where: { status: 'OPEN' }, _count: { _all: true } }),
      prisma.pipedriveDealStageLog.groupBy({
        by: ['stageId'],
        where: { enteredAt: { gte: dateFrom, lte: dateTo } },
        _count: { _all: true },
      }),
      prisma.pipedriveDealStageLog.findMany({
        where: { exitedAt: { gte: dateFrom, lte: dateTo } },
        select: { stageId: true, enteredAt: true, exitedAt: true },
      }),
      prisma.pipedriveDeal.groupBy({
        by: ['stageId'],
        where: { status: 'LOST', lostAt: { gte: dateFrom, lte: dateTo } },
        _count: { _all: true },
      }),
    ]);

    const openByStage = Object.fromEntries(openCounts.map(r => [r.stageId, r._count._all]));
    const enteredByStage = Object.fromEntries(enteredLogs.map(r => [r.stageId, r._count._all]));
    const lostCountByStage = Object.fromEntries(lostByStage.map(r => [r.stageId, r._count._all]));

    const durationsByStage = {};
    for (const log of closedLogs) {
      const diff = new Date(log.exitedAt) - new Date(log.enteredAt);
      if (diff <= 0) continue;
      (durationsByStage[log.stageId] ||= []).push(diff);
    }

    const stageRows = stages.map(s => ({
      id: s.id,
      name: s.name,
      order: s.orderNr,
      dealsEnteredCount: enteredByStage[s.id] || 0,
      currentlyIn: openByStage[s.id] || 0,
      lostFromStage: lostCountByStage[s.id] || 0,
      avgTimeInStageSeconds: avgSeconds(durationsByStage[s.id] || []),
    }));

    const won = resolvedDeals.filter(d => d.status === 'WON');
    const lost = resolvedDeals.filter(d => d.status === 'LOST');
    const totalResolved = won.length + lost.length;

    const summary = {
      wonCount: won.length,
      lostCount: lost.length,
      conversionRate: totalResolved > 0 ? Math.round((won.length / totalResolved) * 1000) / 10 : null,
      abandonmentRate: totalResolved > 0 ? Math.round((lost.length / totalResolved) * 1000) / 10 : null,
      avgTimeToConversionSeconds: avgSeconds(won.map(d => new Date(d.wonAt) - new Date(d.pipedriveAddedAt))),
      avgTimeToAbandonmentSeconds: avgSeconds(lost.map(d => new Date(d.lostAt) - new Date(d.pipedriveAddedAt))),
    };

    res.json({ configured: true, from: dateFrom, to: dateTo, stages: stageRows, summary });
  } catch (e) {
    console.error('[Funnel] Erro:', e.message);
    res.status(500).json({ error: 'Erro ao gerar relatório do funil' });
  }
}

async function getFunnelDeals(req, res) {
  try {
    const settings = await sync.getSettings();
    if (!settings.enabled) return res.json({ deals: [], total: 0 });

    const { stageId, status, page = 1, limit = 30 } = req.query;
    const where = {};
    if (stageId) where.stageId = Number(stageId);
    if (status) where.status = status;

    const [deals, total] = await Promise.all([
      prisma.pipedriveDeal.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          stageLogs: { where: { exitedAt: null }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.pipedriveDeal.count({ where }),
    ]);

    const now = Date.now();
    const rows = deals.map(d => {
      const openLog = d.stageLogs[0];
      return {
        id: d.id,
        title: d.title,
        contact: d.contact,
        stageName: d.stageName,
        status: d.status,
        value: d.value,
        currency: d.currency,
        currentStageEnteredAt: openLog?.enteredAt || null,
        timeInCurrentStageSeconds: openLog ? Math.round((now - new Date(openLog.enteredAt)) / 1000) : null,
        totalAgeSeconds: Math.round(((d.status === 'OPEN' ? now : new Date(d.wonAt || d.lostAt || d.updatedAt)) - new Date(d.pipedriveAddedAt)) / 1000),
        wonAt: d.wonAt,
        lostAt: d.lostAt,
        lostReason: d.lostReason,
      };
    });

    res.json({ deals: rows, total });
  } catch (e) {
    console.error('[Funnel] Erro ao listar deals:', e.message);
    res.status(500).json({ error: 'Erro ao listar jornada dos contatos' });
  }
}

module.exports = { getFunnelReport, getFunnelDeals };
