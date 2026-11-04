import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, readJsonObject } from "@/lib/admin-api";
import { createSale } from "@/lib/erp-operations";
import { erpError, listQuery, queryId, saleFields, saleStatuses } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  try {
    const { params, status, dateRange, pagination, limit } = listQuery(request, saleStatuses);
    const items = await prisma.venda.findMany({
      where: { status, clienteId: queryId(params, "clienteId"), data: dateRange },
      include: { cliente: true, itens: { include: { produto: true } } },
      ...pagination,
    });
    return apiSuccess({ items, nextCursor: items.length === limit ? items.at(-1)!.id : null });
  } catch (error) { return erpError(error); }
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try { return apiSuccess(await createSale(saleFields(body), "API"), 201); }
  catch (error) { return erpError(error); }
}
