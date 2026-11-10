import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject } from "@/lib/admin-api";
import { createPurchase } from "@/lib/erp-operations";
import { enumField, erpError, idField, itemFields, listQuery, numberField, purchaseStatuses, queryId } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  try {
    const { params, status, dateRange, pagination, limit } = listQuery(request, purchaseStatuses);
    const items = await prisma.compra.findMany({
      where: { status, fornecedorId: queryId(params, "fornecedorId"), data: dateRange },
      include: { fornecedor: true, itens: { include: { produto: true } } },
      ...pagination,
    });
    return apiSuccess({ items, nextCursor: items.length === limit ? items.at(-1)!.id : null });
  } catch (error) { return erpError(error); }
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const moeda = enumField(body.moeda, "moeda", ["BRL", "USD", "EUR"], "BRL") as "BRL" | "USD" | "EUR";
    const cotacao = numberField(body.cotacao, "cotacao", Number.MIN_VALUE, moeda === "BRL" ? 1 : undefined);
    if (moeda === "BRL" && cotacao !== 1) throw new Error("Compras em BRL devem usar cotacao=1.");
    const data = {
      fornecedorId: idField(body.fornecedorId, "fornecedorId"), moeda, cotacao,
      frete: numberField(body.frete, "frete", 0, 0), taxas: numberField(body.taxas, "taxas", 0, 0),
      outrosCustos: numberField(body.outrosCustos, "outrosCustos", 0, 0),
      status: enumField(body.status, "status", purchaseStatuses, "PENDENTE"),
      pagamentoCaixa: body.pagamentoCaixa,
      observacoes: optionalText(body.observacoes, "observacoes", 5000) ?? undefined,
      itens: itemFields(body.itens, "valorUnitarioMoeda").map(({ price, ...item }) => ({ ...item, valorUnitarioMoeda: price })),
    };
    return apiSuccess(await createPurchase(data, "API"), 201);
  } catch (error) { return erpError(error); }
}
