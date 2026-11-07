import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, optionalText, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";
import { dateField, erpError, idField, numberField } from "@/lib/admin-erp-api";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  // Same-origin protection for cookie-authenticated writes, as in the sales route.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
    || request.headers.get("host") || new URL(request.url).host;
  try {
    if (!origin || new URL(origin).host !== host) return apiError("Origem não autorizada.", 403);
  } catch {
    return apiError("Origem não autorizada.", 403);
  }

  const session = await getAdminSession();
  if (!session) return apiError("Sua sessão expirou. Faça login novamente para salvar a encomenda.", 401);
  if (session.mustChangePassword) return apiError("Altere sua senha provisória antes de salvar a encomenda.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return apiError("Envie os dados da encomenda em JSON.", 415);
  }

  const id = positiveId((await context.params).id);
  if (!id) return apiError("Encomenda inválida.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Dados da encomenda inválidos.", 400);

  try {
    const updatedAt = dateField(body.updatedAt, "updatedAt");
    const quantidade = numberField(body.quantidade, "Quantidade", 1);
    if (!Number.isInteger(quantidade) || quantidade > 2_147_483_647) {
      return apiError("Informe uma quantidade inteira válida.", 400);
    }

    const changed = await prisma.encomenda.updateMany({
      where: { id, updatedAt },
      data: {
        clienteId: idField(body.clienteId, "Cliente") ?? null,
        nomeCliente: requiredText(body.nomeCliente, "Nome do cliente"),
        whatsappCliente: optionalText(body.whatsappCliente, "WhatsApp", 100)?.replace(/\D/g, "") || null,
        descricaoItem: requiredText(body.descricaoItem, "Descrição do item", 5000),
        marca: optionalText(body.marca, "Marca", 200) ?? null,
        volume: optionalText(body.volume, "Volume", 100) ?? null,
        quantidade,
        precoEstimado: body.precoEstimado === null ? null : numberField(body.precoEstimado, "Preço estimado", 0),
        custoEstimado: body.custoEstimado === null ? null : numberField(body.custoEstimado, "Custo estimado", 0),
        valorAdiantamento: numberField(body.valorAdiantamento, "Valor do sinal", 0),
        fornecedorId: idField(body.fornecedorId, "Fornecedor") ?? null,
        previsaoChegada: optionalText(body.previsaoChegada, "Previsão de chegada", 500) ?? null,
        observacoes: optionalText(body.observacoes, "Observações", 5000) ?? null,
      },
    });

    if (changed.count !== 1) return apiError("A encomenda foi alterada ou removida. Atualize a página antes de editar novamente.", 409);
    return apiSuccess({ saved: true });
  } catch (error) {
    return erpError(error);
  }
}
