// src/server.js
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const webhookRoutes = require('./routes/webhook.routes');
const mediaRoutes = require('./routes/media.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const authRoutes = require('./routes/auth.routes');
const templatesRoutes = require('./routes/templates.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const { initSocket }  = require('./socket/socket.server');


const app    = express();
// Necessário para Railway/Render (proxy reverso)
app.set('trust proxy', 1);
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // necessário para cookies
}));

app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // mais restritivo para login
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
});

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

// ─── Routes ───────────────────────────────────────────────────────────────────
// Webhook: sem autenticação (Meta não envia tokens)
app.use('/webhook', webhookRoutes);
app.use('/api', apiLimiter, mediaRoutes);

// Auth: rotas públicas + rate limiting específico
app.use('/api/auth', authLimiter, authRoutes);
// ... após as outras rotas:
app.use('/api/templates', apiLimiter, templatesRoutes);
app.use('/api/templates/conversations', apiLimiter, requireAuth, templatesRoutes);

// API: todas as rotas protegidas por JWT
app.use('/api/conversations', apiLimiter, requireAuth, conversationsRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message,
  });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

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
