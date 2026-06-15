const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Escolhe o agente online com menos conversas ativas (OPEN + PENDING).
 * Em caso de empate, desempata pelo nome para ordem estável (round-robin).
 * Retorna null se nenhum agente estiver online.
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

  const withCounts = await Promise.all(
    agents.map(async (agent) => {
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
 * Atribui uma conversa ao agente com menor carga.
 * Retorna { conv, agent } ou null se não houver agentes online.
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
 * Redistribui todas as conversas ativas de um agente que saiu offline
 * entre os demais agentes online, mantendo a distribuição equilibrada.
 * Retorna array de { conv, agent } redistribuídos.
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

module.exports = { assignConversation, redistributeConversations, pickAgent };
