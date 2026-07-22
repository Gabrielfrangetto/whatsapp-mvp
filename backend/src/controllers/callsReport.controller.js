// src/controllers/callsReport.controller.js
// Relatório de chamadas de voz recebidas via WhatsApp (quem tentou ligar).
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function avgSeconds(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

async function getCallsReport(req, res) {
  try {
    const { from, to, status, page = 1, limit = 30 } = req.query;
    const dateTo = to ? new Date(to) : new Date();
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dateTo.setHours(23, 59, 59, 999);

    const where = { startedAt: { gte: dateFrom, lte: dateTo } };
    if (status) where.status = status;

    const [calls, total, statusCounts] = await Promise.all([
      prisma.call.findMany({
        where,
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { startedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.call.count({ where }),
      prisma.call.groupBy({ by: ['status'], where: { startedAt: { gte: dateFrom, lte: dateTo } }, _count: { _all: true } }),
    ]);

    const countByStatus = Object.fromEntries(statusCounts.map(r => [r.status, r._count._all]));
    const totalCalls = Object.values(countByStatus).reduce((a, b) => a + b, 0);
    const answeredCount = countByStatus.ANSWERED || 0;
    const missedCount = countByStatus.MISSED || 0;
    const rejectedCount = countByStatus.REJECTED || 0;

    const answeredDurations = await prisma.call.findMany({
      where: { ...where, status: 'ANSWERED', durationSeconds: { not: null } },
      select: { durationSeconds: true },
    });

    const summary = {
      totalCalls,
      answeredCount,
      missedCount,
      rejectedCount,
      answerRate: totalCalls > 0 ? Math.round((answeredCount / totalCalls) * 1000) / 10 : null,
      avgDurationSeconds: avgSeconds(answeredDurations.map(c => c.durationSeconds)),
    };

    const rows = calls.map(c => ({
      id: c.id,
      contact: c.contact,
      phone: c.phone,
      status: c.status,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationSeconds: c.durationSeconds,
    }));

    res.json({ from: dateFrom, to: dateTo, summary, calls: rows, total });
  } catch (e) {
    console.error('[CallsReport] Erro:', e.message);
    res.status(500).json({ error: 'Erro ao gerar relatório de chamadas' });
  }
}

module.exports = { getCallsReport };
