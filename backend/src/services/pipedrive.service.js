// src/services/pipedrive.service.js
// Cliente fino para a API v1 do Pipedrive (https://developers.pipedrive.com/docs/api/v1)
const axios = require('axios');

const BASE_URL = 'https://api.pipedrive.com/v1';

function client(apiToken) {
  return axios.create({
    baseURL: BASE_URL,
    params: { api_token: apiToken },
    timeout: 15000,
  });
}

async function testConnection(apiToken) {
  const { data } = await client(apiToken).get('/users/me');
  return data?.data || null;
}

async function listPipelines(apiToken) {
  const { data } = await client(apiToken).get('/pipelines');
  return data?.data || [];
}

async function listStages(apiToken, pipelineId) {
  const { data } = await client(apiToken).get('/stages', { params: { pipeline_id: pipelineId } });
  return data?.data || [];
}

async function getPerson(apiToken, personId) {
  if (!personId) return null;
  try {
    const { data } = await client(apiToken).get(`/persons/${personId}`);
    return data?.data || null;
  } catch {
    return null;
  }
}

// Pagina por todos os deals de um pipeline (fechados e abertos)
async function* iterateDeals(apiToken, pipelineId, { pageSize = 100 } = {}) {
  let start = 0;
  for (;;) {
    const { data } = await client(apiToken).get('/deals', {
      params: { pipeline_id: pipelineId, status: 'all_not_deleted', start, limit: pageSize },
    });
    const items = data?.data || [];
    for (const item of items) yield item;
    if (!data?.additional_data?.pagination?.more_items_in_collection) break;
    start = data.additional_data.pagination.next_start;
  }
}

async function registerWebhook(apiToken, { subscriptionUrl, user, pass }) {
  const { data } = await client(apiToken).post('/webhooks', {
    subscription_url: subscriptionUrl,
    event_action: '*',
    event_object: 'deal',
    http_auth_user: user,
    http_auth_password: pass,
  });
  return data?.data || null;
}

async function listWebhooks(apiToken) {
  const { data } = await client(apiToken).get('/webhooks');
  return data?.data || [];
}

async function deleteWebhook(apiToken, webhookId) {
  await client(apiToken).delete(`/webhooks/${webhookId}`);
}

module.exports = {
  testConnection,
  listPipelines,
  listStages,
  getPerson,
  iterateDeals,
  registerWebhook,
  listWebhooks,
  deleteWebhook,
};
