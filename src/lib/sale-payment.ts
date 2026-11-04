import { fromCents, roundMoney, toCents } from '@/lib/money';

type PaymentSale = {
  status: string;
  valorTotal: number;
  valorRecebido?: number | { toNumber(): number } | null;
};

export function getSaleReceivedAmount(sale: PaymentSale): number | null {
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
