import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const key = request.headers.get('x-restore-key');
  if (!key || key !== (process.env.RESTORE_KEY || process.env.ADMIN_SESSION_SECRET)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json();
  if (Array.isArray(body.users)) {
    for (const user of body.users) {
      await prisma.adminUser.upsert({ where: { username: user.username.toLowerCase() }, update: { name: user.name, passwordHash: hashPassword(user.password), mustChangePassword: true }, create: { username: user.username.toLowerCase(), name: user.name, passwordHash: hashPassword(user.password), mustChangePassword: true } });
    }
  }
  if (Array.isArray(body.images)) {
    for (const item of body.images) {
      const product = await prisma.produto.findFirst({ where: { nome: item.name } });
      if (!product) continue;
      await prisma.foto.deleteMany({ where: { produtoId: product.id } });
      await prisma.foto.create({ data: { produtoId: product.id, url: item.url } });
    }
  }
  return NextResponse.json({ success: true, users: body.users?.length ?? 0, images: body.images?.length ?? 0 });
}
