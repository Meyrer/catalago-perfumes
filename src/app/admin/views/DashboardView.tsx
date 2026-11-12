"use client";

import { useState, useMemo } from 'react';
import type { ERPData } from '../types';
import { normalizeImageUrl } from '@/lib/image-url';
import StatCard from '../StatCard';
import MonthFilter, { getMonthKey, isInMonth } from '../MonthFilter';
import { summarizeSalePayments, getSaleItemNetAmounts } from '@/lib/sale-payment';
import { fromCents, toCents } from '@/lib/money';
import {
  DollarSign, Package, ShoppingBag, Clock, CheckCircle2, ChevronRight, Boxes
} from 'lucide-react';

type Props = {
  data: ERPData;
  onNavigate: (tab: string) => void;
};

function DashboardProductThumbnail({ fotoUrl, nome }: { fotoUrl?: string; nome: string }) {
  const [error, setError] = useState(false);
  const normalized = normalizeImageUrl(fotoUrl);

  if (!normalized || error) {
    return <Package size={18} className="text-brand-muted" />;
  }

  return (
    <img
      src={normalized}
      alt={nome}
      width={40}
      height={40}
      className="w-full h-full object-contain p-0.5"
      onError={() => setError(true)}
    />
  );
}

export default function DashboardView({ data, onNavigate }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey());

  const { produtos, vendas, encomendas, despesas } = data;

  const vendasDoPeriodo = useMemo(() => vendas.filter(venda =>
    venda.status !== 'CANCELADO' && isInMonth(venda.data, selectedMonth)), [vendas, selectedMonth]);
  const paymentSummary = useMemo(() => summarizeSalePayments(vendasDoPeriodo), [vendasDoPeriodo]);
  const lucroMes = useMemo(() => fromCents(vendasDoPeriodo.reduce((sum, venda) => sum + toCents(venda.valorTotal) - toCents(venda.custoTotal), 0)), [vendasDoPeriodo]);
  const despesasCentavos = useMemo(() => despesas
    .filter(despesa => despesa.tipo !== 'APORTE' && isInMonth(despesa.data, selectedMonth))
    .reduce((sum, despesa) => sum + toCents(despesa.valor), 0), [despesas, selectedMonth]);
  const lucroLiquido = fromCents(toCents(lucroMes) - despesasCentavos);

  // Cálculos de Estoque
  const totalItensEstoque = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0);
  }, [produtos]);

  const encomendasAtivasCount = useMemo(() => {
    return encomendas.filter(e => e.status !== 'FINALIZADO' && e.status !== 'CANCELADO').length;
  }, [encomendas]);

  // Ranking de Produtos Mais Vendidos
  const topProdutosMaisVendidos = useMemo(() => {
    const map = new Map<number, { produto: typeof produtos[0]; qtd: number; totalVendas: number }>();
    for (const v of vendasDoPeriodo) {
      const netAmounts = getSaleItemNetAmounts(v);
      for (const [index, item] of v.itens.entries()) {
        const prod = produtos.find(p => p.id === item.produtoId) || item.produto;
        if (!prod) continue;
        const current = map.get(prod.id) || { produto: prod as unknown as typeof produtos[0], qtd: 0, totalVendas: 0 };
        current.qtd += item.quantidade;
        current.totalVendas = fromCents(toCents(current.totalVendas) + toCents(netAmounts[index]));
        map.set(prod.id, current);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [vendasDoPeriodo, produtos]);

  return (
    <div className="space-y-6">
      <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate">
          Visão Geral da Perfumio
        </h2>
        <button
          type="button"
          onClick={() => onNavigate('vendas')}
          className="self-start px-4 py-2 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <ShoppingBag size={15} className="text-brand-caramel" aria-hidden="true" />
          Registrar Venda
        </button>
      </div>

      <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Resumo das vendas do período">
        {[
          { label: 'Total vendido bruto', value: paymentSummary.total, icon: ShoppingBag },
          { label: 'Lucro líquido', value: lucroLiquido, icon: DollarSign, detail: 'Após custos e despesas do período' },
          { label: 'Já recebido bruto', value: paymentSummary.received, icon: CheckCircle2, color: 'text-emerald-700' },
          { label: 'Falta receber bruto', value: paymentSummary.outstanding, icon: Clock, color: 'text-amber-700' },
        ].map(card => (
          <StatCard
            key={card.label}
            label={card.label}
            icon={card.icon}
            detail={card.detail}
            value={<span className={card.color}>{card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
          />
        ))}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-brand-muted">Valores agrupados pelo mês da venda.</p>
        <button
          type="button"
          onClick={() => onNavigate('financeiro')}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-xs font-semibold text-brand-chocolate hover:bg-brand-nude cursor-pointer"
        >
          <DollarSign size={15} aria-hidden="true" />
          Ver saldo em caixa
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Estoque e encomendas">
        <button type="button" onClick={() => onNavigate('estoque')} className="admin-stat w-full text-left cursor-pointer hover:border-brand-caramel">
          <span className="admin-stat-icon"><Boxes size={22} aria-hidden="true" /></span>
          <span className="flex-1">
            <span className="admin-stat-label block">Itens em estoque</span>
            <span className="admin-stat-value block">{totalItensEstoque} un.</span>
          </span>
          <ChevronRight size={16} className="text-brand-muted" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onNavigate('encomendas')} className="admin-stat w-full text-left cursor-pointer hover:border-brand-caramel">
          <span className="admin-stat-icon"><Clock size={22} aria-hidden="true" /></span>
          <span className="flex-1">
            <span className="admin-stat-label block">Encomendas ativas</span>
            <span className="admin-stat-value block">{encomendasAtivasCount}</span>
          </span>
          <ChevronRight size={16} className="text-brand-muted" aria-hidden="true" />
        </button>
      </section>

      <div>
        
        {/* TOP PRODUTOS MAIS VENDIDOS */}
        <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate">
                Produtos Mais Vendidos
              </h3>
              <p className="text-xs text-brand-muted">
                Período selecionado; valores com descontos e sem frete
              </p>
            </div>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-xs font-bold text-brand-muted hover:underline cursor-pointer"
            >
              Ver Relatório Completo
            </button>
          </div>

          {topProdutosMaisVendidos.length === 0 ? (
            <p className="text-xs text-brand-muted py-8 text-center">Nenhum produto vendido até o momento.</p>
          ) : (
            <div className="divide-y divide-brand-nude">
              {topProdutosMaisVendidos.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-brand-muted">
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-line overflow-hidden shrink-0 flex items-center justify-center">
                      <DashboardProductThumbnail
                        fotoUrl={item.produto.fotos && item.produto.fotos[0]?.url}
                        nome={item.produto.nome}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-chocolate leading-tight">
                        {item.produto.nome}
                      </p>
                      <p className="text-[11px] text-brand-muted">
                        {item.produto.marca} {item.produto.volume ? `• ${item.produto.volume}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-brand-chocolate block">
                      {item.qtd} un. vendidas
                    </span>
                    <span className="text-[11px] text-brand-chocolate font-bold block">
                      {item.totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
