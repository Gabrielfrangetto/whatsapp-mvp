// src/routes/media.routes.js
const express = require('express');
const multer = require('multer');
const { sendMedia, getMediaUrl } = require('../controllers/media.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Multer — armazena em memória, limite de 16MB (limite da Meta)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/aac',
      'video/mp4', 'video/3gpp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  },
});

router.post('/conversations/:id/media', requireAuth, upload.single('file'), sendMedia);
router.get('/media/:mediaId', getMediaUrl);

module.exports = router;
