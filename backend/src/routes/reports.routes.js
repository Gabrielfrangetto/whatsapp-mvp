// src/routes/reports.routes.js
const express = require('express');
const { getReports } = require('../controllers/reports.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, getReports);

module.exports = router;
