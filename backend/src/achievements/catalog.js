// src/achievements/catalog.js
// Catálogo de conquistas dos atendentes. Fica em código (não editável pelo admin)
// porque cada categoria tem sua própria regra de gatilho, não um valor simples
// como a meta de SLA ou os motivos de finalização.
//
// `type` liga a definição ao progresso rastreado em AgentAchievementProgress:
// - streaks (SLA_STREAK, FCR_STREAK, ACTIVE_DAYS) resetam ao quebrar a sequência
// - cumulativos (FAST_FIRST_RESPONSE, FAST_RESOLUTION, RESOLVED_TOTAL) só sobem

const CATEGORY = {
  SLA: 'SLA & Velocidade',
  RESOLUTION: 'Resolução & Qualidade',
  VOLUME: 'Volume & Consistência',
};

const CATALOG = [
  // ─── SLA & Velocidade ───────────────────────────────────────────────────────
  { key: 'sla_streak_bronze', type: 'SLA_STREAK', category: CATEGORY.SLA, threshold: 10, icon: '⚡', title: 'Raio Iniciante', description: '10 conversas seguidas com 1ª resposta dentro da meta de SLA' },
  { key: 'sla_streak_silver', type: 'SLA_STREAK', category: CATEGORY.SLA, threshold: 25, icon: '⚡', title: 'Raio Veterano', description: '25 conversas seguidas com 1ª resposta dentro da meta de SLA' },
  { key: 'sla_streak_gold', type: 'SLA_STREAK', category: CATEGORY.SLA, threshold: 50, icon: '⚡', title: 'Raio Lendário', description: '50 conversas seguidas com 1ª resposta dentro da meta de SLA' },

  { key: 'fast_response_bronze', type: 'FAST_FIRST_RESPONSE', category: CATEGORY.SLA, threshold: 50, icon: '🚀', title: 'Resposta Rápida', description: '50 primeiras respostas enviadas em até 60 segundos' },
  { key: 'fast_response_silver', type: 'FAST_FIRST_RESPONSE', category: CATEGORY.SLA, threshold: 100, icon: '🚀', title: 'Resposta Instantânea', description: '100 primeiras respostas enviadas em até 60 segundos' },

  // ─── Resolução & Qualidade ──────────────────────────────────────────────────
  { key: 'fcr_streak_bronze', type: 'FCR_STREAK', category: CATEGORY.RESOLUTION, threshold: 10, icon: '✅', title: 'Sem Volta', description: '10 conversas seguidas resolvidas sem reabertura' },
  { key: 'fcr_streak_silver', type: 'FCR_STREAK', category: CATEGORY.RESOLUTION, threshold: 25, icon: '✅', title: 'Resolução Definitiva', description: '25 conversas seguidas resolvidas sem reabertura' },
  { key: 'fcr_streak_gold', type: 'FCR_STREAK', category: CATEGORY.RESOLUTION, threshold: 50, icon: '✅', title: 'Mestre da Resolução', description: '50 conversas seguidas resolvidas sem reabertura' },

  { key: 'fast_resolution_bronze', type: 'FAST_RESOLUTION', category: CATEGORY.RESOLUTION, threshold: 25, icon: '🎯', title: 'Resolução Relâmpago', description: '25 conversas resolvidas em até 15 minutos' },
  { key: 'fast_resolution_silver', type: 'FAST_RESOLUTION', category: CATEGORY.RESOLUTION, threshold: 100, icon: '🎯', title: 'Precisão Cirúrgica', description: '100 conversas resolvidas em até 15 minutos' },

  // ─── Volume & Consistência ──────────────────────────────────────────────────
  { key: 'resolved_total_bronze', type: 'RESOLVED_TOTAL', category: CATEGORY.VOLUME, threshold: 10, icon: '🏅', title: 'Primeiros Passos', description: '10 conversas resolvidas' },
  { key: 'resolved_total_silver', type: 'RESOLVED_TOTAL', category: CATEGORY.VOLUME, threshold: 100, icon: '🏅', title: 'Centena de Atendimentos', description: '100 conversas resolvidas' },
  { key: 'resolved_total_gold', type: 'RESOLVED_TOTAL', category: CATEGORY.VOLUME, threshold: 500, icon: '🏆', title: 'Veterano de Atendimento', description: '500 conversas resolvidas' },

  { key: 'active_days_bronze', type: 'ACTIVE_DAYS', category: CATEGORY.VOLUME, threshold: 5, icon: '🔥', title: 'Sequência de 5 Dias', description: '5 dias seguidos resolvendo pelo menos 1 conversa' },
  { key: 'active_days_silver', type: 'ACTIVE_DAYS', category: CATEGORY.VOLUME, threshold: 15, icon: '🔥', title: 'Sequência de 15 Dias', description: '15 dias seguidos resolvendo pelo menos 1 conversa' },
  { key: 'active_days_gold', type: 'ACTIVE_DAYS', category: CATEGORY.VOLUME, threshold: 30, icon: '🔥', title: 'Sequência de 30 Dias', description: '30 dias seguidos resolvendo pelo menos 1 conversa' },
];

function byType(type) {
  return CATALOG.filter(a => a.type === type);
}

module.exports = { CATALOG, byType, CATEGORY };
