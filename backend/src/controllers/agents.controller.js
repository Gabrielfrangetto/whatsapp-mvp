const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const AVATAR_COLORS = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#9B59B6', '#E67E22'];

async function listAgents(req, res) {
  try {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, email: true, role: true, avatarColor: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(agents);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function createAgent(req, res) {
  try {
    const { name, email, password, role = 'AGENT' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres' });

    const exists = await prisma.agent.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 12);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const agent = await prisma.agent.create({
      data: { name, email: email.toLowerCase(), passwordHash, role, avatarColor },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    });
    res.status(201).json(agent);
  } catch (e) {
    console.error('[Agents] createAgent error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function updateAgent(req, res) {
  try {
    const { id } = req.params;
    const { name, password, isActive, role } = req.body;
    if (req.agent.sub !== id && req.agent.role !== 'ADMIN')
      return res.status(403).json({ error: 'Sem permissão' });

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
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function updateAgentAvatar(req, res) {
  try {
    const { id } = req.params;
    const { avatarUrl } = req.body;
    if (req.agent.role !== 'ADMIN' && req.agent.sub !== id)
      return res.status(403).json({ error: 'Sem permissão' });
    if (!avatarUrl || !avatarUrl.startsWith('https://res.cloudinary.com/'))
      return res.status(400).json({ error: 'URL inválida' });
    const agent = await prisma.agent.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, avatarUrl: true },
    });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar avatar' });
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
  } catch {
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
}

async function getAgentSchedule(req, res) {
  try {
    const { id } = req.params;
    const agent = await prisma.agent.findUnique({ where: { id }, select: { workSchedule: true } });
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json({ workSchedule: agent.workSchedule || null });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function updateAgentSchedule(req, res) {
  try {
    const { id } = req.params;
    const { workSchedule } = req.body;
    if (!workSchedule || typeof workSchedule !== 'object')
      return res.status(400).json({ error: 'workSchedule inválido' });

    for (const day of DAYS) {
      const entry = workSchedule[day];
      if (!entry) continue;
      if (typeof entry.enabled !== 'boolean') return res.status(400).json({ error: `${day}.enabled inválido` });
      if (entry.enabled && (!TIME_RE.test(entry.start) || !TIME_RE.test(entry.end)))
        return res.status(400).json({ error: `Horário inválido para ${day}` });
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: { workSchedule },
      select: { id: true, workSchedule: true },
    });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { listAgents, createAgent, updateAgent, updateAgentAvatar, updatePreferences, getAgentSchedule, updateAgentSchedule };
