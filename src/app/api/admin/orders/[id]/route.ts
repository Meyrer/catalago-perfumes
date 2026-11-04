import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, positiveId, readJsonObject } from "@/lib/admin-api";
import { dateField, enumField, erpError, orderStatuses } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const include = { cliente: true, fornecedor: true, produto: true } as const;

export async function GET(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  try {
    const order = await prisma.encomenda.findUnique({ where: { id }, include });
    return order ? apiSuccess(order) : apiError("Encomenda não encontrada.", 404);
  } catch (error) { return erpError(error); }
}

export async function PATCH(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body || !Object.keys(body).some(key => ["status", "observacoes", "previsaoChegada"].includes(key)) || Object.keys(body).some(key => !["status", "observacoes", "previsaoChegada", "updatedAt"].includes(key))) return apiError("Envie status, observacoes ou previsaoChegada. updatedAt é opcional para controle de concorrência.", 400);
  try {
    const changed = await prisma.encomenda.updateMany({
      where: { id, updatedAt: body.updatedAt === undefined ? undefined : dateField(body.updatedAt, "updatedAt") },
      data: {
        status: body.status === undefined ? undefined : enumField(body.status, "status", orderStatuses),
        observacoes: optionalText(body.observacoes, "observacoes", 5000),
        previsaoChegada: optionalText(body.previsaoChegada, "previsaoChegada", 500),
      },
    });
    if (changed.count !== 1) return apiError("Encomenda não encontrada ou alterada. Consulte novamente.", 409);
    revalidatePath("/admin");
    return apiSuccess(await prisma.encomenda.findUnique({ where: { id }, include }));
  } catch (error) { return erpError(error); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme com ?confirm=true.", 400);
  try {
    if (await prisma.venda.findFirst({ where: { encomendaId: id }, select: { id: true } })) return apiError("A encomenda está vinculada a uma venda e não pode ser excluída.", 409);
    const deleted = await prisma.encomenda.deleteMany({ where: { id, vendaId: null, valorAdiantamento: 0 } });
    if (deleted.count !== 1) return apiError("Encomenda não encontrada, vinculada a venda ou com adiantamento. Resolva os vínculos financeiros antes de excluir.", 409);
    revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return erpError(error); }
}
