const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listFavorites(req, res) {
  try {
    const agentId = req.agent.sub;
    const favorites = await prisma.stickerFavorite.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(favorites);
  } catch {
    res.status(500).json({ error: 'Erro ao listar favoritos' });
  }
}

async function toggleFavorite(req, res) {
  try {
    const agentId = req.agent.sub;
    const { mediaUrl, name } = req.body;
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl é obrigatório' });

    const existing = await prisma.stickerFavorite.findUnique({
      where: { agentId_mediaUrl: { agentId, mediaUrl } },
    });

    if (existing) {
      await prisma.stickerFavorite.delete({ where: { id: existing.id } });
      return res.json({ favorited: false });
    }

    const fav = await prisma.stickerFavorite.create({
      data: { agentId, mediaUrl, name: name || null },
    });
    res.json({ favorited: true, favorite: fav });
  } catch {
    res.status(500).json({ error: 'Erro ao favoritar' });
  }
}

module.exports = { listFavorites, toggleFavorite };
