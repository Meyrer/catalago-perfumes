const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the actual TypeScript business modules, without a server or database.
const cache = new Map();
function load(name) {
  if (name === 'server-only') return {};
  if (!name.startsWith('@/lib/') && name !== '@/app/admin/MonthFilter') return require(name);
  if (cache.has(name)) return cache.get(name).exports;
  const sourcePath = path.resolve(__dirname, '../src', name.slice(2));
  const filename = fs.existsSync(sourcePath + '.ts') ? sourcePath + '.ts' : sourcePath + '.tsx';
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} }; cache.set(name, module);
  new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
  return module.exports;
}
const { getFifoLots, takeFifo, fifoCost, releaseFifo } = load('@/lib/fifo');
const { changeFifoStock } = load('@/lib/fifo-stock');
const { getSalePaymentAllocations, recordSalePayment, getSaleReceivedAmount, getSalePaymentStatus, summarizeSalePayments } = load('@/lib/sale-payment');
const { toCents } = load('@/lib/money');

function inventory(quantity = 2, cost = 30.25) {
  const state = { id: 1, quantidade: quantity, precoCusto: cost, lotesEstoque: [], updatedAt: new Date('2026-11-05T12:00:00Z') };
  const tx = { produto: { updateMany: async ({ where, data }) => {
    if (where.quantidade !== state.quantidade || where.updatedAt.getTime() !== state.updatedAt.getTime()) return { count: 0 };
    state.lotesEstoque = structuredClone(data.lotesEstoque);
    state.updatedAt = new Date(state.updatedAt.getTime() + 1);
    return { count: 1 };
  } } };
  async function change(next, origin, unitCost, returned) {
    const result = await changeFifoStock(tx, structuredClone(state), next, origin, unitCost, returned);
    state.quantidade = next; // physical update made by the same ERP transaction
    return result;
  }
  return { state, tx, change };
}

test('new purchase preserves old layers; sale consumes oldest units first', async () => {
  const { state, change } = inventory();
  await change(5, 'COMPRA', 38.5);
  assert.equal(fifoCost(getFifoLots(state)), 176);
  const sale = await change(2, 'VENDA');
  assert.deepEqual(sale.taken.map(lot => [lot.quantidade, lot.custoUnitario]), [[2, 30.25], [1, 38.5]]);
  assert.equal(sale.cost, 99);
  assert.equal(fifoCost(getFifoLots(state)), 77);
});

test('reducing a sale releases its last allocation; cancellation restores original layers', async () => {
  const { state, change } = inventory();
  await change(5, 'COMPRA', 38.5);
  const sale = await change(2, 'VENDA');
  const release = releaseFifo(sale.taken, 1);
  assert.equal(fifoCost(release.kept), 60.5);
  await change(3, 'DEVOLUCAO_PARCIAL', undefined, release.returned);
  await change(5, 'CANCELAMENTO', undefined, release.kept);
  assert.equal(fifoCost(getFifoLots(state)), 176);
  assert.deepEqual(getFifoLots(state).map(lot => lot.quantidade), [2, 3]);
});

test('mixed-layer average does not introduce a cent into the sale total', async () => {
  const { change } = inventory(1, 10);
  await change(3, 'COMPRA', 20);
  const sale = await change(0, 'VENDA');
  const average = sale.cost / 3;
  assert.equal(toCents(average * 3), 5000);
  assert.equal(sale.cost, 50);
});

test('FIFO rejects insufficient units, divergent balance and stale writes', async () => {
  const { state, tx } = inventory();
  const lots = getFifoLots(state);
  assert.throws(() => takeFifo(lots, 3), /insuficiente/);
  assert.equal(lots[0].quantidade, 2);
  assert.throws(() => getFifoLots({ ...state, lotesEstoque: [{ ...lots[0], quantidade: 1 }] }), /diverge/);
  const stale = structuredClone(state);
  state.updatedAt = new Date(state.updatedAt.getTime() + 1);
  await assert.rejects(changeFifoStock(tx, stale, 1, 'VENDA'), /outra operação/);
  assert.deepEqual(state.lotesEstoque, []);
});

test('old balance stays undated; only the new difference gets payment date and method', () => {
  const old = { status: 'ENTREGUE', valorTotal: 200, valorRecebido: 80, historicoPagamentos: [] };
  const history = recordSalePayment(old, 150, 'PIX', 'Meyrer', '2026-11-05T12:00:00Z');
  const entries = getSalePaymentAllocations({ ...old, valorRecebido: 150, historicoPagamentos: history });
  assert.equal(entries.find(entry => entry.data === null).valor, 80);
  assert.deepEqual(entries.find(entry => entry.data !== null), { valor: 70, data: '2026-11-05T12:00:00.000Z', formaPagamento: 'PIX' });
});

