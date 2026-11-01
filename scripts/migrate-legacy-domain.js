const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando verificação de URLs com perfumes.meyrer.com...');

  // 1. Fotos de Produtos
  const fotos = await prisma.foto.findMany({
    where: {
      url: { contains: 'perfumes.meyrer.com' }
    }
  });
  console.log(`Encontradas ${fotos.length} fotos com o domínio antigo.`);
  for (const f of fotos) {
    const newUrl = f.url.replace(/^https?:\/\/perfumes\.meyrer\.com(?=\/uploads\/)/i, '');
    await prisma.foto.update({
      where: { id: f.id },
      data: { url: newUrl }
    });
  }

  // 2. Banners
  const banners = await prisma.banner.findMany({
    where: {
      imagemUrl: { contains: 'perfumes.meyrer.com' }
    }
  });
  console.log(`Encontrados ${banners.length} banners com o domínio antigo.`);
  for (const b of banners) {
    const newUrl = b.imagemUrl.replace(/^https?:\/\/perfumes\.meyrer\.com(?=\/uploads\/)/i, '');
    await prisma.banner.update({
      where: { id: b.id },
      data: { imagemUrl: newUrl }
    });
  }

  // 3. Categorias
  const categorias = await prisma.categoria.findMany({
    where: {
      imagemUrl: { contains: 'perfumes.meyrer.com' }
    }
  });
  console.log(`Encontradas ${categorias.length} categorias com o domínio antigo.`);
  for (const c of categorias) {
    if (!c.imagemUrl) continue;
    const newUrl = c.imagemUrl.replace(/^https?:\/\/perfumes\.meyrer\.com(?=\/uploads\/)/i, '');
    await prisma.categoria.update({
      where: { id: c.id },
      data: { imagemUrl: newUrl }
    });
  }

  console.log('Migração finalizada com sucesso.');
}

main()
  .catch((err) => {
    console.error('Erro na migração:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
