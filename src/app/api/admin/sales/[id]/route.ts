import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";
import { deleteSale, updateSale } from "@/lib/erp-operations";
import { dateField, erpError, saleFields } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const include = { cliente: true, itens: { include: { produto: true } } } as const;

export async function GET(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  try {
    const sale = await prisma.venda.findUnique({ where: { id }, include });
    return sale ? apiSuccess(sale) : apiError("Venda não encontrada.", 404);
  } catch (error) { return erpError(error); }
}

export async function PUT(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const data = { ...saleFields(body), data: dateField(body.data).toISOString(), updatedAt: requiredText(body.updatedAt, "updatedAt", 40) };
    await updateSale(id, data, "API");
    return apiSuccess(await prisma.venda.findUnique({ where: { id }, include }));
  } catch (error) { return erpError(error); }
}

export async function PATCH(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body || body.observacoes === undefined || Object.keys(body).some(key => !["observacoes", "updatedAt"].includes(key))) return apiError("PATCH aceita observacoes e updatedAt. Para itens use PUT; para status use /status.", 400);
  try {
    const changed = await prisma.venda.updateMany({
      where: { id, updatedAt: dateField(body.updatedAt, "updatedAt") },
      data: { observacoes: optionalText(body.observacoes, "observacoes", 5000) },
    });
    if (changed.count !== 1) return apiError("Venda não encontrada ou alterada. Consulte novamente antes de editar.", 409);
    revalidatePath("/admin");
    return apiSuccess(await prisma.venda.findUnique({ where: { id }, include }));
  } catch (error) { return erpError(error); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme com ?confirm=true.", 400);
  try { await deleteSale(id, "API"); return apiSuccess({ deleted: true }); }
  catch (error) { return erpError(error); }
}
