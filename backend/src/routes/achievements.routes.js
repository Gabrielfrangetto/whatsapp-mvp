// src/routes/achievements.routes.js
const express = require('express');
const { getMyAchievements, markSeen } = require('../controllers/achievements.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, getMyAchievements);
router.patch('/me/seen', requireAuth, markSeen);

module.exports = router;
