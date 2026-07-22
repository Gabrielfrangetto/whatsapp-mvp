// src/routes/calls.routes.js
const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getActive } = require('../controllers/calls.controller');

const router = express.Router();

router.get('/active', requireAuth, getActive);

module.exports = router;
