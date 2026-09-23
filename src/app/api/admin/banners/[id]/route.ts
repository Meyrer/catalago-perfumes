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
    const data: { imagemUrl?: string; titulo?: string | null; subtitulo?: string | null; link?: string | null } = {};
    if (body.imagemUrl !== undefined) {
      const url = requiredText(body.imagemUrl, "imagemUrl", 2000);
      if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) return apiError("imagemUrl precisa ser URL http(s) ou caminho /uploads/.", 400);
      data.imagemUrl = url;
    }
    for (const field of ["titulo", "subtitulo", "link"] as const) if (body[field] !== undefined) data[field] = optionalText(body[field], field, 2000);
    const banner = await prisma.banner.update({ where: { id }, data });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(banner);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível atualizar o banner.", 400); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme a exclusão com ?confirm=true.", 400);
  try {
    await prisma.banner.delete({ where: { id } });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível excluir o banner.", 404); }
}
