// src/controllers/auth.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
const ACCESS_EXPIRY  = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateTokens(agent) {
  const payload = { sub: agent.id, email: agent.email, role: agent.role, name: agent.name };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ sub: agent.id, jti: uuidv4() }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const agent = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!agent || !agent.isActive) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, agent.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const { accessToken, refreshToken } = generateTokens(agent);

    // Salva refresh token no banco
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        agentId: agent.id,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    // Atualiza último login
    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastLoginAt: new Date() },
    });

    // Refresh token via cookie httpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: REFRESH_EXPIRY_MS,
    });

    res.json({
      accessToken,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        avatarColor: agent.avatarColor,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function updatePreferences(req, res) {
  try {
    const { themeColor, themeMode } = req.body;
    const data = {};
    if (themeColor) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(themeColor)) return res.status(400).json({ error: 'Cor hex inválida' });
      data.themeColor = themeColor;
    }
    if (themeMode) {
      if (!['light', 'dark'].includes(themeMode)) return res.status(400).json({ error: 'Modo inválido' });
      data.themeMode = themeMode;
    }
    const agent = await prisma.agent.update({
      where: { id: req.agent.sub },
      data,
      select: { id: true, name: true, email: true, role: true, avatarColor: true, themeColor: true, themeMode: true },
    });
    res.json(agent);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
}
/**
 * POST /api/auth/refresh
 * Usa o refreshToken do cookie para emitir novo accessToken
 */
async function refresh(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    let payload;
    try {
      payload = jwt.verify(token, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: payload.sub } });
    if (!agent || !agent.isActive) {
      return res.status(401).json({ error: 'Conta inativa' });
    }

    // Rotação do refresh token (invalidar antigo, emitir novo)
    await prisma.refreshToken.delete({ where: { token } });
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(agent);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        agentId: agent.id,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: REFRESH_EXPIRY_MS,
    });

    res.json({ accessToken });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/auth/me
 * Retorna dados do agente autenticado
 */
async function me(req, res) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent.sub },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, lastLoginAt: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/auth/agents  (apenas ADMIN)
 * Lista todos os agentes
 */
async function listAgents(req, res) {
  try {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, email: true, role: true, avatarColor: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * POST /api/auth/agents  (apenas ADMIN)
 * Cria novo agente
 */
async function createAgent(req, res) {
  try {
    const { name, email, password, role = 'AGENT' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres' });
    }

    const exists = await prisma.agent.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 12);
    const colors = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#9B59B6', '#E67E22'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const agent = await prisma.agent.create({
      data: { name, email: email.toLowerCase(), passwordHash, role, avatarColor },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    });

    res.status(201).json(agent);
  } catch (error) {
    console.error('[Auth] Create agent error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * PATCH /api/auth/agents/:id  (ADMIN ou próprio agente)
 */
async function updateAgent(req, res) {
  try {
    const { id } = req.params;
    const { name, password, isActive, role } = req.body;

    // Agente só pode editar a si mesmo, a não ser que seja admin
    if (req.agent.sub !== id && req.agent.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const data = {};
    if (name) data.name = name;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Senha muito curta' });
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    if (req.agent.role === 'ADMIN') {
      if (isActive !== undefined) data.isActive = isActive;
      if (role) data.role = role;
    }

    const agent = await prisma.agent.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarColor: true },
    });

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { login, refresh, logout, me, listAgents, createAgent, updateAgent, updatePreferences };
