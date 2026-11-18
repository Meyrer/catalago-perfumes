const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [expectedUnits, ...args] = process.argv.slice(2);
  const transferOption = '--to-sapiranga=';
  const optionIndex = args.findIndex(arg => arg.startsWith('--'));
  const purchaseNumbers = optionIndex < 0 ? args : args.slice(0, optionIndex);
  const [transferArg, ...extraArgs] = args.slice(purchaseNumbers.length);
  if (extraArgs.length || (transferArg && !transferArg.startsWith(transferOption))) {
    throw new Error('Informe --to-sapiranga=CODIGO:QUANTIDADE,... após os códigos das compras.');
  }
  const transfers = new Map();
  if (transferArg) {
    for (const entry of transferArg.slice(transferOption.length).split(',')) {
      const match = /^(\d{3}):([1-9]\d*)$/.exec(entry);
      if (!match || !Number.isSafeInteger(Number(match[2])) || transfers.has(match[1])) throw new Error(`Transferência inválida: ${entry}.`);
      transfers.set(match[1], Number(match[2]));
    }
  }
  const expected = Number(expectedUnits);
  if (!Number.isSafeInteger(expected) || expected < 1 || !purchaseNumbers.length || new Set(purchaseNumbers).size !== purchaseNumbers.length) {
    throw new Error('Informe o total esperado em Igrejinha seguido dos códigos das compras recebidas.');
  }

  const summary = await prisma.$transaction(async tx => {
    const purchases = await tx.compra.findMany({
      where: { numero: { in: purchaseNumbers }, status: 'RECEBIDO' },
      select: { numero: true, itens: { select: { produtoId: true, quantidade: true } } },
    });
    if (purchases.length !== purchaseNumbers.length) throw new Error('Confira os códigos e a situação das compras.');

    const byProduct = new Map();
    for (const { itens } of purchases) {
      if (!itens.length) throw new Error('Há uma compra sem itens.');
      for (const item of itens) {
        if (item.quantidade < 1) throw new Error('Há um item de compra com quantidade inválida.');
        byProduct.set(item.produtoId, (byProduct.get(item.produtoId) ?? 0) + item.quantidade);
      }
    }
    const igrejinha = [...byProduct.values()].reduce((sum, quantity) => sum + quantity, 0);
    if (igrejinha !== expected) throw new Error(`As compras somam ${igrejinha} un. e eram esperadas ${expected} un.`);

    const products = await tx.produto.findMany({
      where: { OR: [{ quantidade: { gt: 0 } }, { id: { in: [...byProduct.keys()] } }] },
      select: { id: true, nome: true, sku: true, quantidade: true, estoqueSapiranga: true, estoqueIgrejinha: true },
    });
    const transferByProduct = new Map();
    for (const [code, quantity] of transfers) {
      const matches = products.filter(product => {
        if (!byProduct.has(product.id)) return false;
        const skuCode = product.sku?.match(/(?:^|\D)(\d{3})$/)?.[1];
        const nameCode = product.nome.match(/^Mini Brand Collection\s+N[º°]\s*(\d{3})\b/i)?.[1];
        return (skuCode ?? nameCode) === code;
      });
      if (matches.length !== 1) throw new Error(`O código ${code} precisa identificar um produto nos lotes. Confira o SKU e o nome.`);
      const product = matches[0];
      if (quantity > byProduct.get(product.id)) throw new Error(`O lote não tem ${quantity} un. em Igrejinha para ${product.nome}.`);
      transferByProduct.set(product.id, quantity);
    }
    const transferredUnits = [...transferByProduct.values()].reduce((sum, quantity) => sum + quantity, 0);
    const distribution = products.map(product => {
      const initialIgrejinha = byProduct.get(product.id) ?? 0;
      if (initialIgrejinha > product.quantidade) throw new Error(`Saldo insuficiente para ${product.nome}.`);
      const transferred = transferByProduct.get(product.id) ?? 0;
      const estoqueIgrejinha = initialIgrejinha - transferred;
      return { product, initialIgrejinha, transferred, estoqueIgrejinha, estoqueSapiranga: product.quantidade - estoqueIgrejinha };
    });
    const sapiranga = distribution.reduce((sum, item) => sum + item.estoqueSapiranga, 0);
    if (distribution.every(({ product, estoqueIgrejinha, estoqueSapiranga }) =>
      product.estoqueIgrejinha === estoqueIgrejinha && product.estoqueSapiranga === estoqueSapiranga)) {
      return { sapiranga, igrejinha: igrejinha - transferredUnits, transferidas: 0, produtosAtualizados: 0 };
    }
    if (products.some(product => product.estoqueSapiranga || product.estoqueIgrejinha)) {
      throw new Error('Já existe uma distribuição por cidade. Revise o estoque antes de aplicar a carga inicial.');
    }

    const movements = [];
    for (const { product, initialIgrejinha, transferred, estoqueIgrejinha, estoqueSapiranga } of distribution) {
      await tx.produto.update({ where: { id: product.id }, data: { estoqueIgrejinha, estoqueSapiranga } });
      const movement = {
        produtoId: product.id, tipo: 'AJUSTE', quantidade: 0, quantidadeAnterior: product.quantidade, quantidadeNova: product.quantidade,
        usuarioResponsavel: 'Distribuição inicial',
      };
      movements.push({ ...movement,
        motivo: `Distribuição inicial · Sapiranga ${product.quantidade - initialIgrejinha} · Igrejinha ${initialIgrejinha}${initialIgrejinha > 0 ? ` · ${purchaseNumbers.join(', ')}` : ''}`,
      });
      if (transferred) movements.push({ ...movement, motivo: `Transferência · ${transferred} un. de Igrejinha para Sapiranga` });
    }
    await tx.estoqueMovimentacao.createMany({ data: movements });
    return { sapiranga, igrejinha: igrejinha - transferredUnits, transferidas: transferredUnits, produtosAtualizados: distribution.length };
  }, { isolationLevel: 'Serializable', timeout: 30000 });
  console.log(summary);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
