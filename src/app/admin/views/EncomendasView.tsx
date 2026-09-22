"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminEncomenda } from '../types';
import { 
  Clock, Plus, Search, MessageCircle, ChevronRight, 
  CheckCircle2, AlertCircle, X, Loader2, DollarSign, 
  Truck, ArrowRight, User
} from 'lucide-react';
import { createEncomendaAction, updateEncomendaStatusAction, deleteEncomendaAction } from '../../actions';

type Props = {
  data: ERPData;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SOLICITACAO_RECEBIDA: { label: 'Solicitação Recebida', color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando Sinal / Pagto', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-300' },
  PEDIDO_REALIZADO: { label: 'Pedido ao Fornecedor', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-300' },
  EM_TRANSITO: { label: 'Em Trânsito Internacional', color: 'text-indigo-800', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  RECEBIDO: { label: 'Recebido na Loja', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-300' },
  PRONTO_ENTREGA: { label: 'Pronto para Entrega', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-300' },
  FINALIZADO: { label: 'Finalizado / Entregue', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-300' },
};

export default function EncomendasView({ data }: Props) {
  const { encomendas, clientes, fornecedores, produtos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal Nova Encomenda
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  const [descricaoItem, setDescricaoItem] = useState('');
  const [marca, setMarca] = useState('');
  const [volume, setVolume] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [precoEstimado, setPrecoEstimado] = useState<number>(0);
  const [custoEstimado, setCustoEstimado] = useState<number>(0);
  const [valorAdiantamento, setValorAdiantamento] = useState<number>(0);
  const [fornecedorId, setFornecedorId] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  // Encomendas filtradas
  const filteredEncomendas = useMemo(() => {
    return encomendas.filter(e => {
      const matchSearch = 
        e.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.descricaoItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.marca && e.marca.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = filterStatus === 'ALL' || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [encomendas, searchTerm, filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim() || !descricaoItem.trim()) {
      setFormError('Informe o nome do cliente e o item encomendado.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createEncomendaAction({
        clienteId: clienteId ? parseInt(clienteId) : undefined,
        nomeCliente,
        whatsappCliente,
        descricaoItem,
        marca,
        volume,
        quantidade,
        precoEstimado,
        custoEstimado,
        valorAdiantamento,
        fornecedorId: fornecedorId ? parseInt(fornecedorId) : undefined,
        previsaoChegada,
        observacoes
      });

      setFeedback('Encomenda registrada com sucesso!');
      setIsNewOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar encomenda.';
      setFormError(msg);
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

    const text = `Olá, ${enc.nomeCliente}! Tudo bem? Passando para avisar que sobre sua encomenda *${enc.descricaoItem}* (${enc.numero}): ${statusText}! Qualquer dúvida estou à disposição na Elegance. ✨`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE ENCOMENDAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <Clock size={22} className="text-[#7a5828]" />
            Fluxo de Produtos Sob Encomenda
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Acompanhamento ciclo de vida em 8 estágios: solicitação, sinal, pedido ao fornecedor, trânsito e entrega.
          </p>
        </div>

        <button
          onClick={() => { setIsNewOpen(true); setFormError(''); }}
          className="px-5 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-[#a37941]" />
          <span>Registrar Nova Encomenda</span>
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
            placeholder="Buscar por cliente, perfume (#ENC-...) ou marca..."
            className="w-full pl-10 pr-4 py-2 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none font-medium"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
        >
          <option value="ALL">Todos os Estágios ({encomendas.length})</option>
          {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
            <option key={st} value={st}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* TABELA DE ENCOMENDAS */}
      <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#ebe5dc] text-xs">
              {filteredEncomendas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-[#71717a]">
                    Nenhuma encomenda em andamento com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEncomendas.map((enc) => {
                  const cfg = STATUS_CONFIG[enc.status] || STATUS_CONFIG.SOLICITACAO_RECEBIDA;
                  const dataFormatada = new Date(enc.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  });

                  return (
                    <tr key={enc.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#7a5828] block">{enc.numero}</span>
                        <span className="text-[10px] text-[#71717a]">{dataFormatada}</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#09090b]">
                        {enc.nomeCliente}
                        {enc.whatsappCliente && (
                          <span className="text-[10px] text-[#52525b] block font-mono">{enc.whatsappCliente}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-[#09090b] block">{enc.descricaoItem}</span>
                        <span className="text-[11px] text-[#52525b]">
                          {enc.marca ? enc.marca : ''} {enc.volume ? `• ${enc.volume}` : ''} • Qtd: {enc.quantidade}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                        {enc.precoEstimado ? enc.precoEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'A definir'}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-emerald-800">
                        {enc.valorAdiantamento > 0 ? enc.valorAdiantamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem sinal'}
                      </td>

                      <td className="py-3 px-3 text-[#52525b] font-medium text-[11px]">
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
                          {(enc.whatsappCliente || enc.cliente?.whatsapp) && (
                            <a
                              href={getWhatsAppMessageUrl(enc)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
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
      {/* MODAL: REGISTRAR NOVA ENCOMENDA */}
      {/* ========================================================================= */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#09090b]">Registrar Nova Encomenda</h3>
                <p className="text-xs text-[#52525b]">Cadastro de solicitação sob encomenda com previsão e sinal</p>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* DADOS DO CLIENTE */}
              <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3">
                <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">1. Cliente</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Cliente Cadastrado</label>
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
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
                    >
                      <option value="">Cliente Novo / Avulso</option>
                      {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Ex: Dra. Mariana Siqueira"
                      className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">WhatsApp (DDD + Número)</label>
                  <input
                    type="text"
                    value={whatsappCliente}
                    onChange={(e) => setWhatsappCliente(e.target.value)}
                    placeholder="11988887777"
                    className="w-full px-3 py-2 bg-white text-xs font-mono text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                  />
                </div>
              </div>

              {/* DETALHES DO ITEM ENCOMENDADO */}
              <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3">
                <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">2. Item Solicitado</span>
                
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Descrição / Nome do Perfume *</label>
                  <input
                    type="text"
                    required
                    value={descricaoItem}
                    onChange={(e) => setDescricaoItem(e.target.value)}
                    placeholder="Ex: Tom Ford Lost Cherry EDP"
                    className="w-full px-3 py-2 bg-white text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Marca</label>
                    <input type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Tom Ford" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Volume</label>
                    <input type="text" value={volume} onChange={e => setVolume(e.target.value)} placeholder="50ml" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Quantidade</label>
                    <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 bg-white text-xs font-bold text-center text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
                  </div>
                </div>
              </div>

              {/* PREÇOS, SINAL E FORNECEDOR */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Preço Venda Estimado</label>
                  <input type="number" step="0.01" value={precoEstimado} onChange={e => setPrecoEstimado(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Custo Estimado</label>
                  <input type="number" step="0.01" value={custoEstimado} onChange={e => setCustoEstimado(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-[#f4efe6] text-xs font-bold text-[#5c401c] rounded-xl border border-[#dcd5c7] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Valor do Sinal / Pago</label>
                  <input type="number" step="0.01" value={valorAdiantamento} onChange={e => setValorAdiantamento(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-[#f4efe6] text-xs font-bold text-emerald-800 rounded-xl border border-[#dcd5c7] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Fornecedor Encarregado</label>
                  <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none">
                    <option value="">Ainda não definido</option>
                    {fornecedores.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Previsão de Chegada</label>
                  <input type="text" value={previsaoChegada} onChange={e => setPrevisaoChegada(e.target.value)} placeholder="Ex: Em 10 dias úteis" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#a37941]" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Registrar Encomenda</span>
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
