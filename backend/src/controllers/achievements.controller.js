// src/controllers/achievements.controller.js
const { PrismaClient } = require('@prisma/client');
const { CATALOG } = require('../achievements/catalog');

const prisma = new PrismaClient();

async function getMyAchievements(req, res) {
  try {
    const agentId = req.agent.sub;

    const [unlocked, progress] = await Promise.all([
      prisma.agentAchievement.findMany({ where: { agentId } }),
      prisma.agentAchievementProgress.findMany({ where: { agentId } }),
    ]);

    const unlockedByKey = Object.fromEntries(unlocked.map(u => [u.key, u]));
    const progressByType = Object.fromEntries(progress.map(p => [p.type, p]));

    const achievements = CATALOG.map(def => {
      const unlock = unlockedByKey[def.key];
      const currentValue = progressByType[def.type]?.value ?? 0;
      return {
        ...def,
        unlocked: !!unlock,
        unlockedAt: unlock?.unlockedAt ?? null,
        seenAt: unlock?.seenAt ?? null,
        progress: Math.min(currentValue, def.threshold),
      };
    });

    res.json({ achievements });
  } catch (e) {
    console.error('[Achievements] getMyAchievements error:', e.message);
    res.status(500).json({ error: 'Erro ao carregar conquistas' });
  }
}

async function markSeen(req, res) {
  try {
    const agentId = req.agent.sub;
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: 'keys obrigatório' });

    await prisma.agentAchievement.updateMany({
      where: { agentId, key: { in: keys }, seenAt: null },
      data: { seenAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[Achievements] markSeen error:', e.message);
    res.status(500).json({ error: 'Erro ao marcar conquistas como vistas' });
  }
}

module.exports = { getMyAchievements, markSeen };
