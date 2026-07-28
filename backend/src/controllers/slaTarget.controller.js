// src/controllers/slaTarget.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Usado apenas enquanto nenhuma meta foi configurada pelo admin.
const DEFAULT_SLA_TARGET_SECONDS = 300; // 5 min

async function getSlaTargetHistory() {
  return prisma.slaTargetHistory.findMany({ orderBy: { effectiveFrom: 'asc' } });
}

function currentTargetFromHistory(history) {
  return history.length ? history[history.length - 1].targetSeconds : DEFAULT_SLA_TARGET_SECONDS;
}

// Meta vigente em uma data específica — usada para não alterar retroativamente
// o SLA de conversas cujo período já passou quando o admin muda a meta.
function resolveSlaTargetAt(history, at) {
  const ts = at.getTime();
  let target = DEFAULT_SLA_TARGET_SECONDS;
  for (const row of history) {
    if (new Date(row.effectiveFrom).getTime() > ts) break;
    target = row.targetSeconds;
  }
  return target;
}

async function getSlaTarget(req, res) {
  try {
    const history = await getSlaTargetHistory();
    res.json({ targetSeconds: currentTargetFromHistory(history) });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar meta de SLA' });
  }
}

async function updateSlaTarget(req, res) {
  try {
    const value = Number(req.body.targetSeconds);
    if (!Number.isInteger(value) || value < 10 || value > 86400) {
      return res.status(400).json({ error: 'Meta de SLA inválida (entre 10s e 24h)' });
    }
    await prisma.slaTargetHistory.create({ data: { targetSeconds: value } });
    res.json({ targetSeconds: value });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar meta de SLA' });
  }
}

module.exports = {
  getSlaTarget,
  updateSlaTarget,
  getSlaTargetHistory,
  resolveSlaTargetAt,
  currentTargetFromHistory,
  DEFAULT_SLA_TARGET_SECONDS,
};
