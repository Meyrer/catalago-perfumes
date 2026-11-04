import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, positiveId, readJsonObject } from "@/lib/admin-api";
import { updateSaleStatus } from "@/lib/erp-operations";
import { enumField, erpError, saleStatuses } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    await updateSaleStatus(id, enumField(body.status, "status", saleStatuses), "API");
    return apiSuccess(await prisma.venda.findUnique({ where: { id }, include: { itens: true } }));
  } catch (error) { return erpError(error); }
}
