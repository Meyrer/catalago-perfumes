"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminCompra } from '../types';
import { 
  Truck, Plus, Search, CheckCircle2, Clock, 
  X, Loader2, DollarSign, Calendar, ArrowDownRight, 
  Globe, ChevronRight, Eye
} from 'lucide-react';
import { createCompraAction, receberCompraAction, deleteCompraAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function ComprasView({ data }: Props) {
  const { compras, fornecedores, produtos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal Nova Compra
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [viewingCompra, setViewingCompra] = useState<AdminCompra | null>(null);
  const [fornecedorId, setFornecedorId] = useState('');
  const [moeda, setMoeda] = useState<'BRL' | 'USD' | 'EUR'>('USD');
  const [cotacao, setCotacao] = useState<number>(5.75);
  const [frete, setFrete] = useState<number>(0);
  const [taxas, setTaxas] = useState<number>(0);
  const [outrosCustos, setOutrosCustos] = useState<number>(0);
  const [statusCompra, setStatusCompra] = useState<string>('RECEBIDO');
  const [observacoes, setObservacoes] = useState('');

  // Itens da Compra
  const [compraItens, setCompraItens] = useState<Array<{ produtoId: number; quantidade: number; valorUnitarioMoeda: number }>>([]);
  const [selectedAddProdId, setSelectedAddProdId] = useState<string>('');
  const [itemValorMoeda, setItemValorMoeda] = useState<number>(0);
  const [itemQtd, setItemQtd] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  // Compras filtradas
  const filteredCompras = useMemo(() => {
    return compras.filter(c => {
      const matchSearch = 
        c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.fornecedor?.nome && c.fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [compras, searchTerm, filterStatus]);

  // Cálculos dinâmicos em BRL e rateio
  const calculoCompra = useMemo(() => {
    let subtotalMoeda = 0;
    for (const it of compraItens) {
      subtotalMoeda += it.valorUnitarioMoeda * it.quantidade;
    }
    const subtotalBRL = subtotalMoeda * (cotacao || 1);
    const custosExtrasBRL = (frete || 0) + (taxas || 0) + (outrosCustos || 0);
    const custoTotalBRL = subtotalBRL + custosExtrasBRL;

    const itensDetalhados = compraItens.map(it => {
      const p = produtos.find(prod => prod.id === it.produtoId);
      const itemValorBRL = it.valorUnitarioMoeda * (cotacao || 1);
      const proporcao = subtotalBRL > 0 ? (itemValorBRL * it.quantidade) / subtotalBRL : (1 / compraItens.length || 1);
      const custoExtraPorUn = it.quantidade > 0 ? (custosExtrasBRL * proporcao) / it.quantidade : 0;
      const custoFinalUnitarioBRL = itemValorBRL + custoExtraPorUn;

      return {
        ...it,
        produto: p,
        itemValorBRL,
        custoFinalUnitarioBRL,
        totalItemBRL: custoFinalUnitarioBRL * it.quantidade
      };
    });

    return { subtotalMoeda, subtotalBRL, custosExtrasBRL, custoTotalBRL, itensDetalhados };
  }, [compraItens, cotacao, frete, taxas, outrosCustos, produtos]);

  const handleAddItem = () => {
    if (!selectedAddProdId || itemValorMoeda <= 0) return;
    const prodId = parseInt(selectedAddProdId);
    setCompraItens([...compraItens, { produtoId: prodId, quantidade: itemQtd, valorUnitarioMoeda: itemValorMoeda }]);
    setSelectedAddProdId('');
    setItemValorMoeda(0);
    setItemQtd(1);
  };

  const handleRemoveItem = (idx: number) => {
    setCompraItens(compraItens.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (compraItens.length === 0) {
      setFormError('Adicione pelo menos um produto à compra.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createCompraAction({
        fornecedorId: fornecedorId ? parseInt(fornecedorId) : undefined,
        moeda,
        cotacao,
        frete,
        taxas,
        outrosCustos,
        observacoes,
        status: statusCompra,
        itens: compraItens
      });

      setFeedback('Compra registrada com sucesso!');
      setIsNewOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar compra.';
      setFormError(msg);
      setIsSubmitting(false);
    }
  };

  const handleReceber = async (id: number) => {
    if (!confirm('Deseja marcar esta compra como recebida? Os produtos serão adicionados ao estoque físico automaticamente.')) return;
    try {
      await receberCompraAction(id);
      setFeedback('Compra recebida e estoque atualizado com sucesso!');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao receber compra.';
      setFeedback(msg);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE COMPRAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <Truck size={22} className="text-[#7a5828]" />
            Compras & Importações Internacionais
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Cotação cambial (USD/EUR), rateio de frete e impostos, e entrada automatizada no estoque físico.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewOpen(true);
            setCompraItens([]);
            setFormError('');
          }}
          className="px-5 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-[#a37941]" />
          <span>Registrar Nova Compra</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número (#COMP-...) ou fornecedor..."
            className="w-full pl-10 pr-4 py-2 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none font-medium"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="RECEBIDO">Recebido (No estoque)</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_TRANSITO">Em Trânsito</option>
        </select>
      </div>

      {/* TABELA DE COMPRAS */}
      <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                <th className="py-3 px-4">Código / Data</th>
                <th className="py-3 px-3">Fornecedor</th>
                <th className="py-3 px-3 text-center">Moeda & Cotação</th>
                <th className="py-3 px-3">Itens Comprados</th>
                <th className="py-3 px-3 text-right">Frete + Taxas</th>
                <th className="py-3 px-3 text-right">Custo Total (R$)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe5dc] text-xs">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-[#71717a]">
                    Nenhuma compra registrada até o momento.
                  </td>
                </tr>
              ) : (
                filteredCompras.map((c) => {
                  const dataFormatada = new Date(c.data).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  });
                  const isRecebido = c.status === 'RECEBIDO';

                  return (
                    <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#09090b] block">{c.numero}</span>
                        <span className="text-[10px] text-[#71717a]">{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#09090b]">
                        {c.fornecedor?.nome || 'Importação Direta'}
                        {c.fornecedor?.cidadePais && (
                          <span className="text-[10px] text-[#52525b] block">{c.fornecedor.cidadePais}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] text-[10px] font-bold text-[#09090b] border border-[#dcd5c7]">
                          {c.moeda} {c.moeda !== 'BRL' && `(R$ ${c.cotacao.toFixed(2)})`}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[#52525b] font-medium">{c.itens.length} modelo(s)</span>
                        <span className="text-[10px] text-[#71717a] block line-clamp-1">
                          {c.itens.map(i => `${i.quantidade}x ${i.produto?.nome || 'Item'}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-[#52525b] font-medium">
                        {(c.frete + c.taxas + c.outrosCustos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#5c401c]">
                        {c.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isRecebido 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {isRecebido ? 'Recebido no Estoque' : c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!isRecebido && (
                            <button
                              onClick={() => handleReceber(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#09090b] hover:bg-[#27272a] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Dar Entrada
                            </button>
                          )}
                          <button
                            onClick={() => setViewingCompra(c)}
                            className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                            title="Ver detalhes da compra"
                          >
                            <Eye size={14} />
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

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR NOVA COMPRA / IMPORTAÇÃO */}
      {/* ========================================================================= */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 sm:p-8 relative my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#dcd5c7] mb-5">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#09090b]">Registrar Compra / Lote de Importação</h3>
                <p className="text-xs text-[#52525b]">Rateio de moeda estrangeira, frete, impostos e atualização de custo unitário</p>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="p-1.5 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer transition-colors">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              {/* DADOS DO FORNECEDOR E COTAÇÃO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3.5">
                <span className="text-xs font-bold text-[#7a5828] uppercase tracking-wider block">1. Fornecedor & Moeda</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-[#52525b] uppercase mb-1">Fornecedor</label>
                    <select
                      value={fornecedorId}
                      onChange={e => setFornecedorId(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs font-semibold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer focus:border-[#7a5828]"
                    >
                      <option value="">Selecione o fornecedor parceiro...</option>
                      {fornecedores.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-[#52525b] uppercase mb-1">Moeda da Compra</label>
                    <select
                      value={moeda}
                      onChange={e => {
                        const m = e.target.value as typeof moeda;
                        setMoeda(m);
                        if (m === 'BRL') setCotacao(1.0);
                        else if (m === 'USD') setCotacao(5.75);
                        else if (m === 'EUR') setCotacao(6.20);
                      }}
                      className="w-full px-3 py-2 bg-white text-xs font-semibold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer focus:border-[#7a5828]"
                    >
                      <option value="USD">USD ($) • Dólar Americano</option>
                      <option value="EUR">EUR (€) • Euro</option>
                      <option value="BRL">BRL (R$) • Real Brasileiro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-[#52525b] uppercase mb-1">
                      Cotação Cambial (R$)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      disabled={moeda === 'BRL'}
                      value={cotacao}
                      onChange={e => setCotacao(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828] disabled:bg-neutral-100"
                    />
                  </div>
                </div>
              </div>

              {/* ITENS DA COMPRA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3.5">
                <span className="text-xs font-bold text-[#7a5828] uppercase tracking-wider block">2. Itens do Lote</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Perfume / Produto</label>
                    <select
                      value={selectedAddProdId}
                      onChange={e => setSelectedAddProdId(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs font-semibold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]"
                    >
                      <option value="">Selecione o perfume do catálogo...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={String(p.id)}>{p.nome} ({p.marca})</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={itemQtd}
                      onChange={e => setItemQtd(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-center text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Preço Un. ({moeda})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itemValorMoeda || ''}
                      onChange={e => setItemValorMoeda(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-center text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de Itens */}
                {compraItens.length > 0 && (
                  <div className="divide-y divide-[#ebe5dc] border border-[#dcd5c7] rounded-xl bg-white overflow-hidden text-xs mt-3">
                    {calculoCompra.itensDetalhados.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-bold text-[#09090b] block truncate">{it.produto?.nome}</span>
                          <span className="text-[11px] text-[#52525b]">
                            {it.quantidade} un. &times; {moeda} {it.valorUnitarioMoeda.toFixed(2)} &rarr; <strong className="text-[#5c401c]">R$ {it.custoFinalUnitarioBRL.toFixed(2)}/un</strong> (rateado c/ frete e taxas)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-[#5c401c] text-xs">Total: R$ {it.totalItemBRL.toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 text-red-600 hover:text-red-800 cursor-pointer rounded hover:bg-red-50" title="Remover item">
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FRETE, TAXAS E OUTROS CUSTOS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#f4efe6] border border-[#dcd5c7] space-y-3.5">
                <span className="text-xs font-bold text-[#7a5828] uppercase tracking-wider block">3. Custos de Logística & Importação (em R$)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Frete Internacional / Nacional (R$)</label>
                    <input type="number" step="0.01" min="0" value={frete} onChange={e => setFrete(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Taxas Aduaneiras / IOF (R$)</label>
                    <input type="number" step="0.01" min="0" value={taxas} onChange={e => setTaxas(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Outros Custos Operacionais (R$)</label>
                    <input type="number" step="0.01" min="0" value={outrosCustos} onChange={e => setOutrosCustos(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none focus:border-[#7a5828]" />
                  </div>
                </div>

                {/* Resumo Final da Compra */}
                <div className="pt-3 border-t border-[#dcd5c7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs text-[#52525b]">
                    Subtotal Mercadorias: <strong className="text-[#09090b]">{moeda} {calculoCompra.subtotalMoeda.toFixed(2)}</strong> (R$ {calculoCompra.subtotalBRL.toFixed(2)})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-[#52525b]">Custo Total do Lote:</span>
                    <span className="text-lg font-bold text-[#5c401c]">
                      {calculoCompra.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="pt-3 border-t border-[#dcd5c7] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || compraItens.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#a37941]" />
                      <span>Salvando Compra...</span>
                    </>
                  ) : (
                    <span>Registrar Compra & Entrada de Estoque</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALHES DA COMPRA */}
      {viewingCompra && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#7a5828]">{viewingCompra.numero}</span>
                <h3 className="text-lg font-serif font-bold text-[#09090b]">Detalhes da Compra / Lote</h3>
              </div>
              <button onClick={() => setViewingCompra(null)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#dcd5c7]">
                <span className="text-[10px] font-bold text-[#52525b] uppercase block">Fornecedor</span>
                <p className="font-bold text-[#09090b]">{viewingCompra.fornecedor?.nome || 'Importação Direta'}</p>
                <p className="text-[11px] text-[#52525b] mt-0.5">{viewingCompra.fornecedor?.contato || ''}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#52525b] uppercase block mb-1">Itens do Lote</span>
                <div className="divide-y divide-[#ebe5dc] border border-[#dcd5c7] rounded-xl bg-white overflow-hidden">
                  {viewingCompra.itens.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#09090b]">{it.produto?.nome}</span>
                        <span className="text-[11px] text-[#52525b] ml-1">
                          ({it.quantidade}x a {viewingCompra.moeda} {it.valorUnitarioMoeda.toFixed(2)})
                        </span>
                      </div>
                      <span className="font-bold text-[#5c401c]">R$ {it.custoTotalBRL.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#f4efe6] border border-[#dcd5c7] space-y-1">
                <div className="flex justify-between text-[#52525b]">
                  <span>Moeda & Cotação:</span>
                  <span>{viewingCompra.moeda} (Cotação R$ {viewingCompra.cotacao.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-[#52525b]">
                  <span>Frete & Taxas:</span>
                  <span>R$ {(viewingCompra.frete + viewingCompra.taxas + viewingCompra.outrosCustos).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#dcd5c7] flex justify-between font-bold text-sm text-[#09090b]">
                  <span>Custo Total em Reais:</span>
                  <span className="text-[#5c401c]">R$ {viewingCompra.custoTotalBRL.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
