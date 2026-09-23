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
    const data: { nome?: string; imagemUrl?: string | null } = {};
    if (body.nome !== undefined) data.nome = requiredText(body.nome, "nome");
    if (body.imagemUrl !== undefined) data.imagemUrl = optionalText(body.imagemUrl, "imagemUrl", 2000);
    const category = await prisma.categoria.update({ where: { id }, data });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(category);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível atualizar a categoria.", 400); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const params = new URL(request.url).searchParams;
  if (params.get("confirm") !== "true") return apiError("Confirme a exclusão com ?confirm=true.", 400);
  const productCount = await prisma.produto.count({ where: { categoriaId: id } });
  let targetId: number | undefined;
  if (productCount > 0) {
    const targetParam = params.get("targetCategoriaId");
    targetId = targetParam ? positiveId(targetParam) ?? undefined : undefined;
    if (targetId === id) return apiError("A categoria de destino deve ser diferente da categoria excluída.", 400);
    if (!targetId) targetId = (await prisma.categoria.findFirst({ where: { id: { not: id } }, orderBy: { id: "asc" } }))?.id;
    if (!targetId) return apiError("Não é possível excluir a única categoria enquanto ela tiver produtos.", 409);
    if (!await prisma.categoria.findUnique({ where: { id: targetId } })) return apiError("Categoria de destino não encontrada.", 400);
  }
  try {
    await prisma.$transaction(async (tx) => {
      if (targetId) await tx.produto.updateMany({ where: { categoriaId: id }, data: { categoriaId: targetId } });
      await tx.categoria.delete({ where: { id } });
    });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess({ deleted: true, productsMoved: productCount, targetCategoriaId: targetId ?? null });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível excluir a categoria.", 404); }
}
