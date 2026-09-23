"use client";

import { useState, useMemo } from 'react';
import { 
  Tags, Plus, Trash2, Search, Image as ImageIcon, Sparkles, AlertCircle, 
  CheckCircle2, Edit3, Package, X, Check, CheckSquare, Square, 
  ArrowRightLeft, Layers, Loader2, ArrowRight
} from 'lucide-react';
import type { Categoria } from '@prisma/client';
import type { AdminProduto } from '../types';
import { 
  createCategoria, updateCategoria, deleteCategoria, vincularProdutosCategoria 
} from '@/app/actions';

interface CategoriasViewProps {
  categorias: Categoria[];
  produtos: AdminProduto[];
}

export function CategoriasView({ categorias, produtos }: CategoriasViewProps) {
  const [search, setSearch] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(null);
  const [targetTransferCatId, setTargetTransferCatId] = useState<number | ''>('');
  const [managingCategory, setManagingCategory] = useState<Categoria | null>(null);
  
  // Estados para gerenciador de produtos da categoria
  const [prodSearch, setProdSearch] = useState('');
  const [prodFilterTab, setProdFilterTab] = useState<'TODOS' | 'VINCULADOS' | 'DISPONIVEIS'>('TODOS');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  // 1. Cadastrar Categoria
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

  // 2. Editar Categoria
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData(e.currentTarget);
      await updateCategoria(editingCategory.id, formData);
      setFeedback({ type: 'success', message: `Categoria "${editingCategory.nome}" atualizada com sucesso!` });
      setEditingCategory(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao atualizar categoria.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Excluir Categoria com transferência segura
  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteCategoria(
        deletingCategory.id, 
        targetTransferCatId ? Number(targetTransferCatId) : undefined
      );
      setFeedback({ type: 'success', message: `Categoria "${deletingCategory.nome}" removida com sucesso!` });
      setDeletingCategory(null);
      setTargetTransferCatId('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao excluir categoria.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Vincular um único produto
  const handleVincularSingle = async (produtoId: number, categoriaId: number) => {
    setIsLoading(true);
    try {
      await vincularProdutosCategoria(categoriaId, [produtoId]);
      setFeedback({ type: 'success', message: 'Produto vinculado com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao vincular produto.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Vincular múltiplos produtos selecionados
  const handleVincularSelecionados = async (categoriaId: number) => {
    if (selectedProductIds.length === 0) return;
    setIsLoading(true);
    try {
      await vincularProdutosCategoria(categoriaId, selectedProductIds);
      setFeedback({ type: 'success', message: `${selectedProductIds.length} produto(s) vinculados à categoria!` });
      setSelectedProductIds([]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao vincular produtos.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Produtos sugeridos para vincular automaticamente à categoria aberta
  const sugeridosParaVincular = useMemo(() => {
    if (!managingCategory) return [];
    const catNome = managingCategory.nome.toLowerCase();
    
    return produtos.filter(p => {
      if (p.categoriaId === managingCategory.id) return false;
      const pNome = (p.nome || '').toLowerCase();
      const pMarca = (p.marca || '').toLowerCase();

      // Brand Collection
      if (catNome.includes('brand') && (pNome.includes('brand') || pMarca.includes('brand'))) {
        return true;
      }
      // Victoria's Secret
      if ((catNome.includes('victoria') || catNome.includes('splash')) && 
          (pMarca.includes('victoria') || pNome.includes('splash') || pNome.includes('body splash'))) {
        return true;
      }
      // Correspondência por marca ou nome da categoria
      if (pMarca.includes(catNome) || pNome.includes(catNome)) {
        return true;
      }
      return false;
    });
  }, [managingCategory, produtos]);

  // Produtos filtrados na tela de gerenciar produtos
  const produtosDaCategoriaModal = useMemo(() => {
    if (!managingCategory) return [];
    return produtos.filter(p => {
      // Filtro de texto
      const matchText = 
        p.nome.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.marca.toLowerCase().includes(prodSearch.toLowerCase());
      if (!matchText) return false;

      // Filtro de aba
      if (prodFilterTab === 'VINCULADOS') return p.categoriaId === managingCategory.id;
      if (prodFilterTab === 'DISPONIVEIS') return p.categoriaId !== managingCategory.id;
      return true;
    });
  }, [managingCategory, produtos, prodSearch, prodFilterTab]);

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
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
            onClick={() => {
              setIsNewOpen(!isNewOpen);
              setEditingCategory(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#09090b] hover:bg-[#18181b] text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            {isNewOpen ? 'Fechar' : 'Nova Categoria'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2.5 text-xs font-medium animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
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
                  placeholder="Ex: Brand Collection, Decants, Victoria's Secret"
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
                className="px-4 py-2 text-xs font-semibold text-[#71717a] hover:bg-[#fcfbf9] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#09090b] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Salvando...' : 'Salvar Categoria'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CATEGORIA */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#dcd5c7] p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#f4efe6]">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#7a5828]" />
                <h3 className="font-serif text-base font-bold text-[#09090b]">
                  Editar Departamento #{editingCategory.id}
                </h3>
              </div>
              <button 
                onClick={() => setEditingCategory(null)}
                className="p-1.5 text-[#71717a] hover:text-[#09090b] rounded-lg hover:bg-[#f4efe6] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  Nome do Departamento *
                </label>
                <input 
                  name="nome" 
                  type="text" 
                  required
                  defaultValue={editingCategory.nome}
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
                  defaultValue={editingCategory.imagemUrl || ''}
                  placeholder="https://... foto de fundo ou ícone"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#f4efe6]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#71717a] hover:bg-[#fcfbf9] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-[#09090b] hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingCategory && (() => {
        const prodCount = produtos.filter(p => p.categoriaId === deletingCategory.id).length;
        const otherCats = categorias.filter(c => c.id !== deletingCategory.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl border border-[#dcd5c7] p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertCircle size={22} />
                <h3 className="font-serif text-base font-bold text-[#09090b]">
                  Excluir Categoria: {deletingCategory.nome}
                </h3>
              </div>

              {prodCount > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold mb-1">
                      ⚠️ Esta categoria possui <strong>{prodCount} produto(s)</strong> vinculado(s).
                    </p>
                    <p>
                      Para não deixar produtos órfãos ou quebrar o catálogo, escolha para qual departamento eles serão transferidos antes de excluir:
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#09090b] mb-1">
                      Transferir produtos para: *
                    </label>
                    <select
                      value={targetTransferCatId}
                      onChange={e => setTargetTransferCatId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                      required
                    >
                      <option value="">Selecione o departamento de destino...</option>
                      {otherCats.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#71717a] leading-relaxed">
                  Tem certeza que deseja excluir a categoria <strong>"{deletingCategory.nome}"</strong>? Nenhum produto está vinculado a ela no momento.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#f4efe6]">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingCategory(null);
                    setTargetTransferCatId('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#71717a] hover:bg-[#fcfbf9] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isLoading || (prodCount > 0 && !targetTransferCatId)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Excluindo...' : prodCount > 0 ? 'Transferir e Excluir' : 'Excluir Categoria'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* GRID DE CARDS DE CATEGORIAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategorias.map(c => {
          const prodsDestaCat = produtos.filter(p => p.categoriaId === c.id);
          const count = prodsDestaCat.length;
          const valorEmEstoque = prodsDestaCat
            .reduce((acc, p) => acc + ((p.precoVista || 0) * (p.quantidade || 0)), 0);

          return (
            <div 
              key={c.id} 
              className="bg-white p-5 rounded-2xl border border-[#dcd5c7] flex flex-col justify-between shadow-xs hover:border-[#7a5828]/50 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#f4efe6] overflow-hidden shrink-0 border border-[#dcd5c7] flex items-center justify-center group-hover:scale-105 transition-transform">
                      {c.imagemUrl ? (
                        <img src={c.imagemUrl} alt={c.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Tags size={20} className="text-[#7a5828]" />
                      )}
                    </div>

                    <div className="min-w-0">
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
                  </div>

                  {/* AÇÕES DE EDITAR E EXCLUIR */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setEditingCategory(c)}
                      className="p-1.5 text-[#71717a] hover:text-[#09090b] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
                      title={`Editar categoria "${c.nome}"`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button 
                      onClick={() => setDeletingCategory(c)}
                      disabled={isLoading}
                      className="p-1.5 text-[#a1a1aa] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title={`Excluir categoria "${c.nome}"`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL: GERENCIAR / ADICIONAR PRODUTOS */}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setManagingCategory(c);
                      setProdSearch('');
                      setProdFilterTab('TODOS');
                      setSelectedProductIds([]);
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                      count === 0 
                        ? 'bg-[#09090b] hover:bg-[#27272a] text-white border border-[#09090b]' 
                        : 'bg-[#fcfbf9] hover:bg-[#09090b] text-[#09090b] hover:text-white border border-[#dcd5c7] hover:border-[#09090b]'
                    }`}
                  >
                    <Package size={14} className={count === 0 ? "text-amber-300" : "text-[#7a5828]"} />
                    <span>{count === 0 ? '+ Adicionar Produtos' : `Gerenciar Produtos (${count})`}</span>
                  </button>
                </div>
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

      {/* MODAL COMPLETO DE GERENCIAR / ADICIONAR PRODUTOS NA CATEGORIA */}
      {managingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#dcd5c7] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="p-5 px-6 border-b border-[#dcd5c7] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f4efe6] border border-[#dcd5c7] flex items-center justify-center text-[#7a5828]">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#09090b] flex items-center gap-2">
                    Produtos em: <span className="text-[#7a5828]">{managingCategory.nome}</span>
                  </h3>
                  <p className="text-xs text-[#71717a]">
                    Vincule, transfira ou adicione perfumes e cosméticos a este departamento
                  </p>
                </div>
              </div>

              <button
                onClick={() => setManagingCategory(null)}
                className="p-2 text-[#71717a] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* BANNER DE SUGESTÃO INTELIGENTE (Ex: Brand Collection) */}
            {sugeridosParaVincular.length > 0 && (
              <div className="mx-6 mt-4 p-3.5 bg-gradient-to-r from-[#fbf8f2] to-[#f4ede0] border border-[#dcd5c7] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-[#7a5828] shrink-0" />
                  <p className="text-xs text-[#09090b] font-medium leading-snug">
                    Detectamos <strong>{sugeridosParaVincular.length} produto(s)</strong> de <strong>"{managingCategory.nome}"</strong> atualmente em outros departamentos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleVincularSelecionados(managingCategory.id)}
                  onMouseEnter={() => setSelectedProductIds(sugeridosParaVincular.map(p => p.id))}
                  className="px-4 py-2 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Vincular todos ({sugeridosParaVincular.length}) com 1 clique</span>
                </button>
              </div>
            )}

            {/* BARRA DE FILTROS & PESQUISA DE PRODUTOS */}
            <div className="p-4 px-6 border-b border-[#f4efe6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-[#fdfbf7]">
              {/* Abas */}
              <div className="flex items-center gap-1 bg-[#ede8de] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setProdFilterTab('TODOS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prodFilterTab === 'TODOS' ? 'bg-white text-[#09090b] shadow-2xs' : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  Todos ({produtos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProdFilterTab('VINCULADOS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prodFilterTab === 'VINCULADOS' ? 'bg-white text-[#09090b] shadow-2xs' : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  Vinculados ({produtos.filter(p => p.categoriaId === managingCategory.id).length})
                </button>
                <button
                  type="button"
                  onClick={() => setProdFilterTab('DISPONIVEIS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prodFilterTab === 'DISPONIVEIS' ? 'bg-white text-[#09090b] shadow-2xs' : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  Outros ({produtos.filter(p => p.categoriaId !== managingCategory.id).length})
                </button>
              </div>

              {/* Busca */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={e => setProdSearch(e.target.value)}
                  placeholder="Filtrar por nome ou marca..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#dcd5c7] rounded-xl text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>
            </div>

            {/* BARRA DE AÇÃO EM LOTE SE HOUVER ITENS SELECIONADOS */}
            {selectedProductIds.length > 0 && (
              <div className="bg-[#09090b] text-white px-6 py-2.5 flex items-center justify-between text-xs animate-fadeIn shrink-0">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-amber-400" />
                  <span className="font-bold">{selectedProductIds.length} produtos selecionados</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="text-[#a1a1aa] hover:text-white px-2 py-1 text-xs cursor-pointer"
                  >
                    Desmarcar
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleVincularSelecionados(managingCategory.id)}
                    className="bg-[#7a5828] hover:bg-[#63451e] text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Mover para {managingCategory.nome}</span>
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE PRODUTOS */}
            <div className="flex-1 overflow-y-auto p-6 divide-y divide-[#f4efe6]">
              {produtosDaCategoriaModal.map(p => {
                const isVinculado = p.categoriaId === managingCategory.id;
                const isSelected = selectedProductIds.includes(p.id);

                return (
                  <div 
                    key={p.id}
                    className={`py-3 flex items-center justify-between gap-4 transition-colors ${
                      isSelected ? 'bg-[#fbf9f5]' : 'hover:bg-[#fdfbf7]'
                    } rounded-xl px-3`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox de Seleção */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductIds(prev => 
                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className="text-[#71717a] hover:text-[#09090b] shrink-0 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-[#09090b]" />
                        ) : (
                          <Square size={18} className="text-[#dcd5c7]" />
                        )}
                      </button>

                      {/* Foto */}
                      <div className="w-11 h-11 rounded-lg bg-[#fcfbf9] border border-[#dcd5c7] shrink-0 p-1 flex items-center justify-center overflow-hidden">
                        {p.fotos && p.fotos[0]?.url ? (
                          <img src={p.fotos[0].url} alt={p.nome} className="w-full h-full object-contain" />
                        ) : (
                          <Package size={16} className="text-[#a1a1aa]" />
                        )}
                      </div>

                      {/* Nome e Marca */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a5828]">
                            {p.marca}
                          </span>
                          {p.volume && (
                            <span className="text-[10px] text-[#71717a] font-medium">({p.volume})</span>
                          )}
                        </div>
                        <h5 className="font-serif font-bold text-xs text-[#09090b] truncate">{p.nome}</h5>
                      </div>

                      {/* Preço e Estoque */}
                      <div className="hidden sm:flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold text-[#09090b]">
                          {p.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-[10px] text-[#71717a]">
                          Estoque: <strong>{p.quantidade ?? 0} un</strong>
                        </span>
                      </div>

                      {/* Badge do Departamento Atual */}
                      <div className="shrink-0">
                        {isVinculado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <Check size={12} className="text-emerald-700" />
                            Vinculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7a5828] bg-[#f8f3eb] px-2.5 py-0.5 rounded-full border border-[#dcd5c7]">
                            {p.categoria?.nome || 'Outro'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação Direta */}
                    <div className="shrink-0">
                      {isVinculado ? (
                        <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                          <span>Neste departamento</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleVincularSingle(p.id, managingCategory.id)}
                          className="px-3 py-1.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Vincular</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {produtosDaCategoriaModal.length === 0 && (
                <div className="py-12 text-center text-[#a1a1aa]">
                  <Package size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Nenhum produto encontrado com os filtros selecionados.</p>
                </div>
              )}
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="p-4 px-6 border-t border-[#dcd5c7] bg-[#fcfbf9] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#71717a]">
                Total de <strong>{produtos.filter(p => p.categoriaId === managingCategory.id).length}</strong> produto(s) neste departamento
              </span>
              <button
                type="button"
                onClick={() => setManagingCategory(null)}
                className="px-5 py-2 bg-[#09090b] hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
