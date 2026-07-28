// src/routes/reports.routes.js
const express = require('express');
const { getReports } = require('../controllers/reports.controller');
const { getFunnelReport, getFunnelDeals } = require('../controllers/funnel.controller');
const { getCallsReport } = require('../controllers/callsReport.controller');
const { getConversationsReport, getConversationsList } = require('../controllers/conversationsReport.controller');
const { getSlaTarget, updateSlaTarget } = require('../controllers/slaTarget.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, getReports);
router.get('/funnel', requireAuth, getFunnelReport);
router.get('/funnel/deals', requireAuth, getFunnelDeals);
router.get('/calls', requireAuth, getCallsReport);
router.get('/conversations', requireAuth, getConversationsReport);
router.get('/conversations/list', requireAuth, getConversationsList);
router.get('/sla-target', requireAuth, getSlaTarget);
router.patch('/sla-target', requireAuth, requireRole('ADMIN'), updateSlaTarget);

module.exports = router;
