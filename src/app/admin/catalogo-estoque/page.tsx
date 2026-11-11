import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import prisma from '@/lib/prisma';
import { normalizeProductGender } from '@/lib/product-gender';
import { sortBrandCollectionProducts } from '@/lib/product-order';
import PrintButton from './PrintButton';
import styles from './catalogo.module.css';

export const metadata = { title: 'Perfumio | Catálogo de pronta entrega' };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });
const groups = [
  { gender: 'Feminino', title: 'Femininos' },
  { gender: 'Masculino', title: 'Masculinos' },
  { gender: 'Unissex', title: 'Unissex' },
  { gender: null, title: 'Gênero não informado' },
];

export default async function StockCatalogPage() {
  const session = await getAdminSession();
  if (!session || session.mustChangePassword) redirect('/admin');

  const stock = await prisma.produto.findMany({
    where: {
      disponivel: true,
      tipoDisponibilidade: 'PRONTA_ENTREGA',
      quantidade: { gt: prisma.produto.fields.quantidadeReservada },
    },
    select: {
      id: true, nome: true, marca: true, sku: true, genero: true, volume: true,
      quantidade: true, quantidadeReservada: true, precoVista: true,
      fotos: { orderBy: { id: 'asc' }, take: 1, select: { url: true } },
    },
  });
  const products = sortBrandCollectionProducts(stock.sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }),
  ));

  return (
    <main className={styles.catalog} id="catalogo-estoque">
      <div className={styles.toolbar}>
        <Link href="/admin" className={styles.back}>Voltar ao painel</Link>
        <PrintButton disabled={!products.length} />
      </div>

      <header className={styles.header}>
        <p className={styles.brand}>Perfumio</p>
        <h1>Catálogo de pronta entrega</h1>
        <p className={styles.muted}>Disponibilidade em {date.format(new Date())}</p>
      </header>

      {!products.length && <p>Nenhum produto disponível para pronta entrega.</p>}
      {groups.map(({ gender, title }) => {
        const items = products.filter(product => normalizeProductGender(product.genero) === gender);
        if (!items.length) return null;

        return (
          <section className={styles.group} key={title}>
            <h2>{title}</h2>
            <div className={styles.grid}>
              {items.map(product => {
                const photo = normalizeImageUrl(product.fotos[0]?.url);
                const available = product.quantidade - product.quantidadeReservada;
                const price = Number(product.precoVista);

                return (
                  <article key={product.id} className={styles.card}>
                    <div className={styles.photo}>
                      {photo ? (
                        // The catalog also uses supplier images outside the Next.js image allowlist.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={product.nome} loading="eager" />
                      ) : <span className={styles.muted}>Foto indisponível</span>}
                    </div>
                    <h3>{product.nome}</h3>
                    {product.volume && <p className={styles.muted}>{product.volume}</p>}
                    <p className={styles.price}>{price > 0 ? money.format(price) : 'Preço sob consulta'}</p>
                    <p className={styles.muted}>{available} {available === 1 ? 'unidade disponível' : 'unidades disponíveis'}</p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
