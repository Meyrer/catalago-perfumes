"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminVenda, AdminProduto } from '../types';
import { 
  ShoppingBag, Plus, Search, CheckCircle2, Clock, 
  X, Loader2, DollarSign, Calendar, User, Truck, 
  CreditCard, ChevronRight, Eye, AlertCircle
} from 'lucide-react';
import { createVendaAction, updateVendaStatusAction, deleteVendaAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function VendasView({ data }: Props) {
  const { vendas, produtos, clientes, user } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('ALL');

  // Drawer / Modais
  const [isNewVendaOpen, setIsNewVendaOpen] = useState(false);
  const [viewingVenda, setViewingVenda] = useState<AdminVenda | null>(null);
  const [feedback, setFeedback] = useState('');

  // Formulário Nova Venda
  const [clienteId, setClienteId] = useState<string>('');
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [contatoAvulso, setContatoAvulso] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [statusVenda, setStatusVenda] = useState('PAGO');
  const [desconto, setDesconto] = useState<number>(0);
  const [frete, setFrete] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');
  const [cartItens, setCartItens] = useState<Array<{ produtoId: number; quantidade: number; precoUnitario: number }>>([]);
  const [selectedAddProdId, setSelectedAddProdId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Vendas filtradas
  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      const matchSearch = 
        v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.cliente?.nome && v.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.nomeClienteAvulso && v.nomeClienteAvulso.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = selectedStatus === 'ALL' || v.status === selectedStatus;
      const matchPag = selectedFormaPagamento === 'ALL' || v.formaPagamento === selectedFormaPagamento;

      return matchSearch && matchStatus && matchPag;
    });
  }, [vendas, searchTerm, selectedStatus, selectedFormaPagamento]);

  // Cálculos do carrinho na criação de venda
  const carrinhoCalculado = useMemo(() => {
    let subtotal = 0;
    let custoTotal = 0;

    const itensDetalhados = cartItens.map(item => {
      const p = produtos.find(prod => prod.id === item.produtoId);
      const sub = item.precoUnitario * item.quantidade;
      const cst = (p?.precoCusto || 0) * item.quantidade;
      subtotal += sub;
      custoTotal += cst;
      return { ...item, produto: p, subtotal: sub, custoTotal: cst };
    });

    const valorTotal = Math.max(0, subtotal - (desconto || 0) + (frete || 0));
    const lucroTotal = (subtotal - (desconto || 0)) - custoTotal;

    return { subtotal, custoTotal, valorTotal, lucroTotal, itensDetalhados };
  }, [cartItens, produtos, desconto, frete]);

  const handleAddItemToCart = () => {
    if (!selectedAddProdId) return;
    const prodId = parseInt(selectedAddProdId);
    const prod = produtos.find(p => p.id === prodId);
    if (!prod) return;

    const existingIndex = cartItens.findIndex(it => it.produtoId === prodId);
    if (existingIndex >= 0) {
      const updated = [...cartItens];
      updated[existingIndex].quantidade += 1;
      setCartItens(updated);
    } else {
      setCartItens([...cartItens, { produtoId: prodId, quantidade: 1, precoUnitario: prod.precoVista || 0 }]);
    }
    setSelectedAddProdId('');
  };

  const handleRemoveCartItem = (idx: number) => {
    setCartItens(cartItens.filter((_, i) => i !== idx));
  };

  const handleUpdateItemQtd = (idx: number, qtd: number) => {
    const updated = [...cartItens];
    updated[idx].quantidade = Math.max(1, qtd);
    setCartItens(updated);
  };

  const handleCreateVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItens.length === 0) {
      setFormError('Adicione pelo menos um produto à venda.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createVendaAction({
        clienteId: clienteId ? parseInt(clienteId) : undefined,
        nomeClienteAvulso: nomeAvulso || undefined,
        contatoClienteAvulso: contatoAvulso || undefined,
        itens: cartItens,
        formaPagamento,
        desconto,
        frete,
        status: statusVenda,
        observacoes
      });

      setFeedback('Venda registrada com sucesso e estoque atualizado!');
      setIsNewVendaOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar venda.';
      setFormError(msg);
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (vendaId: number, newStatus: string) => {
    try {
      await updateVendaStatusAction(vendaId, newStatus);
      setFeedback(`Status da venda atualizado para ${newStatus}.`);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
      setFeedback(msg);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE VENDAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <ShoppingBag size={22} className="text-[#7a5828]" />
            Vendas & Gestão de Pedidos
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Registro de pedidos diretos, baixa automática em estoque, cálculo de lucro e status de entrega.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewVendaOpen(true);
            setCartItens([]);
            setFormError('');
          }}
          className="px-5 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-[#a37941]" />
          <span>Registrar Nova Venda</span>
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
            placeholder="Buscar por número do pedido (#VND-...) ou nome do cliente..."
            className="w-full pl-10 pr-4 py-2 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none font-medium"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</option>
          <option value="PAGO">Pago</option>
          <option value="PREPARANDO">Preparando</option>
          <option value="ENVIADO">Enviado</option>
          <option value="ENTREGUE">Entregue</option>
          <option value="CANCELADO">Cancelado</option>
        </select>

        <select
          value={selectedFormaPagamento}
          onChange={(e) => setSelectedFormaPagamento(e.target.value)}
          className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
        >
          <option value="ALL">Forma de Pagamento (Todas)</option>
          <option value="PIX">PIX</option>
          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
          <option value="CARTAO_DEBITO">Cartão de Débito</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="LINK_PAGAMENTO">Link de Pagamento</option>
        </select>
      </div>

      {/* TABELA DE VENDAS */}
      <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                <th className="py-3 px-4">Pedido / Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Itens</th>
                <th className="py-3 px-3 text-center">Pagamento</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-3 text-right">Lucro Bruto</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe5dc] text-xs">
              {filteredVendas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-[#71717a]">
                    Nenhuma venda registrada até o momento.
                  </td>
                </tr>
              ) : (
                filteredVendas.map((v) => {
                  const clienteNome = v.cliente?.nome || v.nomeClienteAvulso || 'Cliente Balcão';
                  const dataFormatada = new Date(v.data).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={v.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#09090b] block">{v.numero}</span>
                        <span className="text-[10px] text-[#71717a]">{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#09090b]">
                        {clienteNome}
                        {v.contatoClienteAvulso && (
                          <span className="text-[10px] text-[#52525b] block font-mono">{v.contatoClienteAvulso}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[#52525b] font-medium">
                          {v.itens.length} produto(s)
                        </span>
                        <span className="text-[10px] text-[#71717a] block line-clamp-1">
                          {v.itens.map(i => `${i.quantidade}x ${i.produto?.nome || 'Item'}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] text-[10px] font-bold text-[#09090b] border border-[#dcd5c7]">
                          {v.formaPagamento}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                        {v.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        +{v.lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <select
                          value={v.status}
                          onChange={(e) => handleUpdateStatus(v.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer ${
                            v.status === 'PAGO' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                            v.status === 'ENVIADO' ? 'bg-blue-50 text-blue-900 border-blue-300' :
                            v.status === 'ENTREGUE' ? 'bg-purple-50 text-purple-900 border-purple-300' :
                            v.status === 'CANCELADO' ? 'bg-red-50 text-red-900 border-red-300' :
                            'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          <option value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</option>
                          <option value="PAGO">Pago</option>
                          <option value="PREPARANDO">Preparando</option>
                          <option value="ENVIADO">Enviado</option>
                          <option value="ENTREGUE">Entregue</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setViewingVenda(v)}
                          className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                          title="Ver detalhes da venda"
                        >
                          <Eye size={14} />
                        </button>
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
      {/* DRAWER / MODAL: REGISTRAR NOVA VENDA (PDV) */}
      {/* ========================================================================= */}
      {isNewVendaOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#09090b]">Registrar Venda / Pedido</h3>
                <p className="text-xs text-[#52525b]">Venda direta com baixa automática de estoque</p>
              </div>
              <button onClick={() => setIsNewVendaOpen(false)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateVenda} className="space-y-4">
              {/* SELEÇÃO DE CLIENTE */}
              <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3">
                <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">1. Identificação do Cliente</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Cliente Cadastrado</label>
                    <select
                      value={clienteId}
                      onChange={(e) => { setClienteId(e.target.value); if (e.target.value) { setNomeAvulso(''); setContatoAvulso(''); } }}
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
                    >
                      <option value="">Cliente Avulso / Não cadastrado</option>
                      {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome} ({c.whatsapp || c.cidade || 'Sem contato'})</option>)}
                    </select>
                  </div>

                  {!clienteId && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Nome do Cliente Avulso</label>
                        <input
                          type="text"
                          value={nomeAvulso}
                          onChange={(e) => setNomeAvulso(e.target.value)}
                          placeholder="Ex: Beatriz Lima"
                          className="w-full px-3 py-2 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none font-medium"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SELEÇÃO DE PRODUTOS */}
              <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3">
                <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">2. Itens do Pedido</span>
                
                <div className="flex gap-2">
                  <select
                    value={selectedAddProdId}
                    onChange={(e) => setSelectedAddProdId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                  >
                    <option value="">Selecione um perfume ou cosmético para adicionar...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={String(p.id)} disabled={p.quantidade <= 0}>
                        {p.nome} — {p.marca} (Estoque: {p.quantidade} un.) — R$ {p.precoVista?.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="px-4 py-2 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Lista de Itens no Carrinho */}
                {cartItens.length === 0 ? (
                  <p className="text-xs text-[#71717a] py-3 text-center">Nenhum produto adicionado ainda.</p>
                ) : (
                  <div className="divide-y divide-[#ebe5dc] border border-[#dcd5c7] rounded-xl bg-white overflow-hidden">
                    {carrinhoCalculado.itensDetalhados.map((it, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="flex-1">
                          <span className="font-bold text-[#09090b]">{it.produto?.nome}</span>
                          <span className="text-[10px] text-[#52525b] ml-1">({it.produto?.marca})</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={it.produto?.quantidade || 99}
                            value={it.quantidade}
                            onChange={(e) => handleUpdateItemQtd(idx, parseInt(e.target.value) || 1)}
                            className="w-14 px-2 py-1 bg-[#f4efe6] text-xs font-bold text-center rounded-lg border border-[#dcd5c7] outline-none"
                          />
                          <span className="text-xs font-bold text-[#09090b] min-w-[70px] text-right">
                            {it.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAGAMENTO E TOTAIS */}
              <div className="p-4 rounded-2xl bg-[#f4efe6] border border-[#dcd5c7] space-y-3">
                <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">3. Pagamento & Valores</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Forma de Pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="LINK_PAGAMENTO">Link de Pagamento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Status da Venda</label>
                    <select
                      value={statusVenda}
                      onChange={(e) => setStatusVenda(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                    >
                      <option value="PAGO">Pago (Baixa imediata)</option>
                      <option value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</option>
                      <option value="PREPARANDO">Preparando Envio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={desconto}
                      onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Taxa de Frete (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={frete}
                      onChange={(e) => setFrete(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                    />
                  </div>
                </div>

                {/* Resumo Final da Venda */}
                <div className="pt-2 border-t border-[#dcd5c7] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#52525b]">Subtotal: R$ {carrinhoCalculado.subtotal.toFixed(2)}</span>
                    <span className="text-[11px] text-emerald-800 font-bold ml-3">Lucro: +R$ {carrinhoCalculado.lucroTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#52525b] mr-2">Valor Total a Pagar:</span>
                    <span className="text-lg font-bold text-[#09090b]">
                      {carrinhoCalculado.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsNewVendaOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || cartItens.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#a37941]" />
                      <span>Processando Venda...</span>
                    </>
                  ) : (
                    <span>Concluir Venda & Baixar Estoque</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER DETALHES DA VENDA */}
      {/* ========================================================================= */}
      {viewingVenda && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#7a5828]">{viewingVenda.numero}</span>
                <h3 className="text-lg font-serif font-bold text-[#09090b]">Detalhes do Pedido</h3>
              </div>
              <button onClick={() => setViewingVenda(null)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cliente */}
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#dcd5c7]">
                <span className="text-[10px] font-bold text-[#52525b] uppercase block mb-1">Cliente</span>
                <p className="font-bold text-[#09090b] text-sm">{viewingVenda.cliente?.nome || viewingVenda.nomeClienteAvulso || 'Cliente Balcão'}</p>
                {viewingVenda.cliente?.whatsapp && <p className="text-[11px] text-[#52525b]">WhatsApp: {viewingVenda.cliente.whatsapp}</p>}
                <p className="text-[10px] text-[#71717a] mt-1">Vendedor responsável: {viewingVenda.usuarioResponsavel || 'Sistema'}</p>
              </div>

              {/* Itens */}
              <div>
                <span className="text-[10px] font-bold text-[#52525b] uppercase block mb-1">Itens Comprados</span>
                <div className="divide-y divide-[#ebe5dc] border border-[#dcd5c7] rounded-xl bg-white overflow-hidden">
                  {viewingVenda.itens.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#09090b]">{it.produto?.nome}</span>
                        <span className="text-[11px] text-[#52525b] ml-1">({it.quantidade}x a R$ {it.precoUnitario.toFixed(2)})</span>
                      </div>
                      <span className="font-bold text-[#09090b]">
                        R$ {it.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="p-3.5 rounded-xl bg-[#f4efe6] border border-[#dcd5c7] space-y-1.5">
                <div className="flex justify-between text-[#52525b]">
                  <span>Subtotal:</span>
                  <span>R$ {viewingVenda.subtotal.toFixed(2)}</span>
                </div>
                {viewingVenda.desconto > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>Desconto:</span>
                    <span>-R$ {viewingVenda.desconto.toFixed(2)}</span>
                  </div>
                )}
                {viewingVenda.frete > 0 && (
                  <div className="flex justify-between text-[#52525b]">
                    <span>Frete:</span>
                    <span>+R$ {viewingVenda.frete.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#dcd5c7] flex justify-between font-bold text-sm text-[#09090b]">
                  <span>Valor Total:</span>
                  <span>R$ {viewingVenda.valorTotal.toFixed(2)} ({viewingVenda.formaPagamento})</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold text-xs pt-1">
                  <span>Lucro Líquido da Venda:</span>
                  <span>+R$ {viewingVenda.lucroTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
