import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess, isAdminApiAuthorized, readJsonObject } from "@/lib/admin-api";
import { dateField, erpError, idField, numberField } from "@/lib/admin-erp-api";
import { roundMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const localDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});

async function initialMiniPurchase(tx: Prisma.TransactionClient, input: unknown) {
  if (!input || typeof input !== "object" || !("data" in input) || !("quantidade" in input) || !("custoUnitario" in input)) {
    throw new Error("Informe data, quantidade e custoUnitario do estoque inicial.");
  }
  const date = dateField(input.data);
  if (typeof input.data !== "string" || input.data !== date.toISOString().slice(0, 10)) {
    throw new Error("A data do estoque inicial deve seguir YYYY-MM-DD.");
  }
  const quantity = numberField(input.quantidade, "quantidade", 1);
  if (!Number.isSafeInteger(quantity)) throw new Error("A quantidade deve ser um inteiro positivo.");
  const unitCost = roundMoney(numberField(input.custoUnitario, "custoUnitario", 0.01));
  const number = `COMP-INICIAL-MINI-${input.data.replaceAll("-", "")}`;
  const existing = await tx.compra.findUnique({ where: { numero: number }, include: { itens: true } });
  if (existing) {
    if (existing.itens.reduce((sum, item) => sum + item.quantidade, 0) !== quantity ||
        existing.itens.some(item => item.custoUnitarioBRL !== unitCost)) {
      throw new Error("O estoque inicial desta data já foi registrado com valores diferentes.");
    }
    return existing.id;
  }

  const products = await tx.produto.findMany({
    where: { marca: "MINI BRAND COLLECTION" },
    select: {
      id: true, createdAt: true, quantidade: true, precoCusto: true,
      movimentacoes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 1, select: { quantidadeAnterior: true } },
    },
  });
  const items = products.filter(product => localDate.format(product.createdAt) === input.data)
    .map(product => ({ ...product, opening: product.movimentacoes[0]?.quantidadeAnterior ?? product.quantidade }))
    .filter(product => product.opening > 0);
  if (items.reduce((sum, product) => sum + product.opening, 0) !== quantity ||
      items.some(product => Number(product.precoCusto) !== unitCost)) {
    throw new Error("O estoque inicial diverge da quantidade ou do custo confirmados.");
  }

  const purchase = await tx.compra.create({
    data: {
      numero: number, data: new Date(`${input.data}T15:00:00.000Z`), status: "RECEBIDO", moeda: "BRL", cotacao: 1,
      custoTotalBRL: roundMoney(unitCost * quantity),
      observacoes: "Compra histórica de Mini Brand Collection. Data de cadastro usada como referência. Saldo inicial reconstruído pelo histórico. Estoque já contabilizado.",
      itens: { create: items.map(product => ({
        produtoId: product.id, quantidade: product.opening, valorUnitarioMoeda: unitCost,
        custoUnitarioBRL: unitCost, custoTotalBRL: roundMoney(unitCost * product.opening),
      })) },
    },
    select: { id: true },
  });
  return purchase.id;
}

export async function GET(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  return apiSuccess(await prisma.despesaFinanceira.findMany({
    where: { tipo: "APORTE" },
    orderBy: [{ data: "desc" }, { id: "desc" }],
  }));
}

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const body = await readJsonObject(request);
  if (!body || Object.keys(body).some(key => !["compraId", "despesaId", "estoqueInicial"].includes(key))) {
    return apiError("Informe compraId, despesaId ou estoqueInicial.", 400);
  }

  try {
    const compraId = idField(body.compraId, "compraId");
    const despesaId = idField(body.despesaId, "despesaId");
    const sources = [compraId, despesaId, body.estoqueInicial].filter(value => value !== undefined);
    if (sources.length !== 1) return apiError("Informe uma única origem para o aporte.", 400);

    const result = await prisma.$transaction(async tx => {
      const sourcePurchaseId = body.estoqueInicial === undefined ? compraId : await initialMiniPurchase(tx, body.estoqueInicial);
      const referencia = sourcePurchaseId ? `Compra #${sourcePurchaseId}` : `Despesa #${despesaId}`;
      const existing = await tx.despesaFinanceira.findFirst({ where: { tipo: "APORTE", observacoes: referencia } });
      if (existing) return { aporte: existing, created: false };

      const source = sourcePurchaseId
        ? await tx.compra.findUniqueOrThrow({ where: { id: sourcePurchaseId } })
        : await tx.despesaFinanceira.findFirstOrThrow({ where: { id: despesaId!, tipo: "DESPESA", pago: true } });
      const isPurchase = "custoTotalBRL" in source;
      const valor = roundMoney(isPurchase ? source.custoTotalBRL : source.valor);
      if (valor <= 0) throw new Error("O lançamento de origem deve ter valor positivo.");
      if (isPurchase) {
        if (source.status !== "RECEBIDO" || source.valorPagoCaixa !== null) {
          throw new Error("O aporte exige uma compra recebida sem pagamento registrado no caixa.");
        }
        await tx.compra.update({
          where: { id: source.id },
          data: { valorPagoCaixa: valor, dataPagamentoCaixa: new Date(`${localDate.format(source.data)}T00:00:00.000Z`) },
        });
      }

      const descricao = isPurchase ? `Aporte dos sócios — ${source.numero}` : `Aporte dos sócios — ${source.descricao}`;
      const aporte = await tx.despesaFinanceira.create({
        data: { tipo: "APORTE", categoria: "CAPITAL_SOCIOS", descricao, valor, pago: true, data: source.data, observacoes: referencia },
      });
      return { aporte, created: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin");
    return apiSuccess(result.aporte, result.created ? 201 : 200);
  } catch (error) {
    return erpError(error);
  }
}
