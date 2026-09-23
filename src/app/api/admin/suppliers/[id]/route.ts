import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) { return update(request, context); }
export async function PATCH(request: Request, context: Context) { return update(request, context); }

async function update(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const data: { nome?: string; contato?: string | null; cidadePais?: string | null; observacoes?: string | null } = {};
    if (body.nome !== undefined) data.nome = requiredText(body.nome, "nome");
    for (const field of ["contato", "cidadePais", "observacoes"] as const) if (body[field] !== undefined) data[field] = optionalText(body[field], field, field === "observacoes" ? 5000 : 2000);
    const supplier = await prisma.fornecedor.update({ where: { id }, data });
    revalidatePath("/admin");
    return apiSuccess(supplier);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível atualizar o fornecedor.", 400); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme a exclusão com ?confirm=true.", 400);
  try {
    const supplier = await prisma.fornecedor.findUnique({ where: { id }, select: { _count: { select: { compras: true, encomendas: true } } } });
    if (!supplier) return apiError("Fornecedor não encontrado.", 404);
    if (supplier._count.compras || supplier._count.encomendas) return apiError("Fornecedor vinculado a compras ou encomendas não pode ser excluído.", 409);
    await prisma.fornecedor.delete({ where: { id } });
    revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível excluir o fornecedor.", 400); }
}
