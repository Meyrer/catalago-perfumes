import { getSalePaymentAllocations, summarizeSalePayments } from '@/lib/sale-payment';
import { toCents } from '@/lib/money';
import { getExpensePartnerFunding, getPartnerContributions, getPurchasePartnerFunding, type PartnerFunding } from '@/lib/partner-funding';
import type { AdminCompra, AdminVenda, ERPData } from '@/app/admin/types';

export const financePeriods = [
  ['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'],
  ['mes', 'Este mês'], ['personalizado', 'Personalizado'],
] as const;

export const movementTypes = [
  ['venda', 'Vendas'], ['compra', 'Compras'], ['despesa', 'Despesas'],
  ['aporte', 'Aportes'], ['entrada', 'Outras entradas'],
] as const;

export type FinancePeriod = typeof financePeriods[number][0];
export type MovementType = typeof movementTypes[number][0];
export type FinanceFilter = {
  period: FinancePeriod;
  start: string;
  end: string;
  query: string;
  type: MovementType | '';
  scope: 'recent' | 'period' | 'pending';
  page: number;
};

export type Movement = {
  key: string;
  sourceId: number;
  type: MovementType;
  description: string;
  date: string | null;
  day: string | null;
  code: string;
  name?: string;
  method?: string | null;
  notes?: string | null;
  category?: string;
  status?: string;
  partnerFunding?: PartnerFunding;
  cents: number;
  cash: number;
};

type FinanceSale = Pick<AdminVenda, 'id' | 'numero' | 'data' | 'status' | 'valorTotal' | 'valorRecebido' | 'historicoPagamentos' | 'nomeClienteAvulso' | 'custoTotal' | 'observacoes'>
  & { cliente: { nome: string } | null };
type FinancePurchase = Pick<AdminCompra, 'id' | 'numero' | 'data' | 'status' | 'valorPagoCaixa' | 'dataPagamentoCaixa' | 'custoTotalBRL' | 'observacoes'>
  & { fornecedor: { nome: string } | null };

const saoPauloDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

function dayOf(value: Date | string | null) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? saoPauloDay.format(date) : null;
}

