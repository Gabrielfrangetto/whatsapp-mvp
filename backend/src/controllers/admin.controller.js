// src/controllers/admin.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const STATUS_PRIORITY = { OPEN: 3, PENDING: 2, RESOLVED: 1 };

async function getDuplicateGroups() {
  return prisma.conversation.groupBy({
    by: ['contactId'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });
}

async function previewMerge(req, res) {
  try {
    const groups = await getDuplicateGroups();
    if (groups.length === 0) return res.json({ contacts: 0, duplicates: 0, items: [] });

    const items = await Promise.all(groups.map(async ({ contactId }) => {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { name: true, phone: true },
      });
      const convs = await prisma.conversation.findMany({
        where: { contactId },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { messages: true } } },
      });
      return {
        contact: { name: contact?.name, phone: contact?.phone },
        total: convs.length,
        duplicates: convs.length - 1,
        conversations: convs.map(c => ({
          id: c.id,
          status: c.status,
          messages: c._count.messages,
          createdAt: c.createdAt,
        })),
      };
    }));

    const totalDuplicates = items.reduce((s, i) => s + i.duplicates, 0);
    res.json({ contacts: groups.length, duplicates: totalDuplicates, items });
  } catch (e) {
    console.error('[Admin] previewMerge error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

async function executeMerge(req, res) {
  try {
    const groups = await getDuplicateGroups();
    if (groups.length === 0) return res.json({ contacts: 0, messages: 0, deleted: 0 });

    let totalContacts = 0, totalMessages = 0, totalDeleted = 0;

    for (const { contactId } of groups) {
      const convs = await prisma.conversation.findMany({
        where: { contactId },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { messages: true } } },
      });

      const primary = convs[0];
      const duplicates = convs.slice(1);
      let movedMsgs = 0;

      for (const dup of duplicates) {
        const { count } = await prisma.message.updateMany({
          where: { conversationId: dup.id },
          data: { conversationId: primary.id },
        });
        movedMsgs += count;
        await prisma.conversation.delete({ where: { id: dup.id } });
      }

      const lastMsg = await prisma.message.findFirst({
        where: { conversationId: primary.id },
        orderBy: { timestamp: 'desc' },
      });
      const firstOutbound = await prisma.message.findFirst({
        where: { conversationId: primary.id, direction: 'OUTBOUND', sentByAgentId: { not: null } },
        orderBy: { timestamp: 'asc' },
      });

      const mostUrgent = convs.reduce((best, c) =>
        (STATUS_PRIORITY[c.status] || 0) > (STATUS_PRIORITY[best.status] || 0) ? c : best
      );
      const activeConv = [...convs].reverse().find(c => c.status === 'OPEN' || c.status === 'PENDING');
      const lastResolved = [...convs].reverse().find(c => c.status === 'RESOLVED' && c.resolvedAt);
      const totalReopenCount = convs.reduce((s, c) => s + (c.reopenCount || 0), 0);

      await prisma.conversation.update({
        where: { id: primary.id },
        data: {
          status:               mostUrgent.status,
          assignedToId:         activeConv?.assignedToId        ?? null,
          assignmentSource:     activeConv?.assignmentSource     ?? null,
          firstResponseAt:      firstOutbound?.timestamp        ?? primary.firstResponseAt,
          resolvedAt:           mostUrgent.status === 'RESOLVED' ? (lastResolved?.resolvedAt ?? null) : null,
          resolvedByAgentId:    mostUrgent.status === 'RESOLVED' ? (lastResolved?.resolvedByAgentId ?? null) : null,
          lastMessage:          lastMsg?.content                ?? primary.lastMessage,
          lastMessageAt:        lastMsg?.timestamp              ?? primary.lastMessageAt,
          lastMessageDirection: lastMsg ? (lastMsg.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND') : primary.lastMessageDirection,
          reopenCount:          totalReopenCount,
        },
      });

      totalContacts++;
      totalMessages += movedMsgs;
      totalDeleted  += duplicates.length;
    }

    res.json({ contacts: totalContacts, messages: totalMessages, deleted: totalDeleted });
  } catch (e) {
    console.error('[Admin] executeMerge error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { previewMerge, executeMerge };
