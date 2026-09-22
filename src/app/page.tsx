import prisma from "@/lib/prisma";
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
    const publicProduto = { ...produto } as Omit<typeof produto, 'precoCusto'> & { precoCusto?: number | null };
    delete publicProduto.precoCusto;
    return publicProduto;
  });

  return (
    <CatalogClient 
      initialProdutos={publicProdutos} 
      categorias={categorias} 
      banners={banners} 
    />
  );
}
