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

async function updateBanner(req, res) {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/'))
      return res.status(400).json({ error: 'Imagem inválida' });
    if (image.length > 4 * 1024 * 1024)
      return res.status(413).json({ error: 'Imagem muito grande (máx. ~3MB)' });

    await prisma.systemSetting.upsert({
      where: { key: 'sidebar_banner' },
      update: { value: image },
      create: { key: 'sidebar_banner', value: image },
    });
    res.json({ sidebar_banner: image });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar banner' });
  }
}

async function removeBanner(req, res) {
  try {
    await prisma.systemSetting.deleteMany({ where: { key: 'sidebar_banner' } });
    res.json({ sidebar_banner: null });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao remover banner' });
  }
}

module.exports = { getSettings, updateSettings, updateBanner, removeBanner };
