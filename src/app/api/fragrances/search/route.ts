import { NextRequest, NextResponse } from 'next/server';
import { fragranceSearchService } from '@/services/fragrance-search/FragranceSearchService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 20) : 8;

    if (!query.trim() || query.trim().length < 3) {
      return NextResponse.json({
        query,
        results: [],
        sources: [],
        cached: false,
        total: 0,
      });
    }

    const response = await fragranceSearchService.search(query, limit);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API /fragrances/search] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro interno ao realizar busca de fragrâncias.',
        results: [],
        sources: [],
        cached: false,
        total: 0,
      },
      { status: 500 }
    );
  }
}
