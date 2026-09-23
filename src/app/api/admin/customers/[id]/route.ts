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
    const data: { nome?: string; whatsapp?: string | null; instagram?: string | null; email?: string | null; cidade?: string | null; dataNascimento?: string | null; observacoes?: string | null } = {};
    if (body.nome !== undefined) data.nome = requiredText(body.nome, "nome");
    for (const field of ["whatsapp", "instagram", "email", "cidade", "dataNascimento", "observacoes"] as const) if (body[field] !== undefined) data[field] = optionalText(body[field], field, field === "email" ? 320 : field === "observacoes" ? 5000 : 2000);
    const customer = await prisma.cliente.update({ where: { id }, data });
    revalidatePath("/admin");
    return apiSuccess(customer);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível atualizar o cliente.", 400); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme a exclusão com ?confirm=true.", 400);
  try {
    const customer = await prisma.cliente.findUnique({ where: { id }, select: { _count: { select: { vendas: true, encomendas: true } } } });
    if (!customer) return apiError("Cliente não encontrado.", 404);
    if (customer._count.vendas || customer._count.encomendas) return apiError("Cliente vinculado a vendas ou encomendas não pode ser excluído.", 409);
    await prisma.cliente.delete({ where: { id } });
    revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível excluir o cliente.", 400); }
}
