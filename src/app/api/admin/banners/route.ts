import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  return apiSuccess(await prisma.banner.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const imagemUrl = requiredText(body.imagemUrl, "imagemUrl", 2000);
    if (!/^https?:\/\//i.test(imagemUrl) && !imagemUrl.startsWith("/uploads/")) return apiError("imagemUrl precisa ser URL http(s) ou caminho /uploads/.", 400);
    const banner = await prisma.banner.create({ data: { imagemUrl, titulo: optionalText(body.titulo, "titulo"), subtitulo: optionalText(body.subtitulo, "subtitulo"), link: optionalText(body.link, "link", 2000) } });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(banner, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível criar o banner.", 400); }
}
