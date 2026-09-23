export type { Prisma, Categoria, Banner, Fornecedor, Compra, Cliente, Venda, Encomenda, DespesaFinanceira } from '@prisma/client';
import type { Prisma, Categoria, Banner, Fornecedor, Compra, Cliente, Venda, Encomenda, DespesaFinanceira } from '@prisma/client';
import type { AdminSessionUser } from '@/lib/auth';

type Plain<T> = T extends Prisma.Decimal ? number
  : T extends Date ? Date
  : T extends (infer Item)[] ? Plain<Item>[]
  : T extends object ? { [Key in keyof T]: Plain<T[Key]> }
  : T;

export type AdminProduto = Plain<Prisma.ProdutoGetPayload<{
  include: {
    categoria: true;
    fotos: true;
    fornecedor: true;
  };
}>>;

export type AdminVenda = Plain<Prisma.VendaGetPayload<{
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
}>>;

export type AdminCompra = Plain<Prisma.CompraGetPayload<{
  include: {
    fornecedor: true;
    itens: {
      include: {
        produto: true;
      };
    };
  };
}>>;

export type AdminEncomenda = Plain<Prisma.EncomendaGetPayload<{
  include: {
    cliente: true;
    produto: {
      include: { fotos: true };
    };
    fornecedor: true;
  };
}>>;

export type AdminCliente = Plain<Prisma.ClienteGetPayload<{
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
}>>;

export type AdminMovimentacao = Plain<Prisma.EstoqueMovimentacaoGetPayload<{
  include: {
    produto: true;
  };
}>>;

export type ERPData = {
  user: AdminSessionUser;
  produtos: AdminProduto[];
  categorias: Plain<Categoria>[];
  banners: Plain<Banner>[];
  fornecedores: Plain<Fornecedor>[];
  movimentacoes: AdminMovimentacao[];
  compras: AdminCompra[];
  vendas: AdminVenda[];
  clientes: AdminCliente[];
  encomendas: AdminEncomenda[];
  despesas: Plain<DespesaFinanceira>[];
};
