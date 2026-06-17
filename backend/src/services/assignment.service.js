const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Verifica se o agente está dentro do seu horário de trabalho configurado.
 * Se não tiver horário configurado, considera sempre disponível.
 */
function isAgentInSchedule(agent) {
  const schedule = agent.workSchedule;
  if (!schedule) return true;

  const now = new Date();
  const dayKey = DAYS[now.getDay()];
  const day = schedule[dayKey];

  if (!day || !day.enabled) return false;

  const [startH, startM] = day.start.split(':').map(Number);
  const [endH, endM]     = day.end.split(':').map(Number);
  const current = now.getHours() * 60 + now.getMinutes();

  return current >= startH * 60 + startM && current < endH * 60 + endM;
}

/**
 * Escolhe o agente online, dentro do horário de trabalho e com menos conversas ativas.
 * Em caso de empate, desempata pelo nome para ordem estável (round-robin).
 * Retorna null se nenhum agente estiver disponível.
 */
async function pickAgent(excludeAgentId = null) {
  const agents = await prisma.agent.findMany({
    where: {
      onlineStatus: 'ONLINE',
      isActive: true,
      ...(excludeAgentId ? { id: { not: excludeAgentId } } : {}),
    },
  });

  if (agents.length === 0) return null;

  const available = agents.filter(isAgentInSchedule);
  if (available.length === 0) return null;

  const withCounts = await Promise.all(
    available.map(async (agent) => {
      const count = await prisma.conversation.count({
        where: { assignedToId: agent.id, status: { in: ['OPEN', 'PENDING'] } },
      });
      return { agent, count };
    })
  );

  withCounts.sort((a, b) => a.count - b.count || a.agent.name.localeCompare(b.agent.name));
  return withCounts[0].agent;
}

/**
 * Atribui uma conversa ao agente com menor carga disponível no horário atual.
 * Retorna { conv, agent } ou null se não houver agentes disponíveis.
 */
async function assignConversation(conversationId, excludeAgentId = null) {
  const agent = await pickAgent(excludeAgentId);
  if (!agent) return null;

  const conv = await prisma.conversation.update({
    where: { id: conversationId },
    data: { assignedToId: agent.id },
    include: { contact: true },
  });

  return { conv, agent };
}

/**
 * Percorre conversas PENDENTES sem assignee e tenta atribuí-las a agentes
 * disponíveis no horário atual, promovendo-as para OPEN.
 * Chamado quando um agente fica online ou volta do modo away.
 */
async function pickupPendingConversations() {
  const pending = await prisma.conversation.findMany({
    where: { status: 'PENDING', assignedToId: null },
    orderBy: { lastMessageAt: 'asc' },
  });

  const results = [];
  for (const conv of pending) {
    const agent = await pickAgent();
    if (!agent) break; // Sem agentes disponíveis, para

    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: { status: 'OPEN', assignedToId: agent.id },
      include: { contact: true },
    });

    console.log(`[Assignment] 📋 Pendente ${conv.id} → ${agent.name}`);
    results.push({ conv: updated, agent });
  }
  return results;
}

/**
 * Redistribui todas as conversas ativas de um agente que saiu offline
 * entre os demais agentes online, mantendo a distribuição equilibrada.
 */
async function redistributeConversations(offlineAgentId) {
  const convs = await prisma.conversation.findMany({
    where: { assignedToId: offlineAgentId, status: { in: ['OPEN', 'PENDING'] } },
  });

  const results = [];
  for (const conv of convs) {
    const result = await assignConversation(conv.id, offlineAgentId);
    if (result) results.push(result);
  }
  return results;
}

module.exports = { assignConversation, redistributeConversations, pickAgent, pickupPendingConversations };
