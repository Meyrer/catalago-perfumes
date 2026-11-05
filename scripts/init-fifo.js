const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.$executeRaw`
    UPDATE "Produto" SET "lotesEstoque" = jsonb_build_array(jsonb_build_object(
      'id', 'inicial-' || "id", 'ordem', 0, 'quantidade', "quantidade",
      'custoUnitario', ROUND(COALESCE("precoCusto", 0)::numeric, 2),
      'recebidoEm', NULL, 'origem', 'SALDO_INICIAL'
    )), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "quantidade" > 0 AND "lotesEstoque" = '[]'::jsonb
  `;
  console.log(`FIFO: ${count} saldos iniciais preparados.`);
}
main().catch(error => { console.error('Não foi possível preparar o FIFO:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
