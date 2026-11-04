import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalBoolean, optionalText, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";
import { dateField, enumField, erpError, numberField } from "@/lib/admin-erp-api";
import { roundMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  try {
    const expense = await prisma.despesaFinanceira.findFirst({ where: { id, tipo: "DESPESA" } });
    return expense ? apiSuccess(expense) : apiError("Despesa não encontrada.", 404);
  } catch (error) { return erpError(error); }
}

export async function PATCH(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  const fields = ["descricao", "categoria", "valor", "data", "pago", "formaPagamento", "observacoes"];
  if (!body || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) return apiError(`Envie um ou mais campos: ${fields.join(", ")}.`, 400);
  try {
    const changed = await prisma.despesaFinanceira.updateMany({
      where: { id, tipo: "DESPESA" },
      data: {
        descricao: body.descricao === undefined ? undefined : requiredText(body.descricao, "descricao"),
        categoria: body.categoria === undefined ? undefined : enumField(body.categoria, "categoria", ["EMBALAGENS", "FRETE", "MARKETING", "IMPOSTOS", "ESTRUTURA", "OUTROS"]),
        valor: body.valor === undefined ? undefined : roundMoney(numberField(body.valor, "valor", 0.01)),
        data: body.data === undefined ? undefined : dateField(body.data),
        pago: optionalBoolean(body.pago, "pago"),
        formaPagamento: optionalText(body.formaPagamento, "formaPagamento", 100),
        observacoes: optionalText(body.observacoes, "observacoes", 5000),
      },
    });
    if (changed.count !== 1) return apiError("Despesa não encontrada.", 404);
    revalidatePath("/admin");
    return apiSuccess(await prisma.despesaFinanceira.findUnique({ where: { id } }));
  } catch (error) { return erpError(error); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme com ?confirm=true.", 400);
  try {
    const deleted = await prisma.despesaFinanceira.deleteMany({ where: { id, tipo: "DESPESA" } });
    if (deleted.count !== 1) return apiError("Despesa não encontrada.", 404);
    revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return erpError(error); }
}
