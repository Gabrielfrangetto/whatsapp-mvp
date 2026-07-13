const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { previewMerge, executeMerge } = require('../controllers/admin.controller');

router.get('/merge-conversations',  requireAuth, requireRole('ADMIN'), previewMerge);
router.post('/merge-conversations', requireAuth, requireRole('ADMIN'), executeMerge);

module.exports = router;
