import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, positiveId, readJsonObject } from "@/lib/admin-api";
import { dateField, enumField, erpError, purchaseStatuses } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const include = { fornecedor: true, itens: { include: { produto: true } } } as const;

export async function GET(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  try {
    const purchase = await prisma.compra.findUnique({ where: { id }, include });
    return purchase ? apiSuccess(purchase) : apiError("Compra não encontrada.", 404);
  } catch (error) { return erpError(error); }
}

export async function PATCH(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body || !Object.keys(body).some(key => ["observacoes", "data", "status"].includes(key)) || Object.keys(body).some(key => !["observacoes", "data", "status", "updatedAt"].includes(key))) return apiError("PATCH aceita observacoes, data, status e updatedAt. Custos e itens não são editáveis por este endpoint.", 400);
  try {
    const current = await prisma.compra.findUnique({ where: { id } });
    if (!current) return apiError("Compra não encontrada.", 404);
    const status = body.status === undefined ? undefined : enumField(body.status, "status", purchaseStatuses);
    if (status === "RECEBIDO" || (current.status === "RECEBIDO" && status !== undefined && status !== current.status)) return apiError("Use /receive para receber a compra. Uma compra recebida não pode ser cancelada ou voltar de status sem estornar o estoque.", 409);
    const changed = await prisma.compra.updateMany({
      where: { id, updatedAt: body.updatedAt === undefined ? current.updatedAt : dateField(body.updatedAt, "updatedAt") },
      data: { status, observacoes: optionalText(body.observacoes, "observacoes", 5000), data: body.data === undefined ? undefined : dateField(body.data) },
    });
    if (changed.count !== 1) return apiError("A compra foi alterada. Consulte novamente antes de editar.", 409);
    revalidatePath("/admin");
    return apiSuccess(await prisma.compra.findUnique({ where: { id }, include }));
  } catch (error) { return erpError(error); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme com ?confirm=true.", 400);
  try {
    if (await prisma.estoqueMovimentacao.findFirst({ where: { compraId: id }, select: { id: true } })) return apiError("A compra possui movimentações de estoque e não pode ser excluída.", 409);
    const deleted = await prisma.compra.deleteMany({ where: { id, status: { not: "RECEBIDO" } } });
    if (deleted.count !== 1) return apiError("Compra não encontrada ou já recebida no estoque. Compras recebidas não podem ser excluídas por este endpoint.", 409);
    revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return erpError(error); }
}
