// src/routes/templates.routes.js
const express = require('express');
const { listTemplates, syncTemplates, sendTemplate } = require('../controllers/templates.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, listTemplates);
router.post('/sync', requireAuth, syncTemplates);
router.post('/conversations/:id/send-template', requireAuth, sendTemplate);

module.exports = router;
