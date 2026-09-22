import prisma from "@/lib/prisma";
import AdminClient from "./AdminClient";
import AdminLoginForm from "./AdminLoginForm";
import AdminChangePasswordForm from "./AdminChangePasswordForm";
import { getAdminSession } from "@/lib/auth";
import type { ERPData } from "./types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();

  // 1. Não autenticado -> Formulário de login
  if (!session) {
    return <AdminLoginForm />;
  }

  // 2. Primeiro acesso com senha provisória pendente -> Formulário obrigatório de troca de senha
  if (session.mustChangePassword) {
    return <AdminChangePasswordForm user={session} />;
  }

  // 3. Usuário autenticado e com senha definitiva -> Carrega ERP completo em paralelo
  const [
    produtos,
    categorias,
    banners,
    fornecedores,
    movimentacoes,
    compras,
    vendas,
    clientes,
    encomendas,
    despesas
  ] = await Promise.all([
    prisma.produto.findMany({
      include: {
        categoria: true,
        fotos: true,
        fornecedor: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.categoria.findMany({
      orderBy: { nome: 'asc' }
    }),
    prisma.banner.findMany({
      orderBy: { createdAt: 'desc' }
    }),
    prisma.fornecedor.findMany({
      orderBy: { nome: 'asc' }
    }),
    prisma.estoqueMovimentacao.findMany({
      include: { produto: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.compra.findMany({
      include: {
        fornecedor: true,
        itens: {
          include: { produto: true }
        }
      },
      orderBy: { data: 'desc' }
    }),
    prisma.venda.findMany({
      include: {
        cliente: true,
        itens: {
          include: {
            produto: {
              include: { fotos: true }
            }
          }
        }
      },
      orderBy: { data: 'desc' }
    }),
    prisma.cliente.findMany({
      include: {
        vendas: {
          include: {
            itens: {
              include: { produto: true }
            }
          }
        },
        encomendas: true
      },
      orderBy: { nome: 'asc' }
    }),
    prisma.encomenda.findMany({
      include: {
        cliente: true,
        produto: {
          include: { fotos: true }
        },
        fornecedor: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.despesaFinanceira.findMany({
      orderBy: { data: 'desc' }
    })
  ]);

  const erpData: ERPData = {
    user: session,
    produtos,
    categorias,
    banners,
    fornecedores,
    movimentacoes,
    compras,
    vendas,
    clientes,
    encomendas,
    despesas
  };

  return <AdminClient data={erpData} />;
}
