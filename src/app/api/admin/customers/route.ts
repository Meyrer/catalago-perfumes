import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") || 100);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 100;
  return apiSuccess(await prisma.cliente.findMany({ orderBy: { nome: "asc" }, take: limit }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const customer = await prisma.cliente.create({ data: { nome: requiredText(body.nome, "nome"), whatsapp: optionalText(body.whatsapp, "whatsapp"), instagram: optionalText(body.instagram, "instagram"), email: optionalText(body.email, "email", 320), cidade: optionalText(body.cidade, "cidade"), dataNascimento: optionalText(body.dataNascimento, "dataNascimento"), observacoes: optionalText(body.observacoes, "observacoes", 5000) } });
    revalidatePath("/admin");
    return apiSuccess(customer, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível criar o cliente.", 400); }
}
