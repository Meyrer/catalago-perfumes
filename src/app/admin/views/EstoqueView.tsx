"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminProduto } from '../types';
import { 
  Boxes, AlertTriangle, ArrowDownRight, ArrowUpRight, 
  Search, History, RefreshCw, X, Loader2,
  Package, Calendar, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { movimentarEstoqueAction } from '../../actions';

type Props = {
  data: ERPData;
  onRefresh?: () => void;
};

export default function EstoqueView({ data }: Props) {
  const { produtos, movimentacoes, user } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BAIXO' | 'ZERADO' | 'PRONTA_ENTREGA' | 'ENCOMENDA'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'saldo' | 'historico'>('saldo');

  // Modal de Movimentação
  const [movingProduct, setMovingProduct] = useState<AdminProduto | null>(null);
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PERDA' | 'DEVOLUCAO' | 'RESERVA'>('ENTRADA');
  const [movQtd, setMovQtd] = useState<number>(1);
  const [movMotivo, setMovMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Produtos filtrados
  const filteredProdutos = useMemo(() => {
    return produtos.filter(p => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchFilter = true;
      if (filterType === 'BAIXO') {
        matchFilter = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo || 2) && p.quantidade > 0;
      } else if (filterType === 'ZERADO') {
        matchFilter = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade === 0;
      } else if (filterType === 'PRONTA_ENTREGA') {
        matchFilter = p.tipoDisponibilidade === 'PRONTA_ENTREGA';
      } else if (filterType === 'ENCOMENDA') {
        matchFilter = p.tipoDisponibilidade === 'ENCOMENDA';
      }

      return matchSearch && matchFilter;
    });
  }, [produtos, searchTerm, filterType]);

  // Totais de Estoque
  const totalFisico = useMemo(() => produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0), [produtos]);
  const totalCusto = useMemo(() => produtos.reduce((acc, p) => acc + (p.precoCusto || 0) * (p.quantidade || 0), 0), [produtos]);
  const totalVenda = useMemo(() => produtos.reduce((acc, p) => acc + (p.precoVista || 0) * (p.quantidade || 0), 0), [produtos]);
  const totalReservado = useMemo(() => produtos.reduce((acc, p) => acc + (p.quantidadeReservada || 0), 0), [produtos]);

  const handleOpenMoveModal = (p: AdminProduto, tipoPredef: typeof movTipo = 'ENTRADA') => {
    setMovingProduct(p);
    setMovTipo(tipoPredef);
    setMovQtd(tipoPredef === 'AJUSTE' ? p.quantidade : 1);
    setMovMotivo('');
    setFeedbackMsg('');
  };

  const handleExecuteMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingProduct) return;

    setIsSubmitting(true);
    try {
      await movimentarEstoqueAction(
        movingProduct.id,
        movTipo,
        Number(movQtd),
        movMotivo
      );
      setFeedbackMsg('Movimentação realizada com sucesso!');
      setTimeout(() => {
        setMovingProduct(null);
        window.location.reload();
      }, 700);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar movimentação.';
      setFeedbackMsg(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE ESTOQUE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <Boxes size={22} className="text-[#7a5828]" />
            Gestão & Controle de Estoque
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Controle de saldo físico, reservas, estoque mínimo, valor investido e histórico de movimentações.
          </p>
        </div>

        {/* Sub-Abas: Saldo Atual vs Histórico Completo */}
        <div className="flex items-center gap-1.5 bg-[#f4efe6] p-1 rounded-2xl border border-[#dcd5c7]">
          <button
            onClick={() => setActiveSubTab('saldo')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'saldo' ? 'bg-[#09090b] text-white shadow-xs' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            Saldo de Estoque ({produtos.length})
          </button>
          <button
            onClick={() => setActiveSubTab('historico')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'historico' ? 'bg-[#09090b] text-white shadow-xs' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            <History size={14} /> Histórico de Movimentações ({movimentacoes.length})
          </button>
        </div>
      </div>

      {/* CARDS RESUMO DO ESTOQUE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-1">
            Total Físico em Estoque
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#09090b]">
            {totalFisico} <span className="text-xs font-medium text-[#52525b]">unidades</span>
          </p>
          <span className="text-[11px] text-[#7a5828] font-semibold block mt-1">
            {totalReservado} un. reservadas
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
          <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
            Valor Total Investido (Custo)
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#5c401c]">
            {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[11px] text-[#52525b] block mt-1">
            Custo médio por unidade: R$ {totalFisico > 0 ? (totalCusto / totalFisico).toFixed(2).replace('.', ',') : '0,00'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
          <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
            Valor Potencial de Venda
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#5c401c]">
            {totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[11px] text-emerald-700 font-bold block mt-1">
            +{(totalVenda - totalCusto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} lucro projetado
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/30 shadow-xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
            Alertas de Reposição
          </span>
          <p className="text-xl sm:text-2xl font-bold text-amber-950">
            {produtos.filter(p => p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo || 2)).length} <span className="text-xs font-medium text-amber-800">itens</span>
          </p>
          <span className="text-[11px] text-amber-900 font-medium block mt-1">
            Estoque baixo ou zerado
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ABA: SALDO DE ESTOQUE */}
      {/* ========================================================= */}
      {activeSubTab === 'saldo' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#dcd5c7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, marca ou SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none transition-all font-medium"
              />
            </div>

            {/* Pílulas de Filtro */}
            <div className="flex items-center gap-1 bg-[#f4efe6] p-1 rounded-xl border border-[#dcd5c7] overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ALL' ? 'bg-[#09090b] text-white shadow-xs' : 'text-[#52525b] hover:text-[#09090b]'
                }`}
              >
                Todos ({produtos.length})
              </button>
              <button
                onClick={() => setFilterType('BAIXO')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'BAIXO' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Estoque Baixo
              </button>
              <button
                onClick={() => setFilterType('ZERADO')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ZERADO' ? 'bg-red-600 text-white shadow-xs' : 'text-red-700 hover:text-red-950'
                }`}
              >
                Sem Estoque
              </button>
              <button
                onClick={() => setFilterType('PRONTA_ENTREGA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'PRONTA_ENTREGA' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                Pronta Entrega
              </button>
              <button
                onClick={() => setFilterType('ENCOMENDA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ENCOMENDA' ? 'bg-[#7a5828] text-white shadow-xs' : 'text-[#7a5828] hover:text-[#5c401c]'
                }`}
              >
                Encomenda
              </button>
            </div>
          </div>

          {/* TABELA DE ESTOQUE DENSE */}
          <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                    <th className="py-3 px-4">Produto & Marca</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3 text-center">Físico</th>
                    <th className="py-3 px-3 text-center">Reservado</th>
                    <th className="py-3 px-3 text-center">Disponível</th>
                    <th className="py-3 px-3 text-center">Mínimo</th>
                    <th className="py-3 px-3 text-right">Custo Unit.</th>
                    <th className="py-3 px-3 text-right">Investido</th>
                    <th className="py-3 px-3 text-right">Potencial Venda</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Movimentação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe5dc] text-xs">
                  {filteredProdutos.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-xs text-[#71717a]">
                        Nenhum produto encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProdutos.map((p) => {
                      const disponivel = Math.max(0, (p.quantidade || 0) - (p.quantidadeReservada || 0));
                      const isBaixo = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo || 2) && p.quantidade > 0;
                      const isZerado = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade === 0;
                      const totalInv = (p.precoCusto || 0) * (p.quantidade || 0);
                      const totalPotVenda = (p.precoVista || 0) * (p.quantidade || 0);

                      return (
                        <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                          {/* Produto e Marca */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#fcfbf9] border border-[#dcd5c7] overflow-hidden shrink-0 flex items-center justify-center">
                                {p.fotos && p.fotos[0] ? (
                                  <img src={p.fotos[0].url} alt={p.nome} width={36} height={36} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <Package size={16} className="text-[#8c8c8e]" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#09090b] leading-tight line-clamp-1">{p.nome}</p>
                                <p className="text-[10px] text-[#52525b] font-medium">
                                  {p.marca} {p.volume ? `• ${p.volume}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-3 px-3 font-mono text-[10px] text-[#52525b]">
                            {p.sku || '—'}
                          </td>

                          {/* Quantidade Físico */}
                          <td className="py-3 px-3 text-center font-bold text-[#09090b]">
                            {p.quantidade} un.
                          </td>

                          {/* Reservado */}
                          <td className="py-3 px-3 text-center text-[#52525b] font-medium">
                            {p.quantidadeReservada || 0}
                          </td>

                          {/* Disponível */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isZerado 
                                ? 'bg-red-100 text-red-800' 
                                : isBaixo 
                                ? 'bg-amber-100 text-amber-900' 
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {disponivel} un.
                            </span>
                          </td>

                          {/* Mínimo */}
                          <td className="py-3 px-3 text-center text-[#71717a]">
                            {p.estoqueMinimo || 2}
                          </td>

                          {/* Custo Unitário */}
                          <td className="py-3 px-3 text-right font-medium text-[#52525b]">
                            {(p.precoCusto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Investimento Total */}
                          <td className="py-3 px-3 text-right font-bold text-[#5c401c]">
                            {totalInv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Potencial Venda */}
                          <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                            {totalPotVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {isZerado ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#7a5828] text-[10px] font-bold">
                                Sob Encomenda
                              </span>
                            ) : isBaixo ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                Estoque Baixo
                              </span>
                            ) : p.tipoDisponibilidade === 'ENCOMENDA' ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#7a5828] text-[10px] font-bold">
                                Encomenda
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                Normal
                              </span>
                            )}
                          </td>

                          {/* Botão de Ação Rápida */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenMoveModal(p, 'ENTRADA')}
                                className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                                title="Entrada rápida de estoque"
                              >
                                <ArrowUpRight size={13} className="text-emerald-700" />
                              </button>
                              <button
                                onClick={() => handleOpenMoveModal(p, 'SAIDA')}
                                className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                                title="Saída / Perda de estoque"
                              >
                                <ArrowDownRight size={13} className="text-red-700" />
                              </button>
                              <button
                                onClick={() => handleOpenMoveModal(p, 'AJUSTE')}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#09090b] hover:bg-[#27272a] text-white transition-colors cursor-pointer"
                              >
                                Ajustar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA: HISTÓRICO DE MOVIMENTAÇÕES (AUDITORIA) */}
      {/* ========================================================= */}
      {activeSubTab === 'historico' && (
        <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#dcd5c7] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#09090b]">Registro Geral de Auditoria de Estoque</h3>
              <p className="text-[11px] text-[#52525b]">Todas as entradas, saídas, vendas e ajustes manuais registrados no sistema.</p>
            </div>
            <span className="text-xs font-bold text-[#7a5828]">
              {movimentacoes.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3 text-center">Tipo</th>
                  <th className="py-3 px-3 text-center">Variação</th>
                  <th className="py-3 px-3 text-center">Saldo Anterior &rarr; Novo</th>
                  <th className="py-3 px-4">Motivo / Descrição</th>
                  <th className="py-3 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5dc] text-xs">
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-xs text-[#71717a]">
                      Nenhuma movimentação de estoque registrada.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((m) => {
                    const dataFormatada = new Date(m.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    });

                    const isPositivo = m.tipo === 'ENTRADA' || m.tipo === 'DEVOLUCAO';

                    return (
                      <tr key={m.id} className="hover:bg-[#fcfbf9] transition-colors">
                        <td className="py-3 px-4 text-[11px] font-mono text-[#52525b]">
                          {dataFormatada}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#09090b]">
                          {m.produto?.nome || `Produto #${m.produtoId}`}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-900' :
                            m.tipo === 'SAIDA' ? 'bg-red-100 text-red-900' :
                            m.tipo === 'VENDA' ? 'bg-blue-100 text-blue-900' :
                            m.tipo === 'PERDA' ? 'bg-gray-200 text-gray-800' :
                            'bg-amber-100 text-amber-900'
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-center font-bold ${isPositivo ? 'text-emerald-700' : 'text-red-700'}`}>
                          {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade} un.
                        </td>
                        <td className="py-3 px-3 text-center text-[#52525b] font-mono text-[11px]">
                          {m.quantidadeAnterior} &rarr; <strong className="text-[#09090b]">{m.quantidadeNova}</strong>
                        </td>
                        <td className="py-3 px-4 text-[#52525b]">
                          {m.motivo || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#7a5828]">
                          👤 {m.usuarioResponsavel || 'Sistema'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE MOVIMENTAÇÃO RÁPIDA DE ESTOQUE */}
      {/* ========================================================= */}
      {movingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#09090b]">
                  Movimentar Estoque
                </h3>
                <p className="text-xs text-[#52525b] font-medium">
                  {movingProduct.nome} ({movingProduct.marca})
                </p>
              </div>
              <button
                onClick={() => setMovingProduct(null)}
                className="p-1 rounded-full text-[#52525b] hover:text-[#09090b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {feedbackMsg && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleExecuteMovimentacao} className="space-y-4">
              {/* Saldo Atual */}
              <div className="p-3 rounded-xl bg-[#f4efe6] border border-[#dcd5c7] flex items-center justify-between text-xs">
                <span className="font-medium text-[#52525b]">Saldo Físico Atual:</span>
                <span className="font-bold text-[#09090b] text-sm">{movingProduct.quantidade} unidades</span>
              </div>

              {/* Tipo de Movimentação */}
              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'ENTRADA', label: 'Entrada (+)' },
                    { key: 'SAIDA', label: 'Saída (-)' },
                    { key: 'AJUSTE', label: 'Ajuste (=)' },
                    { key: 'PERDA', label: 'Perda/Avaria' },
                    { key: 'DEVOLUCAO', label: 'Devolução' },
                    { key: 'RESERVA', label: 'Reserva' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setMovTipo(t.key as typeof movTipo);
                        if (t.key === 'AJUSTE') setMovQtd(movingProduct.quantidade);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        movTipo === t.key
                          ? 'bg-[#09090b] text-white border-[#09090b] shadow-xs'
                          : 'bg-[#f4efe6] text-[#52525b] border-[#dcd5c7] hover:bg-[#eae3d5]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
                  {movTipo === 'AJUSTE' ? 'Nova Quantidade Real em Estoque' : 'Quantidade a Movimentar'}
                </label>
                <input
                  type="number"
                  min={movTipo === 'AJUSTE' ? 0 : 1}
                  required
                  value={movQtd}
                  onChange={(e) => setMovQtd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-[#f4efe6] focus:bg-white text-sm font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  required
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ex: Chegada de lote, provador de mostruário, ajuste de contagem..."
                  className="w-full px-3.5 py-2.5 bg-[#f4efe6] focus:bg-white text-xs font-medium text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none"
                />
              </div>

              {/* Usuário Responsável */}
              <p className="text-[11px] text-[#52525b]">
                Registrado por: <strong className="text-[#09090b]">{user?.name || 'Administrador'}</strong>
              </p>

              {/* Botões */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setMovingProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#a37941]" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Movimentação</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
