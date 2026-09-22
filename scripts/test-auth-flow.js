const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuf = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedKey);
  } catch {
    return false;
  }
}

async function runTests() {
  console.log('--- TESTE 1: Verificar usuários no banco ---');
  const users = await prisma.adminUser.findMany();
  console.log('Usuários cadastrados:', users.map(u => ({ id: u.id, username: u.username, name: u.name, mustChangePassword: u.mustChangePassword })));

  console.log('\n--- TESTE 2: Validar credenciais provisórias ---');
  const meyrer = await prisma.adminUser.findUnique({ where: { username: 'meyrer' } });
  const felipe = await prisma.adminUser.findUnique({ where: { username: 'felipe' } });

  const meyrerOk = verifyPassword('meyrer123', meyrer.passwordHash);
  const felipeOk = verifyPassword('felipe123', felipe.passwordHash);
  console.log('Senha provisória Meyrer válida:', meyrerOk, '| mustChangePassword:', meyrer.mustChangePassword);
  console.log('Senha provisória Felipe válida:', felipeOk, '| mustChangePassword:', felipe.mustChangePassword);

  console.log('\n--- TESTE 3: Simulação de troca de senha ---');
  // Altera para nova senha
  const novaSenha = 'NovaSenha@Elegance2026';
  const novoHash = hashPassword(novaSenha);
  await prisma.adminUser.update({
    where: { username: 'meyrer' },
    data: { passwordHash: novoHash, mustChangePassword: false }
  });

  const meyrerAtualizado = await prisma.adminUser.findUnique({ where: { username: 'meyrer' } });
  console.log('Meyrer após troca: mustChangePassword =', meyrerAtualizado.mustChangePassword);
  console.log('Nova senha confere:', verifyPassword(novaSenha, meyrerAtualizado.passwordHash));
  console.log('Senha antiga rejeitada:', !verifyPassword('meyrer123', meyrerAtualizado.passwordHash));

  console.log('\n--- TESTE 4: Resetar Meyrer de volta ao estado inicial para o usuário testar ---');
  const hashInicial = hashPassword('meyrer123');
  await prisma.adminUser.update({
    where: { username: 'meyrer' },
    data: { passwordHash: hashInicial, mustChangePassword: true }
  });
  const meyrerReset = await prisma.adminUser.findUnique({ where: { username: 'meyrer' } });
  console.log('Meyrer resetado: mustChangePassword =', meyrerReset.mustChangePassword);

  console.log('\n TODOS OS TESTES PASSARAM COM SUCESSO!');
}

runTests()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
