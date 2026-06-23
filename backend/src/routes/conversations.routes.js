// src/routes/conversations.routes.js
const express = require('express');
const { listConversations, getMessages, sendMessage, updateConversationStatus, getStats, togglePin, reactToMessage, listAgentsForTransfer } = require('../controllers/conversations.controller');
const router = express.Router();
router.get('/stats', getStats);
router.get('/agents-for-transfer', listAgentsForTransfer);
router.get('/', listConversations);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/status', updateConversationStatus);
router.patch('/:id/pin', togglePin);
router.post('/:id/react', reactToMessage);
module.exports = router;
