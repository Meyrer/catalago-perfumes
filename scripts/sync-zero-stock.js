const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const produtosZerados = await prisma.produto.findMany({
    where: { quantidade: { lte: 0 } },
    select: { id: true, nome: true, quantidade: true, tipoDisponibilidade: true }
  });

  console.log(`Encontrados ${produtosZerados.length} produtos com estoque <= 0:`);
  console.log(JSON.stringify(produtosZerados, null, 2));

  // Atualiza todos com quantidade <= 0 para ENCOMENDA
  const updated = await prisma.produto.updateMany({
    where: { 
      quantidade: { lte: 0 },
      tipoDisponibilidade: 'PRONTA_ENTREGA'
    },
    data: {
      tipoDisponibilidade: 'ENCOMENDA',
      previsaoEntrega: 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias'
    }
  });

  console.log(`Atualizados ${updated.count} produtos de PRONTA_ENTREGA para ENCOMENDA.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
