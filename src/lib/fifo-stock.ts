import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Prisma, Produto } from '@prisma/client';
import { fifoCost, getFifoLots, takeFifo, type FifoLot } from '@/lib/fifo';
import { roundMoney } from '@/lib/money';

export function initialFifoStock(quantity: number, unitCost: number): FifoLot[] {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error('Quantidade ou custo inicial inválido.');
  return quantity > 0 ? [{ id: randomUUID(), ordem: 0, quantidade: quantity, custoUnitario: roundMoney(unitCost),
    recebidoEm: new Date().toISOString(), origem: 'CADASTRO_INICIAL' }] : [];
}

// Must run in the same transaction as the physical balance and its movement.
export async function changeFifoStock(tx: Prisma.TransactionClient, product: Produto, newQuantity: number,
  origin: string, unitCost = Number(product.precoCusto ?? 0), returned?: FifoLot[]) {
  if (!Number.isSafeInteger(newQuantity) || newQuantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error('Saldo ou custo FIFO inválido.');
  let lots = getFifoLots({ ...product, precoCusto: Number(product.precoCusto ?? 0) });
  const delta = newQuantity - product.quantidade;
  let taken: FifoLot[] = [];
  if (delta < 0) {
    const result = takeFifo(lots, -delta);
    lots = result.lots;
    taken = result.taken;
  } else if (delta > 0) {
    if (returned) {
      if (returned.reduce((sum, lot) => sum + lot.quantidade, 0) !== delta) throw new Error('Quantidade devolvida diverge dos lotes da venda.');
      for (const lot of returned) {
        const existing = lots.find(current => current.id === lot.id);
        if (existing) existing.quantidade += lot.quantidade;
        else lots.push({ ...lot, ordem: Math.max(-1, ...lots.map(current => current.ordem)) + 1 });
      }
    } else {
      lots.push({ id: randomUUID(), ordem: Math.max(-1, ...lots.map(lot => lot.ordem)) + 1,
        quantidade: delta, custoUnitario: roundMoney(unitCost), recebidoEm: new Date().toISOString(), origem: origin });
    }
  }
  const changed = await tx.produto.updateMany({ where: { id: product.id, updatedAt: product.updatedAt, quantidade: product.quantidade }, data: { lotesEstoque: lots } });
  if (changed.count !== 1) throw new Error('Os lotes de estoque foram alterados por outra operação. Atualize a página.');
  return { taken, cost: fifoCost(taken) };
}
