import { toCents } from '@/lib/money';
import type { AdminCompra, ERPData } from '@/app/admin/types';

export type PartnerFunding = 'direto' | 'aporte' | 'parcial';

type Purchase = Pick<AdminCompra, 'id' | 'observacoes' | 'valorPagoCaixa'>;
type Entry = ERPData['despesas'][number];

export function getPartnerContributions(entries: Entry[]) {
  const contributions = new Map<string, number>();
  for (const entry of entries) {
    const reference = entry.observacoes?.trim();
    if (entry.tipo !== 'APORTE' || !entry.pago || entry.valor <= 0 || !reference ||
        !/^(Compra|Despesa) #[1-9]\d*$/.test(reference)) continue;
    contributions.set(reference, (contributions.get(reference) ?? 0) + toCents(entry.valor));
  }
  return contributions;
}

export function getExpensePartnerFunding(contributions: Map<string, number>, id: number, cents: number): PartnerFunding | undefined {
  const contribution = getPartnerContributionAmount(contributions, 'despesa', id);
  return contribution ? contribution >= cents ? 'aporte' : 'parcial' : undefined;
}

export function getPurchasePartnerFunding(contributions: Map<string, number>, purchase: Purchase): PartnerFunding | undefined {
  const cash = toCents(purchase.valorPagoCaixa ?? 0);
  const contribution = getPartnerContributionAmount(contributions, 'compra', purchase.id);
  if (cash > 0 && contribution) return contribution >= cash ? 'aporte' : 'parcial';
  if (cash === 0 && purchase.observacoes?.split(/\r?\n/).some(line => line.trim() === 'Origem do pagamento: sócios.')) return 'direto';
  return undefined;
}

export function getPartnerContributionAmount(contributions: Map<string, number>, type: 'compra' | 'despesa', id: number) {
  return contributions.get(`${type === 'compra' ? 'Compra' : 'Despesa'} #${id}`) ?? 0;
}
