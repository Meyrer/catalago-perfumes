import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";
import { createCustomOrder } from "@/lib/erp-operations";
import { erpError, idField, listQuery, numberField, orderStatuses, queryId } from "@/lib/admin-erp-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  try {
    const { params, status, dateRange, pagination, limit } = listQuery(request, orderStatuses);
    const items = await prisma.encomenda.findMany({
      where: { status, clienteId: queryId(params, "clienteId"), fornecedorId: queryId(params, "fornecedorId"), produtoId: queryId(params, "produtoId"), createdAt: dateRange },
      include: { cliente: true, fornecedor: true, produto: true },
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
    const quantidade = numberField(body.quantidade, "quantidade", 1, 1);
    if (!Number.isSafeInteger(quantidade)) throw new Error("quantidade deve ser um inteiro positivo.");
    return apiSuccess(await createCustomOrder({
      nomeCliente: requiredText(body.nomeCliente, "nomeCliente"), descricaoItem: requiredText(body.descricaoItem, "descricaoItem", 5000), quantidade,
      clienteId: idField(body.clienteId, "clienteId"), fornecedorId: idField(body.fornecedorId, "fornecedorId"), produtoId: idField(body.produtoId, "produtoId"),
      whatsappCliente: optionalText(body.whatsappCliente, "whatsappCliente", 100) ?? undefined,
      marca: optionalText(body.marca, "marca", 200) ?? undefined,
      volume: optionalText(body.volume, "volume", 100) ?? undefined,
      previsaoChegada: optionalText(body.previsaoChegada, "previsaoChegada", 500) ?? undefined,
      observacoes: optionalText(body.observacoes, "observacoes", 5000) ?? undefined,
      precoEstimado: body.precoEstimado == null ? undefined : numberField(body.precoEstimado, "precoEstimado", 0),
      custoEstimado: body.custoEstimado == null ? undefined : numberField(body.custoEstimado, "custoEstimado", 0),
      valorAdiantamento: numberField(body.valorAdiantamento, "valorAdiantamento", 0, 0),
    }), 201);
  } catch (error) { return erpError(error); }
}
