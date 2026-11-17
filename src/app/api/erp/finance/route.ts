import { apiError, apiSuccess } from '@/lib/admin-api';
import { getAdminSession } from '@/lib/auth';
import { buildFinanceOverview, financePeriods, movementTypes } from '@/lib/finance-overview';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || session.mustChangePassword) return apiError('Sessão administrativa necessária.', 401);

  const params = new URL(request.url).searchParams;
  const period = financePeriods.find(([id]) => id === params.get('period'))?.[0];
  const scope = params.get('scope');
  const rawType = params.get('type') ?? '';
  const type = movementTypes.find(([id]) => id === rawType)?.[0];
  const page = Number(params.get('page') ?? 1);
  const query = params.get('query') ?? '';
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  if (!period || (scope !== 'recent' && scope !== 'period' && scope !== 'pending') ||
      (rawType && !type) || !Number.isSafeInteger(page) || page < 1 || query.length > 160 ||
      (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) ||
      (start && end && start > end)) return apiError('Confira os filtros informados.', 400);

  try {
    const [sales, purchases, entries] = await prisma.$transaction([
      prisma.venda.findMany({ select: {
        id: true, numero: true, data: true, status: true, valorTotal: true, valorRecebido: true,
        historicoPagamentos: true, nomeClienteAvulso: true, custoTotal: true, observacoes: true,
        cliente: { select: { nome: true } },
      } }),
      prisma.compra.findMany({ select: {
        id: true, numero: true, data: true, status: true, valorPagoCaixa: true, dataPagamentoCaixa: true,
        custoTotalBRL: true, observacoes: true, fornecedor: { select: { nome: true } },
      } }),
      prisma.despesaFinanceira.findMany({ where: { tipo: { in: ['DESPESA', 'RECEITA_EXTRA', 'APORTE'] } } }),
    ], { isolationLevel: 'RepeatableRead' });
    const overview = buildFinanceOverview(
      sales.map(sale => ({ ...sale, valorRecebido: sale.valorRecebido?.toNumber() ?? null })),
      purchases.map(purchase => ({ ...purchase, valorPagoCaixa: purchase.valorPagoCaixa?.toNumber() ?? null })),
      entries,
      { period, scope, type: type ?? '', page, query, start, end },
    );
    return apiSuccess(overview);
  } catch (error) {
    if (error instanceof Error && error.message === 'Selecione um intervalo de datas válido.') return apiError(error.message, 400);
    console.error('Falha ao consultar o financeiro.', error);
    return apiError('Não foi possível consultar o financeiro.', 500);
  }
}
