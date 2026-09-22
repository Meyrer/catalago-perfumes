import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      brand,
      concentration,
      year,
      volume,
      gender,
      family,
      imageUrl,
      topNotes,
      middleNotes,
      baseNotes,
      accords,
      source,
      sourceUrl,
      externalId,
      precoVista,
      categoriaId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 });
    }

    // Identificar ou criar categoria padrão caso não informada
    let targetCategoriaId = categoriaId;
    if (!targetCategoriaId) {
      // Buscar categoria 'Perfumes' ou primeira disponível
      const defaultCat = await prisma.categoria.findFirst({
        where: { nome: { contains: 'Perfume', mode: 'insensitive' } },
      }) || await prisma.categoria.findFirst();

      if (!defaultCat) {
        const newCat = await prisma.categoria.create({ data: { nome: 'Perfumes Importados' } });
        targetCategoriaId = newCat.id;
      } else {
        targetCategoriaId = defaultCat.id;
      }
    }

    const precoFinal = typeof precoVista === 'number' && precoVista > 0 ? precoVista : 0;

    const produto = await prisma.produto.create({
      data: {
        nome: name.trim(),
        marca: brand?.trim() || 'Marca Importada',
        descricao: `Fragrância importada ${name.trim()}${brand ? ` por ${brand.trim()}` : ''}.`,
        precoVista: precoFinal,
        volume: volume || null,
        concentracao: concentration || null,
        anoLancamento: year ? parseInt(String(year), 10) : null,
        genero: gender || null,
        familiaOlfativa: family || null,
        notasSaida: Array.isArray(topNotes) && topNotes.length > 0 ? topNotes : undefined,
        notasCoracao: Array.isArray(middleNotes) && middleNotes.length > 0 ? middleNotes : undefined,
        notasFundo: Array.isArray(baseNotes) && baseNotes.length > 0 ? baseNotes : undefined,
        acordesPrincipais: Array.isArray(accords) && accords.length > 0 ? accords : undefined,
        
        // Rastreabilidade e Confiabilidade
        dataSource: source || 'openbeautyfacts',
        sourceUrl: sourceUrl || null,
        externalId: externalId || null,
        verificationStatus: 'unverified', // Sempre unverified na importação inicial
        importedAt: new Date(),
        lastSyncedAt: new Date(),

        categoriaId: targetCategoriaId,
        tipoDisponibilidade: 'ENCOMENDA',
        previsaoEntrega: 'Sob Encomenda (Consulte prazo)',
      },
    });

    if (imageUrl && imageUrl.trim().startsWith('http')) {
      await prisma.foto.create({
        data: {
          url: imageUrl.trim(),
          produtoId: produto.id,
        },
      });
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json({
      success: true,
      message: 'Fragrância adicionada com sucesso ao catálogo.',
      product: produto,
    });
  } catch (error) {
    console.error('[API /fragrances/import] Erro ao importar:', error);
    return NextResponse.json(
      { error: 'Não foi possível importar a fragrância para o catálogo.' },
      { status: 500 }
    );
  }
}
