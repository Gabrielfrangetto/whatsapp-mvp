// src/controllers/settings.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULTS = {
  autoclose_enabled: 'false',
};

async function getSettings(req, res) {
  try {
    const rows = await prisma.systemSetting.findMany();
    const map = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
}

async function updateSettings(req, res) {
  try {
    const allowed = Object.keys(DEFAULTS);
    const updates = [];

    for (const key of allowed) {
      if (key in req.body) {
        const value = String(req.body[key]);
        updates.push(
          prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        );
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo válido fornecido' });

    await Promise.all(updates);

    const rows = await prisma.systemSetting.findMany();
    const map = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
}

module.exports = { getSettings, updateSettings };
