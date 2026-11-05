import { fromCents, roundMoney, toCents } from '@/lib/money';

type PaymentSale = {
  status: string;
  valorTotal: number;
  valorRecebido?: number | { toNumber(): number } | null;
  historicoPagamentos?: unknown;
};

export type SalePaymentEntry = {
  tipo: 'RECEBIMENTO' | 'AJUSTE' | 'CONFERENCIA' | 'SALDO_INICIAL';
  valor: number | null;
  totalRecebido: number | null;
  data: string | null;
  registradoEm: string | null;
  formaPagamento: string | null;
  responsavel: string | null;
};

export function getSaleItemNetAmounts(sale: { desconto: number; itens: Array<{ subtotal: number }> }): number[] {
  const subtotal = sale.itens.reduce((sum, item) => sum + toCents(item.subtotal), 0);
  let accumulated = 0;
  let allocatedDiscount = 0;
  return sale.itens.map(item => {
    const amount = toCents(item.subtotal);
    accumulated += amount;
    const discount = subtotal > 0 ? Math.round(toCents(sale.desconto) * accumulated / subtotal) : 0;
    const net = amount - (discount - allocatedDiscount);
    allocatedDiscount = discount;
    return fromCents(net);
  });
}

export function getSalePaymentHistory(sale: PaymentSale & { formaPagamento?: string }): SalePaymentEntry[] {
  if (Array.isArray(sale.historicoPagamentos) && sale.historicoPagamentos.length > 0) {
    return sale.historicoPagamentos as SalePaymentEntry[];
  }
  const received = getSaleReceivedAmount(sale);
  return received !== null && received > 0 ? [{
    tipo: 'SALDO_INICIAL', valor: received, totalRecebido: received,
    data: null, registradoEm: null, formaPagamento: null, responsavel: null,
  }] : [];
}

export type SalePaymentAllocation = { valor: number; data: string | null; formaPagamento: string | null };

// Corrections do not identify which earlier payment/date/method was wrong.
// Keep that balance unclassified rather than assigning it to an invented receipt.
export function getSalePaymentAllocations(sale: PaymentSale): SalePaymentAllocation[] {
  const received = getSaleReceivedAmount(sale);
  if (received === null || received <= 0) return [];
  const history = getSalePaymentHistory(sale);
  let start = 0;
  history.forEach((entry, index) => {
    if (entry.tipo !== 'RECEBIMENTO') start = index + 1;
  });
  const known = history.slice(start).filter(entry => entry.tipo === 'RECEBIMENTO'
    && entry.valor !== null && entry.valor > 0 && entry.data !== null
    && Number.isFinite(new Date(entry.data).getTime())).map(entry => ({
    valor: entry.valor!, data: entry.data, formaPagamento: entry.formaPagamento,
  }));
  const knownCents = known.reduce((sum, entry) => sum + toCents(entry.valor), 0);
  const receivedCents = toCents(received);
  if (knownCents > receivedCents) return [{ valor: received, data: null, formaPagamento: null }];
  const remainder = receivedCents - knownCents;
  return remainder > 0 ? [...known, { valor: fromCents(remainder), data: null, formaPagamento: null }] : known;
}

// Called inside the sale transaction; the client cannot rewrite earlier entries.
export function recordSalePayment(
  sale: PaymentSale & { formaPagamento?: string },
  received: number | null,
  method: string,
  actor: string,
  paymentDate?: string,
): SalePaymentEntry[] {
  const history = getSalePaymentHistory(sale);
  const previous = getSaleReceivedAmount(sale);
  if (previous === received) return history;
  if (!['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'LINK_PAGAMENTO'].includes(method)) {
    throw new Error('Forma do recebimento inválida.');
  }
  if (paymentDate !== undefined && !Number.isFinite(new Date(paymentDate).getTime())) {
    throw new Error('Data do recebimento inválida.');
  }
  const now = new Date().toISOString();
  const date = paymentDate === undefined ? now : new Date(paymentDate).toISOString();
  const difference = received === null ? null : fromCents(toCents(received) - toCents(previous ?? 0));
  return [...history, {
    tipo: received === null ? 'CONFERENCIA' : previous === null || (difference ?? 0) < 0 ? 'AJUSTE' : 'RECEBIMENTO',
    valor: difference, totalRecebido: received,
    data: previous === null || difference === null || difference < 0 ? null : date,
    registradoEm: now, formaPagamento: previous === null || difference === null || difference < 0 ? null : method,
    responsavel: actor,
  }];
}

export function getSaleReceivedAmount(sale: PaymentSale): number | null {
  if (Array.isArray(sale.historicoPagamentos)) {
    const last = sale.historicoPagamentos[sale.historicoPagamentos.length - 1] as SalePaymentEntry | undefined;
    if (sale.valorRecebido == null && last?.tipo === 'CONFERENCIA' && last.totalRecebido === null) return null;
  }
  if (sale.valorRecebido !== null && sale.valorRecebido !== undefined) {
    return roundMoney(typeof sale.valorRecebido === 'number' ? sale.valorRecebido : sale.valorRecebido.toNumber());
  }
  // Only legacy statuses that explicitly describe payment provide evidence.
  if (sale.status === 'PAGO') return roundMoney(sale.valorTotal);
  if (sale.status === 'AGUARDANDO_PAGAMENTO') return 0;
  return null;
}

export function getSalePaymentStatus(sale: PaymentSale): 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'A_CONFERIR' | 'CANCELADO' {
  if (sale.status === 'CANCELADO') return 'CANCELADO';
  const received = getSaleReceivedAmount(sale);
  if (received === null) return 'A_CONFERIR';
  if (toCents(received) >= toCents(sale.valorTotal)) return 'PAGO';
  return received > 0 ? 'PARCIAL' : 'PENDENTE';
}

export function summarizeSalePayments(sales: PaymentSale[]) {
  let total = 0, received = 0, outstanding = 0, unconfirmed = 0, unconfirmedCount = 0, count = 0;
  for (const sale of sales) {
    if (sale.status === 'CANCELADO') continue;
    count++;
    const amount = toCents(sale.valorTotal);
    total += amount;
    const paid = getSaleReceivedAmount(sale);
    if (paid === null) {
      unconfirmed += amount;
      unconfirmedCount++;
    } else {
      received += toCents(paid);
      outstanding += Math.max(0, amount - toCents(paid));
    }
  }
  return { total: fromCents(total), received: fromCents(received), outstanding: fromCents(outstanding), unconfirmed: fromCents(unconfirmed), unconfirmedCount, count };
}

export function validateSaleReceivedAmount(value: number | null, total: number): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || toCents(value) > toCents(total) || toCents(value) > 999999999999) {
    throw new Error('O valor recebido deve estar entre zero e o total da venda.');
  }
  return roundMoney(value);
}
