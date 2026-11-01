import prisma from "@/lib/prisma";
import { plainPrismaData } from "@/lib/admin-api";
import { normalizeImageUrl } from "@/lib/image-url";
import CatalogClient from "./CatalogClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [produtos, categorias, banners] = await Promise.all([
    prisma.produto.findMany({
      where: { disponivel: true },
      include: { categoria: true, fotos: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.categoria.findMany({
      orderBy: { nome: 'asc' }
    }),
    prisma.banner.findMany({
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const publicProdutos = produtos.map(produto => {
    const { precoCusto: _precoCusto, ...publicProduto } = produto;
    return plainPrismaData({
      ...publicProduto,
      fotos: publicProduto.fotos.map(foto => ({
        ...foto,
        url: normalizeImageUrl(foto.url),
      })),
      precoVista: Number(produto.precoVista),
      precoOriginal: produto.precoOriginal === null ? null : Number(produto.precoOriginal),
    });
  });

  const normalizedCategorias = categorias.map(categoria => ({
    ...categoria,
    imagemUrl: categoria.imagemUrl ? normalizeImageUrl(categoria.imagemUrl) : categoria.imagemUrl,
  }));

  const normalizedBanners = banners.map(banner => ({
    ...banner,
    imagemUrl: normalizeImageUrl(banner.imagemUrl),
  }));

  return (
    <CatalogClient 
      initialProdutos={publicProdutos as unknown as Parameters<typeof CatalogClient>[0]["initialProdutos"]}
      categorias={normalizedCategorias} 
      banners={normalizedBanners} 
    />
  );
}
