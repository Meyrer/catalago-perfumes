import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, errorMessage, isAdminApiAuthorized, positiveId, readJsonObject } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);

  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);

  const body = await readJsonObject(request);
  if (!body || !Array.isArray(body.fotos) || body.fotos.length < 1 || body.fotos.length > 10 ||
    body.fotos.some((url) => typeof url !== "string" || !/^https?:\/\//i.test(url.trim()))) {
    return apiError("Envie de 1 a 10 URLs http(s) em fotos.", 400);
  }

  try {
    const fotos = (body.fotos as string[]).map((url) => ({ url: url.trim() }));
    const product = await prisma.produto.update({
      where: { id },
      data: { fotos: { deleteMany: {}, create: fotos } },
      include: { categoria: true, fotos: true },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return apiSuccess(product);
  } catch (error) {
    return apiError(errorMessage(error), 400);
  }
}
