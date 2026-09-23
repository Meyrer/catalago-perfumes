import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, errorMessage, isAdminApiAuthorized, optionalNumber, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const productId = positiveId(String(body.produtoId ?? ""));
    if (!productId) return apiError("produtoId inválido.", 400);
    const quantity = optionalNumber(body.quantidade, "quantidade", { integer: true, min: 1 });
    if (quantity === undefined) return apiError("quantidade é obrigatória.", 400);
    const reason = body.motivo === undefined ? "Entrada via API" : requiredText(body.motivo, "motivo");
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.produto.findUnique({ where: { id: productId } });
      if (!product) throw new Error("Produto não encontrado.");
      const newQuantity = product.quantidade + quantity;
      const changed = await tx.produto.updateMany({ where: { id: productId, quantidade: product.quantidade }, data: { quantidade: newQuantity, ...(product.tipoDisponibilidade === "ENCOMENDA" ? { tipoDisponibilidade: "PRONTA_ENTREGA", previsaoEntrega: "Disponível em estoque • Envio ou retirada imediata" } : {}) } });
      if (changed.count !== 1) throw new Error("Estoque alterado por outra operação. Consulte o saldo e tente novamente.");
      const updated = await tx.produto.findUniqueOrThrow({ where: { id: productId } });
      const movement = await tx.estoqueMovimentacao.create({ data: { produtoId: productId, tipo: "ENTRADA", quantidade: quantity, quantidadeAnterior: product.quantidade, quantidadeNova: newQuantity, motivo: reason, usuarioResponsavel: "API" } });
      return { produto: updated, movimentacao: movement };
    });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(result, 201);
  } catch (error) { return apiError(errorMessage(error), 400); }
}
