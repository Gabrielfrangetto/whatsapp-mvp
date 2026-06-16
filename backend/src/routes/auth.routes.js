// src/routes/auth.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  login, refresh, logout, me,
  listAgents, createAgent, updateAgent, updatePreferences, updateAgentAvatar,
  getAgentSchedule, updateAgentSchedule,
} = require('../controllers/auth.controller');

const router = express.Router();

// Públicas
router.post('/login', login);
router.post('/refresh', refresh);
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
