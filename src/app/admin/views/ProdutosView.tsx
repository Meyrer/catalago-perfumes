"use client";

import { useState, useMemo } from 'react';
import type { ERPData, AdminProduto } from '../types';
import { 
  Package, Search, Plus, Sparkles, Edit3, Copy, Trash2, 
  Eye, EyeOff, Check, X, Loader2, ArrowUpDown, ChevronDown, 
  ExternalLink, DollarSign, Percent, Tag, SlidersHorizontal,
  ZoomIn, ZoomOut, Clock, CalendarCheck, CheckCircle2, AlertTriangle, Layers,
  Maximize2, RotateCcw, ChevronRight
} from 'lucide-react';
import { 
  createProduto, updateProduto, deleteProduto, duplicarProdutoAction, 
  toggleAtivo, toggleDisponibilidade, actionSearchPerfume 
} from '../../actions';
import type { PerfumeSearchResult } from '@/services/perfumeApi';

type Props = {
  data: ERPData;
};

export default function ProdutosView({ data }: Props) {
  const { produtos, categorias, fornecedores } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState<string>('ALL');
  const [selectedDisponibilidade, setSelectedDisponibilidade] = useState<'ALL' | 'PRONTA_ENTREGA' | 'ENCOMENDA'>('ALL');
  const [selectedEstoqueFiltro, setSelectedEstoqueFiltro] = useState<'ALL' | 'BAIXO' | 'ZERADO'>('ALL');
  const [sortField, setSortField] = useState<'nome' | 'marca' | 'quantidade' | 'precoCusto' | 'precoVista' | 'lucro' | 'margem'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modais e Drawers
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduto | null>(null);
  const [viewingQuickProduct, setViewingQuickProduct] = useState<AdminProduto | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<number | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Busca Inteligente de Fragrâncias (Autocomplete)
  const [perfumeQuery, setPerfumeQuery] = useState('');
  const [isSearchingPerfume, setIsSearchingPerfume] = useState(false);
  const [perfumeResults, setPerfumeResults] = useState<PerfumeSearchResult[]>([]);

  // Marcas únicas para filtro
  const marcasList = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach(p => { if (p.marca) set.add(p.marca); });
    return Array.from(set).sort();
  }, [produtos]);

  // Produtos filtrados e ordenados
  const filteredSortedProdutos = useMemo(() => {
    return produtos.filter(p => {
      const matchSearch = 
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.codigoBarras && p.codigoBarras.includes(searchTerm));

      const matchMarca = selectedMarca === 'ALL' || p.marca === selectedMarca;
      const matchDisp = selectedDisponibilidade === 'ALL' || p.tipoDisponibilidade === selectedDisponibilidade;
      
      let matchEstoque = true;
      if (selectedEstoqueFiltro === 'BAIXO') {
        matchEstoque = p.quantidade <= (p.estoqueMinimo || 2) && p.quantidade > 0;
      } else if (selectedEstoqueFiltro === 'ZERADO') {
        matchEstoque = p.quantidade === 0;
      }

      return matchSearch && matchMarca && matchDisp && matchEstoque;
    }).sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortField === 'nome') {
        aVal = a.nome.toLowerCase();
        bVal = b.nome.toLowerCase();
      } else if (sortField === 'marca') {
        aVal = a.marca.toLowerCase();
        bVal = b.marca.toLowerCase();
      } else if (sortField === 'quantidade') {
        aVal = a.quantidade || 0;
        bVal = b.quantidade || 0;
      } else if (sortField === 'precoCusto') {
        aVal = a.precoCusto || 0;
        bVal = b.precoCusto || 0;
      } else if (sortField === 'precoVista') {
        aVal = a.precoVista || 0;
        bVal = b.precoVista || 0;
      } else if (sortField === 'lucro') {
        aVal = (a.precoVista || 0) - (a.precoCusto || 0);
        bVal = (b.precoVista || 0) - (b.precoCusto || 0);
      } else if (sortField === 'margem') {
        const aLucro = (a.precoVista || 0) - (a.precoCusto || 0);
        const bLucro = (b.precoVista || 0) - (b.precoCusto || 0);
        aVal = a.precoVista > 0 ? (aLucro / a.precoVista) : 0;
        bVal = b.precoVista > 0 ? (bLucro / b.precoVista) : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [produtos, searchTerm, selectedMarca, selectedDisponibilidade, selectedEstoqueFiltro, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDuplicar = async (id: number) => {
    setIsDuplicating(id);
    try {
      await duplicarProdutoAction(id);
      setFeedback('Produto duplicado com sucesso!');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao duplicar produto.';
      setFeedback(msg);
      setIsDuplicating(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este produto do catálogo?')) return;
    setIsDeleting(id);
    try {
      await deleteProduto(id);
      setFeedback('Produto excluído com sucesso.');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir produto.';
      setFeedback(msg);
      setIsDeleting(null);
    }
  };

  const handleSearchFragrance = async (q: string) => {
    if (!q.trim() || isSearchingPerfume) return;
    setIsSearchingPerfume(true);
    try {
      const results = await actionSearchPerfume(q.trim());
      setPerfumeResults(results);
    } catch {
      setFeedback('Não foi possível buscar na base de fragrâncias.');
    } finally {
      setIsSearchingPerfume(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* HEADER & BARRA DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <Package size={22} className="text-[#7a5828]" />
            Catálogo & Cadastro de Produtos
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Gerenciamento completo de perfumes, cosméticos, margens, preços e dados olfativos técnicos.
          </p>
        </div>

        <button
          onClick={() => { setIsNewProductOpen(true); setEditingProduct(null); }}
          className="px-5 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} className="text-[#a37941]" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* FILTROS AVANÇADOS E BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Campo de Busca */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, marca, SKU ou código de barras..."
              className="w-full pl-10 pr-4 py-2 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none font-medium"
            />
          </div>

          {/* Filtro por Marca */}
          <select
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
          >
            <option value="ALL">Todas as Marcas ({marcasList.length})</option>
            {marcasList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Filtro Pronta Entrega vs Encomenda */}
          <select
            value={selectedDisponibilidade}
            onChange={(e) => setSelectedDisponibilidade(e.target.value as typeof selectedDisponibilidade)}
            className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
          >
            <option value="ALL">Disponibilidade (Todos)</option>
            <option value="PRONTA_ENTREGA">Apenas Pronta Entrega</option>
            <option value="ENCOMENDA">Apenas Sob Encomenda</option>
          </select>

          {/* Filtro de Estoque */}
          <select
            value={selectedEstoqueFiltro}
            onChange={(e) => setSelectedEstoqueFiltro(e.target.value as typeof selectedEstoqueFiltro)}
            className="px-3 py-2 bg-[#f4efe6] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none cursor-pointer"
          >
            <option value="ALL">Status Estoque (Todos)</option>
            <option value="BAIXO">Estoque Baixo</option>
            <option value="ZERADO">Sem Estoque</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-[#52525b] pt-1">
          <span>Mostrando <strong>{filteredSortedProdutos.length}</strong> de {produtos.length} produtos cadastrados</span>
          {(searchTerm || selectedMarca !== 'ALL' || selectedDisponibilidade !== 'ALL' || selectedEstoqueFiltro !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMarca('ALL');
                setSelectedDisponibilidade('ALL');
                setSelectedEstoqueFiltro('ALL');
              }}
              className="text-[#7a5828] font-bold hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* TABELA DENSE MODERNA DE PRODUTOS */}
      <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                <th className="py-3 px-4 cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('nome')}>
                  <span className="flex items-center gap-1">Produto <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('marca')}>
                  <span className="flex items-center gap-1">Marca <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-center cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('quantidade')}>
                  <span className="flex items-center justify-center gap-1">Estoque <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-right cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('precoCusto')}>
                  <span className="flex items-center justify-end gap-1">Custo <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-right cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('precoVista')}>
                  <span className="flex items-center justify-end gap-1">Venda <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-right cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('lucro')}>
                  <span className="flex items-center justify-end gap-1">Lucro (R$) <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-center cursor-pointer select-none hover:text-[#09090b]" onClick={() => handleSort('margem')}>
                  <span className="flex items-center justify-center gap-1">Margem % <ArrowUpDown size={11} /></span>
                </th>
                <th className="py-3 px-3 text-center">Markup</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe5dc] text-xs">
              {filteredSortedProdutos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-xs text-[#71717a]">
                    Nenhum produto cadastrado ou correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredSortedProdutos.map((p) => {
                  const custo = p.precoCusto || 0;
                  const venda = p.precoVista || 0;
                  const lucro = venda - custo;
                  const margem = venda > 0 ? ((lucro / venda) * 100).toFixed(1) : '0';
                  const markup = custo > 0 ? (venda / custo).toFixed(2) : '—';
                  const isEncomenda = p.tipoDisponibilidade === 'ENCOMENDA' || (p.quantidade || 0) <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                      {/* Produto */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewingQuickProduct(p)}
                            className="group relative w-11 h-11 rounded-xl bg-[#fcfbf9] border border-[#dcd5c7] overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-[#7a5828] hover:shadow-xs transition-all"
                            title="Clique para ampliar foto e abrir dossiê"
                          >
                            {p.fotos && p.fotos[0] ? (
                              <img src={p.fotos[0].url} alt={p.nome} width={44} height={44} className="w-full h-full object-contain p-0.5 group-hover:scale-110 transition-transform duration-200" />
                            ) : (
                              <Package size={18} className="text-[#8c8c8e]" />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn size={14} className="text-white drop-shadow" />
                            </div>
                          </button>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setViewingQuickProduct(p)}
                              className="text-left font-bold text-[#09090b] leading-tight hover:text-[#7a5828] transition-colors truncate block max-w-[280px] cursor-pointer"
                              title="Clique para ver detalhes completos"
                            >
                              {p.nome}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {p.sku && <span className="font-mono text-[10px] text-[#71717a]">{p.sku}</span>}
                              {p.volume && <span className="text-[10px] text-[#52525b]">• {p.volume}</span>}
                              {p.destaque && <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">Destaque</span>}
                              {p.novidade && <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[9px] font-bold">Novo</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Marca */}
                      <td className="py-3 px-3 font-semibold text-[#52525b] whitespace-nowrap">
                        {p.marca}
                      </td>

                      {/* Estoque */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.quantidade === 0 ? 'bg-red-100 text-red-800' :
                          p.quantidade <= (p.estoqueMinimo || 2) ? 'bg-amber-100 text-amber-900' :
                          'bg-emerald-100 text-emerald-900'
                        }`}>
                          {p.quantidade} un.
                        </span>
                      </td>

                      {/* Custo */}
                      <td className="py-3 px-3 text-right font-medium text-[#52525b] whitespace-nowrap">
                        {custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Venda */}
                      <td className="py-3 px-3 text-right font-bold text-[#09090b] whitespace-nowrap">
                        {venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Lucro */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        +{lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Margem % */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-bold text-[11px] border border-emerald-200">
                          {margem}%
                        </span>
                      </td>

                      {/* Markup */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#52525b] whitespace-nowrap">
                        {markup}x
                      </td>

                      {/* Status / Disponibilidade */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                          isEncomenda 
                            ? 'bg-[#f4efe6] border-[#dcd5c7] text-[#7a5828]'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          {isEncomenda ? 'Sob Encomenda' : 'Pronta Entrega'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingQuickProduct(p)}
                            className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                            title="Visualizar detalhes & foto ampliada"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => { setEditingProduct(p); setIsNewProductOpen(true); }}
                            className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                            title="Editar dados completos"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDuplicar(p.id)}
                            disabled={isDuplicating === p.id}
                            className="p-1.5 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] border border-[#dcd5c7] transition-colors cursor-pointer"
                            title="Duplicar produto"
                          >
                            {isDuplicating === p.id ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={isDeleting === p.id}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            title="Excluir produto"
                          >
                            {isDeleting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
      {/* MODAL DE VISUALIZAÇÃO AMPLIADA & DOSSIÊ TÉCNICO COM ZOOM NA FOTO */}
      {/* ========================================================================= */}
      {viewingQuickProduct && (
        <ProductQuickViewModal
          product={viewingQuickProduct}
          onClose={() => setViewingQuickProduct(null)}
          onEdit={() => {
            const p = viewingQuickProduct;
            setViewingQuickProduct(null);
            setEditingProduct(p);
            setIsNewProductOpen(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL DE CADASTRO E EDIÇÃO COMPLETA DE PRODUTO */}
      {/* ========================================================================= */}
      {isNewProductOpen && (
        <ProductFormModal
          isOpen={isNewProductOpen}
          onClose={() => { setIsNewProductOpen(false); setEditingProduct(null); }}
          productToEdit={editingProduct}
          categorias={categorias}
          fornecedores={fornecedores}
          onSearchPerfume={handleSearchFragrance}
          perfumeResults={perfumeResults}
          isSearchingPerfume={isSearchingPerfume}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTE: FORMULÁRIO DE PRODUTO COM CÁLCULOS AO VIVO
// -------------------------------------------------------------

function ProductFormModal({
  isOpen, onClose, productToEdit, categorias, fornecedores,
  onSearchPerfume, perfumeResults, isSearchingPerfume
}: {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: AdminProduto | null;
  categorias: ERPData['categorias'];
  fornecedores: ERPData['fornecedores'];
  onSearchPerfume: (q: string) => Promise<void>;
  perfumeResults: PerfumeSearchResult[];
  isSearchingPerfume: boolean;
}) {
  const isEditing = Boolean(productToEdit);

  // Estados dos Campos com Cálculos em Tempo Real
  const [nome, setNome] = useState(productToEdit?.nome || '');
  const [marca, setMarca] = useState(productToEdit?.marca || '');
  const [categoriaId, setCategoriaId] = useState(String(productToEdit?.categoriaId || (categorias[0]?.id || 1)));
  const [subcategoria, setSubcategoria] = useState(productToEdit?.subcategoria || '');
  const [volume, setVolume] = useState(productToEdit?.volume || '');
  const [genero, setGenero] = useState(productToEdit?.genero || 'Compartilhável');
  const [precoCusto, setPrecoCusto] = useState<number>(productToEdit?.precoCusto || 0);
  const [precoVista, setPrecoVista] = useState<number>(productToEdit?.precoVista || 0);
  const [precoOriginal, setPrecoOriginal] = useState<number>(productToEdit?.precoOriginal || 0);
  const [quantidade, setQuantidade] = useState<number>(productToEdit?.quantidade || 1);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(productToEdit?.estoqueMinimo || 2);
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [codigoBarras, setCodigoBarras] = useState(productToEdit?.codigoBarras || '');
  const [tipoDisponibilidade, setTipoDisponibilidade] = useState(productToEdit?.tipoDisponibilidade || 'PRONTA_ENTREGA');
  const [fornecedorId, setFornecedorId] = useState(String(productToEdit?.fornecedorId || ''));
  const [destaque, setDestaque] = useState(productToEdit?.destaque || false);
  const [novidade, setNovidade] = useState(productToEdit?.novidade || false);
  const [descricao, setDescricao] = useState(productToEdit?.descricao || '');
  const [fotoUrlDirect, setFotoUrlDirect] = useState(productToEdit?.fotos?.[0]?.url || '');

  // Dados Olfativos
  const [familiaOlfativa, setFamiliaOlfativa] = useState(productToEdit?.familiaOlfativa || '');
  const [concentracao, setConcentracao] = useState(productToEdit?.concentracao || '');
  const [anoLancamento, setAnoLancamento] = useState(productToEdit?.anoLancamento ? String(productToEdit.anoLancamento) : '');
  const [notasSaida, setNotasSaida] = useState(Array.isArray(productToEdit?.notasSaida) ? (productToEdit.notasSaida as string[]).join(', ') : '');
  const [notasCoracao, setNotasCoracao] = useState(Array.isArray(productToEdit?.notasCoracao) ? (productToEdit.notasCoracao as string[]).join(', ') : '');
  const [notasFundo, setNotasFundo] = useState(Array.isArray(productToEdit?.notasFundo) ? (productToEdit.notasFundo as string[]).join(', ') : '');
  const [acordesPrincipais, setAcordesPrincipais] = useState(Array.isArray(productToEdit?.acordesPrincipais) ? (productToEdit.acordesPrincipais as string[]).join(', ') : '');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Cálculos Automáticos de Lucro, Margem e Markup
  const lucroUnitario = Math.max(0, precoVista - precoCusto);
  const margemPercentual = precoVista > 0 ? ((lucroUnitario / precoVista) * 100).toFixed(1) : '0';
  const markup = precoCusto > 0 ? (precoVista / precoCusto).toFixed(2) : '—';

  const handleApplySearchResult = (res: PerfumeSearchResult) => {
    setNome(res.name);
    setMarca(res.brand);
    if ((res as any).volume) setVolume((res as any).volume);
    if (res.concentration) setConcentracao(res.concentration);
    if (res.release_year) setAnoLancamento(String(res.release_year));
    if (res.gender) setGenero(res.gender);
    if (res.family) setFamiliaOlfativa(res.family);
    if (res.top_notes && res.top_notes.length > 0) setNotasSaida(res.top_notes.join(', '));
    if (res.middle_notes && res.middle_notes.length > 0) setNotasCoracao(res.middle_notes.join(', '));
    if (res.base_notes && res.base_notes.length > 0) setNotasFundo(res.base_notes.join(', '));
    if (res.main_accords && res.main_accords.length > 0) setAcordesPrincipais(res.main_accords.join(', '));
    if (res.image_url && !fotoUrlDirect) setFotoUrlDirect(res.image_url);
    if ((res as any).ean && !codigoBarras) setCodigoBarras((res as any).ean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('nome', nome);
      formData.set('marca', marca);
      formData.set('categoriaId', categoriaId);
      formData.set('subcategoria', subcategoria);
      formData.set('volume', volume);
      formData.set('genero', genero);
      formData.set('precoVista', String(precoVista));
      formData.set('precoOriginal', String(precoOriginal));
      formData.set('precoCusto', String(precoCusto));
      formData.set('quantidade', String(quantidade));
      formData.set('estoqueMinimo', String(estoqueMinimo));
      formData.set('sku', sku);
      formData.set('codigoBarras', codigoBarras);
      formData.set('tipoDisponibilidade', tipoDisponibilidade);
      formData.set('fornecedorId', fornecedorId);
      formData.set('destaque', String(destaque));
      formData.set('novidade', String(novidade));
      formData.set('descricao', descricao);
      formData.set('fotoUrlDirect', fotoUrlDirect);

      formData.set('familiaOlfativa', familiaOlfativa);
      formData.set('concentracao', concentracao);
      formData.set('anoLancamento', anoLancamento);
      formData.set('notasSaida', JSON.stringify(notasSaida.split(',').map(s => s.trim()).filter(Boolean)));
      formData.set('notasCoracao', JSON.stringify(notasCoracao.split(',').map(s => s.trim()).filter(Boolean)));
      formData.set('notasFundo', JSON.stringify(notasFundo.split(',').map(s => s.trim()).filter(Boolean)));
      formData.set('acordesPrincipais', JSON.stringify(acordesPrincipais.split(',').map(s => s.trim()).filter(Boolean)));

      if (isEditing && productToEdit) {
        await updateProduto(productToEdit.id, formData);
      } else {
        await createProduto(formData);
      }

      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar produto.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

        <div className="flex items-center justify-between pb-4 border-b border-[#dcd5c7] mb-5">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#09090b]">
              {isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>
            <p className="text-xs text-[#52525b]">
              {isEditing ? `Alterando dados do produto #${productToEdit?.id}` : 'Insira os dados cadastrais, financeiros e olfativos'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#52525b] hover:text-[#09090b] hover:bg-[#f4efe6] transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* BUSCADOR INTELIGENTE DE FRAGRÂNCIAS (OPEN BEAUTY FACTS / BASE LOCAL) */}
        <div className="mb-5 p-4 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> Autocomplete Inteligente de Fragrâncias
            </span>
            <span className="text-[10px] text-[#71717a]">Puxa notas, ano, acordes e foto oficial</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome ex: Sauvage, Good Girl, Libre, Bleu..."
              className="flex-1 px-3.5 py-2 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
            />
            <button
              type="button"
              disabled={isSearchingPerfume}
              onClick={() => onSearchPerfume(searchQuery)}
              className="px-4 py-2 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearchingPerfume ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>Pesquisar</span>
            </button>
          </div>

          {perfumeResults.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto divide-y divide-[#ebe5dc] border border-[#dcd5c7] rounded-xl bg-white">
              {perfumeResults.map((res, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-[#fcfbf9] transition-colors text-xs">
                  <div>
                    <span className="font-bold text-[#09090b]">{res.name}</span>
                    <span className="text-[#52525b] ml-1.5 font-medium">({res.brand})</span>
                    {res.family && <span className="text-[10px] text-[#7a5828] block">{res.family}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplySearchResult(res)}
                    className="px-2.5 py-1 rounded-lg bg-[#f4efe6] hover:bg-[#eae3d5] text-[#09090b] font-bold text-[11px] border border-[#dcd5c7] cursor-pointer"
                  >
                    Preencher Campos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PAINEL DE CÁLCULO DE LUCRO, MARGEM E MARKUP AO VIVO */}
          <div className="p-4 rounded-2xl bg-[#f4efe6] border border-[#dcd5c7] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Preço de Custo</span>
              <span className="text-base font-bold text-[#09090b]">
                {precoCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Preço de Venda</span>
              <span className="text-base font-bold text-[#09090b]">
                {precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="bg-white/60 p-2 rounded-xl border border-emerald-300">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Lucro Nominal</span>
              <span className="text-base font-bold text-emerald-950">
                +{lucroUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="bg-white/60 p-2 rounded-xl border border-emerald-300">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Margem / Markup</span>
              <span className="text-base font-bold text-emerald-950">
                {margemPercentual}% <span className="text-xs font-normal text-[#52525b]">({markup}x)</span>
              </span>
            </div>
          </div>

          {/* DADOS BÁSICOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Nome do Produto *</label>
              <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" placeholder="Ex: Sauvage Eau de Toilette" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Marca / Grife *</label>
              <input type="text" required value={marca} onChange={e => setMarca(e.target.value)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-semibold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" placeholder="Ex: Dior" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Categoria *</label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full px-3 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none">
                {categorias.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Subcategoria</label>
              <input type="text" value={subcategoria} onChange={e => setSubcategoria(e.target.value)} placeholder="Ex: Mini Brands" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Volume</label>
              <input type="text" value={volume} onChange={e => setVolume(e.target.value)} placeholder="Ex: 100ml, 250ml" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Gênero</label>
              <select value={genero} onChange={e => setGenero(e.target.value)} className="w-full px-3 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none">
                <option value="Compartilhável">Compartilhável / Unissex</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>
          </div>

          {/* VALORES E ESTOQUE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Custo de Aquisição (R$)</label>
              <input type="number" step="0.01" value={precoCusto} onChange={e => setPrecoCusto(parseFloat(e.target.value) || 0)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#5c401c] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Preço de Venda (R$) *</label>
              <input type="number" step="0.01" required value={precoVista} onChange={e => setPrecoVista(parseFloat(e.target.value) || 0)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Qtd Atual em Estoque</label>
              <input type="number" min="0" value={quantidade} onChange={e => setQuantidade(parseInt(e.target.value) || 0)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Estoque Mínimo (Alerta)</label>
              <input type="number" min="0" value={estoqueMinimo} onChange={e => setEstoqueMinimo(parseInt(e.target.value) || 2)} className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
          </div>

          {/* CÓDIGOS, FORNECEDOR E TIPO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">SKU / Código Interno</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="ELG-DIO-100" className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-mono text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Código de Barras (EAN)</label>
              <input type="text" value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} placeholder="789..." className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-mono text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">
                Disponibilidade
                {quantidade <= 0 && <span className="ml-1 text-[10px] font-semibold text-amber-700">(Estoque 0 = Encomenda)</span>}
              </label>
              <select 
                value={quantidade <= 0 ? 'ENCOMENDA' : tipoDisponibilidade} 
                onChange={e => {
                  if (quantidade <= 0 && e.target.value === 'PRONTA_ENTREGA') {
                    alert('Para marcar como Pronta Entrega, a quantidade em estoque deve ser de pelo menos 1 unidade.');
                    return;
                  }
                  setTipoDisponibilidade(e.target.value);
                }} 
                className="w-full px-3 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
              >
                <option value="PRONTA_ENTREGA" disabled={quantidade <= 0}>Pronta Entrega (Físico)</option>
                <option value="ENCOMENDA">Sob Encomenda</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Fornecedor Principal</label>
              <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className="w-full px-3 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none">
                <option value="">Nenhum vinculado</option>
                {fornecedores.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
              </select>
            </div>
          </div>

          {/* FOTO E STATUS */}
          <div>
            <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">URL Direta da Imagem do Frasco</label>
            <input type="url" value={fotoUrlDirect} onChange={e => setFotoUrlDirect(e.target.value)} placeholder="https://..." className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
          </div>

          {/* DADOS OLFATIVOS TÉCNICOS */}
          <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#dcd5c7] space-y-3">
            <span className="text-[11px] font-bold text-[#7a5828] uppercase tracking-wider block">
              Pirâmide Olfativa & Notas Técnicas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Família Olfativa</label>
                <input type="text" value={familiaOlfativa} onChange={e => setFamiliaOlfativa(e.target.value)} placeholder="Floral Oriental" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Concentração</label>
                <input type="text" value={concentracao} onChange={e => setConcentracao(e.target.value)} placeholder="EDP / EDT / Parfum" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Ano de Lançamento</label>
                <input type="number" value={anoLancamento} onChange={e => setAnoLancamento(e.target.value)} placeholder="2024" className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Notas de Saída / Topo</label>
                <input type="text" value={notasSaida} onChange={e => setNotasSaida(e.target.value)} placeholder="Bergamota, Pimenta..." className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Notas de Coração</label>
                <input type="text" value={notasCoracao} onChange={e => setNotasCoracao(e.target.value)} placeholder="Lavanda, Gerânio..." className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Notas de Fundo / Base</label>
                <input type="text" value={notasFundo} onChange={e => setNotasFundo(e.target.value)} placeholder="Ambroxan, Cedro..." className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#52525b] uppercase mb-1">Acordes Principais</label>
              <input type="text" value={acordesPrincipais} onChange={e => setAcordesPrincipais(e.target.value)} placeholder="Cítrico, Especiado Fresco, Âmbar..." className="w-full px-3 py-1.5 bg-white text-xs text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none" />
            </div>
          </div>

          {/* FLAGS */}
          <div className="flex items-center gap-6 text-xs font-bold text-[#09090b]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={destaque} onChange={e => setDestaque(e.target.checked)} className="rounded border-[#dcd5c7] accent-[#09090b]" />
              <span>Destaque na Vitrine Hero</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={novidade} onChange={e => setNovidade(e.target.checked)} className="rounded border-[#dcd5c7] accent-[#09090b]" />
              <span>Marcar como Novidade / Lançamento</span>
            </label>
          </div>

          {/* BOTÕES */}
          <div className="pt-3 border-t border-[#dcd5c7] flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
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
                  <span>Salvando Produto...</span>
                </>
              ) : (
                <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTE: JANELA / MODAL DE VISUALIZAÇÃO AMPLIADA COM ZOOM E DOSSIÊ TÉCNICO
// -------------------------------------------------------------

function ProductQuickViewModal({
  product,
  onClose,
  onEdit,
}: {
  product: AdminProduto;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const fotos = product.fotos && product.fotos.length > 0 ? product.fotos : [];
  const currentPhotoUrl = fotos[activePhotoIdx]?.url;

  const custo = product.precoCusto || 0;
  const venda = product.precoVista || 0;
  const lucro = venda - custo;
  const margem = venda > 0 ? ((lucro / venda) * 100).toFixed(1) : '0';
  const markup = custo > 0 ? (venda / custo).toFixed(2) : '—';
  const isEncomenda = product.tipoDisponibilidade === 'ENCOMENDA' || (product.quantidade || 0) <= 0;

  // Extrair notas e acordes de Json ou array
  const parseNotes = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const notasSaida = parseNotes(product.notasSaida);
  const notasCoracao = parseNotes(product.notasCoracao);
  const notasFundo = parseNotes(product.notasFundo);
  const acordes = parseNotes(product.acordesPrincipais);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  const handleToggleZoom = () => {
    setZoomLevel(prev => (prev === 1 ? 2.5 : 1));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl border border-[#dcd5c7] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR / HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#ebe5dc] flex items-center justify-between gap-4 bg-[#fcfbf9]">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
              isEncomenda 
                ? 'bg-[#f4efe6] border-[#dcd5c7] text-[#7a5828]'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {isEncomenda ? 'Sob Encomenda' : 'Pronta Entrega'}
            </span>
            <div className="h-4 w-px bg-[#dcd5c7]" />
            <span className="text-xs font-serif font-bold tracking-widest text-[#7a5828] uppercase">
              {product.marca}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 size={13} className="text-[#a37941]" />
              <span>Editar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white hover:bg-[#f4efe6] text-[#52525b] border border-[#dcd5c7] transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPO MODAL COM SCROLL */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* COLUNA ESQUERDA: FOTO COM ZOOM PROFISSIONAL */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-3 flex flex-col items-center">
                {/* Visualizador da Imagem */}
                <div 
                  className={`relative w-full aspect-square rounded-xl bg-white border border-[#ebe5dc] overflow-hidden flex items-center justify-center select-none ${
                    zoomLevel > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={handleToggleZoom}
                  onMouseMove={handleMouseMove}
                  title={zoomLevel > 1 ? 'Clique para reduzir zoom' : 'Clique para ampliar imagem'}
                >
                  {currentPhotoUrl ? (
                    <div 
                      className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      }}
                    >
                      <img 
                        src={currentPhotoUrl} 
                        alt={product.nome} 
                        width={420} 
                        height={420} 
                        className="w-full h-full object-contain p-4 pointer-events-none" 
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#8c8c8e] gap-2">
                      <Package size={48} />
                      <span className="text-xs">Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Badge de Zoom no Canto */}
                  <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 shadow-sm pointer-events-none">
                    <ZoomIn size={12} className="text-[#a37941]" />
                    <span>{zoomLevel.toFixed(1)}x</span>
                  </div>
                </div>

                {/* Barra de Controles de Zoom */}
                <div className="w-full flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#ebe5dc]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(1, +(prev - 0.5).toFixed(1)))}
                      disabled={zoomLevel <= 1}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#f4efe6] text-[#09090b] border border-[#dcd5c7] disabled:opacity-40 transition-colors cursor-pointer"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      disabled={zoomLevel === 1}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#f4efe6] text-[#09090b] border border-[#dcd5c7] disabled:opacity-40 transition-colors cursor-pointer"
                      title="Resetar Zoom"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(3.5, +(prev + 0.5).toFixed(1)))}
                      disabled={zoomLevel >= 3.5}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#f4efe6] text-[#09090b] border border-[#dcd5c7] disabled:opacity-40 transition-colors cursor-pointer"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  <span className="text-[10px] text-[#71717a] font-medium hidden sm:inline">
                    {zoomLevel > 1 ? 'Mova o cursor para navegar' : 'Clique na foto para zoom'}
                  </span>

                  {currentPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(currentPhotoUrl, '_blank')}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-[#f4efe6] text-[#52525b] border border-[#dcd5c7] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Abrir imagem original em tela cheia"
                    >
                      <span>Original</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                {/* Miniaturas caso haja mais de 1 foto */}
                {fotos.length > 1 && (
                  <div className="flex items-center gap-2 mt-2.5 overflow-x-auto w-full py-1">
                    {fotos.map((f, idx) => (
                      <button
                        key={f.id || idx}
                        onClick={() => { setActivePhotoIdx(idx); setZoomLevel(1); }}
                        className={`w-12 h-12 rounded-lg border overflow-hidden p-0.5 shrink-0 transition-all cursor-pointer ${
                          activePhotoIdx === idx 
                            ? 'border-[#7a5828] ring-2 ring-[#7a5828]/20 bg-white' 
                            : 'border-[#dcd5c7] bg-[#fcfbf9] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={f.url} alt="Miniatura" width={48} height={48} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status do Catálogo */}
              <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[#52525b]">
                  <span>Status na Loja:</span>
                  <span className={`font-bold flex items-center gap-1 ${product.disponivel ? 'text-emerald-700' : 'text-red-600'}`}>
                    {product.disponivel ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {product.disponivel ? 'Ativo e Visível' : 'Oculto / Desativado'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#52525b]">
                  <span>Destaque Vitrine:</span>
                  <span className="font-bold text-[#09090b]">{product.destaque ? 'Sim (Hero)' : 'Não'}</span>
                </div>
                <div className="flex items-center justify-between text-[#52525b]">
                  <span>Selo Novidade:</span>
                  <span className="font-bold text-[#09090b]">{product.novidade ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: DOSSIÊ TÉCNICO, FINANCEIRO & OLFATIVO */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] leading-snug">
                  {product.nome}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-[#52525b]">
                  {product.concentracao && (
                    <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#7a5828] font-bold">
                      {product.concentracao}
                    </span>
                  )}
                  {product.volume && (
                    <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#09090b] font-medium">
                      {product.volume}
                    </span>
                  )}
                  {product.genero && (
                    <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#09090b] font-medium">
                      {product.genero}
                    </span>
                  )}
                  {product.anoLancamento && (
                    <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#dcd5c7] text-[#09090b] font-medium">
                      Lançamento: {product.anoLancamento}
                    </span>
                  )}
                </div>
              </div>

              {/* CARD DE PRECIFICAÇÃO & MARGENS */}
              <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-4">
                <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-2.5">
                  Precificação & Margens Comerciais
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Preço à Vista</span>
                    <span className="text-base font-bold text-emerald-800">
                      {venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Custo de Entrada</span>
                    <span className="text-base font-bold text-[#52525b]">
                      {custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Lucro Bruto</span>
                    <span className="text-base font-bold text-emerald-700">
                      +{lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Margem / Markup</span>
                    <span className="text-base font-bold text-[#09090b]">
                      {margem}% <span className="text-xs text-[#71717a] font-normal">({markup}x)</span>
                    </span>
                  </div>
                </div>

                {product.precoParcelado && (
                  <div className="mt-2 text-xs text-[#52525b] flex items-center justify-between pt-2 border-t border-[#ebe5dc]">
                    <span>Condição Parcelada:</span>
                    <strong className="text-[#09090b]">{product.precoParcelado}</strong>
                  </div>
                )}
              </div>

              {/* CARD DE ESTOQUE & DADOS DE CONTROLE */}
              <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-4">
                <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-2.5">
                  Estoque & Rastreabilidade
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Estoque Físico</span>
                    <span className={`inline-block font-bold text-sm mt-0.5 ${
                      product.quantidade === 0 ? 'text-red-700' :
                      product.quantidade <= (product.estoqueMinimo || 2) ? 'text-amber-800' :
                      'text-emerald-800'
                    }`}>
                      {product.quantidade} un. {product.quantidade === 0 && '(Sem Estoque)'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Estoque Mínimo</span>
                    <span className="font-bold text-sm text-[#09090b] mt-0.5 block">
                      {product.estoqueMinimo || 2} un.
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                    <span className="text-[10px] text-[#71717a] block">Fornecedor</span>
                    <span className="font-bold text-sm text-[#09090b] mt-0.5 block truncate">
                      {product.fornecedor?.nome || '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#ebe5dc] text-xs text-[#52525b]">
                  {product.sku && (
                    <div>
                      SKU: <strong className="font-mono text-[#09090b]">{product.sku}</strong>
                    </div>
                  )}
                  {product.codigoBarras && (
                    <div>
                      Código de Barras: <strong className="font-mono text-[#09090b]">{product.codigoBarras}</strong>
                    </div>
                  )}
                  {product.previsaoEntrega && (
                    <div className="col-span-full">
                      Prazo / Previsão: <strong className="text-[#09090b]">{product.previsaoEntrega}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* PIRÂMIDE OLFATIVA & DADOS TÉCNICOS */}
              {(notasSaida.length > 0 || notasCoracao.length > 0 || notasFundo.length > 0 || acordes.length > 0 || product.familiaOlfativa) && (
                <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[#a37941]" />
                      Pirâmide Olfativa & Notas
                    </span>
                    {product.familiaOlfativa && (
                      <span className="text-xs font-serif font-bold text-[#7a5828]">
                        {product.familiaOlfativa}
                      </span>
                    )}
                  </div>

                  {/* Andares da Pirâmide */}
                  <div className="space-y-2 text-xs">
                    {notasSaida.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                        <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
                          Notas de Saída / Topo
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {notasSaida.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[#fcfbf9] border border-[#dcd5c7] text-[#09090b] font-medium text-[11px]">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {notasCoracao.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                        <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
                          Notas de Coração / Corpo
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {notasCoracao.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[#fcfbf9] border border-[#dcd5c7] text-[#09090b] font-medium text-[11px]">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {notasFundo.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                        <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
                          Notas de Fundo / Base
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {notasFundo.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[#fcfbf9] border border-[#dcd5c7] text-[#09090b] font-medium text-[11px]">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {acordes.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-[#ebe5dc]">
                        <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-1">
                          Acordes Principais
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {acordes.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[10px]">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DESCRIÇÃO DO PRODUTO */}
              {product.descricao && (
                <div className="bg-[#fcfbf9] rounded-2xl border border-[#dcd5c7] p-4 text-xs">
                  <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-1.5">
                    Descrição & Conceito
                  </span>
                  <p className="text-[#52525b] leading-relaxed whitespace-pre-line">
                    {product.descricao}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 sm:p-5 border-t border-[#ebe5dc] flex items-center justify-between gap-3 bg-[#fcfbf9]">
          <span className="text-xs text-[#71717a]">
            ID Sistema: #{product.id}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer"
            >
              Fechar Janela
            </button>
            <button
              onClick={onEdit}
              className="px-5 py-2 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Edit3 size={14} className="text-[#a37941]" />
              <span>Editar Dados do Produto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
