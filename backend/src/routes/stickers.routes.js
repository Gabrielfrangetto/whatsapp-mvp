// src/routes/stickers.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { listStickers, createSticker, deleteSticker, sendSticker } = require('../controllers/stickers.controller');

const router = express.Router();

router.get('/', requireAuth, listStickers);
router.post('/', requireAuth, requireRole('ADMIN'), createSticker);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteSticker);
router.post('/send/:conversationId', requireAuth, sendSticker);

module.exports = router;
