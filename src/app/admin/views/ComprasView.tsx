"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminCompra } from '../types';
import MonthFilter, { getDayKey, getMonthKey, isInMonth } from '../MonthFilter';
import { roundMoney } from '@/lib/money';
import { 
  Truck, Plus, Search, CheckCircle2, Clock, 
  X, Loader2, DollarSign, Calendar, ArrowDownRight, 
  Globe, ChevronRight, Eye, Coins, ShoppingCart, Package, Check
} from 'lucide-react';
import { createCompraAction, receberCompraAction, marcarCompraEmTransitoAction, atualizarPagamentoCompraAction } from '../../actions';

type Props = {
  data: ERPData;
};

function PurchaseCashFields({ value, onChange, total }: {
  value: { valor: string; data: string };
  onChange: (value: { valor: string; data: string }) => void;
  total: number;
}) {
  const inputClass = 'mt-1 w-full px-3 py-2 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs font-bold text-brand-muted">
        Valor pago pelo caixa (R$)
        <input className={inputClass} type="number" step="0.01" min="0.01" max={roundMoney(total)} placeholder="Opcional" value={value.valor} onChange={event => onChange({ ...value, valor: event.target.value })} />
      </label>
      <label className="text-xs font-bold text-brand-muted">
        Data do pagamento
        <input className={inputClass} type="date" value={value.data} required={value.valor !== ''} onChange={event => onChange({ ...value, data: event.target.value })} />
      </label>
    </div>
  );
}

