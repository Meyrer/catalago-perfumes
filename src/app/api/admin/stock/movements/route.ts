import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, positiveId } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const params = new URL(request.url).searchParams;
  const productId = params.get("produtoId") ? positiveId(params.get("produtoId")!) : undefined;
  if (params.has("produtoId") && !productId) return apiError("produtoId inválido.", 400);
  const rawLimit = Number(params.get("limit") || 100);
  const take = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;
  const items = await prisma.estoqueMovimentacao.findMany({ where: productId ? { produtoId: productId } : undefined, include: { produto: true }, orderBy: { createdAt: "desc" }, take });
  return apiSuccess(items);
}
