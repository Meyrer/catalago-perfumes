import { getAdminSession } from "@/lib/auth";
import { apiError, apiSuccess, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";
import { dateField, erpError, saleFields } from "@/lib/admin-erp-api";
import { updateSale } from "@/lib/erp-operations";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  // Cookie-authenticated mutations must originate from this application.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
    || request.headers.get("host") || new URL(request.url).host;
  try {
    if (!origin || new URL(origin).host !== host) return apiError("Origem não autorizada.", 403);
  } catch {
    return apiError("Origem não autorizada.", 403);
  }
  const session = await getAdminSession();
  if (!session) return apiError("Sua sessão expirou. Faça login novamente para salvar a venda.", 401);
  if (session.mustChangePassword) return apiError("Altere sua senha provisória antes de salvar a venda.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return apiError("Envie os dados da venda em JSON.", 415);
  }
  const id = positiveId((await context.params).id);
  if (!id) return apiError("Venda inválida.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Dados da venda inválidos.", 400);
  try {
    await updateSale(id, {
      ...saleFields(body),
      data: dateField(body.data).toISOString(),
      updatedAt: requiredText(body.updatedAt, "updatedAt", 40),
    }, session.name);
    return apiSuccess({ saved: true });
  } catch (error) {
    return erpError(error);
  }
}
