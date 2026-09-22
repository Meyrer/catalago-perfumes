import prisma from '@/lib/prisma';
import { FragranceProvider, FragranceSearchResult } from '../types';

export class LocalFragranceProvider implements FragranceProvider {
  readonly name = 'local';

  async search(query: string, limit = 8): Promise<FragranceSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      // Busca local inteligente no banco PostgreSQL do catálogo
      const produtos = await prisma.produto.findMany({
        where: {
          OR: [
            { nome: { contains: cleanQuery, mode: 'insensitive' } },
            { marca: { contains: cleanQuery, mode: 'insensitive' } },
            { familiaOlfativa: { contains: cleanQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          fotos: {
            take: 1,
          },
        },
        take: limit,
        orderBy: [
          { disponivel: 'desc' },
          { destaque: 'desc' },
          { id: 'asc' },
        ],
      });

      return produtos.map((p): FragranceSearchResult => {
        const parseJsonArray = (val: unknown): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val.map(String);
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) return parsed.map(String);
            } catch {
              return val.split(/[,•;]/).map(s => s.trim()).filter(Boolean);
            }
          }
          return [];
        };

        return {
          id: p.id,
          externalId: p.externalId || undefined,
          name: p.nome,
          brand: p.marca,
          concentration: p.concentracao || undefined,
          year: p.anoLancamento || undefined,
          volume: p.volume || undefined,
          gender: p.genero || undefined,
          family: p.familiaOlfativa || undefined,
          imageUrl: p.fotos[0]?.url || undefined,
          topNotes: parseJsonArray(p.notasSaida),
          middleNotes: parseJsonArray(p.notasCoracao),
          baseNotes: parseJsonArray(p.notasFundo),
          accords: parseJsonArray(p.acordesPrincipais),
          source: 'local',
          sourceUrl: p.sourceUrl || undefined,
          isLocal: true,
          verificationStatus: (p.verificationStatus as 'unverified' | 'reviewed' | 'verified') || 'verified',
          price: p.precoVista,
          priceFormatted: p.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          available: p.disponivel,
        };
      });
    } catch (error) {
      console.error('[LocalFragranceProvider] Erro ao consultar banco local:', error);
      return [];
    }
  }
}