export default function ComprasView({ data }: Props) {
  const { compras, fornecedores, produtos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFornecedor, setFilterFornecedor] = useState('ALL');

  // Modal Nova Compra
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [viewingCompra, setViewingCompra] = useState<AdminCompra | null>(null);
  const [fornecedorId, setFornecedorId] = useState('');
  const [moeda, setMoeda] = useState<'BRL' | 'USD' | 'EUR'>('USD');
  const [cotacao, setCotacao] = useState<number>(5.75);
  const [frete, setFrete] = useState<number>(0);
  const [taxas, setTaxas] = useState<number>(0);
  const [outrosCustos, setOutrosCustos] = useState<number>(0);
  const [statusCompra, setStatusCompra] = useState('PENDENTE');
  const [pagamentoCaixa, setPagamentoCaixa] = useState(() => ({ valor: '', data: getDayKey() }));
  const [isSavingCash, setIsSavingCash] = useState(false);
  const [cashError, setCashError] = useState('');
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
        (c.fornecedor?.nome && c.fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.itens.some(item => item.produto?.nome.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchFornecedor = filterFornecedor === 'ALL' || String(c.fornecedorId) === filterFornecedor;
      return matchSearch && matchStatus && matchFornecedor && isInMonth(c.data, selectedMonth);
    });
  }, [compras, searchTerm, filterStatus, filterFornecedor, selectedMonth]);

  const indicadores = useMemo(() => {
    const agora = selectedMonth ? new Date(`${selectedMonth}-15T12:00:00Z`) : new Date();
    const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const validas = compras.filter(compra => compra.status !== 'CANCELADO' && isInMonth(compra.data, selectedMonth));
    const noMes = validas.filter(compra => formatoMes.format(new Date(compra.data)) === formatoMes.format(agora));
    const emTransito = validas.filter(compra => compra.status === 'EM_TRANSITO');
    const recebidas = validas.filter(compra => compra.status === 'RECEBIDO');
    const total = (lista: AdminCompra[]) => lista.reduce((soma, compra) => soma + compra.custoTotalBRL, 0);
    const quantidade = (lista: AdminCompra[], singular: string, plural: string) => `${lista.length} ${lista.length === 1 ? singular : plural}`;
    return [
      { titulo: 'Total investido', valor: total(validas), descricao: `Em ${quantidade(validas, 'compra registrada', 'compras registradas')}`, icon: Coins },
      { titulo: 'Compras no mês', valor: total(noMes), descricao: `${quantidade(noMes, 'compra', 'compras')} em ${agora.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })}`, icon: ShoppingCart },
      { titulo: 'Em trânsito', valor: total(emTransito), descricao: quantidade(emTransito, 'compra em importação', 'compras em importação'), icon: Truck },
      { titulo: 'Recebidas', valor: total(recebidas), descricao: quantidade(recebidas, 'compra recebida', 'compras recebidas'), icon: Package },
    ];
  }, [compras, selectedMonth]);

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
    if (compraItens.some(item => item.produtoId === prodId)) {
      setFormError('Este produto já foi adicionado. Remova a linha anterior e informe a quantidade total em uma única linha.');
      return;
    }
    setFormError('');
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
        pagamentoCaixa: pagamentoCaixa.valor === '' ? null : { valor: Number(pagamentoCaixa.valor), data: pagamentoCaixa.data },
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

  const openPurchaseDetails = (compra: AdminCompra) => {
    setPagamentoCaixa({
      valor: compra.valorPagoCaixa?.toFixed(2) ?? '',
      data: compra.dataPagamentoCaixa ? new Date(compra.dataPagamentoCaixa).toISOString().slice(0, 10) : getDayKey(),
    });
    setCashError('');
    setViewingCompra(compra);
  };

  const handleSaveCashPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewingCompra) return;
    setIsSavingCash(true);
    setCashError('');
    try {
      await atualizarPagamentoCompraAction(
        viewingCompra.id,
        pagamentoCaixa.valor === '' ? null : { valor: Number(pagamentoCaixa.valor), data: pagamentoCaixa.data },
        new Date(viewingCompra.updatedAt).toISOString(),
      );
      window.location.reload();
    } catch (error) {
      setCashError(error instanceof Error ? error.message : 'Erro ao salvar o pagamento.');
      setIsSavingCash(false);
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

  const handleMarkInTransit = async (id: number) => {
    try {
      await marcarCompraEmTransitoAction(id);
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao marcar a compra em trânsito.');
    }
  };

  return (
    <div className="space-y-6">
      <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map(({ titulo, valor, descricao, icon: Icon }) => (
          <div key={titulo} className="flex items-start gap-4 rounded-2xl border border-brand-line bg-brand-card p-5 shadow-[0_3px_8px_rgba(67,44,31,0.04)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5e3d0] text-[#995e29]">
              <Icon size={28} strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-chocolate">{titulo}</p>
              <p className="mt-1 whitespace-nowrap font-serif text-2xl font-bold tracking-tight text-brand-deep">
                {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">{descricao}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-brand-line bg-brand-card p-4 shadow-[0_3px_8px_rgba(67,44,31,0.04)] sm:p-6">
      {/* HEADER DA VISÃO DE COMPRAS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5e3d0] text-[#995e29]">
            <Truck size={29} strokeWidth={1.6} />
          </div>
          <div className="border-l border-brand-line pl-4">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate">
            Compras & Importações Internacionais
          </h2>
          <p className="text-sm leading-relaxed text-brand-muted mt-1">
            Cotação cambial (USD/EUR), frete, impostos e entrada automatizada no estoque físico.
          </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsNewOpen(true);
            setCompraItens([]);
            setStatusCompra('PENDENTE');
            setPagamentoCaixa({ valor: '', data: getDayKey() });
            setFormError('');
          }}
          className="shrink-0 px-5 py-3 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer self-start xl:self-auto"
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
      <div className="grid grid-cols-1 items-end gap-4 border-t border-brand-line py-5 lg:grid-cols-[minmax(0,2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            aria-label="Buscar compras"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código da compra, produto ou fornecedor..."
            className="w-full pl-10 pr-4 py-3 bg-brand-cream/40 focus:bg-brand-card text-sm text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none"
          />
        </div>

        <label className="space-y-1.5 text-xs font-semibold text-brand-chocolate">
          <span>Fornecedor</span>
          <select
            value={filterFornecedor}
            onChange={event => setFilterFornecedor(event.target.value)}
            className="w-full rounded-xl border border-brand-line bg-brand-card px-3 py-3 text-sm font-normal outline-none focus:border-brand-caramel cursor-pointer"
          >
            <option value="ALL">Todos os fornecedores</option>
            {fornecedores.map(fornecedor => <option key={fornecedor.id} value={String(fornecedor.id)}>{fornecedor.nome}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-brand-chocolate">
          <span>Status</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-3 bg-brand-card text-sm font-normal text-brand-chocolate rounded-xl border border-brand-line outline-none focus:border-brand-caramel cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="RECEBIDO">Recebido (No estoque)</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_TRANSITO">Em Trânsito</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        </label>
      </div>

      {/* TABELA DE COMPRAS */}
      <div className="bg-brand-card rounded-2xl border border-brand-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream border-b border-brand-line text-xs font-semibold text-brand-chocolate">
                <th className="py-4 px-4 w-[170px]">Código / Data</th>
                <th className="py-4 px-3 w-[125px]">Fornecedor</th>
                <th className="py-4 px-3 w-[145px] text-center">Moeda & Cotação</th>
                <th className="py-4 px-4">Mercadorias</th>
                <th className="py-4 px-3 w-[110px] text-right">Frete + Taxas</th>
                <th className="py-4 px-3 w-[140px] text-right">Custo Total (R$)</th>
                <th className="py-4 px-3 w-[110px] text-center">Status</th>
                <th className="py-4 px-4 w-[150px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-nude text-sm">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-brand-muted">
                    {compras.length === 0 ? 'Nenhuma compra registrada até o momento.' : 'Nenhuma compra encontrada com os filtros selecionados.'}
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
                      <td className="py-6 px-4" style={{ overflowWrap: 'normal' }}>
                        <span className="font-semibold text-brand-chocolate block leading-relaxed">{c.numero}</span>
                        <span className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-brand-muted"><Calendar size={14} className="text-[#995e29]" />{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-brand-chocolate">
                        {c.fornecedor?.nome || 'Importação Direta'}
                        {c.fornecedor?.cidadePais && (
                          <span className="text-[10px] text-brand-muted block">{c.fornecedor.cidadePais}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex whitespace-nowrap px-3 py-1.5 rounded-full bg-[#f5e3d0] text-xs font-semibold text-brand-chocolate">
                          {c.moeda} {c.moeda !== 'BRL' && `(${c.cotacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
                        </span>
                      </td>

                      <td className="py-5 px-4">
                        <div className="flex items-center gap-2 font-bold text-brand-chocolate"><Package size={18} className="shrink-0 text-[#995e29]" />{c.itens.length} {c.itens.length === 1 ? 'modelo' : 'modelos'}</div>
                        <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">
                          {c.itens.reduce((total, item) => total + item.quantidade, 0)} unidades · {c.itens.slice(0, 3).map(item => (item.produto?.nome.split('—').pop() || 'Item').replace(/\s*\([^)]*\)/g, '').trim()).join(', ')}{c.itens.length > 3 ? ` e mais ${c.itens.length - 3}` : ''}
                        </p>
                        <button type="button" onClick={() => openPurchaseDetails(c)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-brand-line px-2.5 py-1.5 text-xs font-semibold text-brand-chocolate hover:bg-brand-cream cursor-pointer">
                          Ver detalhes <ChevronRight size={13} />
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right text-brand-muted font-medium">
                        {(c.frete + c.taxas + c.outrosCustos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-brand-deep">
                        {c.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                          isRecebido 
                            ? 'bg-[#e7ebcf] text-[#59612e]'
                            : c.status === 'CANCELADO' ? 'bg-brand-rose-beige/40 text-brand-chocolate' : 'bg-[#f5e3d0] text-[#835721]'
                        }`}>
                          {isRecebido ? <Check size={13} /> : c.status === 'EM_TRANSITO' ? <Truck size={13} /> : <Clock size={13} />}
                          {isRecebido ? 'Recebido' : c.status === 'EM_TRANSITO' ? 'Em trânsito' : c.status === 'CANCELADO' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex flex-col items-end gap-2">
                          {c.status === 'PENDENTE' && (
                            <button type="button" onClick={() => handleMarkInTransit(c.id)} className="rounded-lg border border-brand-line px-2.5 py-1 text-[11px] font-bold text-brand-chocolate hover:bg-brand-cream cursor-pointer">
                              Marcar em trânsito
                            </button>
                          )}
                          {!isRecebido && c.status !== 'CANCELADO' && (
                            <button
                              onClick={() => handleReceber(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Dar Entrada
                            </button>
                          )}
                          <button
                            onClick={() => openPurchaseDetails(c)}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-semibold transition-colors cursor-pointer"
                            aria-label={`Ver detalhes da compra ${c.numero}`}
                          >
                            <Eye size={14} /> Ver detalhes
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

      </section>

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

              <div className="p-4 sm:p-5 rounded-2xl bg-brand-cream border border-brand-line space-y-3.5">
                <label className="block text-xs font-bold text-brand-muted">
                  Status da compra
                  <select value={statusCompra} onChange={event => setStatusCompra(event.target.value)} className="mt-1 block w-full max-w-xs px-3 py-2 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line">
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_TRANSITO">Em trânsito</option>
                    <option value="RECEBIDO">Recebida · Dar entrada agora</option>
                  </select>
                </label>
                <PurchaseCashFields value={pagamentoCaixa} onChange={setPagamentoCaixa} total={calculoCompra.custoTotalBRL} />
                <p className="text-[11px] text-brand-muted">Informe quanto saiu do caixa para esta compra. Despesas lançadas separadamente ficam fora desse valor.</p>
              </div>

              <div>
                <label htmlFor="compra-observacoes" className="mb-1.5 block text-xs font-bold text-brand-muted">Observação</label>
                <textarea
                  id="compra-observacoes"
                  value={observacoes}
                  onChange={event => setObservacoes(event.target.value)}
                  rows={3}
                  placeholder="Informações adicionais sobre esta compra..."
                  className="w-full resize-y rounded-xl border border-brand-line bg-brand-card px-3 py-2 text-sm text-brand-chocolate outline-none focus:border-brand-caramel"
                />
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
                    <span>{statusCompra === 'RECEBIDO' ? 'Registrar compra e dar entrada' : 'Registrar compra'}</span>
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
          <div role="dialog" aria-modal="true" aria-labelledby="compra-detalhes-title" className="bg-brand-card w-full max-w-3xl max-h-[90vh] rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-brand-muted">{viewingCompra.numero}</span>
                <h3 id="compra-detalhes-title" className="text-xl font-serif font-bold text-brand-chocolate">Detalhes da Compra / Lote</h3>
              </div>
              <button type="button" aria-label="Fechar detalhes da compra" onClick={() => setViewingCompra(null)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
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
                <span className="text-xs font-semibold text-brand-muted block mb-2">Itens do lote · {viewingCompra.itens.length} modelos · {viewingCompra.itens.reduce((total, item) => total + item.quantidade, 0)} unidades</span>
                <div className="max-h-[42vh] overflow-y-auto divide-y divide-brand-nude border border-brand-line rounded-xl bg-brand-card">
                  {viewingCompra.itens.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 leading-relaxed">
                        <span className="font-bold text-brand-chocolate">{it.produto?.nome}</span>
                        <span className="text-[11px] text-brand-muted ml-1">
                          ({it.quantidade}x a {viewingCompra.moeda} {it.valorUnitarioMoeda.toFixed(2)})
                        </span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap font-bold text-brand-deep">{it.custoTotalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewingCompra.observacoes && (
                <div className="rounded-xl border border-brand-line bg-brand-cream p-3 text-xs text-brand-muted">
                  <p className="mb-1 font-bold">Observação</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{viewingCompra.observacoes}</p>
                </div>
              )}

              <form onSubmit={handleSaveCashPayment} className="rounded-xl border border-brand-line bg-brand-cream p-3 space-y-2">
                <h4 className="font-bold text-brand-chocolate">Pagamento pelo caixa</h4>
                <PurchaseCashFields value={pagamentoCaixa} onChange={setPagamentoCaixa} total={viewingCompra.custoTotalBRL} />
                {cashError && <p role="alert" className="text-red-700">{cashError}</p>}
                <button type="submit" disabled={isSavingCash} className="rounded-lg border border-brand-line bg-brand-card px-3 py-2 font-semibold text-brand-chocolate disabled:opacity-60">
                  {isSavingCash ? 'Salvando…' : 'Salvar pagamento'}
                </button>
              </form>

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
