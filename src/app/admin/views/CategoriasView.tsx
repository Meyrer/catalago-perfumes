"use client";

import { useState } from 'react';
import { 
  Tags, Plus, Trash2, Search, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 
} from 'lucide-react';
import type { Categoria } from '@prisma/client';
import type { AdminProduto } from '../types';
import { createCategoria, deleteCategoria } from '@/app/actions';

interface CategoriasViewProps {
  categorias: Categoria[];
  produtos: AdminProduto[];
}

export function CategoriasView({ categorias, produtos }: CategoriasViewProps) {
  const [search, setSearch] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData(e.currentTarget);
      await createCategoria(formData);
      setFeedback({ type: 'success', message: 'Categoria cadastrada com sucesso!' });
      setIsNewOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao cadastrar categoria.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    const prodCount = produtos.filter(p => p.categoriaId === id).length;
    if (prodCount > 0) {
      if (!confirm(`Atenção: A categoria "${nome}" possui ${prodCount} produto(s) vinculado(s). Ao excluí-la, verifique se os produtos serão reatribuídos. Deseja continuar?`)) {
        return;
      }
    } else {
      if (!confirm(`Tem certeza que deseja excluir a categoria "${nome}"?`)) return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteCategoria(id);
      setFeedback({ type: 'success', message: `Categoria "${nome}" removida com sucesso!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao excluir categoria.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#dcd5c7] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="text-[#7a5828]" size={22} />
            <h2 className="font-serif text-xl font-bold text-[#09090b]">Departamentos & Categorias</h2>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">
            Organize o catálogo de perfumes, cosméticos e linhas exclusivas em seções elegantes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar departamentos..."
              className="pl-9 pr-3.5 py-2 bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl text-xs text-[#09090b] placeholder:text-[#a1a1aa] outline-none focus:border-[#7a5828] w-56"
            />
          </div>
          <button
            onClick={() => setIsNewOpen(!isNewOpen)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#09090b] hover:bg-[#18181b] text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0"
          >
            <Plus size={15} />
            {isNewOpen ? 'Fechar' : 'Nova Categoria'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* FORMULÁRIO DE NOVA CATEGORIA */}
      {isNewOpen && (
        <div className="bg-white border border-[#dcd5c7] rounded-2xl p-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#f4efe6]">
            <div>
              <h3 className="font-serif text-base font-bold text-[#09090b]">Cadastrar Novo Departamento</h3>
              <p className="text-xs text-[#71717a]">Crie uma nova classificação para exibição no catálogo público</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a5828] bg-[#fdfbf7] px-2.5 py-1 rounded-md border border-[#e8dfd3]">
              Catálogo Ativo
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  Nome do Departamento *
                </label>
                <input 
                  name="nome" 
                  type="text" 
                  required
                  placeholder="Ex: Decants Exclusivos, Home & Fragrance"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  URL da Foto de Capa (Opcional)
                </label>
                <input 
                  name="imagemUrlDirect" 
                  type="url" 
                  placeholder="https://... foto de fundo ou ícone"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#f4efe6]">
              <button
                type="button"
                onClick={() => setIsNewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#71717a] hover:bg-[#fcfbf9] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#09090b] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {isLoading ? 'Salvando...' : 'Salvar Categoria'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GRID DE CATEGORIAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategorias.map(c => {
          const count = produtos.filter(p => p.categoriaId === c.id).length;
          const valorEmEstoque = produtos
            .filter(p => p.categoriaId === c.id)
            .reduce((acc, p) => acc + ((p.precoVista || 0) * (p.quantidade || 0)), 0);

          return (
            <div 
              key={c.id} 
              className="bg-white p-4 rounded-2xl border border-[#dcd5c7] flex flex-col justify-between shadow-xs hover:border-[#7a5828]/50 transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#f4efe6] overflow-hidden shrink-0 border border-[#dcd5c7] flex items-center justify-center group-hover:scale-105 transition-transform">
                  {c.imagemUrl ? (
                    <img src={c.imagemUrl} alt={c.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Tags size={20} className="text-[#7a5828]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-sm text-[#09090b] truncate">{c.nome}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-[#71717a]">
                      {count} {count === 1 ? 'produto' : 'produtos'}
                    </span>
                    <span className="text-[10px] text-[#a1a1aa]">•</span>
                    <span className="text-[11px] font-bold text-[#7a5828]">
                      {valorEmEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(c.id, c.nome)}
                  disabled={isLoading}
                  className="p-1.5 text-[#a1a1aa] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                  title="Excluir categoria"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f4efe6] flex items-center justify-between text-[11px] text-[#71717a]">
                <span>ID: #{c.id}</span>
                <span className="font-mono text-[10px] text-[#a1a1aa]">/categoria/{c.id}</span>
              </div>
            </div>
          );
        })}

        {filteredCategorias.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-[#dcd5c7] text-center text-[#a1a1aa]">
            <Tags size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum departamento encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
