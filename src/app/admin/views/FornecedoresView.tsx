"use client";

import { useState, useMemo } from 'react';
import type { ERPData, Fornecedor } from '../types';
import { 
  Building2, Plus, Search, Phone, Mail, MapPin, 
  Edit3, Trash2, X, Loader2, Truck, Package
} from 'lucide-react';
import { createFornecedorAction, updateFornecedorAction, deleteFornecedorAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function FornecedoresView({ data }: Props) {
  const { fornecedores, compras, produtos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [cidadePais, setCidadePais] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  const fornecedoresComDados = useMemo(() => {
    return fornecedores.map(f => {
      const fCompras = compras.filter(c => c.fornecedorId === f.id);
      const totalComprado = fCompras.reduce((acc, c) => acc + c.custoTotalBRL, 0);
      const fProdutos = produtos.filter(p => p.fornecedorId === f.id);

      return {
        ...f,
        comprasCount: fCompras.length,
        totalComprado,
        produtosCount: fProdutos.length
      };
    });
  }, [fornecedores, compras, produtos]);

  const filteredFornecedores = useMemo(() => {
    return fornecedoresComDados.filter(f => {
      return (
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.cidadePais && f.cidadePais.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.contato && f.contato.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [fornecedoresComDados, searchTerm]);

  const handleOpenCreate = () => {
    setEditingFornecedor(null);
    setNome('');
    setContato('');
    setCidadePais('');
    setObservacoes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Fornecedor) => {
    setEditingFornecedor(f);
    setNome(f.nome);
    setContato(f.contato || '');
    setCidadePais(f.cidadePais || '');
    setObservacoes(f.observacoes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFormError('O nome do fornecedor é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingFornecedor) {
        await updateFornecedorAction(editingFornecedor.id, {
          nome,
          contato,
          cidadePais,
          observacoes
        });
        setFeedback('Fornecedor atualizado com sucesso!');
      } else {
        await createFornecedorAction({
          nome,
          contato,
          cidadePais,
          observacoes
        });
        setFeedback('Fornecedor cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar fornecedor.';
      setFormError(msg);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este fornecedor?')) return;
    try {
      await deleteFornecedorAction(id);
      setFeedback('Fornecedor excluído com sucesso.');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir fornecedor.';
      setFeedback(msg);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <Building2 size={22} className="text-[#7a5828]" />
            Fornecedores & Importadoras
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Gestão de distribuidores e canais de importação (Miami EUA, Paraguai CDE, Distribuidores Brasil).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-[#a37941]" />
          <span>Cadastrar Fornecedor</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar fornecedor por nome, localização ou contato..."
            className="w-full pl-10 pr-4 py-2 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none font-medium"
          />
        </div>
      </div>

      {/* GRID DE FORNECEDORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFornecedores.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[#71717a] bg-white rounded-3xl border border-[#dcd5c7]">
            Nenhum fornecedor cadastrado ou correspondente à busca.
          </div>
        ) : (
          filteredFornecedores.map((f) => (
            <div key={f.id} className="bg-white rounded-3xl border border-[#dcd5c7] p-5 shadow-xs flex flex-col justify-between hover:border-[#7a5828]/50 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#09090b] leading-tight">
                      {f.nome}
                    </h3>
                    {f.cidadePais && (
                      <p className="text-[11px] text-[#7a5828] font-bold flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {f.cidadePais}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-1.5 rounded-lg text-[#52525b] hover:text-[#09090b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {f.contato && (
                  <p className="text-[11px] text-[#52525b] bg-[#fcfbf9] p-2.5 rounded-xl border border-[#dcd5c7] mb-3">
                    <strong>Contato:</strong> {f.contato}
                  </p>
                )}

                {f.observacoes && (
                  <p className="text-[11px] text-[#71717a] italic mb-3">
                    {f.observacoes}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-[#f4efe6] border border-[#dcd5c7] flex items-center justify-between text-xs mt-3">
                <div>
                  <span className="text-[9px] font-bold text-[#52525b] uppercase block">Total em Compras</span>
                  <span className="font-bold text-[#5c401c]">
                    {f.totalComprado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-[#52525b] uppercase block">Produtos Ativos</span>
                  <span className="font-bold text-[#09090b]">{f.produtosCount} catálogo</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL NOVO/EDITAR FORNECEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#09090b]">
                  {editingFornecedor ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
                </h3>
                <p className="text-xs text-[#52525b]">Canais e distribuidoras de importação</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Nome / Empresa *</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Star Perfumes Miami LLC" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Localização / Origem</label>
                <input type="text" value={cidadePais} onChange={e => setCidadePais(e.target.value)} placeholder="Ex: Miami, Estados Unidos" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Contato (Telefone / WhatsApp / E-mail)</label>
                <input type="text" value={contato} onChange={e => setContato(e.target.value)} placeholder="+1 (305) 555-0199 / contato@fornecedor.com" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Observações / Linhas Trabalhadas</label>
                <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Distribuidor autorizado de Tom Ford, Creed, Dior..." className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none resize-none" />
              </div>

              <div className="pt-3 border-t border-[#dcd5c7] flex items-center justify-end gap-2.5">
                <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin text-[#a37941]" /> : <span>Salvar Fornecedor</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
