import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, positiveId, readJsonObject } from "@/lib/admin-api";
import { dateField, enumField, erpError, idField, numberField, purchaseStatuses } from "@/lib/admin-erp-api";
import { updatePurchaseCashPayment } from "@/lib/erp-operations";
import { roundMoney, toCents } from "@/lib/money";

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
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    if ("moeda" in body || "cotacao" in body) {
      if (Object.keys(body).some(key => !["moeda", "cotacao", "updatedAt"].includes(key))) return apiError("Edite a moeda e a cotação separadamente.", 400);
      const moeda = enumField(body.moeda, "moeda", ["BRL", "USD", "EUR"]);
      const cotacao = numberField(body.cotacao, "cotacao", Number.MIN_VALUE);
      if (moeda === "BRL" && cotacao !== 1) return apiError("Compras em BRL devem usar cotacao=1.", 400);
      const updatedAt = dateField(body.updatedAt, "updatedAt");
      const result = await prisma.$transaction(async tx => {
        const compra = await tx.compra.findUnique({ where: { id }, include: { itens: true } });
        if (!compra) return { ok: false, error: "Compra não encontrada.", status: 404 } as const;
        if (compra.updatedAt.getTime() !== updatedAt.getTime()) return { ok: false, error: "A compra foi alterada. Consulte novamente antes de editar.", status: 409 } as const;

        const itens = compra.itens.map(item => ({
          ...item,
          novoValor: roundMoney(item.valorUnitarioMoeda * compra.cotacao / cotacao),
        }));
        const subtotalAnterior = itens.reduce((sum, item) => sum + toCents(item.valorUnitarioMoeda) * item.quantidade, 0);
        const novoSubtotal = itens.reduce((sum, item) => sum + toCents(item.novoValor) * item.quantidade, 0);
        if (itens.some(item => toCents(item.novoValor * cotacao) !== toCents(item.valorUnitarioMoeda * compra.cotacao)) ||
            toCents(novoSubtotal * cotacao / 100) !== toCents(subtotalAnterior * compra.cotacao / 100)) {
          return { ok: false, error: "A conversão deve preservar os valores dos itens e o subtotal em reais.", status: 409 } as const;
        }
        const changed = await tx.compra.updateMany({ where: { id, updatedAt }, data: { moeda, cotacao } });
        if (changed.count !== 1) return { ok: false, error: "A compra foi alterada. Consulte novamente antes de editar.", status: 409 } as const;
        for (const item of itens) {
          await tx.compraItem.update({ where: { id: item.id }, data: { valorUnitarioMoeda: item.novoValor } });
        }
        return { ok: true, data: await tx.compra.findUniqueOrThrow({ where: { id }, include }) } as const;
      });
      if (!result.ok) return apiError(result.error, result.status);
      revalidatePath("/admin");
      return apiSuccess(result.data);
    }
    if ("pagamentoCaixa" in body) {
      if (Object.keys(body).some(key => !["pagamentoCaixa", "updatedAt"].includes(key))) return apiError("Edite o pagamento do caixa separadamente.", 400);
      await updatePurchaseCashPayment(id, body.pagamentoCaixa, body.updatedAt === undefined ? undefined : dateField(body.updatedAt, "updatedAt"));
      return apiSuccess(await prisma.compra.findUnique({ where: { id }, include }));
    }
    const editableFields = ["observacoes", "data", "status", "fornecedorId"];
    if (!Object.keys(body).some(key => editableFields.includes(key)) || Object.keys(body).some(key => key !== "updatedAt" && !editableFields.includes(key))) return apiError("PATCH aceita observacoes, data, status, fornecedorId e updatedAt. Custos e itens não são editáveis por este endpoint.", 400);
    const current = await prisma.compra.findUnique({ where: { id } });
    if (!current) return apiError("Compra não encontrada.", 404);
    const status = body.status === undefined ? undefined : enumField(body.status, "status", purchaseStatuses);
    if (status === "RECEBIDO" || (current.status === "RECEBIDO" && status !== undefined && status !== current.status)) return apiError("Use /receive para receber a compra. Uma compra recebida não pode ser cancelada ou voltar de status sem estornar o estoque.", 409);
    const fornecedorId = body.fornecedorId === null ? null : idField(body.fornecedorId, "fornecedorId");
    if (typeof fornecedorId === "number" && (fornecedorId > 2147483647 || !await prisma.fornecedor.findUnique({ where: { id: fornecedorId }, select: { id: true } }))) {
      return apiError("Fornecedor não encontrado.", 404);
    }
    const changed = await prisma.compra.updateMany({
      where: { id, updatedAt: body.updatedAt === undefined ? current.updatedAt : dateField(body.updatedAt, "updatedAt") },
      data: { status, fornecedorId, observacoes: optionalText(body.observacoes, "observacoes", 5000), data: body.data === undefined ? undefined : dateField(body.data) },
    });
    if (changed.count !== 1) return apiError("A compra foi alterada. Consulte novamente antes de editar.", 409);
    revalidatePath("/admin");
    if (status !== undefined) revalidatePath("/");
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
    const deleted = await prisma.compra.deleteMany({ where: { id, status: { not: "RECEBIDO" }, valorPagoCaixa: null } });
    if (deleted.count !== 1) return apiError("Compra não encontrada, já recebida ou com pagamento registrado no caixa.", 409);
    revalidatePath("/admin");
    revalidatePath("/");
    return apiSuccess({ deleted: true });
  } catch (error) { return erpError(error); }
}
