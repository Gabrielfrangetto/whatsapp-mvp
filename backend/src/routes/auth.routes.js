// src/routes/auth.routes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { login, refresh, logout, me } = require('../controllers/auth.controller');
const {
  listAgents, createAgent, updateAgent, updatePreferences, updateAgentAvatar,
  getAgentSchedule, updateAgentSchedule,
} = require('../controllers/agents.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Muitas requisições de refresh. Aguarde um momento.' },
});

const router = express.Router();

// Públicas
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

// Autenticadas
router.get('/me', requireAuth, me);

// Admin only
router.get('/agents', requireAuth, requireRole('ADMIN'), listAgents);
router.post('/agents', requireAuth, requireRole('ADMIN'), createAgent);
router.patch('/agents/:id/avatar', requireAuth, requireRole('ADMIN'), updateAgentAvatar);
router.get('/agents/:id/schedule', requireAuth, requireRole('ADMIN'), getAgentSchedule);
router.patch('/agents/:id/schedule', requireAuth, requireRole('ADMIN'), updateAgentSchedule);
router.patch('/agents/:id', requireAuth, updateAgent);
router.patch('/me/preferences', requireAuth, updatePreferences);

module.exports = router;
