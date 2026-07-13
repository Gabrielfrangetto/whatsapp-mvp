/**
 * Mescla conversas duplicadas criadas pelo bug do limite de 24h.
 *
 * Por padrão roda em dry-run (sem alterar nada).
 * Use --execute para aplicar as mudanças.
 *
 * node src/scripts/merge-duplicate-conversations.js
 * node src/scripts/merge-duplicate-conversations.js --execute
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

async function main() {
  console.log(DRY_RUN
    ? '🔍  DRY RUN — nenhuma alteração será feita. Passe --execute para aplicar.\n'
    : '🚀  EXECUTANDO mesclagem de conversas duplicadas...\n'
  );

  // Contatos com mais de 1 conversa
  const groups = await prisma.conversation.groupBy({
    by: ['contactId'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  if (groups.length === 0) {
    console.log('✅  Nenhuma conversa duplicada encontrada.');
    return;
  }

  console.log(`📋  ${groups.length} contato(s) com conversas duplicadas.\n`);

  let totalContacts = 0;
  let totalMessages = 0;
  let totalDeleted  = 0;

  for (const { contactId } of groups) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });

    // Todas as conversas do contato, da mais antiga para a mais nova
    const convs = await prisma.conversation.findMany({
      where: { contactId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { messages: true } } },
    });

    const primary    = convs[0];
    const duplicates = convs.slice(1);

    const label = contact?.name || contact?.phone || contactId;
    console.log(`📱  ${label}  (${convs.length} conversas → será mantida 1)`);
    console.log(`    ✔ principal  #${primary.id.slice(0, 8)}  ${primary.status.padEnd(8)}  ${primary._count.messages} msgs  abertura: ${fmtDate(primary.createdAt)}`);
    for (const d of duplicates) {
      console.log(`    ✖ duplicata  #${d.id.slice(0, 8)}  ${d.status.padEnd(8)}  ${d._count.messages} msgs  abertura: ${fmtDate(d.createdAt)}`);
    }

    if (!DRY_RUN) {
      let movedMsgs = 0;

      for (const dup of duplicates) {
        // Move as mensagens da duplicata para a principal
        const { count } = await prisma.message.updateMany({
          where: { conversationId: dup.id },
          data:  { conversationId: primary.id },
        });
        movedMsgs += count;

        // Exclui a conversa duplicata (sem mensagens vinculadas agora)
        await prisma.conversation.delete({ where: { id: dup.id } });
      }

      // Recalcula metadados da conversa principal a partir de todas as mensagens
      const lastMsg = await prisma.message.findFirst({
        where: { conversationId: primary.id },
        orderBy: { timestamp: 'desc' },
      });

      const firstOutbound = await prisma.message.findFirst({
        where: { conversationId: primary.id, direction: 'OUTBOUND', sentByAgentId: { not: null } },
        orderBy: { timestamp: 'asc' },
      });

      // Status final: OPEN > PENDING > RESOLVED
      const STATUS_PRIORITY = { OPEN: 3, PENDING: 2, RESOLVED: 1 };
      const mostUrgent = convs.reduce((best, c) =>
        (STATUS_PRIORITY[c.status] || 0) > (STATUS_PRIORITY[best.status] || 0) ? c : best
      );

      // Agente atribuído vem da conversa mais recente que estava ativa
      const activeConv = [...convs].reverse().find(c => c.status === 'OPEN' || c.status === 'PENDING');
      const lastResolved = [...convs].reverse().find(c => c.status === 'RESOLVED' && c.resolvedAt);

      const totalReopenCount = convs.reduce((s, c) => s + (c.reopenCount || 0), 0);

      await prisma.conversation.update({
        where: { id: primary.id },
        data: {
          status:              mostUrgent.status,
          assignedToId:        activeConv?.assignedToId        ?? null,
          assignmentSource:    activeConv?.assignmentSource     ?? null,
          firstResponseAt:     firstOutbound?.timestamp        ?? primary.firstResponseAt,
          resolvedAt:          mostUrgent.status === 'RESOLVED' ? (lastResolved?.resolvedAt ?? null) : null,
          resolvedByAgentId:   mostUrgent.status === 'RESOLVED' ? (lastResolved?.resolvedByAgentId ?? null) : null,
          lastMessage:         lastMsg?.content                ?? primary.lastMessage,
          lastMessageAt:       lastMsg?.timestamp              ?? primary.lastMessageAt,
          lastMessageDirection: lastMsg ? (lastMsg.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND') : primary.lastMessageDirection,
          reopenCount:         totalReopenCount,
        },
      });

      totalContacts++;
      totalMessages += movedMsgs;
      totalDeleted  += duplicates.length;

      console.log(`    → ${movedMsgs} mensagem(s) movida(s), ${duplicates.length} conversa(s) excluída(s)`);
    }

    console.log('');
  }

  if (DRY_RUN) {
    console.log('💡  Para aplicar: node src/scripts/merge-duplicate-conversations.js --execute');
  } else {
    console.log(`✅  Concluído!`);
    console.log(`    ${totalContacts} contato(s) processado(s)`);
    console.log(`    ${totalMessages} mensagem(s) preservada(s)`);
    console.log(`    ${totalDeleted} conversa(s) duplicada(s) removida(s)`);
  }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

main()
  .catch(e => { console.error('❌  Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
