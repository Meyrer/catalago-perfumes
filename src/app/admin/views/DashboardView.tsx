"use client";

import { useState, useMemo } from 'react';
import type { ERPData } from '../types';
import { 
  TrendingUp, DollarSign, Package, AlertTriangle, 
  ShoppingBag, Clock, ArrowUpRight, ArrowDownRight, 
  Sparkles, CheckCircle2, ChevronRight, Boxes
} from 'lucide-react';

type Props = {
  data: ERPData;
  onNavigate: (tab: string) => void;
};

export default function DashboardView({ data, onNavigate }: Props) {
  const [salesTimeframe, setSalesTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const { produtos, vendas, encomendas } = data;

  // Datas de referência
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  // Cálculos de Vendas
  const vendasPagas = useMemo(() => {
    return vendas.filter(v => v.status === 'PAGO' || v.status === 'ENVIADO' || v.status === 'ENTREGUE');
  }, [vendas]);

  const faturamentoHoje = useMemo(() => {
    return vendasPagas
      .filter(v => new Date(v.data) >= inicioHoje)
      .reduce((acc, v) => acc + v.valorTotal, 0);
  }, [vendasPagas, inicioHoje]);

  const faturamentoMes = useMemo(() => {
    return vendasPagas
      .filter(v => new Date(v.data) >= inicioMes)
      .reduce((acc, v) => acc + v.valorTotal, 0);
  }, [vendasPagas, inicioMes]);

  const lucroMes = useMemo(() => {
    return vendasPagas
      .filter(v => new Date(v.data) >= inicioMes)
      .reduce((acc, v) => acc + v.lucroTotal, 0);
  }, [vendasPagas, inicioMes]);

  const margemLucroMes = faturamentoMes > 0 ? ((lucroMes / faturamentoMes) * 100).toFixed(1) : '0';

  const vendasMesCount = useMemo(() => {
    return vendasPagas.filter(v => new Date(v.data) >= inicioMes).length;
  }, [vendasPagas, inicioMes]);

  const ticketMedioMes = vendasMesCount > 0 ? (faturamentoMes / vendasMesCount) : 0;

  // Cálculos de Estoque
  const totalItensEstoque = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0);
  }, [produtos]);

  const valorTotalCustoEstoque = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.precoCusto || 0) * (p.quantidade || 0), 0);
  }, [produtos]);

  const valorPotencialVenda = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.precoVista || 0) * (p.quantidade || 0), 0);
  }, [produtos]);

  const lucroPotencialEstoque = valorPotencialVenda - valorTotalCustoEstoque;

  const produtosSobEncomendaCount = useMemo(() => {
    return produtos.filter(p => p.tipoDisponibilidade === 'ENCOMENDA').length;
  }, [produtos]);

  const produtosEstoqueBaixo = useMemo(() => {
    return produtos.filter(p => p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo || 2) && p.quantidade > 0);
  }, [produtos]);

  const produtosSemEstoque = useMemo(() => {
    return produtos.filter(p => p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade === 0);
  }, [produtos]);

  const pedidosPendentesCount = useMemo(() => {
    return vendas.filter(v => v.status === 'AGUARDANDO_PAGAMENTO' || v.status === 'PREPARANDO').length;
  }, [vendas]);

  const encomendasAtivasCount = useMemo(() => {
    return encomendas.filter(e => e.status !== 'FINALIZADO' && e.status !== 'CANCELADO').length;
  }, [encomendas]);

  // Ranking de Produtos Mais Vendidos
  const topProdutosMaisVendidos = useMemo(() => {
    const map = new Map<number, { produto: typeof produtos[0]; qtd: number; totalVendas: number }>();
    for (const v of vendasPagas) {
      for (const item of v.itens) {
        const prod = item.produto;
        if (!prod) continue;
        const current = map.get(prod.id) || { produto: prod as unknown as typeof produtos[0], qtd: 0, totalVendas: 0 };
        current.qtd += item.quantidade;
        current.totalVendas += item.subtotal;
        map.set(prod.id, current);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [vendasPagas, produtos]);

  // Ranking de Categorias Mais Vendidas
  const categoriasMaisVendidas = useMemo(() => {
    const catMap = new Map<string, { nome: string; total: number; qtd: number }>();
    for (const v of vendasPagas) {
      for (const item of v.itens) {
        const prod = produtos.find(p => p.id === item.produtoId);
        const catName = prod?.categoria?.nome || 'Outros';
        const current = catMap.get(catName) || { nome: catName, total: 0, qtd: 0 };
        current.total += item.subtotal;
        current.qtd += item.quantidade;
        catMap.set(catName, current);
      }
    }
    const list = Array.from(catMap.values()).sort((a, b) => b.total - a.total);
    const totalVendasGeral = list.reduce((acc, c) => acc + c.total, 0) || 1;
    return list.map(c => ({
      ...c,
      percent: Math.round((c.total / totalVendasGeral) * 100)
    }));
  }, [vendasPagas, produtos]);

  // Dados para Gráfico de Vendas
  const chartDaysCount = salesTimeframe === '7d' ? 7 : salesTimeframe === '30d' ? 30 : 90;
  const salesChartData = useMemo(() => {
    const points: Array<{ label: string; dateStr: string; valor: number; lucro: number }> = [];
    const baseDate = new Date();

    for (let i = chartDaysCount - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const daySales = vendasPagas.filter(v => {
        const vDate = new Date(v.data);
        return vDate >= dayStart && vDate <= dayEnd;
      });

      const dayTotal = daySales.reduce((acc, v) => acc + v.valorTotal, 0);
      const dayLucro = daySales.reduce((acc, v) => acc + v.lucroTotal, 0);

      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      points.push({ label, dateStr: d.toISOString(), valor: dayTotal, lucro: dayLucro });
    }
    return points;
  }, [vendasPagas, chartDaysCount]);

  const maxChartVal = useMemo(() => {
    const max = Math.max(...salesChartData.map(p => p.valor), 100);
    return max * 1.15; // margem superior
  }, [salesChartData]);

  // Pontos SVG para curva de vendas
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;

  const pointsString = useMemo(() => {
    if (salesChartData.length === 0) return '';
    return salesChartData.map((p, idx) => {
      const x = paddingX + (idx / (salesChartData.length - 1 || 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - (p.valor / maxChartVal) * (svgHeight - paddingY * 2);
      return `${x},${y}`;
    }).join(' ');
  }, [salesChartData, maxChartVal]);

  const areaString = useMemo(() => {
    if (!pointsString) return '';
    const firstX = paddingX;
    const lastX = svgWidth - paddingX;
    const baseY = svgHeight - paddingY;
    return `${firstX},${baseY} ${pointsString} ${lastX},${baseY}`;
  }, [pointsString]);

  return (
    <div className="space-y-6">
      
      {/* BOAS-VINDAS E STATUS GERAL */}
      <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-nude border border-brand-line text-brand-chocolate text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-brand-chocolate animate-pulse" />
            Loja Operacional & Sincronizada
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate">
            Visão Geral da Perfumio
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Métricas em tempo real de faturamento, estoque, vendas e pedidos sob encomenda.
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('vendas')}
            className="px-4 py-2 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <ShoppingBag size={15} className="text-brand-caramel" />
            <span>Registrar Venda</span>
          </button>
          <button
            onClick={() => onNavigate('estoque')}
            className="px-4 py-2 bg-brand-nude hover:bg-brand-nude text-brand-chocolate text-xs font-bold rounded-xl border border-brand-line flex items-center gap-2 transition-all cursor-pointer"
          >
            <Boxes size={15} className="text-brand-muted" />
            <span>Ajustar Estoque</span>
          </button>
          <button
            onClick={() => onNavigate('encomendas')}
            className="px-4 py-2 bg-brand-nude hover:bg-brand-nude text-brand-chocolate text-xs font-bold rounded-xl border border-brand-line flex items-center gap-2 transition-all cursor-pointer"
          >
            <Clock size={15} className="text-brand-muted" />
            <span>Encomendas ({encomendasAtivasCount})</span>
          </button>
        </div>
      </div>

      {/* 11 CARDS COMPACTOS DE KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-3.5">
        
        {/* Faturamento Hoje */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Faturamento Hoje
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {faturamentoHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] font-semibold text-brand-chocolate flex items-center gap-0.5 mt-1">
            <ArrowUpRight size={12} /> Vendas de hoje
          </span>
        </div>

        {/* Faturamento no Mês */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Faturamento no Mês
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-brand-muted block mt-1">
            {vendasMesCount} pedido(s) confirmados
          </span>
        </div>

        {/* Lucro Bruto no Mês */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line bg-brand-nude/20 shadow-xs">
          <span className="text-[10px] font-bold text-brand-chocolate uppercase tracking-wider block mb-1">
            Lucro Bruto (Mês)
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            +{lucroMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] font-bold text-brand-chocolate flex items-center gap-0.5 mt-1">
            Margem: {margemLucroMes}%
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Ticket Médio
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {ticketMedioMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-brand-muted block mt-1">
            Média por pedido
          </span>
        </div>

        {/* Total Investido em Estoque */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Investimento em Estoque
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-deep">
            {valorTotalCustoEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-brand-muted block mt-1">
            Custo total de aquisição
          </span>
        </div>

        {/* Potencial de Venda */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Potencial de Venda
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-deep">
            {valorPotencialVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-brand-chocolate font-bold block mt-1">
            +{lucroPotencialEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} proj.
          </span>
        </div>

        {/* Qtd Itens em Estoque Físico */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Itens em Estoque
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {totalItensEstoque} un.
          </p>
          <span className="text-[10px] text-brand-muted block mt-1">
            {produtos.length} modelos cadastrados
          </span>
        </div>

        {/* Sob Encomenda */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line bg-brand-nude/20 shadow-xs cursor-pointer hover:bg-brand-nude/40 transition-colors" onClick={() => onNavigate('encomendas')}>
          <span className="text-[10px] font-bold text-brand-chocolate uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Sob Encomenda</span>
            <ChevronRight size={12} />
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {encomendasAtivasCount} ativas
          </p>
          <span className="text-[10px] text-brand-chocolate font-medium block mt-1">
            {produtosSobEncomendaCount} itens no catálogo
          </span>
        </div>

        {/* Estoque Baixo */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line bg-brand-nude/30 shadow-xs cursor-pointer hover:bg-brand-nude/50 transition-colors" onClick={() => onNavigate('estoque')}>
          <span className="text-[10px] font-bold text-brand-chocolate uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Estoque Baixo</span>
            <AlertTriangle size={13} className="text-brand-chocolate" />
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {produtosEstoqueBaixo.length} modelos
          </p>
          <span className="text-[10px] text-brand-chocolate font-medium block mt-1">
            Necessitam reposição
          </span>
        </div>

        {/* Sem Estoque / Zerado */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-terracotta bg-brand-rose-beige/30 shadow-xs cursor-pointer hover:bg-brand-rose-beige/50 transition-colors" onClick={() => onNavigate('estoque')}>
          <span className="text-[10px] font-bold text-brand-chocolate uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Estoque Zerado</span>
            <span className="w-2 h-2 rounded-full bg-brand-chocolate" />
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {produtosSemEstoque.length} produtos
          </p>
          <span className="text-[10px] text-brand-chocolate font-medium block mt-1">
            Esgotados no momento
          </span>
        </div>

        {/* Pedidos Pendentes */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs cursor-pointer hover:bg-brand-cream transition-colors" onClick={() => onNavigate('vendas')}>
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Pedidos Pendentes</span>
            <Clock size={13} className="text-brand-caramel" />
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {pedidosPendentesCount}
          </p>
          <span className="text-[10px] text-brand-muted block mt-1">
            Aguardando ou preparando
          </span>
        </div>

        {/* Vendas no Mês */}
        <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs cursor-pointer hover:bg-brand-cream transition-colors" onClick={() => onNavigate('vendas')}>
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Vendas Concluídas
          </span>
          <p className="text-lg sm:text-xl font-bold text-brand-chocolate">
            {vendasPagas.length}
          </p>
          <span className="text-[10px] text-brand-chocolate font-bold block mt-1">
            Total histórico pago
          </span>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: GRÁFICO DE VENDAS & CATEGORIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE EVOLUÇÃO DE VENDAS (2 Colunas) */}
        <div className="lg:col-span-2 bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-muted" />
                Evolução de Faturamento & Lucro
              </h3>
              <p className="text-xs text-brand-muted">
                Desempenho diário de vendas e margem bruta capturada
              </p>
            </div>

            {/* Toggle de Período */}
            <div className="flex items-center gap-1 bg-brand-nude p-1 rounded-xl border border-brand-line self-start sm:self-auto">
              <button
                onClick={() => setSalesTimeframe('7d')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  salesTimeframe === '7d' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
                }`}
              >
                7 dias
              </button>
              <button
                onClick={() => setSalesTimeframe('30d')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  salesTimeframe === '30d' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
                }`}
              >
                30 dias
              </button>
              <button
                onClick={() => setSalesTimeframe('90d')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  salesTimeframe === '90d' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
                }`}
              >
                90 dias
              </button>
            </div>
          </div>

          {/* Canvas SVG do Gráfico */}
          <div className="w-full overflow-hidden">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-48 sm:h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--brand-caramel)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--brand-caramel)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Linhas horizontais de grade */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = paddingY + p * (svgHeight - paddingY * 2);
                const val = (1 - p) * maxChartVal;
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={svgWidth - paddingX} 
                      y2={y} 
                      stroke="var(--brand-line)"
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingX - 6} 
                      y={y + 3} 
                      textAnchor="end" 
                      fontSize="9" 
                      fill="var(--brand-muted)"
                      fontWeight="bold"
                    >
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Área com gradiente */}
              {areaString && (
                <polygon points={areaString} fill="url(#salesGrad)" />
              )}

              {/* Linha da curva de faturamento */}
              {pointsString && (
                <polyline 
                  points={pointsString} 
                  fill="none" 
                  stroke="var(--brand-caramel)"
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              )}

              {/* Pontos interativos */}
              {salesChartData.map((pt, idx) => {
                const x = paddingX + (idx / (salesChartData.length - 1 || 1)) * (svgWidth - paddingX * 2);
                const y = svgHeight - paddingY - (pt.valor / maxChartVal) * (svgHeight - paddingY * 2);

                return (
                  <g key={idx} className="group cursor-pointer">
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="3.5" 
                      fill="var(--brand-cream)"
                      stroke="var(--brand-caramel)"
                      strokeWidth="2" 
                      className="transition-all group-hover:r-5 group-hover:fill-brand-caramel"
                    />
                    {/* Tooltip simples no hover do ponto */}
                    {pt.valor > 0 && (
                      <text
                        x={x}
                        y={y - 8}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="var(--brand-chocolate)"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        R$ {Math.round(pt.valor)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Rótulos do eixo X (amostra de 5 a 7 datas) */}
              {salesChartData
                .filter((_, idx) => idx % Math.ceil(salesChartData.length / 6) === 0 || idx === salesChartData.length - 1)
                .map((pt, idx) => {
                  const origIdx = salesChartData.indexOf(pt);
                  const x = paddingX + (origIdx / (salesChartData.length - 1 || 1)) * (svgWidth - paddingX * 2);
                  return (
                    <text 
                      key={idx} 
                      x={x} 
                      y={svgHeight - 4} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fill="var(--brand-muted)"
                      fontWeight="bold"
                    >
                      {pt.label}
                    </text>
                  );
                })}
            </svg>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-line flex items-center justify-between text-xs text-brand-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-brand-chocolate">
                <span className="w-3 h-1 bg-brand-chocolate rounded-full" /> Faturamento Real (R$)
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-brand-chocolate">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-chocolate" /> Vendas com Lucro Médio de {margemLucroMes}%
              </span>
            </div>
            <span className="font-bold text-brand-muted">
              Total no período: {salesChartData.reduce((acc, p) => acc + p.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* DISTRIBUIÇÃO POR CATEGORIA (1 Coluna) */}
        <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate mb-1">
              Vendas por Categoria
            </h3>
            <p className="text-xs text-brand-muted mb-5">
              Participação de cada linha de produtos nas vendas
            </p>

            <div className="space-y-4">
              {categoriasMaisVendidas.length === 0 ? (
                <p className="text-xs text-brand-muted py-6 text-center">Nenhuma venda registrada ainda.</p>
              ) : (
                categoriasMaisVendidas.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-chocolate">{cat.nome}</span>
                      <div className="text-right font-medium">
                        <span className="text-brand-muted">{cat.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-xs font-bold text-brand-muted ml-1.5">({cat.percent}%)</span>
                      </div>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="w-full h-2 bg-brand-nude rounded-full overflow-hidden border border-brand-line/60">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-caramel to-brand-caramel rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, cat.percent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('categorias')}
            className="w-full mt-6 py-2.5 px-4 rounded-xl bg-brand-nude hover:bg-brand-nude text-brand-chocolate text-xs font-bold border border-brand-line transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Gerenciar Categorias</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: TOP PRODUTOS MAIS VENDIDOS & ALERTAS DE ESTOQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TOP PRODUTOS MAIS VENDIDOS */}
        <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate">
                Produtos Mais Vendidos
              </h3>
              <p className="text-xs text-brand-muted">
                Ranking dos campeões de venda da boutique
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
                      {item.produto.fotos && item.produto.fotos[0] ? (
                          <img
                          src={item.produto.fotos[0].url} 
                          alt={item.produto.nome} 
                          width={40} 
                          height={40} 
                          className="w-full h-full object-contain p-0.5" 
                        />
                      ) : (
                        <Package size={18} className="text-brand-muted" />
                      )}
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

        {/* ALERTAS CRÍTICOS DE ESTOQUE */}
        <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate flex items-center gap-2">
                  <AlertTriangle size={18} className="text-brand-chocolate" />
                  Alertas de Estoque
                </h3>
                <p className="text-xs text-brand-muted">
                  Produtos que necessitam de atenção imediata ou pedido ao fornecedor
                </p>
              </div>
              <button
                onClick={() => onNavigate('estoque')}
                className="text-xs font-bold text-brand-muted hover:underline cursor-pointer"
              >
                Gerenciar Estoque
              </button>
            </div>

            <div className="space-y-2.5">
              {produtosEstoqueBaixo.length === 0 && produtosSemEstoque.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-brand-rose-beige mb-2" />
                  <p className="text-xs font-bold text-brand-chocolate">Estoque Saudável!</p>
                  <p className="text-[11px] text-brand-muted">Todos os produtos de pronta entrega possuem quantidades adequadas.</p>
                </div>
              ) : (
                <>
                  {produtosSemEstoque.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-brand-rose-beige/50 border border-brand-terracotta flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-brand-chocolate text-brand-cream text-[9px] font-bold uppercase">
                            Zerado
                          </span>
                          <span className="text-xs font-bold text-brand-chocolate">{p.nome}</span>
                        </div>
                        <p className="text-[11px] text-brand-muted mt-0.5">{p.marca}</p>
                      </div>
                      <button
                        onClick={() => onNavigate('estoque')}
                        className="px-3 py-1 bg-brand-card border border-brand-terracotta text-brand-chocolate text-xs font-bold rounded-lg hover:bg-brand-rose-beige transition-colors cursor-pointer"
                      >
                        Repor
                      </button>
                    </div>
                  ))}

                  {produtosEstoqueBaixo.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-brand-nude/40 border border-brand-line flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-brand-chocolate text-brand-cream text-[9px] font-bold uppercase">
                            Baixo: {p.quantidade} un.
                          </span>
                          <span className="text-xs font-bold text-brand-chocolate">{p.nome}</span>
                        </div>
                        <p className="text-[11px] text-brand-muted mt-0.5">{p.marca} (mínimo recomendado: {p.estoqueMinimo || 2} un.)</p>
                      </div>
                      <button
                        onClick={() => onNavigate('estoque')}
                        className="px-3 py-1 bg-brand-card border border-brand-line text-brand-chocolate text-xs font-bold rounded-lg hover:bg-brand-nude transition-colors cursor-pointer"
                      >
                        Ajustar
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-nude flex items-center justify-between text-xs text-brand-muted">
            <span>{produtosEstoqueBaixo.length + produtosSemEstoque.length} produtos exigem reposição</span>
            <button
              onClick={() => onNavigate('compras')}
              className="text-xs font-bold text-brand-chocolate hover:text-brand-muted transition-colors cursor-pointer"
            >
              Criar Pedido de Compra &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
