import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  return apiSuccess(await prisma.categoria.findMany({ orderBy: { nome: "asc" } }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const nome = requiredText(body.nome, "nome");
    const imagemUrl = optionalText(body.imagemUrl, "imagemUrl", 2000);
    const category = await prisma.categoria.create({ data: { nome, imagemUrl } });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(category, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível criar a categoria.", 400); }
}
