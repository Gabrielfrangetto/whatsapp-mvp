const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');
const { emitNewMessage, emitConversationUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();
const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
const ACCESS_TOKEN = () => process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

async function listFavorites(req, res) {
  try {
    const agentId = req.agent.sub;
    const favorites = await prisma.stickerFavorite.findMany({
      where: { agentId },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
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

async function sendFavorite(req, res) {
  try {
    const { conversationId } = req.params;
    const { favoriteId } = req.body;
    const agentId = req.agent.sub;

    const [conversation, favorite] = await Promise.all([
      prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } }),
      prisma.stickerFavorite.findUnique({ where: { id: favoriteId } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    if (!favorite || favorite.agentId !== agentId) return res.status(404).json({ error: 'Favorito não encontrado' });

    const phone = conversation.contact.phone.replace(/\D/g, '');

    // Busca a mídia no servidor Meta
    const { data: metaMedia } = await axios.get(`${META_API}/${favorite.mediaUrl}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
    });
    const mediaRes = await axios.get(metaMedia.url, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
    });
    const buffer = Buffer.from(mediaRes.data);

    // Faz upload para a Meta como WebP
    const form = new FormData();
    form.append('file', buffer, { filename: 'sticker.webp', contentType: 'image/webp' });
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/webp');

    const uploadRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/media`,
      form,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, ...form.getHeaders() } },
    );
    const mediaId = uploadRes.data.id;

    // Envia como sticker
    const sendRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: phone, type: 'sticker', sticker: { id: mediaId } },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, 'Content-Type': 'application/json' } },
    );
    const waMessageId = sendRes.data.messages?.[0]?.id;

    const [message] = await Promise.all([
      prisma.message.create({
        data: {
          waMessageId,
          conversationId,
          direction: 'OUTBOUND',
          type: 'IMAGE',
          content: 'Sticker',
          mediaUrl: mediaId,
          status: 'SENT',
          sentByAgentId: agentId,
        },
      }),
      prisma.stickerFavorite.update({
        where: { id: favoriteId },
        data: { lastUsedAt: new Date() },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: 'Sticker', lastMessageAt: new Date(), lastMessageDirection: 'OUTBOUND' },
      }),
    ]);

    emitNewMessage(conversationId, message);
    const updatedConv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } });
    emitConversationUpdate(updatedConv);

    res.json(message);
  } catch (e) {
    console.error('[Favorite] Send error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Erro ao enviar favorito', detail: e.response?.data });
  }
}

module.exports = { listFavorites, toggleFavorite, sendFavorite };