test('corrections do not invent payment dates or preserve an unsupported payment method', () => {
  const old = { status: 'ENTREGUE', valorTotal: 200, valorRecebido: 0, historicoPagamentos: [] };
  const paid = { ...old, valorRecebido: 150, historicoPagamentos: recordSalePayment(old, 150, 'PIX', 'Meyrer') };
  const corrected = { ...paid, valorRecebido: 120, historicoPagamentos: recordSalePayment(paid, 120, 'PIX', 'Meyrer') };
  assert.deepEqual(getSalePaymentAllocations(corrected), [{ valor: 120, data: null, formaPagamento: null }]);
  const unconfirmed = { ...corrected, status: 'AGUARDANDO_PAGAMENTO', valorRecebido: null, historicoPagamentos: recordSalePayment(corrected, null, 'PIX', 'Meyrer') };
  assert.equal(getSaleReceivedAmount(unconfirmed), 0);
});

test('mixed payment methods remain separate and empty receipts count as unpaid', () => {
  const base = { status: 'ENTREGUE', valorTotal: 200, valorRecebido: 0, historicoPagamentos: [] };
  const first = { ...base, valorRecebido: 50, historicoPagamentos: recordSalePayment(base, 50, 'PIX', 'Meyrer') };
  const sale = { ...first, valorRecebido: 80, historicoPagamentos: recordSalePayment(first, 80, 'DINHEIRO', 'Meyrer') };
  assert.deepEqual(getSalePaymentAllocations(sale).map(entry => [entry.formaPagamento, entry.valor]), [['PIX', 50], ['DINHEIRO', 30]]);
  const summary = summarizeSalePayments([sale, { status: 'ENTREGUE', valorTotal: 25, valorRecebido: null }, { ...sale, status: 'CANCELADO' }]);
  assert.equal(summary.total, 225);
  assert.equal(summary.total, summary.received + summary.outstanding);
});


test('delivered or shipped with an empty received amount remains unpaid', () => {
  for (const status of ['ENTREGUE', 'ENVIADO', 'PREPARANDO', 'AGUARDANDO_PAGAMENTO']) {
    for (const valorRecebido of [null, undefined, 0]) {
      const sale = { status, valorTotal: 79.9, valorRecebido };
      assert.equal(getSaleReceivedAmount(sale), 0);
      assert.equal(getSalePaymentStatus(sale), 'PENDENTE');
      assert.deepEqual(summarizeSalePayments([sale]), { total: 79.9, received: 0, outstanding: 79.9, count: 1 });
    }
  }
});

test('the three screenshot totals close exactly to the cent', () => {
  const summary = summarizeSalePayments([
    { status: 'ENTREGUE', valorTotal: 393.73, valorRecebido: 393.73 },
    { status: 'ENTREGUE', valorTotal: 559.2, valorRecebido: 0 },
    { status: 'ENTREGUE', valorTotal: 159.8, valorRecebido: null },
  ]);
  assert.deepEqual(summary, { total: 1112.73, received: 393.73, outstanding: 719, count: 3 });
  assert.equal(toCents(summary.total), toCents(summary.received) + toCents(summary.outstanding));
});

test('legacy explicitly paid sales remain confirmed and are not erased by the new blank rule', () => {
  assert.equal(getSaleReceivedAmount({ status: 'PAGO', valorTotal: 79.9, valorRecebido: null }), 79.9);
});

test('monthly totals use the sale month even when its payment arrived in another month', () => {
  const { isInMonth } = load('@/app/admin/MonthFilter');
  const sales = [
    { status: 'ENTREGUE', data: '2026-11-01T02:30:00Z', valorTotal: 100, valorRecebido: 40 },
    { status: 'ENTREGUE', data: '2026-11-01T03:00:00Z', valorTotal: 200, valorRecebido: null },
  ];
  const october = summarizeSalePayments(sales.filter(sale => isInMonth(sale.data, '2026-10')));
  const november = summarizeSalePayments(sales.filter(sale => isInMonth(sale.data, '2026-11')));
  assert.deepEqual(october, { total: 100, received: 40, outstanding: 60, count: 1 });
  assert.deepEqual(november, { total: 200, received: 0, outstanding: 200, count: 1 });
});
