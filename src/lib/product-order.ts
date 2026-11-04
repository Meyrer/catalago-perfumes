type NumberedProduct = { nome: string; marca: string; sku?: string | null };

function getBrandCollectionNumber(product: NumberedProduct): number | null {
  if (product.marca.trim().toUpperCase() !== 'BRAND COLLECTION') return null;
  const code = product.sku?.match(/^BRAND-(\d+)$/i)?.[1]
    ?? product.nome.match(/\bBrand\s+Collection\s*(?:N[º°o.]?\s*)?(\d+)\b/i)?.[1];
  if (code === undefined) return null;
  const number = Number(code);
  return Number.isSafeInteger(number) ? number : null;
}

export function sortBrandCollectionProducts<T extends NumberedProduct>(products: T[], direction: 'asc' | 'desc' = 'asc'): T[] {
  const numbered = products.flatMap(product => {
    const number = getBrandCollectionNumber(product);
    return number === null ? [] : [{ product, number }];
  }).sort((a, b) => direction === 'asc' ? a.number - b.number : b.number - a.number);
  let index = 0;
  // Preserve the positions and relative order of other product lines.
  return products.map(product => getBrandCollectionNumber(product) === null
    ? product : numbered[index++].product);
}
