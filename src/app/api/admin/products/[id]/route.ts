import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, errorMessage, isAdminApiAuthorized, optionalBoolean, optionalNumber, optionalStringArray, optionalText, positiveId, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const include = { categoria: true, fotos: true } as const;

function validatePatch(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.quantidade !== undefined || body.quantidadeReservada !== undefined) {
    throw new Error("Altere o estoque pelos endpoints /stock/entry, /stock/exit ou /stock/adjustment.");
  }
  if (body.nome !== undefined) data.nome = requiredText(body.nome, "nome");
  if (body.marca !== undefined) data.marca = requiredText(body.marca, "marca");
  for (const key of ["categoriaId", "fornecedorId"] as const) if (body[key] !== undefined) data[key] = body[key] === null && key === "fornecedorId" ? null : optionalNumber(body[key], key, { integer: true, min: 1 });
  for (const key of ["precoVista", "precoOriginal", "precoCusto"] as const) if (body[key] !== undefined) data[key] = body[key] === null && key !== "precoVista" ? null : optionalNumber(body[key], key, { min: 0 });
  for (const key of ["estoqueMinimo", "anoLancamento"] as const) if (body[key] !== undefined) data[key] = body[key] === null && key === "anoLancamento" ? null : optionalNumber(body[key], key, { integer: true, min: 0 });
  for (const key of ["descricao", "precoParcelado", "volume", "modoUso", "caracteristicas", "garantia", "badge", "tipoDisponibilidade", "previsaoEntrega", "subcategoria", "sku", "codigoBarras", "familiaOlfativa", "concentracao", "genero", "descricaoFragrancia", "longevidade", "projecao", "externalId", "dataSource", "sourceUrl", "verificationStatus"] as const) if (body[key] !== undefined) data[key] = optionalText(body[key], key, key === "descricao" || key === "descricaoFragrancia" ? 10000 : 2000);
  for (const key of ["disponivel", "destaque", "novidade"] as const) if (body[key] !== undefined) data[key] = optionalBoolean(body[key], key);
  for (const key of ["notasSaida", "notasCoracao", "notasFundo", "acordesPrincipais"] as const) if (body[key] !== undefined) data[key] = optionalStringArray(body[key], key) as Prisma.InputJsonValue;
  if (body.fotos !== undefined) {
    if (!Array.isArray(body.fotos) || body.fotos.some((url) => typeof url !== "string" || !/^https?:\/\//i.test(url))) throw new Error("fotos deve ser uma lista de URLs http(s).");
    data.fotos = { create: body.fotos.map((url) => ({ url: (url as string).trim() })) };
  }
  return data;
}

export async function GET(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const product = await prisma.produto.findUnique({ where: { id }, include });
  return product ? apiSuccess(product) : apiError("Produto não encontrado.", 404);
}

export async function PUT(request: Request, context: Context) { return update(request, context); }
export async function PATCH(request: Request, context: Context) { return update(request, context); }

async function update(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const data = validatePatch(body);
    if (data.categoriaId && !await prisma.categoria.findUnique({ where: { id: data.categoriaId as number } })) return apiError("Categoria não encontrada.", 400);
    if (data.fornecedorId && !await prisma.fornecedor.findUnique({ where: { id: data.fornecedorId as number } })) return apiError("Fornecedor não encontrado.", 400);
    const { fotos, categoriaId, fornecedorId, ...fields } = data;
    const updateData = {
      ...fields,
      ...(categoriaId !== undefined ? { categoria: { connect: { id: categoriaId as number } } } : {}),
      ...(fornecedorId !== undefined ? fornecedorId === null ? { fornecedor: { disconnect: true } } : { fornecedor: { connect: { id: fornecedorId as number } } } : {}),
      ...(fotos ? { fotos } : {}),
    } as Prisma.ProdutoUpdateInput;
    const product = await prisma.produto.update({ where: { id }, data: updateData, include });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(product);
  } catch (error) { return apiError(errorMessage(error), 400); }
}

export async function DELETE(request: Request, context: Context) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const id = positiveId((await context.params).id);
  if (!id) return apiError("ID inválido.", 400);
  if (new URL(request.url).searchParams.get("confirm") !== "true") return apiError("Confirme a exclusão com ?confirm=true.", 400);
  try {
    const existing = await prisma.produto.findUnique({ where: { id }, select: { _count: { select: { vendasItens: true, comprasItens: true, encomendas: true } } } });
    if (!existing) return apiError("Produto não encontrado.", 404);
    if (existing._count.vendasItens || existing._count.comprasItens || existing._count.encomendas) return apiError("Produto vinculado a vendas, compras ou encomendas não pode ser excluído.", 409);
    await prisma.produto.delete({ where: { id } });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess({ deleted: true });
  } catch { return apiError("Não foi possível excluir o produto.", 400); }
}
