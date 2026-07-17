// src/routes/settings.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getSettings, updateSettings, updateBanner, removeBanner } = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, requireRole('ADMIN'), updateSettings);
router.put('/banner', requireAuth, updateBanner);
router.delete('/banner', requireAuth, removeBanner);

module.exports = router;
