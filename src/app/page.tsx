import prisma from "@/lib/prisma";
import { plainPrismaData } from "@/lib/admin-api";
import CatalogClient from "./CatalogClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [produtos, categorias, banners] = await Promise.all([prisma.produto.findMany({
    where: { disponivel: true },
    include: { categoria: true, fotos: true },
    orderBy: { createdAt: 'desc' }
  }), prisma.categoria.findMany({
    orderBy: { nome: 'asc' }
  }), prisma.banner.findMany({
    orderBy: { createdAt: 'desc' }
  })]);
  const publicProdutos = produtos.map(produto => {
    const { precoCusto: _precoCusto, ...publicProduto } = produto;
    return plainPrismaData({
      ...publicProduto,
      precoVista: Number(produto.precoVista),
      precoOriginal: produto.precoOriginal === null ? null : Number(produto.precoOriginal),
    });
  });

  return (
    <CatalogClient 
      initialProdutos={publicProdutos as unknown as Parameters<typeof CatalogClient>[0]["initialProdutos"]}
      categorias={categorias} 
      banners={banners} 
    />
  );
}
