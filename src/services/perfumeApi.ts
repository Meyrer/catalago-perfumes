import { fragranceSearchService } from './fragrance-search/FragranceSearchService';

export interface PerfumeSearchResult {
  id?: string;
  name: string;
  brand: string;
  family?: string;
  top_notes?: string[];
  middle_notes?: string[];
  base_notes?: string[];
  main_accords?: string[];
  concentration?: string;
  gender?: string;
  release_year?: number;
  description?: string;
  longevity?: string;
  projection?: string;
  image_url?: string;
  external_url?: string;
}

export async function searchPerfume(query: string, brand?: string): Promise<PerfumeSearchResult[]> {
  try {
    const fullQuery = brand ? `${brand} ${query}`.trim() : query.trim();
    if (!fullQuery) return [];

    const searchResponse = await fragranceSearchService.search(fullQuery, 8);

    return searchResponse.results.map((r): PerfumeSearchResult => ({
      id: r.externalId || (r.id ? String(r.id) : undefined),
      name: r.name,
      brand: r.brand || 'Marca Importada',
      family: r.family,
      top_notes: r.topNotes || [],
      middle_notes: r.middleNotes || [],
      base_notes: r.baseNotes || [],
      main_accords: r.accords || [],
      concentration: r.concentration,
      gender: r.gender,
      release_year: r.year,
      image_url: r.imageUrl,
      external_url: r.sourceUrl,
    }));
  } catch (error) {
    console.error('[searchPerfume] Erro ao buscar fragrância:', error);
    return [];
  }
}
