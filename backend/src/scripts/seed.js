// src/scripts/seed.js
// Cria o primeiro agente ADMIN para acesso inicial
// Uso: node src/scripts/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@empresa.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name = process.env.ADMIN_NAME || 'Administrador';

  const exists = await prisma.agent.findUnique({ where: { email } });
  if (exists) {
    console.log(`✓ Admin já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const agent = await prisma.agent.create({
    data: { name, email, passwordHash, role: 'ADMIN', avatarColor: '#075E54' },
  });

  console.log('✅ Agente admin criado com sucesso!');
  console.log(`   E-mail: ${email}`);
  console.log(`   Senha:  ${password}`);
  console.log(`   ID:     ${agent.id}`);
  console.log('\n⚠️  Altere a senha após o primeiro login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
