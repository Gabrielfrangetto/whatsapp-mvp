// src/routes/conversations.routes.js
const express = require('express');
const { listConversations, getMessages, sendMessage, updateConversationStatus, getStats } = require('../controllers/conversations.controller');
const router = express.Router();
router.get('/stats', getStats);
router.get('/', listConversations);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/status', updateConversationStatus);
module.exports = router;
