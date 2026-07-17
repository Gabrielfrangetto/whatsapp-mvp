// src/controllers/pipedrive.controller.js
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const pipedrive = require('../services/pipedrive.service');
const sync = require('../services/pipedriveSync.service');

const prisma = new PrismaClient();

async function saveSettings(patch) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  await Promise.all(entries.map(([key, value]) =>
    prisma.systemSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
  ));
}

async function getConfig(req, res) {
  try {
    const settings = await sync.getSettings();
    let pipelines = [];
    if (settings.apiToken) {
      try { pipelines = await pipedrive.listPipelines(settings.apiToken); } catch { pipelines = []; }
    }
    res.json({
      enabled: settings.enabled,
      hasToken: !!settings.apiToken,
      pipelineId: settings.pipelineId,
      pipelines: pipelines.map(p => ({ id: p.id, name: p.name })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar configuração do Pipedrive' });
  }
}

async function updateConfig(req, res) {
  try {
    const { apiToken, pipelineId, enabled } = req.body;

    let tokenToUse = apiToken;
    if (!tokenToUse) {
      const current = await sync.getSettings();
      tokenToUse = current.apiToken;
    }

    if (enabled) {
      if (!tokenToUse || !pipelineId) {
        return res.status(400).json({ error: 'Informe o token de API e o pipeline para ativar a integração' });
      }
      try {
        await pipedrive.testConnection(tokenToUse);
      } catch {
        return res.status(400).json({ error: 'Token de API do Pipedrive inválido ou sem permissão' });
      }
    }

    const patch = { pipedrive_enabled: String(!!enabled) };
    if (apiToken) patch.pipedrive_api_token = apiToken;
    if (pipelineId) patch.pipedrive_pipeline_id = pipelineId;
    await saveSettings(patch);

    if (enabled) {
      await sync.syncStages(tokenToUse, pipelineId);
      await ensureWebhook(req, tokenToUse);
    }

    const settings = await sync.getSettings();
    res.json({ enabled: settings.enabled, hasToken: !!settings.apiToken, pipelineId: settings.pipelineId });
  } catch (e) {
    console.error('[Pipedrive] Erro ao salvar config:', e.message);
    res.status(500).json({ error: 'Erro ao salvar configuração do Pipedrive' });
  }
}

async function ensureWebhook(req, apiToken) {
  const settings = await sync.getSettings();
  let user = settings.webhookUser;
  let pass = settings.webhookPass;
  if (!user || !pass) {
    user = crypto.randomBytes(8).toString('hex');
    pass = crypto.randomBytes(16).toString('hex');
    await saveSettings({ pipedrive_webhook_user: user, pipedrive_webhook_pass: pass });
  }

  const publicUrl = process.env.APP_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const subscriptionUrl = `${publicUrl}/api/pipedrive/webhook`;

  try {
    const existing = await pipedrive.listWebhooks(apiToken);
    const already = existing.find(w => w.subscription_url === subscriptionUrl);
    if (!already) {
      await pipedrive.registerWebhook(apiToken, { subscriptionUrl, user, pass });
    }
  } catch (e) {
    console.error('[Pipedrive] Erro ao registrar webhook:', e.message);
  }
}

async function triggerSync(req, res) {
  try {
    const count = await sync.backfillDeals();
    res.json({ synced: count });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao sincronizar com o Pipedrive' });
  }
}

function verifyWebhookAuth(req, settings) {
  if (!settings.webhookUser) return true; // nenhuma credencial configurada ainda
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
  return user === settings.webhookUser && pass === settings.webhookPass;
}

async function receiveWebhook(req, res) {
  try {
    const settings = await sync.getSettings();
    if (!verifyWebhookAuth(req, settings)) return res.sendStatus(401);
    res.sendStatus(200); // confirma recebimento imediatamente

    const current = req.body?.current || req.body?.data;
    if (current) await sync.handleWebhookDeal(current);
  } catch (e) {
    console.error('[Pipedrive] Erro ao processar webhook:', e.message);
  }
}

module.exports = { getConfig, updateConfig, triggerSync, receiveWebhook };
