// src/controllers/media.controller.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();
const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
const ACCESS_TOKEN = () => process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

/**
 * POST /api/conversations/:id/media
 * Faz upload de mídia e envia para o contato
 */
async function sendMedia(req, res) {
  let tempPath = null;

  try {
    const { id } = req.params;

    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { contact: true },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    const phone = conversation.contact.phone.replace(/\D/g, '');
    const { originalname, mimetype, buffer } = req.file;

    // Salva temporariamente no disco
    tempPath = path.join(os.tmpdir(), `wamvp_${Date.now()}_${originalname}`);
    fs.writeFileSync(tempPath, buffer);

    // 1. Faz upload da mídia para a Meta
    const form = new FormData();
    form.append('file', fs.createReadStream(tempPath), { filename: originalname, contentType: mimetype });
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimetype);

    const uploadRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN()}`,
          ...form.getHeaders(),
        },
      }
    );

    const mediaId = uploadRes.data.id;

    // 2. Determina o tipo de mensagem
    const msgType = getMessageType(mimetype);

    const caption = req.body.caption || '';
    // 3. Envia a mensagem com mídia
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: msgType,
      [msgType]: {
        id: mediaId,
        ...(caption && { caption }),
        ...(msgType === 'document' && { filename: originalname }),
      },
    };

    const sendRes = await axios.post(
      `${META_API}/${PHONE_NUMBER_ID}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, 'Content-Type': 'application/json' } }
    );

    const waMessageId = sendRes.data.messages?.[0]?.id;

    // 4. Salva no banco
    const message = await prisma.message.create({
      data: {
        waMessageId,
        conversationId: id,
        direction: 'OUTBOUND',
        type: msgType.toUpperCase(),
        content: caption || getContentLabel(msgType, originalname),
        mediaUrl: mediaId,
        status: 'SENT',
        sentByAgentId: req.agent?.sub ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: getContentLabel(msgType, originalname), lastMessageAt: new Date() },
    });

    res.json(message);
  } catch (e) {
    console.error('[Media] Send error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Erro ao enviar mídia', detail: e.response?.data });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * GET /api/media/:mediaId
 * Busca a URL de download de uma mídia da Meta e redireciona
 */
async function getMediaUrl(req, res) {
  try {
    const { mediaId } = req.params;

    const { data } = await axios.get(`${META_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
    });

    // Baixa a mídia e repassa ao cliente
    const mediaRes = await axios.get(data.url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
      responseType: 'arraybuffer',
    });

    res.set('Content-Type', data.mime_type || 'application/octet-stream');
res.set('Cache-Control', 'private, max-age=3600');
res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // ← adicione esta linha
res.send(Buffer.from(mediaRes.data));
  } catch (e) {
    console.error('[Media] Get error:', e.message);
    res.status(500).json({ error: 'Erro ao buscar mídia' });
  }
}

function getMessageType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
}

function getContentLabel(type, filename) {
  const labels = { image: '📷 Imagem', audio: '🎵 Áudio', video: '🎥 Vídeo', document: `📄 ${filename}` };
  return labels[type] || filename;
}

module.exports = { sendMedia, getMediaUrl };
