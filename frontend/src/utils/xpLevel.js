// src/utils/xpLevel.js
// Mesma fórmula usada no backend (achievements/leveling.js) — duplicada aqui só
// para permitir atualização otimista do nível assim que o toast de conquista chega,
// sem esperar o refetch de /achievements/me.
export const XP_PER_LEVEL = 100;

export function levelInfo(totalXp) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  return { level, totalXp, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}
