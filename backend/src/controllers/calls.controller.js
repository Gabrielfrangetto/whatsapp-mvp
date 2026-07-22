// src/controllers/calls.controller.js
const callsService = require('../services/calls.service');

async function getActive(req, res) {
  try {
    const calls = await callsService.getActiveCalls();
    res.json({ calls });
  } catch (e) {
    console.error('[Calls] Erro ao listar chamadas ativas:', e.message);
    res.status(500).json({ error: 'Erro ao carregar chamadas ativas' });
  }
}

module.exports = { getActive };
