export interface FragranceSearchResult {
  id?: number;
  externalId?: string;
  name: string;
  brand?: string;
  concentration?: string;
  year?: number;
  volume?: string;
  gender?: string;
  family?: string;

  imageUrl?: string;

  topNotes?: string[];
  middleNotes?: string[];
  baseNotes?: string[];

  accords?: string[];

  source: 'local' | 'openbeautyfacts' | 'manual';
  sourceUrl?: string;

  isLocal: boolean;
  verificationStatus: 'unverified' | 'reviewed' | 'verified';

  // Informações comerciais quando for local
  price?: number;
  priceFormatted?: string;
  available?: boolean;
}

export interface FragranceProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<FragranceSearchResult[]>;
}

export interface FragranceSearchResponse {
  query: string;
  results: FragranceSearchResult[];
  sources: string[];
  cached: boolean;
  total: number;
}
