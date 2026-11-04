import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, positiveId } from "@/lib/admin-api";
import { receivePurchase } from "@/lib/erp-operations";
import { erpError } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  try {
    await receivePurchase(id, "API");
    return apiSuccess(await prisma.compra.findUnique({ where: { id }, include: { itens: true, fornecedor: true } }));
  } catch (error) { return erpError(error); }
}
