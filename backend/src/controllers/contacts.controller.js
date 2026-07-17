const { PrismaClient } = require('@prisma/client');
const { emitConversationUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();

async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nome inválido' });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: { name: name.trim() },
    });

    const conversations = await prisma.conversation.findMany({
      where: { contactId: id },
      include: {
        contact: true,
        assignedAgent: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } },
        pins: { include: { agent: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } } } },
      },
    });

    for (const { pins, ...conv } of conversations) {
      emitConversationUpdate({ ...conv, pinnedBy: pins.map(p => p.agent) });
    }

    res.json(contact);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Contato não encontrado' });
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
}

module.exports = { updateContact };
