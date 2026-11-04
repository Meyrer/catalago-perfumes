import { Prisma } from "@prisma/client";
import { apiError, errorMessage, optionalText, positiveId, requiredText } from "@/lib/admin-api";
import { toCents } from "@/lib/money";

export const saleStatuses = ["AGUARDANDO_PAGAMENTO", "PAGO", "PREPARANDO", "ENVIADO", "ENTREGUE", "CANCELADO"];
export const purchaseStatuses = ["PENDENTE", "EM_TRANSITO", "RECEBIDO", "CANCELADO"];
export const orderStatuses = ["SOLICITACAO_RECEBIDA", "AGUARDANDO_PAGAMENTO", "PEDIDO_REALIZADO", "EM_TRANSITO", "RECEBIDO", "PRONTO_ENTREGA", "FINALIZADO", "CANCELADO"];
export const paymentMethods = ["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "LINK_PAGAMENTO"];

export function enumField(value: unknown, field: string, choices: string[], fallback?: string): string {
  const result = value === undefined && fallback !== undefined ? fallback : requiredText(value, field, 80);
  if (!choices.includes(result)) throw new Error(`${field} inválido. Valores aceitos: ${choices.join(", ")}.`);
  return result;
}

export function numberField(value: unknown, field: string, min: number, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) throw new Error(`${field} deve ser um número maior ou igual a ${min}.`);
  return value;
}

export function idField(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error(`${field} deve ser um ID inteiro positivo.`);
  return value;
}

export function dateField(value: unknown, field = "data"): Date {
  const text = requiredText(value, field, 40);
  const date = new Date(text);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text.slice(0, 10)) throw new Error(`${field} deve ser uma data ISO válida em UTC.`);
  return date;
}

export function listQuery(request: Request, statuses?: string[]) {
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("limit deve ser um inteiro entre 1 e 200.");
  const cursor = params.has("cursor") ? positiveId(params.get("cursor")!) : undefined;
  if (cursor === null) throw new Error("cursor inválido.");
  const status = params.has("status") && statuses ? enumField(params.get("status"), "status", statuses) : undefined;
  const month = params.get("month");
  let dateRange: { gte: Date; lt: Date } | undefined;
  if (month !== null) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1000) throw new Error("month deve seguir YYYY-MM.");
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    dateRange = { gte: start, lt: end };
  }
  return { params, limit, status, dateRange, pagination: { orderBy: { id: "asc" as const }, take: limit, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) } };
}

export function queryId(params: URLSearchParams, field: string): number | undefined {
  if (!params.has(field)) return undefined;
  const id = positiveId(params.get(field)!);
  if (!id) throw new Error(`${field} inválido.`);
  return id;
}

export function itemFields(value: unknown, priceField: "precoUnitario" | "valorUnitarioMoeda") {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new Error("Envie de 1 a 200 itens.");
  const seen = new Set<number>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Item inválido.");
    const data = item as Record<string, unknown>;
    const produtoId = idField(data.produtoId, "produtoId");
    const quantidade = numberField(data.quantidade, "quantidade", 1);
    if (!produtoId || seen.has(produtoId)) throw new Error("Produto ausente ou duplicado nos itens.");
    if (!Number.isSafeInteger(quantidade)) throw new Error("quantidade deve ser um inteiro positivo.");
    seen.add(produtoId);
    const price = numberField(data[priceField], priceField, 0);
    if (!Number.isSafeInteger(toCents(price) * quantidade)) throw new Error("O valor do item excede o limite monetário permitido.");
    return { produtoId, quantidade, price };
  });
}

export function saleFields(body: Record<string, unknown>) {
  const itens = itemFields(body.itens, "precoUnitario").map(({ price, ...item }) => ({ ...item, precoUnitario: price }));
  const desconto = numberField(body.desconto, "desconto", 0, 0);
  const subtotalCents = itens.reduce((total, item) => total + toCents(item.precoUnitario) * item.quantidade, 0);
  const frete = numberField(body.frete, "frete", 0, 0);
  if (!Number.isSafeInteger(subtotalCents + toCents(frete)) || toCents(desconto) > subtotalCents) throw new Error("Desconto não pode superar o subtotal; os valores devem estar dentro do limite monetário permitido.");
  return {
    clienteId: idField(body.clienteId, "clienteId"),
    nomeClienteAvulso: optionalText(body.nomeClienteAvulso, "nomeClienteAvulso", 500) ?? undefined,
    contatoClienteAvulso: optionalText(body.contatoClienteAvulso, "contatoClienteAvulso", 200) ?? undefined,
    itens,
    desconto,
    frete,
    formaPagamento: enumField(body.formaPagamento, "formaPagamento", paymentMethods),
    status: enumField(body.status, "status", saleStatuses, "PREPARANDO"),
    observacoes: optionalText(body.observacoes, "observacoes", 5000) ?? undefined,
  };
}

export function erpError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return apiError("Registro não encontrado.", 404);
    if (error.code === "P2003") return apiError("Existe um vínculo inválido ou registros relacionados que impedem a operação.", 409);
    if (["P2002", "P2034"].includes(error.code)) return apiError("Conflito com outra operação. Consulte o registro antes de tentar novamente.", 409);
    return apiError("Não foi possível concluir a operação no banco de dados.", 500);
  }
  return apiError(errorMessage(error), 400);
}
