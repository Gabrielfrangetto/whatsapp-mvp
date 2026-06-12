// src/controllers/templates.controller.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
const ACCESS_TOKEN = () => process.env.META_ACCESS_TOKEN;
const WABA_ID = process.env.META_WABA_ID;

/**
 * GET /api/templates
 * Lista templates do banco local (sincronizados da Meta)
 */
async function listTemplates(req, res) {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar templates' });
  }
}

/**
 * POST /api/templates/sync
 * Sincroniza templates aprovados da Meta para o banco local
 */
async function syncTemplates(req, res) {
  try {
    if (!WABA_ID) return res.status(400).json({ error: 'META_WABA_ID não configurado' });

    const { data } = await axios.get(`${META_API}/${WABA_ID}/message_templates`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
      params: { limit: 100 },
    });

    const templates = data.data || [];
    let synced = 0;

    for (const t of templates) {
      const bodyComponent = t.components?.find(c => c.type === 'BODY');
      const headerComponent = t.components?.find(c => c.type === 'HEADER');
      const footerComponent = t.components?.find(c => c.type === 'FOOTER');

      // Extrai variáveis do body (ex: {{1}}, {{2}})
      const body = bodyComponent?.text || '';
      const variables = (body.match(/\{\{\d+\}\}/g) || []).map((v, i) => ({
        index: i + 1,
        placeholder: v,
        example: `valor_${i + 1}`,
      }));

      await prisma.messageTemplate.upsert({
        where: { metaId: t.id },
        update: {
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          body,
          header: headerComponent?.text || null,
          footer: footerComponent?.text || null,
          variables: JSON.stringify(variables),
        },
        create: {
          metaId: t.id,
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          body,
          header: headerComponent?.text || null,
          footer: footerComponent?.text || null,
          variables: JSON.stringify(variables),
        },
      });
      synced++;
    }

    res.json({ message: `${synced} templates sincronizados`, templates: data.data });
  } catch (e) {
    console.error('[Templates] Sync error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Erro ao sincronizar templates', detail: e.response?.data });
  }
}

/**
 * POST /api/conversations/:id/send-template
 * Envia um template aprovado para o contato da conversa
 */
async function sendTemplate(req, res) {
  try {
    const { id } = req.params;
    const { templateId, variables = [] } = req.body;

    if (!templateId) return res.status(400).json({ error: 'templateId obrigatório' });

    const [conversation, template] = await Promise.all([
      prisma.conversation.findUnique({ where: { id }, include: { contact: true } }),
      prisma.messageTemplate.findUnique({ where: { id: templateId } }),
    ]);

    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });
    if (template.status !== 'APPROVED') return res.status(400).json({ error: 'Template não aprovado pela Meta' });

    const phone = conversation.contact.phone.replace(/\D/g, '');

    // Monta os componentes com variáveis
    const components = [];
    if (variables.length > 0) {
      components.push({
        type: 'body',
        parameters: variables.map(v => ({ type: 'text', text: String(v) })),
      });
    }

    const { data: waResponse } = await axios.post(
      `${META_API}/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components,
        },
      },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN()}`, 'Content-Type': 'application/json' } }
    );

    // Renderiza o body com as variáveis substituídas
    let renderedBody = template.body;
    variables.forEach((v, i) => {
      renderedBody = renderedBody.replace(`{{${i + 1}}}`, v);
    });

    const waMessageId = waResponse.messages?.[0]?.id;

    const message = await prisma.message.create({
      data: {
        waMessageId,
        conversationId: id,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        content: renderedBody,
        status: 'SENT',
        sentByAgentId: req.agent?.sub ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: renderedBody, lastMessageAt: new Date(), lastMessageDirection: 'OUTBOUND', status: 'OPEN' },
    });

    res.json(message);
  } catch (e) {
    console.error('[Templates] Send error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Erro ao enviar template', detail: e.response?.data });
  }
}

module.exports = { listTemplates, syncTemplates, sendTemplate };
