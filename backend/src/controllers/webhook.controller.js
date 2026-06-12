// src/controllers/webhook.controller.js
const { PrismaClient } = require('@prisma/client');
const whatsappService = require('../services/whatsapp.service');
const { emitNewMessage, emitMessageStatus, emitConversationUpdate, emitNewConversation } = require('../socket/socket.server');

const prisma = new PrismaClient();

function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Verificado');
    return res.status(200).send(challenge);
  }
  console.warn('[Webhook] ❌ Falha na verificação');
  return res.sendStatus(403);
}

async function receiveWebhook(req, res) {
  res.sendStatus(200); // Meta exige 200 imediato

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      if (value.messages) {
        for (const msg of value.messages) await processInbound(msg, value.contacts?.[0]);
      }
      if (value.statuses) {
        for (const s of value.statuses) await processStatus(s);
      }
    }
  }
}

async function processInbound(msg, contactInfo) {
  try {
    const phone = msg.from;
    const content = extractContent(msg);
    const timestamp = new Date(parseInt(msg.timestamp) * 1000);

    const contact = await prisma.contact.upsert({
      where: { phone },
      update: { name: contactInfo?.profile?.name || undefined },
      create: { phone, name: contactInfo?.profile?.name || phone },
    });

    let conv = await prisma.conversation.findFirst({
  where: {
    contactId: contact.id,
    status: { in: ['OPEN', 'PENDING'] }, // reabre pendentes também
  },
  orderBy: { updatedAt: 'desc' }, // pega a mais recente
});
    const existingConv = !!conv;

    if (!conv) {
      // Verifica se existe uma conversa resolvida recente (últimas 24h)
      const resolved = await prisma.conversation.findFirst({
        where: {
          contactId: contact.id,
          status: 'RESOLVED',
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (resolved) {
        conv = await prisma.conversation.update({
          where: { id: resolved.id },
          data: { status: 'OPEN', unreadCount: 1, lastMessage: content, lastMessageAt: timestamp },
        });
      } else {
        conv = await prisma.conversation.create({
          data: { contactId: contact.id, status: 'OPEN', lastMessage: content, lastMessageAt: timestamp, unreadCount: 1 },
        });
      }
    } else {
      // Conversa existente: atualiza última mensagem e contador de não lidas
      conv = await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessage: content, lastMessageAt: timestamp, unreadCount: { increment: 1 } },
      });
    }
    const message = await prisma.message.create({
      data: {
        waMessageId: msg.id,
        conversationId: conv.id,
        direction: 'INBOUND',
        type: mapType(msg.type),
        content,
        mediaUrl: msg.image?.id || msg.audio?.id || msg.document?.id || msg.sticker?.id || null, // ← adicione msg.sticker?.id
        status: 'DELIVERED',
        timestamp,
      },
    });

    // Busca conversa atualizada para emitir ao frontend
    const updatedConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
      include: { contact: true },
    });

    // Emite em tempo real para todos os agentes conectados
    emitNewMessage(conv.id, message);
    emitConversationUpdate(updatedConv);
    if (!existingConv) emitNewConversation(updatedConv);

    await whatsappService.markAsRead(msg.id);
    console.log(`[Webhook] 📨 ${phone}: ${content}`);
  } catch (e) {
    console.error('[Webhook] processInbound error:', e.message);
  }
}

async function processStatus(s) {
  const map = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };
  const status = map[s.status];
  if (!status) return;
  await prisma.message.updateMany({ where: { waMessageId: s.id }, data: { status } });

  // Encontra a conversa para emitir no canal correto
  const message = await prisma.message.findFirst({ where: { waMessageId: s.id } });
  if (message) emitMessageStatus(message.conversationId, s.id, status);
}

function extractContent(msg) {
  switch (msg.type) {
    case 'text':     return msg.text?.body || '';
    case 'image':    return '📷 Imagem';
    case 'sticker': return '';
    case 'audio':    return '🎵 Áudio';
    case 'video':    return '🎥 Vídeo';
    case 'document': return `📄 ${msg.document?.filename || 'Documento'}`;
    case 'location': return `📍 Localização`;
    default:         return `[${msg.type}]`;
  }
}

function mapType(type) {
  return { text: 'TEXT', image: 'IMAGE', audio: 'AUDIO', video: 'VIDEO', document: 'DOCUMENT', sticker: 'IMAGE' }[type] || 'TEXT';
}

module.exports = { verifyWebhook, receiveWebhook };
