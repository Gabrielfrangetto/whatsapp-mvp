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
const conversationsRoutes = require('./routes/conversations.routes');
const authRoutes = require('./routes/auth.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const { initSocket }  = require('./socket/socket.server');

const app    = express();
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

app.get('/setup', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).json({ error: 'Proibido' });
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe('SELECT 1'); // testa conexão
    const exists = await prisma.agent.findUnique({ where: { email: process.env.ADMIN_EMAIL || 'admin@empresa.com' } });
    if (exists) return res.json({ message: 'Admin já existe', email: exists.email });
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 12);
    const agent = await prisma.agent.create({
      data: { name: process.env.ADMIN_NAME || 'Admin', email: process.env.ADMIN_EMAIL || 'admin@empresa.com', passwordHash: hash, role: 'ADMIN', avatarColor: '#075E54' }
    });
    res.json({ message: 'Admin criado!', email: agent.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// Webhook: sem autenticação (Meta não envia tokens)
app.use('/webhook', webhookRoutes);

// Auth: rotas públicas + rate limiting específico
app.use('/api/auth', authLimiter, authRoutes);

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
