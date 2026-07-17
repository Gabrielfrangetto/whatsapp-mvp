// src/services/pipedriveSync.service.js
// Converte deals do Pipedrive em PipedriveDeal/PipedriveDealStageLog e casa
// cada deal com um Contact existente via telefone.
const { PrismaClient } = require('@prisma/client');
const pipedrive = require('./pipedrive.service');

const prisma = new PrismaClient();

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '');
}

// Compara por sufixo para absorver diferenças de DDI/DDD e o 9º dígito móvel do BR
async function matchContactByPhone(rawPhone) {
  const digits = normalizePhone(rawPhone);
  if (digits.length < 8) return null;

  const suffix = digits.slice(-8);
  const candidates = await prisma.contact.findMany({
    where: { phone: { endsWith: suffix } },
    select: { id: true, phone: true },
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const exact = candidates.find(c => normalizePhone(c.phone) === digits);
    if (exact) return exact;
    const longSuffix = digits.slice(-9);
    const closer = candidates.find(c => normalizePhone(c.phone).endsWith(longSuffix));
    if (closer) return closer;
  }
  return null;
}

async function resolveContact(pdPerson) {
  const phones = pdPerson?.phone;
  if (!phones) return null;
  const list = Array.isArray(phones) ? phones.map(p => p.value) : [phones];
  for (const phone of list) {
    const contact = await matchContactByPhone(phone);
    if (contact) return contact;
  }
  return null;
}

async function syncStages(apiToken, pipelineId) {
  const stages = await pipedrive.listStages(apiToken, pipelineId);
  await Promise.all(stages.map(s => prisma.pipedriveStage.upsert({
    where: { id: s.id },
    update: { name: s.name, orderNr: s.order_nr, pipelineId: s.pipeline_id },
    create: { id: s.id, name: s.name, orderNr: s.order_nr, pipelineId: s.pipeline_id },
  })));
  return stages;
}

async function stageNameFor(stageId, apiToken, pipelineId) {
  const cached = await prisma.pipedriveStage.findUnique({ where: { id: stageId } });
  if (cached) return cached.name;
  const stages = await syncStages(apiToken, pipelineId);
  return stages.find(s => s.id === stageId)?.name || `Estágio ${stageId}`;
}

function dealStatus(pdDeal) {
  if (pdDeal.status === 'won') return 'WON';
  if (pdDeal.status === 'lost') return 'LOST';
  return 'OPEN';
}

async function upsertDeal(pdDeal, { apiToken, pipelineId, person } = {}) {
  const stageName = await stageNameFor(pdDeal.stage_id, apiToken, pipelineId);
  const status = dealStatus(pdDeal);
  const now = new Date();
  const wonAt = status === 'WON' ? new Date(pdDeal.won_time || pdDeal.close_time || now) : null;
  const lostAt = status === 'LOST' ? new Date(pdDeal.lost_time || pdDeal.close_time || now) : null;

  const resolvedPerson = person || (pdDeal.person_id && typeof pdDeal.person_id === 'object' ? pdDeal.person_id : null)
    || (apiToken ? await pipedrive.getPerson(apiToken, pdDeal.person_id?.value || pdDeal.person_id) : null);
  const contact = resolvedPerson ? await resolveContact(resolvedPerson) : null;

  const existing = await prisma.pipedriveDeal.findUnique({
    where: { pipedriveDealId: pdDeal.id },
    include: { stageLogs: { where: { exitedAt: null } } },
  });

  const baseData = {
    contactId: contact?.id ?? existing?.contactId ?? null,
    pipedrivePersonId: pdDeal.person_id?.value || (typeof pdDeal.person_id === 'number' ? pdDeal.person_id : existing?.pipedrivePersonId) || null,
    title: pdDeal.title,
    value: pdDeal.value != null ? Number(pdDeal.value) : null,
    currency: pdDeal.currency || null,
    stageId: pdDeal.stage_id,
    stageName,
    status,
    wonAt: wonAt ?? (status === 'OPEN' ? null : existing?.wonAt ?? null),
    lostAt: lostAt ?? (status === 'OPEN' ? null : existing?.lostAt ?? null),
    lostReason: pdDeal.lost_reason || existing?.lostReason || null,
  };

  if (!existing) {
    const deal = await prisma.pipedriveDeal.create({
      data: { ...baseData, pipedriveDealId: pdDeal.id, pipedriveAddedAt: new Date(pdDeal.add_time) },
    });
    await prisma.pipedriveDealStageLog.create({
      data: { dealId: deal.id, stageId: pdDeal.stage_id, stageName, enteredAt: new Date(pdDeal.add_time) },
    });
    if (status !== 'OPEN') {
      await prisma.pipedriveDealStageLog.updateMany({
        where: { dealId: deal.id, exitedAt: null },
        data: { exitedAt: wonAt || lostAt || now },
      });
    }
    return deal;
  }

  const openLog = existing.stageLogs[0];
  const stageChanged = existing.stageId !== pdDeal.stage_id;
  const closedNow = existing.status === 'OPEN' && status !== 'OPEN';

  if (openLog && (stageChanged || closedNow)) {
    await prisma.pipedriveDealStageLog.update({
      where: { id: openLog.id },
      data: { exitedAt: closedNow ? (wonAt || lostAt || now) : now },
    });
    if (stageChanged && !closedNow) {
      await prisma.pipedriveDealStageLog.create({
        data: { dealId: existing.id, stageId: pdDeal.stage_id, stageName, enteredAt: now },
      });
    }
  }

  return prisma.pipedriveDeal.update({ where: { id: existing.id }, data: baseData });
}

async function handleWebhookDeal(current) {
  if (!current?.id) return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.apiToken) return;
  await upsertDeal(current, { apiToken: settings.apiToken, pipelineId: settings.pipelineId });
}

async function backfillDeals() {
  const settings = await getSettings();
  if (!settings.enabled || !settings.apiToken || !settings.pipelineId) {
    throw new Error('Integração com Pipedrive não configurada');
  }
  await syncStages(settings.apiToken, settings.pipelineId);

  let count = 0;
  for await (const pdDeal of pipedrive.iterateDeals(settings.apiToken, settings.pipelineId)) {
    await upsertDeal(pdDeal, { apiToken: settings.apiToken, pipelineId: settings.pipelineId });
    count++;
  }
  return count;
}

async function getSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ['pipedrive_api_token', 'pipedrive_pipeline_id', 'pipedrive_enabled', 'pipedrive_webhook_user', 'pipedrive_webhook_pass'] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    apiToken: map.pipedrive_api_token || null,
    pipelineId: map.pipedrive_pipeline_id ? Number(map.pipedrive_pipeline_id) : null,
    enabled: map.pipedrive_enabled === 'true',
    webhookUser: map.pipedrive_webhook_user || null,
    webhookPass: map.pipedrive_webhook_pass || null,
  };
}

module.exports = { getSettings, syncStages, backfillDeals, handleWebhookDeal, normalizePhone, matchContactByPhone };
