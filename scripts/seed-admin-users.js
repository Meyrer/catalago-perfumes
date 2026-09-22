const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function seedAdminUsers() {
  const users = [
    { username: 'meyrer', name: 'Meyrer', pass: 'meyrer123' },
    { username: 'felipe', name: 'Felipe', pass: 'felipe123' }
  ];

  for (const u of users) {
    const hash = hashPassword(u.pass);
    const user = await prisma.adminUser.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        passwordHash: hash,
        mustChangePassword: true
      },
      create: {
        username: u.username,
        name: u.name,
        passwordHash: hash,
        mustChangePassword: true
      }
    });
    console.log(`[SEED] Usuário ${user.name} (@${user.username}) pronto com mustChangePassword = true`);
  }
}

seedAdminUsers()
  .catch((err) => {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
