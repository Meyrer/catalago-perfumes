const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categorias = await prisma.categoria.findMany({
    include: {
      produtos: {
        select: { id: true, nome: true }
      }
    }
  });

  console.log("=== CATEGORIAS NO BANCO ===");
  categorias.forEach(c => {
    console.log(`ID: ${c.id} | Nome: "${c.nome}" | Produtos: ${c.produtos.length}`);
    if (c.produtos.length > 0) {
      console.log(`   Exemplos: ${c.produtos.slice(0, 3).map(p => p.nome).join(', ')}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
