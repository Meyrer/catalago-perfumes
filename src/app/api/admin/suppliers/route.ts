import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  return apiSuccess(await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const supplier = await prisma.fornecedor.create({ data: { nome: requiredText(body.nome, "nome"), contato: optionalText(body.contato, "contato"), cidadePais: optionalText(body.cidadePais, "cidadePais"), observacoes: optionalText(body.observacoes, "observacoes", 5000) } });
    revalidatePath("/admin");
    return apiSuccess(supplier, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Não foi possível criar o fornecedor.", 400); }
}
