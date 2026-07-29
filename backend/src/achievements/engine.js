// src/achievements/engine.js
// Motor genérico de progresso/desbloqueio de conquistas + dois hooks de alto
// nível chamados pelos controllers de conversas. Erros aqui nunca devem
// derrubar o fluxo principal (enviar mensagem / resolver conversa).
const { PrismaClient } = require('@prisma/client');
const { byType } = require('./catalog');
const { emitAchievementUnlocked } = require('../socket/socket.server');
const { getSlaTargetHistory, resolveSlaTargetAt } = require('../controllers/slaTarget.controller');

const prisma = new PrismaClient();

const FAST_RESPONSE_MS = 60 * 1000;
const FAST_RESOLUTION_MINUTES = 15;

function todayStr(date) {
  return date.toISOString().slice(0, 10);
}

async function getProgress(agentId, type) {
  return prisma.agentAchievementProgress.upsert({
    where: { agentId_type: { agentId, type } },
    create: { agentId, type, value: 0, best: 0 },
    update: {},
  });
}

async function bumpCounter(agentId, type, delta = 1) {
  const progress = await getProgress(agentId, type);
  const value = progress.value + delta;
  await prisma.agentAchievementProgress.update({
    where: { agentId_type: { agentId, type } },
    data: { value, best: Math.max(progress.best, value) },
  });
  return value;
}

async function resetStreak(agentId, type) {
  await getProgress(agentId, type);
  await prisma.agentAchievementProgress.update({
    where: { agentId_type: { agentId, type } },
    data: { value: 0 },
  });
  return 0;
}

// Dia consecutivo é um caso especial: só avança uma vez por dia civil, e reseta
// para 1 (não para 0) quando o gap é maior que um dia.
async function bumpActiveDays(agentId, now) {
  const progress = await getProgress(agentId, 'ACTIVE_DAYS');
  const today = todayStr(now);
  if (progress.lastEventDate === today) return progress.value;

  const yesterday = todayStr(new Date(now.getTime() - 86400000));
  const value = progress.lastEventDate === yesterday ? progress.value + 1 : 1;

  await prisma.agentAchievementProgress.update({
    where: { agentId_type: { agentId, type: 'ACTIVE_DAYS' } },
    data: { value, best: Math.max(progress.best, value), lastEventDate: today },
  });
  return value;
}

async function checkUnlocks(agentId, type, currentValue) {
  const candidates = byType(type).filter(a => a.threshold <= currentValue);
  if (candidates.length === 0) return [];

  const existing = await prisma.agentAchievement.findMany({
    where: { agentId, key: { in: candidates.map(c => c.key) } },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map(e => e.key));
  const toUnlock = candidates.filter(c => !existingKeys.has(c.key));

  const unlocked = [];
  for (const achievement of toUnlock) {
    try {
      await prisma.agentAchievement.create({
        data: { agentId, key: achievement.key, value: currentValue },
      });
      unlocked.push(achievement);
      emitAchievementUnlocked(agentId, achievement);
    } catch (e) {
      if (e.code !== 'P2002') throw e; // já desbloqueada (corrida concorrente)
    }
  }
  return unlocked;
}

// ─── Hooks chamados pelos controllers ──────────────────────────────────────

async function onFirstResponse({ agentId, openedAt, firstResponseAt }) {
  try {
    if (!agentId || !openedAt || !firstResponseAt) return;

    const diffMs = new Date(firstResponseAt) - new Date(openedAt);
    const history = await getSlaTargetHistory();
    const targetSeconds = resolveSlaTargetAt(history, new Date(openedAt));
    const withinSla = diffMs / 1000 <= targetSeconds;

    const slaValue = withinSla
      ? await bumpCounter(agentId, 'SLA_STREAK', 1)
      : await resetStreak(agentId, 'SLA_STREAK');
    await checkUnlocks(agentId, 'SLA_STREAK', slaValue);

    if (diffMs <= FAST_RESPONSE_MS) {
      const fastValue = await bumpCounter(agentId, 'FAST_FIRST_RESPONSE', 1);
      await checkUnlocks(agentId, 'FAST_FIRST_RESPONSE', fastValue);
    }
  } catch (e) {
    console.error('[Achievements] onFirstResponse error:', e.message);
  }
}

async function onResolution({ agentId, openedAt, resolvedAt, reopenCount }) {
  try {
    if (!agentId) return;
    const now = resolvedAt ? new Date(resolvedAt) : new Date();

    const totalValue = await bumpCounter(agentId, 'RESOLVED_TOTAL', 1);
    await checkUnlocks(agentId, 'RESOLVED_TOTAL', totalValue);

    const fcrValue = reopenCount === 0
      ? await bumpCounter(agentId, 'FCR_STREAK', 1)
      : await resetStreak(agentId, 'FCR_STREAK');
    await checkUnlocks(agentId, 'FCR_STREAK', fcrValue);

    if (openedAt) {
      const minutes = (now - new Date(openedAt)) / 60000;
      if (minutes <= FAST_RESOLUTION_MINUTES) {
        const fastResValue = await bumpCounter(agentId, 'FAST_RESOLUTION', 1);
        await checkUnlocks(agentId, 'FAST_RESOLUTION', fastResValue);
      }
    }

    const activeDaysValue = await bumpActiveDays(agentId, now);
    await checkUnlocks(agentId, 'ACTIVE_DAYS', activeDaysValue);
  } catch (e) {
    console.error('[Achievements] onResolution error:', e.message);
  }
}

module.exports = { onFirstResponse, onResolution, bumpCounter, resetStreak, checkUnlocks };
