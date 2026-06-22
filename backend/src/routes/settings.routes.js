// src/routes/settings.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getSettings, updateSettings } = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, requireRole('ADMIN'), updateSettings);

module.exports = router;
