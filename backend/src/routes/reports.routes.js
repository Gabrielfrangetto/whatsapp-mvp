// src/routes/reports.routes.js
const express = require('express');
const { getReports } = require('../controllers/reports.controller');
const { getFunnelReport, getFunnelDeals } = require('../controllers/funnel.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, getReports);
router.get('/funnel', requireAuth, getFunnelReport);
router.get('/funnel/deals', requireAuth, getFunnelDeals);

module.exports = router;
