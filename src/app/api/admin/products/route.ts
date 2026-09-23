import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, errorMessage, isAdminApiAuthorized, optionalBoolean, optionalNumber, optionalStringArray, optionalText, readJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const productInclude = { categoria: true, fotos: true } as const;

function validateProduct(body: Record<string, unknown>, partial: boolean) {
  const data: Record<string, unknown> = {};
  const requiredFields = ["nome", "marca", "categoriaId", "precoVista"] as const;
  if (!partial) {
    for (const field of requiredFields) if (body[field] === undefined) throw new Error(`${field} é obrigatório.`);
  }
  if (body.nome !== undefined) data.nome = requiredText(body.nome, "nome");
  if (body.marca !== undefined) data.marca = requiredText(body.marca, "marca");
  if (body.descricao !== undefined) data.descricao = requiredText(body.descricao, "descricao", 10000);
  if (body.categoriaId !== undefined) data.categoriaId = optionalNumber(body.categoriaId, "categoriaId", { integer: true, min: 1 });
  if (body.fornecedorId !== undefined) data.fornecedorId = body.fornecedorId === null ? null : optionalNumber(body.fornecedorId, "fornecedorId", { integer: true, min: 1 });
  for (const key of ["precoVista", "precoOriginal", "precoCusto"] as const) {
    if (body[key] !== undefined) data[key] = body[key] === null && key !== "precoVista" ? null : optionalNumber(body[key], key, { min: 0 });
  }
  for (const key of ["quantidade", "quantidadeReservada", "estoqueMinimo", "anoLancamento"] as const) {
    if (body[key] !== undefined) data[key] = body[key] === null && key === "anoLancamento" ? null : optionalNumber(body[key], key, { integer: true, min: 0 });
  }
  for (const key of ["precoParcelado", "volume", "modoUso", "caracteristicas", "garantia", "badge", "tipoDisponibilidade", "previsaoEntrega", "subcategoria", "sku", "codigoBarras", "familiaOlfativa", "concentracao", "genero", "descricaoFragrancia", "longevidade", "projecao", "externalId", "dataSource", "sourceUrl", "verificationStatus"] as const) {
    if (body[key] !== undefined) data[key] = optionalText(body[key], key, key === "descricaoFragrancia" ? 10000 : 2000);
  }
  for (const key of ["disponivel", "destaque", "novidade"] as const) {
    if (body[key] !== undefined) data[key] = optionalBoolean(body[key], key);
  }
  for (const key of ["notasSaida", "notasCoracao", "notasFundo", "acordesPrincipais"] as const) {
    if (body[key] !== undefined) data[key] = optionalStringArray(body[key], key);
  }
  if (body.fotos !== undefined) {
    if (!Array.isArray(body.fotos) || body.fotos.some((url) => typeof url !== "string" || !/^https?:\/\//i.test(url))) throw new Error("fotos deve ser uma lista de URLs http(s).");
    data.fotos = { create: body.fotos.map((url) => ({ url: (url as string).trim() })) };
  }
  return data;
}

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") || 100);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 100;
  const parsedCursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) : undefined;
  if (parsedCursor !== undefined && (!Number.isSafeInteger(parsedCursor) || parsedCursor < 1)) return apiError("cursor inválido.", 400);
  const rawCategory = searchParams.get("categoriaId");
  const categoryId = rawCategory === null ? undefined : Number(rawCategory);
  if (categoryId !== undefined && (!Number.isSafeInteger(categoryId) || categoryId < 1)) return apiError("categoriaId inválido.", 400);
  const where = categoryId === undefined ? undefined : { categoriaId: categoryId };
  const products = await prisma.produto.findMany({ where, include: productInclude, orderBy: { id: "asc" }, take: limit, ...(parsedCursor ? { skip: 1, cursor: { id: parsedCursor } } : {}) });
  return apiSuccess({ items: products, nextCursor: products.length === limit ? products.at(-1)?.id ?? null : null });
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body) return apiError("Envie um objeto JSON válido.", 400);
  try {
    const data = validateProduct(body, false);
    const category = await prisma.categoria.findUnique({ where: { id: data.categoriaId as number } });
    if (!category) return apiError("Categoria não encontrada.", 400);
    if (data.fornecedorId && !await prisma.fornecedor.findUnique({ where: { id: data.fornecedorId as number } })) return apiError("Fornecedor não encontrado.", 400);
    const initialQuantity = (data.quantidade as number | undefined) ?? 1;
    if (initialQuantity <= 0) data.tipoDisponibilidade = "ENCOMENDA";
    const { fotos, categoriaId, fornecedorId, quantidade, ...productFields } = data;
    const createData = {
      ...productFields,
      descricao: productFields.descricao ?? "",
      categoria: { connect: { id: categoriaId as number } },
      ...(fornecedorId ? { fornecedor: { connect: { id: fornecedorId as number } } } : {}),
      ...(fotos ? { fotos } : {}),
    } as Prisma.ProdutoCreateInput;
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.produto.create({ data: createData, include: productInclude });
      await tx.estoqueMovimentacao.create({ data: { produtoId: created.id, tipo: "ENTRADA", quantidade: initialQuantity, quantidadeAnterior: 0, quantidadeNova: initialQuantity, motivo: "Cadastro via API", usuarioResponsavel: "API" } });
      return created;
    });
    revalidatePath("/"); revalidatePath("/admin");
    return apiSuccess(product, 201);
  } catch (error) { return apiError(errorMessage(error), 400); }
}
