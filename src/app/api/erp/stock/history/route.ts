import { getAdminSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/admin-api';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || session.mustChangePassword) return apiError('Sessão administrativa necessária.', 401);
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') || 1);
  const size = Number(params.get('size') || 20);
  const month = params.get('month') || '';
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || ![20, 50].includes(size)
    || (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) return apiError('Página ou mês inválido.', 400);
  const start = month ? new Date(`${month}-01T03:00:00Z`) : undefined;
  if (start && !Number.isFinite(start.getTime())) return apiError('Mês inválido.', 400);
  const end = start ? new Date(start) : undefined;
  if (end) end.setUTCMonth(end.getUTCMonth() + 1);
  const where = start && end ? { createdAt: { gte: start, lt: end } } : {};
  const [total, items] = await prisma.$transaction([
    prisma.estoqueMovimentacao.count({ where }),
    prisma.estoqueMovimentacao.findMany({ where, include: { produto: { select: { id: true, nome: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * size, take: size }),
  ]);
  return apiSuccess({ items, total, page, size });
}
