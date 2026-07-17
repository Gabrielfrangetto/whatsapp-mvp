// src/routes/pipedrive.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getConfig, updateConfig, triggerSync, receiveWebhook } = require('../controllers/pipedrive.controller');

const router = express.Router();

router.post('/webhook', receiveWebhook);

router.get('/config', requireAuth, requireRole('ADMIN'), getConfig);
router.patch('/config', requireAuth, requireRole('ADMIN'), updateConfig);
router.post('/sync', requireAuth, requireRole('ADMIN'), triggerSync);

module.exports = router;
