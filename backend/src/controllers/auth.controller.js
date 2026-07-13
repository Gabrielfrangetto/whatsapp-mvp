const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
const ACCESS_EXPIRY  = '8h';
const REFRESH_EXPIRY = '30d';
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function generateTokens(agent) {
  const payload = { sub: agent.id, email: agent.email, role: agent.role, name: agent.name };
  const accessToken  = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ sub: agent.id, jti: uuidv4() }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: REFRESH_EXPIRY_MS,
};

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

    const agent = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!agent || !agent.isActive) return res.status(401).json({ error: 'Credenciais inválidas' });

    const match = await bcrypt.compare(password, agent.passwordHash);
    if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

    const { accessToken, refreshToken } = generateTokens(agent);
    await prisma.refreshToken.create({ data: { token: refreshToken, agentId: agent.id, expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS) } });
    await prisma.agent.update({ where: { id: agent.id }, data: { lastLoginAt: new Date() } });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken, agent: { id: agent.id, name: agent.name, email: agent.email, role: agent.role, avatarColor: agent.avatarColor, avatarUrl: agent.avatarUrl || null } });
  } catch (e) {
    console.error('[Auth] login error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    let payload;
    try { payload = jwt.verify(token, REFRESH_SECRET); }
    catch { return res.status(401).json({ error: 'Token inválido ou expirado' }); }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });

    const agent = await prisma.agent.findUnique({ where: { id: payload.sub } });
    if (!agent || !agent.isActive) return res.status(401).json({ error: 'Conta inativa' });

    await prisma.refreshToken.delete({ where: { token } });
    const { accessToken, refreshToken: newToken } = generateTokens(agent);
    await prisma.refreshToken.create({ data: { token: newToken, agentId: agent.id, expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS) } });

    res.cookie('refreshToken', newToken, COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (e) {
    console.error('[Auth] refresh error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function logout(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado' });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function me(req, res) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent.sub },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, avatarUrl: true, lastLoginAt: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { login, refresh, logout, me };
