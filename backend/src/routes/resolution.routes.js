// src/routes/resolution.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  listReasons,
  listAllReasons,
  createReason,
  updateReason,
  deleteReason,
  resolveConversation,
} = require('../controllers/resolution.controller');

const router = express.Router();

// Motivos — leitura para todos os agentes, escrita só admin
router.get('/reasons', requireAuth, listReasons);
router.get('/reasons/all', requireAuth, requireRole('ADMIN'), listAllReasons);
router.post('/reasons', requireAuth, requireRole('ADMIN'), createReason);
router.patch('/reasons/:id', requireAuth, requireRole('ADMIN'), updateReason);
router.delete('/reasons/:id', requireAuth, requireRole('ADMIN'), deleteReason);

// Resolver conversa
router.post('/conversations/:id/resolve', requireAuth, resolveConversation);

module.exports = router;
