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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-5 sm:p-6 rounded-3xl border border-brand-line shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate flex items-center gap-2.5">
            <Truck size={22} className="text-brand-muted" />
            Compras & Importações Internacionais
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Cotação cambial (USD/EUR), rateio de frete e impostos, e entrada automatizada no estoque físico.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewOpen(true);
            setCompraItens([]);
            setFormError('');
          }}
          className="px-5 py-2.5 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-brand-caramel" />
          <span>Registrar Nova Compra</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-brand-nude border border-brand-line text-brand-chocolate text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número (#COMP-...) ou fornecedor..."
            className="w-full pl-10 pr-4 py-2 bg-brand-nude focus:bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none font-medium"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-brand-nude text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="RECEBIDO">Recebido (No estoque)</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_TRANSITO">Em Trânsito</option>
        </select>
      </div>

      {/* TABELA DE COMPRAS */}
      <div className="bg-brand-card rounded-2xl border border-brand-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream border-b border-brand-line text-[10px] font-bold text-brand-muted uppercase tracking-wider">
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
            <tbody className="divide-y divide-brand-nude text-xs">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-brand-muted">
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
                    <tr key={c.id} className="hover:bg-brand-cream transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-brand-chocolate block">{c.numero}</span>
                        <span className="text-[10px] text-brand-muted">{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-brand-chocolate">
                        {c.fornecedor?.nome || 'Importação Direta'}
                        {c.fornecedor?.cidadePais && (
                          <span className="text-[10px] text-brand-muted block">{c.fornecedor.cidadePais}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-brand-nude text-[10px] font-bold text-brand-chocolate border border-brand-line">
                          {c.moeda} {c.moeda !== 'BRL' && `(R$ ${c.cotacao.toFixed(2)})`}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-brand-muted font-medium">{c.itens.length} modelo(s)</span>
                        <span className="text-[10px] text-brand-muted block line-clamp-1">
                          {c.itens.map(i => `${i.quantidade}x ${i.produto?.nome || 'Item'}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-brand-muted font-medium">
                        {(c.frete + c.taxas + c.outrosCustos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-brand-deep">
                        {c.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isRecebido 
                            ? 'bg-brand-nude text-brand-chocolate border-brand-line'
                            : 'bg-brand-nude text-brand-chocolate border-brand-line'
                        }`}>
                          {isRecebido ? 'Recebido no Estoque' : c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!isRecebido && (
                            <button
                              onClick={() => handleReceber(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Dar Entrada
                            </button>
                          )}
                          <button
                            onClick={() => setViewingCompra(c)}
                            className="p-1.5 rounded-lg bg-brand-nude hover:bg-brand-nude text-brand-chocolate border border-brand-line transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-brand-card w-full max-w-4xl rounded-3xl border border-brand-line shadow-2xl p-6 sm:p-8 relative my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-4 border-b border-brand-line mb-5">
              <div>
                <h3 className="text-xl font-serif font-bold text-brand-chocolate">Registrar Compra / Lote de Importação</h3>
                <p className="text-xs text-brand-muted">Rateio de moeda estrangeira, frete, impostos e atualização de custo unitário</p>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="p-1.5 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer transition-colors">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-brand-rose-beige border border-brand-terracotta text-brand-chocolate text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              {/* DADOS DO FORNECEDOR E COTAÇÃO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-cream border border-brand-line space-y-3.5">
                <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block">1. Fornecedor & Moeda</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-brand-muted uppercase mb-1">Fornecedor</label>
                    <select
                      value={fornecedorId}
                      onChange={e => setFornecedorId(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-semibold text-brand-chocolate rounded-xl border border-brand-line outline-none cursor-pointer focus:border-brand-caramel"
                    >
                      <option value="">Selecione o fornecedor parceiro...</option>
                      {fornecedores.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-brand-muted uppercase mb-1">Moeda da Compra</label>
                    <select
                      value={moeda}
                      onChange={e => {
                        const m = e.target.value as typeof moeda;
                        setMoeda(m);
                        if (m === 'BRL') setCotacao(1.0);
                        else if (m === 'USD') setCotacao(5.75);
                        else if (m === 'EUR') setCotacao(6.20);
                      }}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-semibold text-brand-chocolate rounded-xl border border-brand-line outline-none cursor-pointer focus:border-brand-caramel"
                    >
                      <option value="USD">USD ($) • Dólar Americano</option>
                      <option value="EUR">EUR (€) • Euro</option>
                      <option value="BRL">BRL (R$) • Real Brasileiro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-brand-muted uppercase mb-1">
                      Cotação Cambial (R$)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      disabled={moeda === 'BRL'}
                      value={cotacao}
                      onChange={e => setCotacao(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel disabled:bg-brand-nude"
                    />
                  </div>
                </div>
              </div>

              {/* ITENS DA COMPRA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-cream border border-brand-line space-y-3.5">
                <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block">2. Itens do Lote</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Perfume / Produto</label>
                    <select
                      value={selectedAddProdId}
                      onChange={e => setSelectedAddProdId(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-semibold text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel"
                    >
                      <option value="">Selecione o perfume do catálogo...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={String(p.id)}>{p.nome} ({p.marca})</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={itemQtd}
                      onChange={e => setItemQtd(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-center text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Preço Un. ({moeda})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itemValorMoeda || ''}
                      onChange={e => setItemValorMoeda(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-center text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de Itens */}
                {compraItens.length > 0 && (
                  <div className="divide-y divide-brand-nude border border-brand-line rounded-xl bg-brand-card overflow-hidden text-xs mt-3">
                    {calculoCompra.itensDetalhados.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-bold text-brand-chocolate block truncate">{it.produto?.nome}</span>
                          <span className="text-[11px] text-brand-muted">
                            {it.quantidade} un. &times; {moeda} {it.valorUnitarioMoeda.toFixed(2)} &rarr; <strong className="text-brand-deep">R$ {it.custoFinalUnitarioBRL.toFixed(2)}/un</strong> (rateado c/ frete e taxas)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-brand-deep text-xs">Total: R$ {it.totalItemBRL.toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 text-brand-chocolate hover:text-brand-chocolate cursor-pointer rounded hover:bg-brand-rose-beige" title="Remover item">
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FRETE, TAXAS E OUTROS CUSTOS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-nude border border-brand-line space-y-3.5">
                <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block">3. Custos de Logística & Importação (em R$)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Frete Internacional / Nacional (R$)</label>
                    <input type="number" step="0.01" min="0" value={frete} onChange={e => setFrete(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Taxas Aduaneiras / IOF (R$)</label>
                    <input type="number" step="0.01" min="0" value={taxas} onChange={e => setTaxas(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Outros Custos Operacionais (R$)</label>
                    <input type="number" step="0.01" min="0" value={outrosCustos} onChange={e => setOutrosCustos(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel" />
                  </div>
                </div>

                {/* Resumo Final da Compra */}
                <div className="pt-3 border-t border-brand-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs text-brand-muted">
                    Subtotal Mercadorias: <strong className="text-brand-chocolate">{moeda} {calculoCompra.subtotalMoeda.toFixed(2)}</strong> (R$ {calculoCompra.subtotalBRL.toFixed(2)})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-brand-muted">Custo Total do Lote:</span>
                    <span className="text-lg font-bold text-brand-deep">
                      {calculoCompra.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="pt-3 border-t border-brand-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-brand-line text-xs font-bold text-brand-muted hover:bg-brand-nude transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || compraItens.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-brand-caramel" />
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
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-lg rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-brand-muted">{viewingCompra.numero}</span>
                <h3 className="text-lg font-serif font-bold text-brand-chocolate">Detalhes da Compra / Lote</h3>
              </div>
              <button onClick={() => setViewingCompra(null)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-brand-cream border border-brand-line">
                <span className="text-[10px] font-bold text-brand-muted uppercase block">Fornecedor</span>
                <p className="font-bold text-brand-chocolate">{viewingCompra.fornecedor?.nome || 'Importação Direta'}</p>
                <p className="text-[11px] text-brand-muted mt-0.5">{viewingCompra.fornecedor?.contato || ''}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-brand-muted uppercase block mb-1">Itens do Lote</span>
                <div className="divide-y divide-brand-nude border border-brand-line rounded-xl bg-brand-card overflow-hidden">
                  {viewingCompra.itens.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-brand-chocolate">{it.produto?.nome}</span>
                        <span className="text-[11px] text-brand-muted ml-1">
                          ({it.quantidade}x a {viewingCompra.moeda} {it.valorUnitarioMoeda.toFixed(2)})
                        </span>
                      </div>
                      <span className="font-bold text-brand-deep">R$ {it.custoTotalBRL.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-nude border border-brand-line space-y-1">
                <div className="flex justify-between text-brand-muted">
                  <span>Moeda & Cotação:</span>
                  <span>{viewingCompra.moeda} (Cotação R$ {viewingCompra.cotacao.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-brand-muted">
                  <span>Frete & Taxas:</span>
                  <span>R$ {(viewingCompra.frete + viewingCompra.taxas + viewingCompra.outrosCustos).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-brand-line flex justify-between font-bold text-sm text-brand-chocolate">
                  <span>Custo Total em Reais:</span>
                  <span className="text-brand-deep">R$ {viewingCompra.custoTotalBRL.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
