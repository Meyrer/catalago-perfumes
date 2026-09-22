import { FragranceProvider, FragranceSearchResult } from '../types';

interface OBFProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  product_name_en?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  image_small_url?: string;
  quantity?: string;
  categories?: string;
  categories_tags?: string[];
}

interface OBFResponse {
  count?: number;
  products?: OBFProduct[];
}

export class OpenBeautyFactsProvider implements FragranceProvider {
  readonly name = 'openbeautyfacts';

  async search(query: string, limit = 8): Promise<FragranceSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 3) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    try {
      const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=${limit}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EleganceCatalog/1.0 (fragrance-search-integration)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`[OpenBeautyFactsProvider] Resposta não OK: ${res.status}`);
        return [];
      }

      const data: OBFResponse = await res.json();
      if (!data.products || !Array.isArray(data.products)) return [];

      const results: FragranceSearchResult[] = [];

      for (const item of data.products) {
        const name = item.product_name_pt || item.product_name || item.product_name_en;
        if (!name || name.trim().length === 0) continue;

        // Extrai concentração se estiver descrita no nome ou nas categorias
        let concentration: string | undefined = undefined;
        const lowerContext = `${name} ${item.categories || ''}`.toLowerCase();
        if (lowerContext.includes('eau de parfum') || lowerContext.includes(' edp')) {
          concentration = 'Eau de Parfum';
        } else if (lowerContext.includes('eau de toilette') || lowerContext.includes(' edt')) {
          concentration = 'Eau de Toilette';
        } else if (lowerContext.includes('parfum') || lowerContext.includes('extrait')) {
          concentration = 'Parfum';
        } else if (lowerContext.includes('body splash') || lowerContext.includes('body mist')) {
          concentration = 'Body Splash';
        } else if (lowerContext.includes('eau de cologne') || lowerContext.includes(' edc')) {
          concentration = 'Eau de Cologne';
        }

        // Extrai ano do nome se especificado (ex: "Invictus Aqua 2018")
        let year: number | undefined = undefined;
        const yearMatch = name.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) {
          const parsedYear = parseInt(yearMatch[1], 10);
          if (parsedYear >= 1900 && parsedYear <= 2030) {
            year = parsedYear;
          }
        }

        const brand = item.brands ? item.brands.split(',')[0].trim() : undefined;
        const imageUrl = item.image_url || item.image_front_url || item.image_small_url;

        results.push({
          externalId: item.code,
          name: name.trim(),
          brand: brand,
          concentration,
          year,
          volume: item.quantity?.trim() || undefined,
          imageUrl: imageUrl || undefined,
          // REGRA PRINCIPAL: Jamais inventar notas ou acordes que a API não fornece
          topNotes: [],
          middleNotes: [],
          baseNotes: [],
          accords: [],
          source: 'openbeautyfacts',
          sourceUrl: item.code ? `https://world.openbeautyfacts.org/product/${item.code}` : undefined,
          isLocal: false,
          verificationStatus: 'unverified',
        });
      }

      return results;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[OpenBeautyFactsProvider] Requisição expirou por timeout (4s)');
      } else {
        console.error('[OpenBeautyFactsProvider] Erro ao consultar API:', error);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
