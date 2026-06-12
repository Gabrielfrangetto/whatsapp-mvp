// src/controllers/stickers.controller.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');
const { emitNewMessage, emitConversationUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();
const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
const ACCESS_TOKEN = () => process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

async function listStickers(req, res) {
  try {
    const stickers = await prisma.sticker.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(stickers);
  } catch {
    res.status(500).json({ error: 'Erro ao listar stickers' });
  }
}

async function createSticker(req, res) {
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Nome e URL são obrigatórios' });
    const sticker = await prisma.sticker.create({ data: { name, url } });
    res.status(201).json(sticker);
  } catch {
    res.status(500).json({ error: 'Erro ao criar sticker' });
  }
}

async function deleteSticker(req, res) {
  try {
    await prisma.sticker.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao remover sticker' });
  }
}

async function sendSticker(req, res) {
  try {
    const { conversationId } = req.params;
    const { stickerId } = req.body;

    const [conversation, sticker] = await Promise.all([
      prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } }),
      prisma.sticker.findUnique({ where: { id: stickerId } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    if (!sticker) return res.status(404).json({ error: 'Sticker não encontrado' });

    const phone = conversation.contact.phone.replace(/\D/g, '');

    // Baixa o arquivo do Cloudinary
    const fileRes = await axios.get(sticker.url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(fileRes.data);
    const contentType = fileRes.headers['content-type'] || 'image/webp';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'webp';

    // Faz upload para a Meta
    const form = new FormData();
    form.append('file', buffer, { filename: `sticker_${sticker.id}.${ext}`, contentType });
    form.append('messaging_product', 'whatsapp');
    form.append('type', contentType);

    const uploadRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/media`,
      form,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, ...form.getHeaders() } }
    );
    const mediaId = uploadRes.data.id;

    // Envia como imagem para o contato
    const sendRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: phone, type: 'image', image: { id: mediaId } },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    const waMessageId = sendRes.data.messages?.[0]?.id;

    const message = await prisma.message.create({
      data: {
        waMessageId,
        conversationId,
        direction: 'OUTBOUND',
        type: 'IMAGE',
        content: 'Sticker',
        mediaUrl: mediaId,
        status: 'SENT',
        sentByAgentId: req.agent?.sub ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: 'Sticker', lastMessageAt: new Date(), lastMessageDirection: 'OUTBOUND' },
    });

    emitNewMessage(conversationId, message);
    const updatedConv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } });
    emitConversationUpdate(updatedConv);

    res.json(message);
  } catch (e) {
    console.error('[Sticker] Send error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Erro ao enviar sticker', detail: e.response?.data });
  }
}

module.exports = { listStickers, createSticker, deleteSticker, sendSticker };
