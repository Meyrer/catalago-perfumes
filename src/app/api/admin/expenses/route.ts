import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, errorMessage, isAdminApiAuthorized, optionalBoolean, optionalNumber, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";
import { roundMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const categories = ["EMBALAGENS", "FRETE", "MARKETING", "IMPOSTOS", "ESTRUTURA", "OUTROS"];

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return apiError("limit deve ser um inteiro entre 1 e 200.", 400);
  return apiSuccess(await prisma.despesaFinanceira.findMany({
    where: { tipo: "DESPESA" },
    orderBy: { id: "desc" },
    take: limit,
  }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const descricao = requiredText(body.descricao, "descricao");
    const categoria = body.categoria === undefined ? "OUTROS" : requiredText(body.categoria, "categoria");
    if (!categories.includes(categoria)) throw new Error("categoria inválida.");
    if (typeof body.valor !== "number") throw new Error("valor deve ser um número maior que zero.");
    optionalNumber(body.valor, "valor", { min: 0.01 });
    let data: Date | undefined;
    if (body.data !== undefined) {
      const dateText = requiredText(body.data, "data", 40);
      data = new Date(dateText);
      if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(dateText) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dateText.slice(0, 10)) {
        throw new Error("data deve ser uma data ISO válida em UTC.");
      }
    }
    const expense = await prisma.despesaFinanceira.create({
      data: {
        descricao,
        categoria,
        valor: roundMoney(body.valor),
        data,
        tipo: "DESPESA",
        pago: optionalBoolean(body.pago, "pago") ?? true,
        formaPagamento: optionalText(body.formaPagamento, "formaPagamento", 100),
        observacoes: optionalText(body.observacoes, "observacoes", 5000),
      },
    });
    revalidatePath("/admin");
    return apiSuccess(expense, 201);
  } catch (error) {
    return apiError(errorMessage(error), 400);
  }
}
