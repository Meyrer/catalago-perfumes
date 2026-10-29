"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminCliente } from '../types';
import { 
  Users, Plus, Search, MessageCircle, AtSign, 
  Mail, MapPin,
  ChevronLeft, ChevronRight, X, Loader2, Edit3, Heart
} from 'lucide-react';
import { createClienteAction, updateClienteAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function ClientesView({ data }: Props) {
  const { clientes, vendas } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('nome');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
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
    const vendasPorCliente = new Map<number, typeof vendas>();
    for (const venda of vendas) {
      if (venda.clienteId === null || !['PAGO', 'ENVIADO', 'ENTREGUE'].includes(venda.status)) continue;
      const grupo = vendasPorCliente.get(venda.clienteId);
      if (grupo) grupo.push(venda);
      else vendasPorCliente.set(venda.clienteId, [venda]);
    }
    return clientes.map(c => {
      const cliVendas = vendasPorCliente.get(c.id) || [];
      const totalGasto = cliVendas.reduce((acc, v) => acc + v.valorTotal, 0);
      const qtdCompras = cliVendas.length;
      const ticketMedio = qtdCompras > 0 ? (totalGasto / qtdCompras) : 0;
      
      const ultimaData = cliVendas.reduce((ultima, venda) => Math.max(ultima, new Date(venda.data).getTime()), 0);
      const ultimaCompra = cliVendas.length > 0 ? new Date(ultimaData) : null;

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
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const terms = normalize(searchTerm).trim().split(/\s+/).filter(Boolean);
    return clientesComMetricas.filter(c => {
      const text = normalize([c.nome, c.whatsapp, c.whatsapp?.replace(/\D/g, ''), c.cidade, c.instagram, c.email].filter(Boolean).join(' '));
      const matchSearch = terms.every(term => text.includes(term));
      const matchPurchases = purchaseFilter === 'ALL' || (purchaseFilter === 'COM_COMPRAS' ? c.qtdCompras > 0 : c.qtdCompras === 0);
      return matchSearch && matchPurchases;
    }).sort((a, b) => {
      if (sortBy === 'total') return b.totalGasto - a.totalGasto || a.nome.localeCompare(b.nome, 'pt-BR');
      if (sortBy === 'ultima') return (b.ultimaCompra?.getTime() || 0) - (a.ultimaCompra?.getTime() || 0) || a.nome.localeCompare(b.nome, 'pt-BR');
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [clientesComMetricas, searchTerm, purchaseFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredClientes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedClientes = filteredClientes.slice(pageStart, pageStart + pageSize);
  const selectedMetricas = selectedCliente ? clientesComMetricas.find(c => c.id === selectedCliente.id) : null;

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
            Consulte clientes, acompanhe compras e acesse o histórico de cada cadastro.
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
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="search"
            aria-label="Buscar clientes"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Buscar por nome do cliente, WhatsApp, cidade ou Instagram..."
            className="w-full pl-10 pr-4 py-2 bg-brand-nude focus:bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none font-medium"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select aria-label="Filtrar clientes por compras" value={purchaseFilter} onChange={e => { setPurchaseFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line">
            <option value="ALL">Todos os clientes</option>
            <option value="COM_COMPRAS">Com compras</option>
            <option value="SEM_COMPRAS">Sem compras</option>
          </select>
          <select aria-label="Ordenar clientes" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className="px-3 py-2 bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line">
            <option value="nome">Nome: A–Z</option>
            <option value="total">Maior total gasto</option>
            <option value="ultima">Compra mais recente</option>
          </select>
        </div>
      </div>

      {/* LISTA PAGINADA DE CLIENTES */}
      <div className="bg-brand-card rounded-2xl border border-brand-line shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-line text-xs text-brand-muted" role="status">
          {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          {filteredClientes.length !== clientes.length && ` de ${clientes.length} cadastrados`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-cream text-[10px] text-brand-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                <th scope="col" className="hidden md:table-cell px-4 py-3 font-semibold">Contato</th>
                <th scope="col" className="hidden sm:table-cell px-4 py-3 text-center font-semibold">Compras</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Total gasto</th>
                <th scope="col" className="hidden lg:table-cell px-4 py-3 font-semibold whitespace-nowrap">Última compra</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {paginatedClientes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-brand-muted">{clientes.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente corresponde aos filtros.'}</td></tr>
              ) : paginatedClientes.map(c => {
                const rawNumber = c.whatsapp?.replace(/\D/g, '') || '';
                const phone = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
                return (
                  <tr key={c.id} className="hover:bg-brand-cream transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedCliente(c)} className="font-semibold text-brand-chocolate text-left break-words hover:underline cursor-pointer">{c.nome}</button>
                      {c.cidade && <p className="text-[11px] text-brand-muted mt-0.5">{c.cidade}</p>}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-brand-muted">
                      {rawNumber ? <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-chocolate hover:underline"><MessageCircle size={13} />{c.whatsapp}</a> : <span>Sem WhatsApp</span>}
                      {c.instagram && <p className="text-[11px] mt-0.5">{c.instagram}</p>}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-brand-muted">{c.qtdCompras}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-chocolate whitespace-nowrap">{c.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-brand-muted whitespace-nowrap">{c.ultimaCompra?.toLocaleDateString('pt-BR') || 'Nunca comprou'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(c)} aria-label={`Editar cadastro de ${c.nome}`} title="Editar cadastro" className="p-2 rounded-lg text-brand-muted hover:text-brand-chocolate hover:bg-brand-nude cursor-pointer"><Edit3 size={14} /></button>
                        <button onClick={() => setSelectedCliente(c)} aria-label={`Ver detalhes e histórico de ${c.nome}`} title="Detalhes e histórico" className="p-2 rounded-lg text-brand-muted hover:text-brand-chocolate hover:bg-brand-nude cursor-pointer"><ChevronRight size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-brand-line flex flex-wrap items-center justify-between gap-3 text-xs text-brand-muted">
          <span>{filteredClientes.length === 0 ? '0 clientes' : `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredClientes.length)} de ${filteredClientes.length} clientes`}</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Por página
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1.5 rounded-lg border border-brand-line bg-brand-card text-brand-chocolate">
                <option value={15}>15</option><option value={30}>30</option><option value={50}>50</option>
              </select>
            </label>
            <nav aria-label="Paginação de clientes" className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior" className="p-2 border border-brand-line rounded-lg hover:bg-brand-nude disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
              <span aria-live="polite">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Próxima página" className="p-2 border border-brand-line rounded-lg hover:bg-brand-nude disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>
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
                <p className="text-xs text-brand-muted">Dados do cliente e histórico de compras</p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2 text-xs text-brand-muted">
                {selectedCliente.cidade && <p className="flex items-center gap-2"><MapPin size={14} />{selectedCliente.cidade}</p>}
                {selectedCliente.whatsapp && (
                  <a href={`https://wa.me/${selectedCliente.whatsapp.replace(/\D/g, '').startsWith('55') ? '' : '55'}${selectedCliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-chocolate hover:underline"><MessageCircle size={14} />{selectedCliente.whatsapp}</a>
                )}
                {selectedCliente.instagram && <p className="flex items-center gap-2"><AtSign size={14} />{selectedCliente.instagram}</p>}
                {selectedCliente.email && <p className="flex items-center gap-2 break-all"><Mail size={14} className="shrink-0" />{selectedCliente.email}</p>}
              </div>
              {selectedMetricas && (
                <>
                  <dl className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-brand-cream border border-brand-line text-xs">
                    <div><dt className="text-[10px] text-brand-muted">Total gasto</dt><dd className="mt-1 font-bold text-brand-chocolate">{selectedMetricas.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>
                    <div><dt className="text-[10px] text-brand-muted">Compras</dt><dd className="mt-1 font-bold text-brand-chocolate">{selectedMetricas.qtdCompras}</dd></div>
                    <div><dt className="text-[10px] text-brand-muted">Ticket médio</dt><dd className="mt-1 font-bold text-brand-chocolate">{selectedMetricas.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>
                  </dl>
                  {selectedMetricas.marcasPreferidas.length > 0 && <p className="flex items-center gap-2 text-xs text-brand-muted"><Heart size={14} className="shrink-0" /><span>Grifes favoritas: {selectedMetricas.marcasPreferidas.join(', ')}</span></p>}
                </>
              )}
              {selectedCliente.observacoes && <p className="text-xs text-brand-muted whitespace-pre-wrap break-words p-3 rounded-xl bg-brand-cream border border-brand-line">{selectedCliente.observacoes}</p>}
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
