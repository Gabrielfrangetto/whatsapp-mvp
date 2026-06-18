const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { listFavorites, toggleFavorite, sendFavorite } = require('../controllers/favorites.controller');

const router = express.Router();

router.get('/', requireAuth, listFavorites);
router.post('/toggle', requireAuth, toggleFavorite);
router.post('/send/:conversationId', requireAuth, sendFavorite);

module.exports = router;
