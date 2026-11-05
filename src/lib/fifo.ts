import { fromCents, toCents } from '@/lib/money';

export type FifoLot = {
  id: string;
  ordem: number;
  quantidade: number;
  custoUnitario: number;
  recebidoEm: string | null;
  origem: string;
};
export type FifoProduct = { id: number; quantidade: number; precoCusto?: number | null; lotesEstoque?: unknown };

export function getFifoLots(product: FifoProduct): FifoLot[] {
  const raw = product.lotesEstoque;
  if (!Array.isArray(raw) || raw.length === 0) {
    return product.quantidade > 0 ? [{ id: `inicial-${product.id}`, ordem: 0, quantidade: product.quantidade,
      custoUnitario: fromCents(toCents(product.precoCusto ?? 0)), recebidoEm: null, origem: 'SALDO_INICIAL' }] : [];
  }
  const lots = (raw as FifoLot[]).map(lot => ({ ...lot })).sort((a, b) => a.ordem - b.ordem);
  if (lots.some(lot => !Number.isSafeInteger(lot.quantidade) || lot.quantidade < 0 || !Number.isFinite(lot.custoUnitario) || lot.custoUnitario < 0)
    || lots.reduce((sum, lot) => sum + lot.quantidade, 0) !== product.quantidade) {
    throw new Error('O saldo dos lotes FIFO diverge do estoque. Confira as movimentações antes de continuar.');
  }
  return lots;
}

export function fifoCost(lots: FifoLot[]): number {
  return fromCents(lots.reduce((sum, lot) => sum + toCents(lot.custoUnitario) * lot.quantidade, 0));
}

export function getFifoStockValue(product: FifoProduct): number {
  return fifoCost(getFifoLots(product));
}

export function getFifoNextCost(product: FifoProduct): number {
  return getFifoLots(product).find(lot => lot.quantidade > 0)?.custoUnitario ?? product.precoCusto ?? 0;
}

export function takeFifo(lots: FifoLot[], quantity: number): { lots: FifoLot[]; taken: FifoLot[] } {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Quantidade FIFO inválida.');
  let remaining = quantity;
  const taken: FifoLot[] = [];
  const updated = lots.map(lot => {
    const amount = Math.min(lot.quantidade, remaining);
    remaining -= amount;
    if (amount) taken.push({ ...lot, quantidade: amount });
    return { ...lot, quantidade: lot.quantidade - amount };
  });
  if (remaining) throw new Error('Estoque insuficiente nos lotes FIFO.');
  return { lots: updated, taken };
}

export function releaseFifo(allocations: FifoLot[], quantity: number) {
  let remaining = quantity;
  const kept = allocations.map(lot => ({ ...lot }));
  const returned: FifoLot[] = [];
  for (let index = kept.length - 1; index >= 0 && remaining > 0; index--) {
    const amount = Math.min(kept[index].quantidade, remaining);
    if (amount) returned.push({ ...kept[index], quantidade: amount });
    kept[index].quantidade -= amount;
    remaining -= amount;
  }
  if (remaining) throw new Error('Devolução maior que o consumo dos lotes desta venda.');
  return { kept: kept.filter(lot => lot.quantidade > 0), returned };
}

export function saleFifoAllocations(item: { produtoId: number; quantidade: number; custoUnitario: number; lotesCusto?: unknown }, saleId: number): FifoLot[] {
  if (Array.isArray(item.lotesCusto) && item.lotesCusto.length) return (item.lotesCusto as FifoLot[]).map(lot => ({ ...lot }));
  return [{ id: `legado-${saleId}-${item.produtoId}`, ordem: -1, quantidade: item.quantidade,
    custoUnitario: item.custoUnitario, recebidoEm: null, origem: 'DEVOLUCAO_VENDA_LEGADA' }];
}
