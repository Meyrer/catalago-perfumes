export type { Prisma, Categoria, Banner, Fornecedor, Compra, Cliente, Venda, Encomenda, DespesaFinanceira } from '@prisma/client';
import type { Prisma, Categoria, Banner, Fornecedor, Compra, Cliente, Venda, Encomenda, DespesaFinanceira } from '@prisma/client';
import type { AdminSessionUser } from '@/lib/auth';

export type AdminProduto = Prisma.ProdutoGetPayload<{
  include: {
    categoria: true;
    fotos: true;
    fornecedor: true;
  };
}>;

export type AdminVenda = Prisma.VendaGetPayload<{
  include: {
    cliente: true;
    itens: {
      include: {
        produto: {
          include: { fotos: true };
        };
      };
    };
  };
}>;

export type AdminCompra = Prisma.CompraGetPayload<{
  include: {
    fornecedor: true;
    itens: {
      include: {
        produto: true;
      };
    };
  };
}>;

export type AdminEncomenda = Prisma.EncomendaGetPayload<{
  include: {
    cliente: true;
    produto: {
      include: { fotos: true };
    };
    fornecedor: true;
  };
}>;

export type AdminCliente = Prisma.ClienteGetPayload<{
  include: {
    vendas: {
      include: {
        itens: {
          include: { produto: true };
        };
      };
    };
    encomendas: true;
  };
}>;

export type AdminMovimentacao = Prisma.EstoqueMovimentacaoGetPayload<{
  include: {
    produto: true;
  };
}>;

export type ERPData = {
  user: AdminSessionUser;
  produtos: AdminProduto[];
  categorias: Categoria[];
  banners: Banner[];
  fornecedores: Fornecedor[];
  movimentacoes: AdminMovimentacao[];
  compras: AdminCompra[];
  vendas: AdminVenda[];
  clientes: AdminCliente[];
  encomendas: AdminEncomenda[];
  despesas: DespesaFinanceira[];
};