function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateRange({ period, start, end }: Pick<FinanceFilter, 'period' | 'start' | 'end'>, today: string) {
  if (period === 'personalizado') {
    if ((start && !isDay(start)) || (end && !isDay(end)) || (start && end && start > end)) {
      throw new Error('Selecione um intervalo de datas válido.');
    }
    return { start, end };
  }
  if (period === 'hoje') return { start: today, end: today };
  if (period === 'mes') {
    const start = today.slice(0, 7) + '-01';
    const last = new Date(start);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    return { start, end: last.toISOString().slice(0, 10) };
  }
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() - (period === '7d' ? 6 : 29));
  return { start: date.toISOString().slice(0, 10), end: today };
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function buildFinanceOverview(
  sales: FinanceSale[], purchases: FinancePurchase[], entries: ERPData['despesas'], filter: FinanceFilter, now = new Date(),
) {
  const range = dateRange(filter, saoPauloDay.format(now));
  const inPeriod = (day: string | null) => day !== null && (!range.start || day >= range.start) && (!range.end || day <= range.end);
  const salesInPeriod = sales.filter(sale => sale.status !== 'CANCELADO' && inPeriod(dayOf(sale.data)));
  const sold = summarizeSalePayments(salesInPeriod);
  const cost = salesInPeriod.reduce((sum, sale) => sum + toCents(sale.custoTotal), 0);
  const expenses = entries.reduce((sum, entry) => entry.tipo === 'DESPESA' && inPeriod(dayOf(entry.data)) ? sum + toCents(entry.valor) : sum, 0);
  const paymentMethods = new Map<string, number>();
  const partnerContributions = getPartnerContributions(entries);

  // The receipt allocations are the sole source of cash receipts from sales.
  const movements: Movement[] = [];
  for (const sale of sales) {
    const name = sale.cliente?.nome || sale.nomeClienteAvulso || 'Cliente balcão';
    const inSalePeriod = sale.status !== 'CANCELADO' && inPeriod(dayOf(sale.data));
    for (const [index, entry] of getSalePaymentAllocations(sale).entries()) {
      const cents = toCents(entry.valor);
      if (inSalePeriod) {
        const method = entry.formaPagamento || 'Sem forma informada';
        paymentMethods.set(method, (paymentMethods.get(method) ?? 0) + cents);
      }
      movements.push({
        key: `venda-${sale.id}-${index}`, sourceId: sale.id, type: 'venda',
        description: 'Recebimento de venda', name, code: sale.numero, method: entry.formaPagamento,
        notes: sale.observacoes, date: entry.data, day: dayOf(entry.data), cents, cash: cents,
        status: sale.status === 'CANCELADO' ? 'Venda cancelada' : undefined,
      });
    }
  }
  const purchasesByNumber = new Map(purchases.map(purchase => [purchase.numero, purchase]));
  for (const purchase of purchases) {
    const payment = toCents(purchase.valorPagoCaixa ?? 0);
    // Compras uses a date-only field for the payment day.
    const date = payment ? purchase.dataPagamentoCaixa?.toISOString() ?? null : purchase.data.toISOString();
    const day = payment ? date?.slice(0, 10) ?? null : dayOf(date);
    const name = purchase.fornecedor?.nome || 'Importação direta';
    movements.push({
      key: `compra-${purchase.id}`, sourceId: purchase.id, type: 'compra', description: 'Compra de mercadorias',
      name, code: purchase.numero, date, day, notes: purchase.observacoes,
      cents: payment || toCents(purchase.custoTotalBRL), cash: -payment,
      partnerFunding: getPurchasePartnerFunding(partnerContributions, purchase),
      status: purchase.status === 'CANCELADO' ? 'Compra cancelada' : payment ? undefined : 'Sem saída registrada no caixa',
    });
  }
  for (const entry of entries) {
    const type = entry.tipo === 'APORTE' ? 'aporte' : entry.tipo === 'RECEITA_EXTRA' ? 'entrada' : 'despesa';
    const cents = toCents(entry.valor);
    const linkedPurchase = type === 'aporte' ? purchasesByNumber.get(entry.descricao.match(/\bCOMP-[A-Z0-9-]+\b/i)?.[0] ?? '') : undefined;
    movements.push({
      key: `${type}-${entry.id}`, sourceId: entry.id, type, description: linkedPurchase ? 'Aporte para compra de mercadorias' : entry.descricao,
      name: linkedPurchase?.fornecedor?.nome, code: linkedPurchase?.numero ?? `#${entry.id}`, category: entry.categoria,
      notes: entry.observacoes, method: entry.formaPagamento, date: entry.data.toISOString(), day: dayOf(entry.data),
      partnerFunding: type === 'despesa' && entry.pago ? getExpensePartnerFunding(partnerContributions, entry.id, cents) : undefined,
      cents, cash: entry.pago ? (type === 'despesa' ? -cents : cents) : 0, status: entry.pago ? undefined : 'Em aberto',
    });
  }

  const pending = movements.filter(row => row.day === null).sort((a, b) => b.sourceId - a.sourceId || a.key.localeCompare(b.key));
  const dated = movements.filter(row => inPeriod(row.day)).sort((a, b) =>
    (b.day ?? '').localeCompare(a.day ?? '') || (b.date ?? '').localeCompare(a.date ?? '') || b.sourceId - a.sourceId || a.key.localeCompare(b.key),
  );
  const opening = range.start ? movements.reduce((sum, row) => row.day && row.day < range.start ? sum + row.cash : sum, 0) : 0;
  const undatedNet = pending.reduce((sum, row) => sum + row.cash, 0);
  const totals = { opening, received: 0, expenses: 0, purchases: 0, contributions: 0, other: 0 };
  for (const row of dated) {
    if (row.type === 'venda') totals.received += row.cash;
    if (row.type === 'compra') totals.purchases -= row.cash;
    if (row.type === 'despesa') totals.expenses -= row.cash;
    if (row.type === 'aporte') totals.contributions += row.cash;
    if (row.type === 'entrada') totals.other += row.cash;
  }
  const outgoing = totals.expenses + totals.purchases;
  const net = totals.received + totals.contributions + totals.other - outgoing;
  const text = normalizeSearch(filter.query.trim());
  const filtered = (filter.scope === 'pending' ? pending : dated).filter(row =>
    (!filter.type || row.type === filter.type) && (!text || [row.description, row.name, row.code, `#${row.sourceId}`, row.notes].some(value => value && normalizeSearch(value).includes(text))),
  );
  const pageSize = filter.scope === 'recent' ? 5 : 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(filter.page, pageCount);

  return {
    range,
    cash: { ...totals, outgoing, net, undatedNet, balance: opening + net + undatedNet },
    pending: { count: pending.length, incoming: pending.reduce((sum, row) => sum + Math.max(0, row.cash), 0), outgoing: pending.reduce((sum, row) => sum - Math.min(0, row.cash), 0) },
    results: { ...sold, cost, expenses, profit: toCents(sold.total) - cost - expenses, paymentMethods: Array.from(paymentMethods) },
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    page, pageCount, count: filtered.length,
  };
}

export type FinanceOverview = ReturnType<typeof buildFinanceOverview>;
