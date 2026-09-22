import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const key = request.headers.get('x-restore-key');
  if (!key || key !== process.env.RESTORE_KEY) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json();
  let count = 0;
  for (const item of body.images || []) {
    const product = await prisma.produto.findFirst({ where: { nome: item.name } });
    if (!product) continue;
    await prisma.foto.deleteMany({ where: { produtoId: product.id } });
    await prisma.foto.create({ data: { produtoId: product.id, url: item.url } });
    count++;
  }
  return NextResponse.json({ success: true, count });
}
