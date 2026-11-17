import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeImageUrl } from "@/lib/image-url";
import CatalogClient from "./CatalogClient";

const getCatalog = unstable_cache(async () => {
  const [produtos, categorias, reposicoes] = await Promise.all([
    prisma.produto.findMany({
      where: { disponivel: true },
      select: {
        id: true, nome: true, marca: true, sku: true, descricao: true,
        precoVista: true, precoOriginal: true, precoParcelado: true,
        quantidade: true, volume: true, modoUso: true, caracteristicas: true, badge: true,
        tipoDisponibilidade: true, previsaoEntrega: true, destaque: true,
        categoriaId: true, categoria: { select: { id: true, nome: true } },
        fotos: { select: { id: true, url: true } },
        familiaOlfativa: true, acordesPrincipais: true, notasSaida: true, notasCoracao: true,
        notasFundo: true, concentracao: true, genero: true, anoLancamento: true,
        descricaoFragrancia: true, dataSource: true, sourceUrl: true, longevidade: true,
        projecao: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.categoria.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' }
    }),
    prisma.compraItem.groupBy({
      by: ['produtoId'],
      where: { compra: { status: 'EM_TRANSITO' }, produto: { disponivel: true, quantidade: { lte: 0 } } },
    }),
  ]);

  const reposicoesEmTransito = new Set(reposicoes.map(item => item.produtoId));
  const publicProdutos = produtos.map(produto => ({
    ...produto,
    createdAt: produto.createdAt.toISOString(),
    emTransito: produto.quantidade <= 0 && reposicoesEmTransito.has(produto.id),
    fotos: produto.fotos.map(foto => ({ ...foto, url: normalizeImageUrl(foto.url) })),
    precoVista: Number(produto.precoVista),
    precoOriginal: produto.precoOriginal === null ? null : Number(produto.precoOriginal),
  }));

  return { initialProdutos: publicProdutos, categorias };
}, ["public-catalog"], { revalidate: 30 });

export default async function Home() {
  await connection();
  return <CatalogClient {...await getCatalog()} />;
}
