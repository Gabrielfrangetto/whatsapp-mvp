// src/services/whatsapp.service.js
const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
});

async function sendTextMessage(to, text) {
  const { data } = await api.post(`/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  });
  return data;
}

async function sendTemplateMessage(to, templateName, languageCode = 'pt_BR', components = []) {
  const { data } = await api.post(`/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: languageCode }, components },
  });
  return data;
}

async function markAsRead(messageId) {
  const { data } = await api.post(`/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
  return data;
}

module.exports = { sendTextMessage, sendTemplateMessage, markAsRead };
