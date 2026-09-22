import { FragranceSearchResponse, FragranceSearchResult, FragranceProvider } from './types';
import { LocalFragranceProvider } from './providers/LocalFragranceProvider';
import { OpenBeautyFactsProvider } from './providers/OpenBeautyFactsProvider';
import { CuratedFragranceProvider } from './providers/CuratedFragranceProvider';
import { deduplicateSearchResults, normalizeText } from './utils/normalizer';
import globalCache from './cache/InMemoryCache';

export class FragranceSearchService {
  private localProvider: LocalFragranceProvider;
  private externalProviders: FragranceProvider[];

  constructor() {
    this.localProvider = new LocalFragranceProvider();
    this.externalProviders = [
      new CuratedFragranceProvider(),
      new OpenBeautyFactsProvider(),
    ];
  }

  async search(rawQuery: string, maxResults = 8): Promise<FragranceSearchResponse> {
    const query = rawQuery.trim().slice(0, 100); // Proteção contra queries excessivas (max 100 chars)

    if (query.length < 2) {
      return {
        query,
        results: [],
        sources: [],
        cached: false,
        total: 0,
      };
    }

    const cacheKey = `fragrance-search:${normalizeText(query)}`;

    // 1. Verificação no Cache
    const cachedResults = await globalCache.get<FragranceSearchResult[]>(cacheKey);
    if (cachedResults) {
      const sources = Array.from(new Set(cachedResults.map(r => r.source)));
      return {
        query,
        results: cachedResults,
        sources,
        cached: true,
        total: cachedResults.length,
      };
    }

    const sourcesUsed: string[] = [];
    const collected: FragranceSearchResult[] = [];

    // 2. Busca prioritária no Banco Local (PostgreSQL)
    const localResults = await this.localProvider.search(query, maxResults);
    if (localResults.length > 0) {
      sourcesUsed.push('local');
      collected.push(...localResults);
    }

    // 3. Se houver poucos resultados locais (< 4), busca em paralelo nas APIs externas
    if (localResults.length < 4) {
      const externalPromises = this.externalProviders.map(async (provider) => {
        try {
          const res = await provider.search(query, maxResults);
          return { name: provider.name, results: res };
        } catch (err) {
          console.warn(`[FragranceSearchService] Falha no provider ${provider.name}:`, err);
          return { name: provider.name, results: [] };
        }
      });

      const externalResponses = await Promise.all(externalPromises);

      for (const ext of externalResponses) {
        if (ext.results.length > 0) {
          sourcesUsed.push(ext.name);
          collected.push(...ext.results);
        }
      }
    }

    // 4. Normalização & Deduplicação Estrita (respeitando anos, flankers e concentrações)
    const deduplicated = deduplicateSearchResults(collected);
    const finalResults = deduplicated.slice(0, maxResults);

    // 5. Enriquecimento de imagens caso algum item de fonte externa tenha ficado sem foto
    for (const r of finalResults) {
      if (!r.imageUrl) {
        const siblingWithImage = collected.find(c => 
          c.imageUrl && (
            (c.name && r.name && normalizeText(c.name) === normalizeText(r.name)) ||
            (c.name && r.name && normalizeText(c.name).includes(normalizeText(r.name))) ||
            (c.name && r.name && normalizeText(r.name).includes(normalizeText(c.name)))
          )
        );
        if (siblingWithImage?.imageUrl) {
          r.imageUrl = siblingWithImage.imageUrl;
        }
      }
    }

    // 6. Armazenamento em Cache (TTL de 7 dias)
    if (finalResults.length > 0) {
      await globalCache.set(cacheKey, finalResults, 7 * 24 * 60 * 60);
    }

    return {
      query,
      results: finalResults,
      sources: Array.from(new Set(sourcesUsed)),
      cached: false,
      total: finalResults.length,
    };
  }

  async clearCache(): Promise<void> {
    await globalCache.clear();
  }
}

// Singleton do serviço
export const fragranceSearchService = new FragranceSearchService();

