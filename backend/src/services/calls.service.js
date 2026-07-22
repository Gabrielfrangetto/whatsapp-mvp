// src/services/calls.service.js
// Processa eventos de chamada do webhook do WhatsApp Cloud API (campo "calls").
// Sem atendimento de áudio dentro do app: toda chamada some da fila quando a
// Meta encerra por falta de resposta, então o fluxo real é só "tocou" → "encerrou".
const { PrismaClient } = require('@prisma/client');
const { emitCallIncoming, emitCallUpdate } = require('../socket/socket.server');

const prisma = new PrismaClient();

const CONTACT_SELECT = { select: { id: true, name: true, phone: true } };

const RINGING_EVENTS = ['connect', 'ringing', 'incoming'];
const ENDED_EVENTS = ['terminate', 'terminated', 'missed', 'rejected', 'failed', 'no_answer'];

function extractPhone(entry) {
  return entry.from?.phone_number || entry.from?.wa_id || (typeof entry.from === 'string' ? entry.from : null)
    || entry.caller?.phone_number || entry.contacts?.[0]?.wa_id || null;
}

function extractTimestamp(entry) {
  const raw = entry.timestamp || entry.start_time;
  if (!raw) return new Date();
  const num = Number(raw);
  return new Date(Number.isFinite(num) ? num * 1000 : raw);
}

function extractDuration(entry) {
  const raw = entry.duration ?? entry.call_duration;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

function resolveTerminateStatus(entry, durationSeconds) {
  const reason = String(entry.status || entry.reason || entry.event || '').toLowerCase();
  if (reason.includes('reject') || reason.includes('decline')) return 'REJECTED';
  if (reason.includes('answer') || reason.includes('complet') || reason.includes('accept')) return 'ANSWERED';
  if (durationSeconds > 0) return 'ANSWERED';
  return 'MISSED';
}

async function handleCallEntry(entry) {
  const waCallId = entry.id || entry.call_id;
  if (!waCallId) return;

  const eventType = String(entry.event || entry.status || '').toLowerCase();

  if (RINGING_EVENTS.some(e => eventType.includes(e))) {
    const phone = extractPhone(entry);
    const contact = phone ? await prisma.contact.findUnique({ where: { phone } }) : null;
    const call = await prisma.call.upsert({
      where: { waCallId },
      update: { rawEvent: entry },
      create: {
        waCallId,
        phone: phone || '',
        contactId: contact?.id ?? null,
        status: 'RINGING',
        startedAt: extractTimestamp(entry),
        rawEvent: entry,
      },
      include: { contact: CONTACT_SELECT },
    });
    emitCallIncoming(call);
    return;
  }

  if (ENDED_EVENTS.some(e => eventType.includes(e))) {
    const existing = await prisma.call.findUnique({ where: { waCallId } });
    if (!existing) return; // encerramento de uma chamada que não vimos tocar

    const endedAt = extractTimestamp(entry);
    const durationSeconds = extractDuration(entry)
      ?? Math.max(0, Math.round((endedAt - new Date(existing.startedAt)) / 1000));
    const status = resolveTerminateStatus(entry, durationSeconds);

    const call = await prisma.call.update({
      where: { waCallId },
      data: { status, endedAt, durationSeconds, rawEvent: entry },
      include: { contact: CONTACT_SELECT },
    });
    emitCallUpdate(call);
    return;
  }

  console.log('[Calls] Evento de chamada não reconhecido, ignorado:', JSON.stringify(entry).slice(0, 300));
}

async function handleCallWebhook(value) {
  const calls = value?.calls || [];
  for (const entry of calls) {
    try {
      await handleCallEntry(entry);
    } catch (e) {
      console.error('[Calls] Erro ao processar evento de chamada:', e.message);
    }
  }
}

async function getActiveCalls() {
  return prisma.call.findMany({
    where: { status: 'RINGING' },
    include: { contact: CONTACT_SELECT },
    orderBy: { startedAt: 'asc' },
  });
}

module.exports = { handleCallWebhook, getActiveCalls };
