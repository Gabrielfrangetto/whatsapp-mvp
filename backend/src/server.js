// src/server.js
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const path = require('path');

const webhookRoutes = require('./routes/webhook.routes');
const mediaRoutes = require('./routes/media.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const authRoutes = require('./routes/auth.routes');
const templatesRoutes = require('./routes/templates.routes');
const resolutionRoutes = require('./routes/resolution.routes');
const stickersRoutes = require('./routes/stickers.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const settingsRoutes = require('./routes/settings.routes');
const reportsRoutes  = require('./routes/reports.routes');
const adminRoutes    = require('./routes/admin.routes');
const contactsRoutes = require('./routes/contacts.routes');
const pipedriveRoutes = require('./routes/pipedrive.routes');
const callsRoutes = require('./routes/calls.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const { initSocket }  = require('./socket/socket.server');



const app    = express();
// Necessário para Railway/Render (proxy reverso)
app.set('trust proxy', 1);
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

console.log('[CORS] Origens permitidas:', allowedOrigins);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.log(`[CORS] Rejeitado: "${origin}" | Permitidos: ${JSON.stringify(allowedOrigins)}`);
    cb(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
}));

app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use('/webhook', express.json());
app.use('/api', express.json({ limit: '10mb' }));



// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Rota temporária de migração — remover após executar
app.get('/migrate', async (req, res) => {
  if (req.query.secret !== process.env.SETUP_SECRET) return res.status(403).json({ error: 'Proibido' });
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe' });
    res.json({ message: '✅ Migrations executadas com sucesso!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Frontend estático ────────────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// ─── Routes ───────────────────────────────────────────────────────────────────
// Webhook: sem autenticação (Meta não envia tokens)
app.use('/webhook', webhookRoutes);
app.use('/api', apiLimiter, mediaRoutes);

// Auth: login com limiter estrito; restante usa apiLimiter
app.use('/api/auth', apiLimiter, authRoutes);
// ... após as outras rotas:
app.use('/api/templates', apiLimiter, templatesRoutes);
app.use('/api/templates/conversations', apiLimiter, requireAuth, templatesRoutes);

// API: todas as rotas protegidas por JWT
app.use('/api/conversations', apiLimiter, requireAuth, conversationsRoutes);
app.use('/api/stickers', apiLimiter, stickersRoutes);
app.use('/api/favorites', apiLimiter, favoritesRoutes);
app.use('/api/resolution', apiLimiter, resolutionRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/reports',  apiLimiter, reportsRoutes);
app.use('/api/admin',    apiLimiter, adminRoutes);
app.use('/api/contacts', apiLimiter, requireAuth, contactsRoutes);
app.use('/api/pipedrive', apiLimiter, pipedriveRoutes);
app.use('/api/calls', apiLimiter, callsRoutes);

// ─── SPA fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message,
  });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ─── Auto-close por inatividade de 24h ───────────────────────────────────────
const { runAutoClose } = require('./services/autoclose.service');
runAutoClose();
setInterval(runAutoClose, 30 * 60 * 1000);

app.post('/api/admin/autoclose', async (req, res) => {
  if (req.query.secret !== process.env.SETUP_SECRET) return res.status(403).json({ error: 'Proibido' });
  try {
    const hours = req.query.hours !== undefined ? parseFloat(req.query.hours) : 24;
    const result = await runAutoClose(hours);
    res.json({ ok: true, ran: new Date().toISOString(), inactivityHours: hours, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  WhatsApp MVP Backend                         ║
║  HTTP → http://localhost:${PORT}                 ║
║  WS   → ws://localhost:${PORT}  (Socket.io)      ║
╚═══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
