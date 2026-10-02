"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminCliente } from '../types';
import { 
  Users, Plus, Search, MessageCircle, AtSign, 
  Mail, MapPin, Calendar, ShoppingBag, DollarSign, 
  ChevronRight, X, Loader2, Edit3, Heart
} from 'lucide-react';
import { createClienteAction, updateClienteAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function ClientesView({ data }: Props) {
  const { clientes, vendas } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<AdminCliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<AdminCliente | null>(null);

  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  // Clientes com métricas calculadas
  const clientesComMetricas = useMemo(() => {
    return clientes.map(c => {
      const cliVendas = vendas.filter(v => v.clienteId === c.id && (v.status === 'PAGO' || v.status === 'ENVIADO' || v.status === 'ENTREGUE'));
      const totalGasto = cliVendas.reduce((acc, v) => acc + v.valorTotal, 0);
      const qtdCompras = cliVendas.length;
      const ticketMedio = qtdCompras > 0 ? (totalGasto / qtdCompras) : 0;
      
      const datas = cliVendas.map(v => new Date(v.data).getTime());
      const ultimaCompra = datas.length > 0 ? new Date(Math.max(...datas)) : null;

      // Marcas preferidas
      const marcasCount = new Map<string, number>();
      for (const v of cliVendas) {
        for (const it of v.itens) {
          const m = it.produto?.marca;
          if (m) marcasCount.set(m, (marcasCount.get(m) || 0) + it.quantidade);
        }
      }
      const marcasPreferidas = Array.from(marcasCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

      return {
        ...c,
        totalGasto,
        qtdCompras,
        ticketMedio,
        ultimaCompra,
        marcasPreferidas,
        cliVendas
      };
    });
  }, [clientes, vendas]);

  const filteredClientes = useMemo(() => {
    return clientesComMetricas.filter(c => {
      return (
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.whatsapp && c.whatsapp.includes(searchTerm)) ||
        (c.cidade && c.cidade.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.instagram && c.instagram.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [clientesComMetricas, searchTerm]);

  const handleOpenCreate = () => {
    setEditingCliente(null);
    setNome('');
    setWhatsapp('');
    setInstagram('');
    setEmail('');
    setCidade('');
    setDataNascimento('');
    setObservacoes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: AdminCliente) => {
    setEditingCliente(c);
    setNome(c.nome);
    setWhatsapp(c.whatsapp || '');
    setInstagram(c.instagram || '');
    setEmail(c.email || '');
    setCidade(c.cidade || '');
    setDataNascimento(c.dataNascimento || '');
    setObservacoes(c.observacoes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFormError('O nome do cliente é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingCliente) {
        await updateClienteAction(editingCliente.id, {
          nome,
          whatsapp,
          instagram,
          email,
          cidade,
          dataNascimento,
          observacoes
        });
        setFeedback('Cliente atualizado com sucesso!');
      } else {
        await createClienteAction({
          nome,
          whatsapp,
          instagram,
          email,
          cidade,
          dataNascimento,
          observacoes
        });
        setFeedback('Cliente cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cliente.';
      setFormError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE CLIENTES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-5 sm:p-6 rounded-3xl border border-brand-line shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate flex items-center gap-2.5">
            <Users size={22} className="text-brand-muted" />
            Clientes VIP & CRM da Perfumio
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Histórico de consumo, LTV (Total gasto), preferências olfativas e contato direto pelo WhatsApp.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-brand-caramel" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-brand-nude border border-brand-line text-brand-chocolate text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* BUSCA */}
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do cliente, WhatsApp, cidade ou Instagram..."
            className="w-full pl-10 pr-4 py-2 bg-brand-nude focus:bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none font-medium"
          />
        </div>
      </div>

      {/* GRID DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClientes.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-brand-muted bg-brand-card rounded-3xl border border-brand-line">
            Nenhum cliente cadastrado ou correspondente à busca.
          </div>
        ) : (
          filteredClientes.map((c) => {
            const rawNumber = c.whatsapp ? c.whatsapp.replace(/\D/g, '') : '';
            const phone = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
            const whatsappUrl = rawNumber ? `https://wa.me/${phone}` : null;

            return (
              <div key={c.id} className="bg-brand-card rounded-3xl border border-brand-line p-5 shadow-xs flex flex-col justify-between hover:border-brand-caramel/50 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-brand-chocolate leading-tight">
                        {c.nome}
                      </h3>
                      {c.cidade && (
                        <p className="text-[11px] text-brand-muted flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-brand-muted" /> {c.cidade}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-brand-chocolate hover:bg-brand-nude transition-colors cursor-pointer"
                      title="Editar cadastro"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>

                  {/* Redes e Contatos */}
                  <div className="flex flex-wrap gap-2 text-[11px] mb-4">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-nude hover:bg-brand-nude text-brand-chocolate font-bold border border-brand-line transition-colors"
                      >
                        <MessageCircle size={12} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {c.instagram && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-nude text-brand-chocolate font-medium border border-brand-line">
                        <AtSign size={12} className="text-brand-caramel" />
                        <span>{c.instagram}</span>
                      </span>
                    )}
                  </div>

                  {/* Métricas do Perfil */}
                  <div className="p-3.5 rounded-2xl bg-brand-cream border border-brand-line grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <span className="text-[9px] font-bold text-brand-muted uppercase block">Total Gasto</span>
                      <span className="text-xs font-bold text-brand-chocolate">
                        {c.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-brand-muted uppercase block">Compras</span>
                      <span className="text-xs font-bold text-brand-chocolate">{c.qtdCompras} pedidos</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-brand-muted uppercase block">Ticket Médio</span>
                      <span className="text-xs font-bold text-brand-muted">
                        {c.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Marcas Preferidas */}
                  {c.marcasPreferidas.length > 0 && (
                    <div className="text-[11px] text-brand-muted mb-2 flex items-center gap-1.5 flex-wrap">
                      <Heart size={12} className="text-brand-caramel shrink-0" />
                      <span className="font-semibold text-brand-chocolate">Grifes favoritas:</span>
                      {c.marcasPreferidas.map((m, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-brand-nude text-[10px] font-bold text-brand-muted">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Observações */}
                  {c.observacoes && (
                    <p className="text-[11px] text-brand-muted line-clamp-2 italic bg-brand-cream p-2 rounded-xl border border-brand-nude">
                      &ldquo;{c.observacoes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-brand-nude mt-3 flex items-center justify-between text-[11px] text-brand-muted">
                  <span>Última compra: {c.ultimaCompra ? c.ultimaCompra.toLocaleDateString('pt-BR') : 'Nunca comprou'}</span>
                  <button
                    onClick={() => setSelectedCliente(c)}
                    className="font-bold text-brand-muted hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    Ver Histórico <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO DE CLIENTE */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-md rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-brand-chocolate">
                  {editingCliente ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <p className="text-xs text-brand-muted">Informações de contato e perfil de preferências</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-brand-rose-beige border border-brand-terracotta text-brand-chocolate text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Nome Completo *</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Dra. Mariana Siqueira" className="w-full px-3.5 py-2 bg-brand-cream text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">WhatsApp</label>
                  <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11988887777" className="w-full px-3.5 py-2 bg-brand-cream text-xs font-mono text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Instagram</label>
                  <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@marianasiqueira" className="w-full px-3.5 py-2 bg-brand-cream text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Cidade / Estado</label>
                  <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo - SP" className="w-full px-3.5 py-2 bg-brand-cream text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Data de Nascimento</label>
                  <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="w-full px-3.5 py-2 bg-brand-cream text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mariana@email.com" className="w-full px-3.5 py-2 bg-brand-cream text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Notas / Preferências Olfativas</label>
                <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Prefere perfumes doces marcantes, alérgica a lavanda..." className="w-full px-3.5 py-2 bg-brand-cream text-xs text-brand-chocolate rounded-xl border border-brand-line outline-none resize-none" />
              </div>

              <div className="pt-3 border-t border-brand-line flex items-center justify-end gap-2.5">
                <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-brand-line text-xs font-bold text-brand-muted hover:bg-brand-nude transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin text-brand-caramel" /> : <span>{editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO COMPLETO DO CLIENTE */}
      {/* ========================================================================= */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-lg rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-brand-chocolate">{selectedCliente.nome}</h3>
                <p className="text-xs text-brand-muted">Histórico de compras e encomendas</p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block">Pedidos Realizados ({selectedCliente.vendas?.length || 0})</span>
              
              {(!selectedCliente.vendas || selectedCliente.vendas.length === 0) ? (
                <p className="text-xs text-brand-muted py-6 text-center">Nenhum pedido finalizado ainda.</p>
              ) : (
                <div className="divide-y divide-brand-nude border border-brand-line rounded-2xl bg-brand-card overflow-hidden text-xs">
                  {selectedCliente.vendas.map(v => (
                    <div key={v.id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-brand-chocolate">{v.numero}</span>
                        <span className="font-bold text-brand-chocolate">{v.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <p className="text-[11px] text-brand-muted">
                        {v.itens.map(i => `${i.quantidade}x ${i.produto?.nome || 'Produto'}`).join(', ')}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-brand-muted">
                        <span>{new Date(v.data).toLocaleDateString('pt-BR')} • {v.formaPagamento}</span>
                        <span className="text-brand-chocolate font-bold">{v.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
