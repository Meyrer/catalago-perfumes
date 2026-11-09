"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ERPData, AdminEncomenda, AdminProduto } from '../types';
import MonthFilter, { getMonthKey, isInMonth } from '../MonthFilter';
import { normalizeImageUrl } from '@/lib/image-url';
import { getBrandCollectionNumber } from '@/lib/product-order';
import { Clock, Download, Package, Plus, Search, MessageCircle, Pencil, X, Loader2 } from 'lucide-react';
import { createEncomendaAction, updateEncomendaStatusAction } from '../../actions';

type Props = {
  data: ERPData;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SOLICITACAO_RECEBIDA: { label: 'Solicitação Recebida', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando Sinal / Pagto', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  PEDIDO_REALIZADO: { label: 'Pedido ao Fornecedor', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  EM_TRANSITO: { label: 'Em Trânsito Internacional', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  RECEBIDO: { label: 'Recebido na Loja', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-300' },
  PRONTO_ENTREGA: { label: 'Pronto para Entrega', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  FINALIZADO: { label: 'Finalizado / Entregue', color: 'text-brand-chocolate', bg: 'bg-brand-nude', border: 'border-brand-line' },
  CANCELADO: { label: 'Cancelado', color: 'text-brand-chocolate', bg: 'bg-brand-rose-beige', border: 'border-brand-terracotta' },
};

function getOrderCode(order: AdminEncomenda): string {
  const sku = order.produto?.sku?.trim() ?? '';
  const nome = order.produto?.nome ?? order.descricaoItem.trim();
  const marca = order.produto?.marca ?? order.marca ?? '';
  const brandCollection = marca.trim().toUpperCase() === 'BRAND COLLECTION'
    || (!marca.trim() && /^Brand\s+Collection\b/i.test(nome));

  if (brandCollection) {
    const code = getBrandCollectionNumber({ nome, marca: 'BRAND COLLECTION', sku });
    if (code !== null) return String(code).padStart(3, '0');
  }
  if (!order.produto && (brandCollection || !marca.trim()) && /^\d{1,3}$/.test(nome)) {
    return nome.padStart(3, '0');
  }
  return sku;
}

function downloadOrderReport(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function EncomendasView({ data }: Props) {
  const router = useRouter();
  const { encomendas, clientes, fornecedores, produtos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey());

  // Formulário compartilhado entre cadastro e edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<AdminEncomenda | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isManualItem, setIsManualItem] = useState(false);
  const [descricaoItem, setDescricaoItem] = useState('');
  const [marca, setMarca] = useState('');
  const [volume, setVolume] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [precoEstimado, setPrecoEstimado] = useState<number | ''>('');
  const [custoEstimado, setCustoEstimado] = useState<number | ''>('');
  const [valorAdiantamento, setValorAdiantamento] = useState<number>(0);
  const [fornecedorId, setFornecedorId] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  const matchingProducts = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(productSearch.trim());
    if (!query) return [];
    const terms = query.split(/\s+/);
    return produtos.filter(product => {
      const searchable = normalize([product.nome, product.marca, product.volume, product.sku, product.codigoBarras].join(' '));
      return terms.every(term => searchable.includes(term));
    }).slice(0, 8);
  }, [produtos, productSearch]);

  // Encomendas filtradas
  const filteredEncomendas = useMemo(() => {
    return encomendas.filter(e => {
      const matchSearch = 
        e.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.descricaoItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.produto?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.marca && e.marca.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = filterStatus === 'ALL' || e.status === filterStatus;
      return matchSearch && matchStatus && isInMonth(e.createdAt, selectedMonth);
    });
  }, [encomendas, searchTerm, filterStatus, selectedMonth]);

  const exportOrders = () => {
    const textCell = (value: string) => `"${(/^(?:[\t\r\n]|\s*[=+@-])/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const moneyCell = (value: number | null) => value === null ? '' : value.toFixed(2).replace('.', ',');
    const rows = ['Encomenda;Data;Cliente;Perfume;SKU;Marca;Volume;Quantidade;Fornecedor;Preço estimado (R$);Custo estimado (R$);Sinal pago (R$);Previsão;Status;Observações'];
    for (const order of filteredEncomendas) {
      rows.push([
        textCell(order.numero),
        new Date(order.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        textCell(order.nomeCliente),
        textCell(order.produto?.nome ?? order.descricaoItem),
        textCell(order.produto?.sku ?? ''),
        textCell(order.produto?.marca ?? order.marca ?? ''),
        textCell(order.produto?.volume ?? order.volume ?? ''),
        order.quantidade,
        textCell(order.fornecedor?.nome ?? ''),
        moneyCell(order.precoEstimado),
        moneyCell(order.custoEstimado),
        moneyCell(order.valorAdiantamento),
        textCell(order.previsaoChegada ?? ''),
        textCell(STATUS_CONFIG[order.status]?.label ?? order.status),
        textCell(order.observacoes ?? ''),
      ].join(';'));
    }

    downloadOrderReport(
      new Blob(['\uFEFF', rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }),
      `encomendas-perfumio-${selectedMonth || 'todos-os-meses'}.csv`,
    );
  };

  const exportOrdersTxt = () => {
    const totals = new Map<string, { quantidade: number; nome: string }>();
    let semCodigo = 0;
    for (const order of filteredEncomendas) {
      const code = getOrderCode(order);
      if (!code) {
        semCodigo += 1;
        continue;
      }
      const previous = totals.get(code);
      totals.set(code, {
        quantidade: (previous?.quantidade ?? 0) + order.quantidade,
        nome: order.produto?.nome ?? previous?.nome ?? order.descricaoItem,
      });
    }

    if (totals.size === 0) {
      setFeedback('Nenhuma encomenda dos filtros selecionados tem código para exportar.');
      return;
    }

    const lines = [...totals].sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }))
      .map(([code, { quantidade, nome }]) => `${code}, ${quantidade} — ${nome.replace(/\s+/g, ' ').trim()}`);
    downloadOrderReport(
      new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }),
      `encomendas-perfumio-${selectedMonth || 'todos-os-meses'}.txt`,
    );
    setFeedback(semCodigo ? `Encomendas sem código fora do TXT: ${semCodigo}.` : 'Lista TXT exportada.');
  };

  const openOrderForm = (order: AdminEncomenda | null) => {
    setEditingOrder(order);
    setClienteId(order?.clienteId?.toString() ?? '');
    setNomeCliente(order?.nomeCliente ?? '');
    setWhatsappCliente(order?.whatsappCliente ?? '');
    setProdutoId(order?.produtoId ?? null);
    setProductSearch('');
    setIsManualItem(Boolean(order && !order.produtoId));
    setDescricaoItem(order?.descricaoItem ?? '');
    setMarca(order?.marca ?? '');
    setVolume(order?.volume ?? '');
    setQuantidade(order?.quantidade ?? 1);
    setPrecoEstimado(order?.precoEstimado ?? '');
    setCustoEstimado(order?.custoEstimado ?? '');
    setValorAdiantamento(order?.valorAdiantamento ?? 0);
    setFornecedorId(order?.fornecedorId?.toString() ?? '');
    setPrevisaoChegada(order?.previsaoChegada ?? '');
    setObservacoes(order?.observacoes ?? '');
    setFormError('');
    setIsFormOpen(true);
  };

  const selectProduct = (product: AdminProduto) => {
    setProdutoId(product.id);
    setDescricaoItem(product.nome);
    setMarca(product.marca);
    setVolume(product.volume ?? '');
    setProductSearch('');
    setIsManualItem(false);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!nomeCliente.trim() || !descricaoItem.trim() || (produtoId === null && !isManualItem)) {
      setFormError('Informe o cliente e selecione um perfume ou cadastre um item avulso.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        clienteId: clienteId ? parseInt(clienteId) : undefined,
        nomeCliente,
        whatsappCliente,
        produtoId: produtoId ?? undefined,
        descricaoItem,
        marca,
        volume,
        quantidade,
        precoEstimado: precoEstimado === '' ? undefined : precoEstimado,
        custoEstimado: custoEstimado === '' ? undefined : custoEstimado,
        valorAdiantamento,
        fornecedorId: fornecedorId ? parseInt(fornecedorId) : undefined,
        previsaoChegada,
        observacoes
      };

      if (editingOrder) {
        const response = await fetch(`/api/erp/orders/${editingOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            produtoId,
            precoEstimado: payload.precoEstimado ?? null,
            custoEstimado: payload.custoEstimado ?? null,
            updatedAt: new Date(editingOrder.updatedAt).toISOString(),
          }),
        });
        const result: { success?: boolean; error?: string } | null = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Não foi possível salvar a encomenda. Tente novamente.');
        }
        setFeedback('Encomenda atualizada com sucesso!');
        setIsFormOpen(false);
        router.refresh();
        return;
      }

      await createEncomendaAction(payload);
      setFeedback('Encomenda registrada com sucesso!');
      setIsFormOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar a encomenda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateEncomendaStatusAction(id, status);
      setFeedback('Status da encomenda atualizado!');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
      setFeedback(msg);
    }
  };

  const getWhatsAppMessageUrl = (enc: AdminEncomenda) => {
    const rawNumber = enc.whatsappCliente || enc.cliente?.whatsapp || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    const phone = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    
    let statusText = '';
    if (enc.status === 'PEDIDO_REALIZADO') statusText = 'seu pedido foi realizado junto ao nosso importador oficial';
    else if (enc.status === 'EM_TRANSITO') statusText = 'sua encomenda já está em trânsito com previsão de chegada para breve';
    else if (enc.status === 'RECEBIDO' || enc.status === 'PRONTO_ENTREGA') statusText = 'seu perfume chegou na loja e já está pronto para entrega/retirada';
    else statusText = `houve uma atualização no seu pedido: ${STATUS_CONFIG[enc.status]?.label || enc.status}`;

    const text = `Olá, ${enc.nomeCliente}! Tudo bem? Passando para avisar que sobre sua encomenda *${enc.descricaoItem}* (${enc.numero}): ${statusText}! Qualquer dúvida estou à disposição na Perfumio. ✨`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE ENCOMENDAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-5 sm:p-6 rounded-3xl border border-brand-line shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate flex items-center gap-2.5">
            <Clock size={22} className="text-brand-muted" />
            Fluxo de Produtos Sob Encomenda
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Acompanhamento ciclo de vida em 8 estágios: solicitação, sinal, pedido ao fornecedor, trânsito e entrega.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportOrders} disabled={filteredEncomendas.length === 0} title="Exportar encomendas dos filtros selecionados" className="inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2 text-brand-chocolate hover:bg-brand-nude">
            <Download size={16} aria-hidden="true" /> Exportar lista CSV
          </button>
          <button type="button" onClick={exportOrdersTxt} disabled={filteredEncomendas.length === 0} title="Exportar códigos e quantidades dos filtros selecionados" className="inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2 text-brand-chocolate hover:bg-brand-nude">
            <Download size={16} aria-hidden="true" /> Exportar TXT
          </button>
          <button
            type="button"
            onClick={() => openOrderForm(null)}
            className="px-5 py-2.5 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} className="text-brand-caramel" />
            <span>Registrar Nova Encomenda</span>
          </button>
        </div>
      </div>

      <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />

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
            placeholder="Buscar por cliente, perfume (#ENC-...) ou marca..."
            className="w-full pl-10 pr-4 py-2 bg-brand-nude focus:bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none font-medium"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-brand-nude text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none cursor-pointer"
        >
          <option value="ALL">Todos os Estágios ({encomendas.length})</option>
          {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
            <option key={st} value={st}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* TABELA DE ENCOMENDAS */}
      <div className="bg-brand-card rounded-2xl border border-brand-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream border-b border-brand-line text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                <th className="py-3 px-4">Código / Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Perfume / Item</th>
                <th className="py-3 px-3 text-right">Preço Estimado</th>
                <th className="py-3 px-3 text-right">Sinal Pago</th>
                <th className="py-3 px-3">Previsão</th>
                <th className="py-3 px-3 text-center">Status do Ciclo</th>
                <th className="py-3 px-4 text-right">Notificar / Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-nude text-xs">
              {filteredEncomendas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-brand-muted">
                    Nenhuma encomenda em andamento com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEncomendas.map((enc) => {
                  const cfg = STATUS_CONFIG[enc.status] || STATUS_CONFIG.SOLICITACAO_RECEBIDA;
                  const photoUrl = normalizeImageUrl(enc.produto?.fotos[0]?.url);
                  const dataFormatada = new Date(enc.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  });

                  return (
                    <tr key={enc.id} className="hover:bg-brand-cream transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-brand-muted block">{enc.numero}</span>
                        <span className="text-[10px] text-brand-muted">{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-brand-chocolate">
                        {enc.nomeCliente}
                        {enc.whatsappCliente && (
                          <span className="text-[10px] text-brand-muted block font-mono">{enc.whatsappCliente}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-line bg-brand-card" aria-hidden="true">
                            <Package size={18} className="text-brand-muted" />
                            {photoUrl && (
                              <img key={photoUrl} src={photoUrl} alt="" width={44} height={44} loading="lazy" className="absolute inset-0 size-full bg-brand-card object-contain p-0.5" onError={event => { event.currentTarget.hidden = true; }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-brand-chocolate block">{enc.descricaoItem}</span>
                            <span className="text-[11px] text-brand-muted">
                              {enc.produto?.sku ? `${enc.produto.sku} • ` : ''}
                              {enc.marca ? enc.marca : ''} {enc.volume ? `• ${enc.volume}` : ''} • Qtd: {enc.quantidade}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-brand-chocolate">
                        {enc.precoEstimado ? enc.precoEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'A definir'}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-brand-chocolate">
                        {enc.valorAdiantamento > 0 ? enc.valorAdiantamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem sinal'}
                      </td>

                      <td className="py-3 px-3 text-brand-muted font-medium text-[11px]">
                        {enc.previsaoChegada || '—'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <select
                          value={enc.status}
                          onChange={(e) => handleUpdateStatus(enc.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer ${cfg.bg} ${cfg.color} ${cfg.border}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([st, c]) => (
                            <option key={st} value={st}>{c.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openOrderForm(enc)}
                            aria-label={`Editar encomenda ${enc.numero}`}
                            title="Editar encomenda"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-card px-2.5 py-1 text-brand-chocolate hover:bg-brand-nude"
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Editar
                          </button>
                          {(enc.whatsappCliente || enc.cliente?.whatsapp) && (
                            <a
                              href={getWhatsAppMessageUrl(enc)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-brand-nude hover:bg-brand-nude text-brand-chocolate border border-brand-line transition-colors cursor-pointer"
                              title="Enviar atualização no WhatsApp do cliente"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
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
      {/* MODAL: CADASTRO E EDIÇÃO DE ENCOMENDA */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="order-form-title" className="bg-brand-card w-full max-w-xl rounded-3xl border border-brand-line shadow-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <h3 id="order-form-title" className="text-xl font-serif font-bold text-brand-chocolate">{editingOrder ? 'Editar Encomenda' : 'Registrar Nova Encomenda'}</h3>
                <p className="text-xs text-brand-muted">{editingOrder ? editingOrder.numero : 'Cadastro de solicitação sob encomenda com previsão e sinal'}</p>
              </div>
              <button type="button" aria-label="Fechar formulário" disabled={isSubmitting} onClick={() => setIsFormOpen(false)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-brand-rose-beige border border-brand-terracotta text-brand-chocolate text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* DADOS DO CLIENTE */}
              <div className="p-3.5 rounded-2xl bg-brand-cream border border-brand-line space-y-3">
                <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block">1. Cliente</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Cliente Cadastrado</label>
                    <select
                      value={clienteId}
                      onChange={(e) => {
                        setClienteId(e.target.value);
                        const c = clientes.find(cli => cli.id === parseInt(e.target.value));
                        if (c) {
                          setNomeCliente(c.nome);
                          setWhatsappCliente(c.whatsapp || '');
                        }
                      }}
                      className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none cursor-pointer"
                    >
                      <option value="">Cliente Novo / Avulso</option>
                      {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Ex: Dra. Mariana Siqueira"
                      className="w-full px-3 py-2 bg-brand-card text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">WhatsApp (DDD + Número)</label>
                  <input
                    type="text"
                    value={whatsappCliente}
                    onChange={(e) => setWhatsappCliente(e.target.value)}
                    placeholder="11988887777"
                    className="w-full px-3 py-2 bg-brand-card text-xs font-mono text-brand-chocolate rounded-xl border border-brand-line outline-none"
                  />
                </div>
              </div>

              {/* DETALHES DO ITEM ENCOMENDADO */}
              <div className="p-3.5 rounded-2xl bg-brand-cream border border-brand-line space-y-3">
                <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block">2. Item Solicitado</span>

                {produtoId !== null && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-line bg-brand-card p-3">
                    <div>
                      <p className="font-semibold">{descricaoItem}</p>
                      <p className="text-xs text-brand-muted">{[marca, volume, produtos.find(product => product.id === produtoId)?.sku].filter(Boolean).join(' · ')}</p>
                    </div>
                    <button type="button" onClick={() => setProdutoId(null)} className="rounded-lg border border-brand-line px-3 text-brand-chocolate hover:bg-brand-nude">Trocar perfume</button>
                  </div>
                )}

                {produtoId === null && !isManualItem && (
                  <div className="space-y-2">
                    <label htmlFor="order-product-search" className="block text-xs font-semibold text-brand-muted">Buscar no catálogo</label>
                    <input id="order-product-search" type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Digite o nome, a marca ou o código" className="w-full px-3 py-2 bg-brand-card rounded-xl border border-brand-line" />
                    {matchingProducts.length > 0 && (
                      <ul className="max-h-48 overflow-y-auto divide-y divide-brand-line rounded-lg border border-brand-line bg-brand-card" aria-label="Perfumes encontrados">
                        {matchingProducts.map(product => (
                          <li key={product.id}>
                            <button type="button" onClick={() => selectProduct(product)} className="block w-full px-3 py-2 text-left hover:bg-brand-nude">
                              <span className="block whitespace-normal font-semibold">{product.nome}</span>
                              <span className="block whitespace-normal text-xs text-brand-muted">{[product.marca, product.volume, product.sku].filter(Boolean).join(' · ')}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {productSearch.trim() && matchingProducts.length === 0 && <p className="text-xs text-brand-muted">Nenhum perfume encontrado.</p>}
                    {productSearch.trim() && (
                      <button type="button" onClick={() => {
                        const description = productSearch.trim();
                        if (description !== descricaoItem) {
                          setDescricaoItem(description);
                          setMarca('');
                          setVolume('');
                        }
                        setIsManualItem(true);
                      }} className="rounded-lg border border-brand-line bg-brand-card px-3 text-brand-chocolate hover:bg-brand-nude">Cadastrar item avulso</button>
                    )}
                  </div>
                )}

                {isManualItem && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-brand-muted">Item avulso</span>
                      <button type="button" onClick={() => { setProductSearch(descricaoItem); setIsManualItem(false); }} className="rounded-lg border border-brand-line bg-brand-card px-3 text-brand-chocolate hover:bg-brand-nude">Buscar no catálogo</button>
                    </div>
                    <label htmlFor="order-item-description" className="block text-xs font-semibold text-brand-muted">Nome do perfume *</label>
                    <input id="order-item-description" type="text" required value={descricaoItem} onChange={event => setDescricaoItem(event.target.value)} className="w-full px-3 py-2 bg-brand-card rounded-xl border border-brand-line" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isManualItem && (
                    <>
                      <label className="block text-xs font-semibold text-brand-muted">Marca
                        <input type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Tom Ford" className="mt-1 w-full px-3 py-1.5 bg-brand-card rounded-xl border border-brand-line" />
                      </label>
                      <label className="block text-xs font-semibold text-brand-muted">Volume
                        <input type="text" value={volume} onChange={e => setVolume(e.target.value)} placeholder="50ml" className="mt-1 w-full px-3 py-1.5 bg-brand-card rounded-xl border border-brand-line" />
                      </label>
                    </>
                  )}
                  <div>
                    <label htmlFor="order-item-quantity" className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Quantidade</label>
                    <input id="order-item-quantity" type="number" min="1" value={quantidade} onChange={e => setQuantidade(parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 bg-brand-card text-xs font-bold text-center text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                  </div>
                </div>
              </div>

              {/* PREÇOS, SINAL E FORNECEDOR */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Preço Venda Estimado</label>
                  <input type="number" min="0" step="0.01" value={precoEstimado} onChange={e => setPrecoEstimado(e.target.value === '' ? '' : e.target.valueAsNumber)} className="w-full px-3 py-1.5 bg-brand-nude text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Custo Estimado</label>
                  <input type="number" min="0" step="0.01" value={custoEstimado} onChange={e => setCustoEstimado(e.target.value === '' ? '' : e.target.valueAsNumber)} className="w-full px-3 py-1.5 bg-brand-nude text-xs font-bold text-brand-deep rounded-xl border border-brand-line outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Valor do Sinal / Pago</label>
                  <input type="number" min="0" step="0.01" value={valorAdiantamento} onChange={e => setValorAdiantamento(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-brand-nude text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Fornecedor Encarregado</label>
                  <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className="w-full px-3 py-1.5 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none">
                    <option value="">Ainda não definido</option>
                    {fornecedores.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Previsão de Chegada</label>
                  <input type="text" value={previsaoChegada} onChange={e => setPrevisaoChegada(e.target.value)} placeholder="Ex: Em 10 dias úteis" className="w-full px-3 py-1.5 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
              </div>

              <div>
                <label htmlFor="order-notes" className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Observações</label>
                <textarea id="order-notes" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} maxLength={5000} className="w-full px-3 py-1.5 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
              </div>

              {/* BOTÕES */}
              <div className="pt-3 border-t border-brand-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-brand-line text-xs font-bold text-brand-muted hover:bg-brand-nude transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-brand-caramel" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingOrder ? 'Salvar Alterações' : 'Registrar Encomenda'}</span>
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
