// src/services/autoclose.service.js
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const { emitConversationUpdate, emitNewMessage } = require('../socket/socket.server');

const prisma = new PrismaClient();

async function pickReason(reasons, messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[AutoClose] ANTHROPIC_API_KEY não definido — usando primeiro motivo disponível');
    return reasons[0];
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const convoText = messages.slice(-30).map(m => {
    const who = m.direction === 'INBOUND' ? 'Cliente' : m.direction === 'OUTBOUND' ? 'Agente' : 'Sistema';
    return `${who}: ${m.content}`;
  }).join('\n');

  const prompt = `Você é um assistente de atendimento ao cliente. Analise a conversa abaixo e escolha o motivo de resolução mais adequado entre as opções.

Conversa (últimas mensagens):
${convoText || '(sem mensagens)'}

Motivos disponíveis:
${reasons.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}

Responda APENAS com o número do motivo escolhido (ex: "2"). Sem explicações.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text?.trim() || '1';
  const picked = parseInt(text) - 1;
  const idx = Number.isFinite(picked) && picked >= 0 && picked < reasons.length ? picked : 0;
  return reasons[idx];
}

async function runAutoClose(inactivityHours = 24) {
  const result = { found: 0, closed: [], skipped: [], reasonsAvailable: 0, aiError: null };

  try {
    const cutoff = new Date(Date.now() - inactivityHours * 60 * 60 * 1000);

    const conversations = await prisma.conversation.findMany({
      where: {
        status: { in: ['OPEN', 'PENDING'] },
        lastMessageAt: { lt: cutoff },
        pinned: false,
      },
      include: { contact: true },
    });

    result.found = conversations.length;

    const reasons = await prisma.resolutionReason.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' },
    });

    result.reasonsAvailable = reasons.length;
    console.log(`[AutoClose] Motivos disponíveis: ${reasons.length} (${reasons.map(r => r.label).join(', ')})`);

    if (conversations.length === 0) {
      console.log('[AutoClose] Nenhuma conversa inativa encontrada');
      return result;
    }

    console.log(`[AutoClose] 🔍 ${conversations.length} conversa(s) inativa(s) para fechar`);

    for (const conv of conversations) {
      try {
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          orderBy: { timestamp: 'asc' },
          take: 50,
        });

        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });

        let reasonLabel = 'Inatividade de 24h';
        if (reasons.length > 0) {
          try {
            const chosen = await pickReason(reasons, messages);
            reasonLabel = chosen.label;
            console.log(`[AutoClose] IA escolheu: "${reasonLabel}"`);
          } catch (aiErr) {
            result.aiError = aiErr.message;
            console.error('[AutoClose] IA falhou:', aiErr.message);
          }
        }

        const internalContent = `🔒 Conversa encerrada automaticamente por inatividade de 24h\nData: ${dateStr} às ${timeStr}\nMotivo: ${reasonLabel}`;

        const internalMessage = await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: 'INTERNAL',
            type: 'INTERNAL',
            content: internalContent,
            status: 'SENT',
          },
        });

        const updatedConv = await prisma.conversation.update({
          where: { id: conv.id },
          data: { status: 'RESOLVED', lastMessage: internalContent, lastMessageAt: now },
          include: { contact: true },
        });

        emitNewMessage(conv.id, internalMessage);
        emitConversationUpdate(updatedConv);

        const contact = conv.contact?.name || conv.contact?.phone;
        console.log(`[AutoClose] ✅ ${contact} → ${reasonLabel}`);
        result.closed.push({ contact, reason: reasonLabel });
      } catch (e) {
        console.error(`[AutoClose] ❌ Erro na conversa ${conv.id}:`, e.message);
        result.skipped.push({ id: conv.id, error: e.message });
      }
    }
  } catch (e) {
    console.error('[AutoClose] ❌ Erro no ciclo:', e.message);
    result.cycleError = e.message;
  }

  return result;
}

module.exports = { runAutoClose };
