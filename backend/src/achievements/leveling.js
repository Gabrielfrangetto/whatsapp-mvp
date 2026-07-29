// src/achievements/leveling.js
// XP é sempre derivado da soma das conquistas já desbloqueadas (catalog.xp) —
// não existe contador de XP persistido, então não há risco de o total
// dessincronizar do que o agente realmente tem em AgentAchievement.
const XP_PER_LEVEL = 100;

function levelInfo(totalXp) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  return { level, totalXp, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}

module.exports = { XP_PER_LEVEL, levelInfo };
