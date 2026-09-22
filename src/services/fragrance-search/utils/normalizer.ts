import { FragranceSearchResult } from '../types';

// Mapeamento de marcas e sinônimos oficiais
const BRAND_ALIASES: Record<string, string> = {
  'paco rabanne': 'rabanne',
  'rabanne': 'rabanne',
  'christian dior': 'dior',
  'dior': 'dior',
  'yves saint laurent': 'yves saint laurent',
  'ysl': 'yves saint laurent',
  'dolce & gabbana': 'dolce & gabbana',
  'dolce and gabbana': 'dolce & gabbana',
  'd&g': 'dolce & gabbana',
  'jean paul gaultier': 'jean paul gaultier',
  'jpg': 'jean paul gaultier',
  'carolina herrera': 'carolina herrera',
  'ch': 'carolina herrera',
  "victoria's secret": "victoria's secret",
  'victorias secret': "victoria's secret",
  'lattafa': 'lattafa',
  'lattafa perfumes': 'lattafa',
  'hermès': 'hermès',
  'hermes': 'hermès',
  'tom ford': 'tom ford',
  'versace': 'versace',
  'chanel': 'chanel',
  'giorgio armani': 'giorgio armani',
  'armani': 'giorgio armani',
  'brand collection': 'brand collection',
};

export function normalizeBrand(brand?: string): string {
  if (!brand) return '';
  const clean = brand.trim().toLowerCase().replace(/[\.,]/g, '');
  return BRAND_ALIASES[clean] || clean;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove a marca do início do nome se estiver repetida (ex: "Paco Rabanne Invictus" -> "Invictus")
 */
export function cleanProductName(name: string, brand?: string): string {
  let cleaned = name.trim();
  if (brand) {
    const brandRegex = new RegExp(`^${brand}\\s*[-–—:]?\\s*`, 'i');
    cleaned = cleaned.replace(brandRegex, '');
    const cleanBrand = normalizeBrand(brand);
    if (cleanBrand !== brand.toLowerCase()) {
      const aliasRegex = new RegExp(`^${cleanBrand}\\s*[-–—:]?\\s*`, 'i');
      cleaned = cleaned.replace(aliasRegex, '');
    }
  }
  return cleaned.trim();
}

/**
 * Identifica se dois itens são estritamente o mesmo perfume ou versões/flankers diferentes.
 * REGRA RIGOROSA:
 * - Invictus ≠ Invictus Aqua 2018 ≠ Invictus Aqua 2024
 * - Good Girl ≠ Good Girl Glam
 * - Sauvage EDT ≠ Sauvage EDP ≠ Sauvage Elixir
 */
export function isSameFragranceVersion(a: FragranceSearchResult, b: FragranceSearchResult): boolean {
  const brandA = normalizeBrand(a.brand);
  const brandB = normalizeBrand(b.brand);

  // Marcas diferentes -> produtos diferentes
  if (brandA && brandB && brandA !== brandB) return false;

  const nameA = normalizeText(cleanProductName(a.name, a.brand));
  const nameB = normalizeText(cleanProductName(b.name, b.brand));

  // Nomes diferentes -> produtos diferentes
  if (nameA !== nameB) return false;

  // Anos diferentes informados -> produtos diferentes (ex: Invictus Aqua 2016 vs 2018)
  if (a.year && b.year && a.year !== b.year) return false;

  // Concentrações diferentes explicitamente informadas -> produtos diferentes (EDT vs EDP vs Elixir vs Parfum)
  if (a.concentration && b.concentration) {
    const concA = normalizeText(a.concentration);
    const concB = normalizeText(b.concentration);
    if (concA !== concB) return false;
  }

  return true;
}

/**
 * Deduplica resultados, priorizando produtos locais (já cadastrados no banco)
 * e mantendo versões distintas intactas.
 */
export function deduplicateSearchResults(items: FragranceSearchResult[]): FragranceSearchResult[] {
  const result: FragranceSearchResult[] = [];

  for (const item of items) {
    const existingIndex = result.findIndex(r => isSameFragranceVersion(r, item));

    if (existingIndex === -1) {
      result.push(item);
    } else {
      const existing = result[existingIndex];
      // Se o novo item for local e o existente não for, o local tem prioridade
      if (item.isLocal && !existing.isLocal) {
        result[existingIndex] = item;
      } else if (!existing.isLocal && !item.isLocal) {
        // Enriquecer dados sem sobrescrever com dados vazios
        if (!existing.imageUrl && item.imageUrl) existing.imageUrl = item.imageUrl;
        if (!existing.year && item.year) existing.year = item.year;
        if (!existing.concentration && item.concentration) existing.concentration = item.concentration;
        if (!existing.volume && item.volume) existing.volume = item.volume;
        if ((!existing.topNotes || existing.topNotes.length === 0) && item.topNotes && item.topNotes.length > 0) {
          existing.topNotes = item.topNotes;
          existing.middleNotes = item.middleNotes;
          existing.baseNotes = item.baseNotes;
        }
        if ((!existing.accords || existing.accords.length === 0) && item.accords && item.accords.length > 0) {
          existing.accords = item.accords;
        }
      }
    }
  }

  return result;
}
