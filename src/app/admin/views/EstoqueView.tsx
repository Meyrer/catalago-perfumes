"use client";

import { getFifoStockValue, getFifoLots, getFifoNextCost } from '@/lib/fifo';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ERPData, AdminProduto } from '../types';
import StockMovementHistory from '../StockMovementHistory';
import { 
  Boxes, AlertTriangle, ArrowDownRight, ArrowUpRight, 
  Search, History, RefreshCw, X, Loader2,
  Package, Calendar, CheckCircle2, ShieldAlert, FileText
} from 'lucide-react';
import { distribuirEstoqueAction, movimentarEstoqueAction } from '../../actions';
import { normalizeImageUrl } from '@/lib/image-url';
import { sortBrandCollectionProducts } from '@/lib/product-order';
import { stockLocations, stockLocationLabels, type CityQuantities, type StockLocation } from '@/lib/stock-locations';

type Props = {
  data: ERPData;
  onRefresh?: () => void;
};

const STOCK_PAGE_SIZE = 20;

export default function EstoqueView({ data }: Props) {
  const { produtos, movimentacoesTotal, user } = data;
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BAIXO' | 'ZERADO' | 'PRONTA_ENTREGA' | 'ENCOMENDA'>('ALL');
  const [locationFilter, setLocationFilter] = useState<StockLocation | ''>('');
  const [activeSubTab, setActiveSubTab] = useState<'saldo' | 'historico'>('saldo');
  const [page, setPage] = useState(1);
  const [previewProduct, setPreviewProduct] = useState<AdminProduto | null>(null);
  const photoDialogRef = useRef<HTMLDialogElement>(null);
  const locationDialogRef = useRef<HTMLDialogElement>(null);
  const [locationProduct, setLocationProduct] = useState<AdminProduto | null>(null);
  const [cities, setCities] = useState<CityQuantities>({ sapiranga: 0, igrejinha: 0 });
  const [transferOrigin, setTransferOrigin] = useState<keyof CityQuantities | null>(null);
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [savingLocations, setSavingLocations] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Modal de Movimentação
  const [movingProduct, setMovingProduct] = useState<AdminProduto | null>(null);
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PERDA' | 'DEVOLUCAO' | 'RESERVA'>('ENTRADA');
  const [movQtd, setMovQtd] = useState<number>(1);
  const [movMotivo, setMovMotivo] = useState('');
  const [movementCity, setMovementCity] = useState<StockLocation | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Produtos filtrados
  const filteredProdutos = useMemo(() => {
    return sortBrandCollectionProducts(produtos.filter(p => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchFilter = true;
      if (filterType === 'BAIXO') {
        matchFilter = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo ?? 2) && p.quantidade > 0;
      } else if (filterType === 'ZERADO') {
        matchFilter = p.quantidade === 0;
      } else if (filterType === 'PRONTA_ENTREGA') {
        matchFilter = p.tipoDisponibilidade === 'PRONTA_ENTREGA';
      } else if (filterType === 'ENCOMENDA') {
        matchFilter = p.tipoDisponibilidade === 'ENCOMENDA';
      }

      return matchSearch && matchFilter && (!locationFilter || stockLocations(p)[locationFilter] > 0);
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
  }, [produtos, searchTerm, filterType, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProdutos.length / STOCK_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * STOCK_PAGE_SIZE;
  const paginatedProdutos = filteredProdutos.slice(pageStart, pageStart + STOCK_PAGE_SIZE);

  const handleFilterChange = (filter: typeof filterType) => {
    setFilterType(filter);
    setPage(1);
  };

  // Totais de Estoque

  const totalFisico = useMemo(() => produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0), [produtos]);
  const totalCusto = useMemo(() => produtos.reduce((acc, p) => acc + getFifoStockValue(p), 0), [produtos]);
  const totalVenda = useMemo(() => produtos.reduce((acc, p) => acc + (p.precoVista || 0) * (p.quantidade || 0), 0), [produtos]);
  const totalReservado = useMemo(() => produtos.reduce((acc, p) => acc + (p.quantidadeReservada || 0), 0), [produtos]);
  const totalSapiranga = produtos.reduce((sum, product) => sum + product.estoqueSapiranga, 0);
  const totalIgrejinha = produtos.reduce((sum, product) => sum + product.estoqueIgrejinha, 0);
  const totalSemLocal = totalFisico - totalSapiranga - totalIgrejinha;
  const movementDelta = !movingProduct || movTipo === 'RESERVA' ? 0 : movTipo === 'AJUSTE'
    ? movQtd - movingProduct.quantidade : ['SAIDA', 'PERDA'].includes(movTipo) ? -movQtd : movQtd;

  const transferDestination = transferOrigin === 'sapiranga' ? 'igrejinha' : 'sapiranga';

  const openLocations = (product: AdminProduto, transfer = false) => {
    const { sapiranga, igrejinha } = stockLocations(product);
    setLocationProduct(product);
    setCities({ sapiranga, igrejinha });
    setTransferOrigin(transfer ? (sapiranga > 0 ? 'sapiranga' : 'igrejinha') : null);
    setTransferQuantity(1);
    setLocationError('');
    locationDialogRef.current?.showModal();
  };

  const saveLocations = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationProduct) return;
    setSavingLocations(true);
    setLocationError('');
    try {
      const distribution = transferOrigin ? { origem: transferOrigin, quantidade: transferQuantity } : cities;
      const result = await distribuirEstoqueAction(locationProduct.id, new Date(locationProduct.updatedAt).toISOString(), distribution);
      if (!result.success) throw new Error(result.error);
      locationDialogRef.current?.close();
      router.refresh();
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Não foi possível atualizar o estoque por cidade.');
    } finally {
      setSavingLocations(false);
    }
  };

  const handleOpenMoveModal = (p: AdminProduto, tipoPredef: typeof movTipo = 'ENTRADA') => {
    setMovingProduct(p);
    setMovTipo(tipoPredef);
    setMovQtd(tipoPredef === 'AJUSTE' ? p.quantidade : 1);
    setMovMotivo('');
    setMovementCity('');
    setFeedbackMsg('');
  };

  const handleExecuteMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingProduct) return;

    setIsSubmitting(true);
    try {
      await movimentarEstoqueAction(
        movingProduct.id,
        movTipo,
        Number(movQtd),
        movMotivo,
        movementCity ? { sapiranga: movementCity === 'sapiranga' ? Math.abs(movementDelta) : 0, igrejinha: movementCity === 'igrejinha' ? Math.abs(movementDelta) : 0 } : undefined,
      );
      setFeedbackMsg('Movimentação realizada com sucesso!');
      setTimeout(() => {
        setMovingProduct(null);
        window.location.reload();
      }, 700);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar movimentação.';
      setFeedbackMsg(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA VISÃO DE ESTOQUE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-5 sm:p-6 rounded-3xl border border-brand-line shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate flex items-center gap-2.5">
            <Boxes size={22} className="text-brand-muted" />
            Gestão & Controle de Estoque
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Controle de saldo físico, reservas, estoque mínimo, valor investido e histórico de movimentações.
          </p>
        </div>

        {/* Sub-Abas: Saldo Atual vs Histórico Completo */}
        <div className="flex flex-wrap items-center gap-1.5 bg-brand-nude p-1 rounded-2xl border border-brand-line">
          <button
            onClick={() => setActiveSubTab('saldo')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'saldo' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
            }`}
          >
            Saldo de Estoque ({totalFisico})
          </button>
          <button
            onClick={() => setActiveSubTab('historico')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'historico' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
            }`}
          >
            <History size={14} /> Histórico de Movimentações ({movimentacoesTotal})
          </button>
          <Link
            href="/admin/catalogo-estoque"
            prefetch={false}
            className="flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-card px-4 py-2 text-xs font-bold text-brand-chocolate hover:bg-brand-cream"
          >
            <FileText size={14} aria-hidden="true" /> Gerar catálogo
          </Link>
        </div>
      </div>

      {/* CARDS RESUMO DO ESTOQUE */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Total Físico em Estoque
          </span>
          <p className="text-xl sm:text-2xl font-bold text-brand-chocolate">
            {totalFisico} <span className="text-xs font-medium text-brand-muted">unidades</span>
          </p>
          <span className="text-[11px] text-brand-muted font-semibold block mt-1">
            {totalReservado} un. reservadas
          </span>
          <p className="mt-1 text-xs font-semibold text-brand-chocolate">Sapiranga {totalSapiranga} un. · Igrejinha {totalIgrejinha} un.</p>
          {totalSemLocal > 0 && <p className="mt-1 text-[11px] text-brand-muted">Sem local definido {totalSemLocal} un.</p>}
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Valor do estoque atual
          </span>
          <p className="text-xl sm:text-2xl font-bold text-brand-deep">
            {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[11px] text-brand-muted block mt-1">
            Custo das {totalFisico} un. em estoque
          </span>
          <span className="text-[11px] text-brand-muted block mt-1">
            Custo médio por unidade: R$ {totalFisico > 0 ? (totalCusto / totalFisico).toFixed(2).replace('.', ',') : '0,00'}
          </span>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
            Projeção de vendas do estoque
          </span>
          <p className="text-xl sm:text-2xl font-bold text-brand-deep">
            {totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[11px] text-brand-muted block mt-1">
            Venda das {totalFisico} un. pelo preço cadastrado
          </span>
          <span className="text-[11px] text-brand-chocolate font-bold block mt-1">
            Lucro bruto projetado {(totalVenda - totalCusto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* ABA: SALDO DE ESTOQUE */}
      {/* ========================================================= */}
      {activeSubTab === 'saldo' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="bg-brand-card p-3.5 sm:p-4 rounded-2xl border border-brand-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nome, marca ou SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-brand-nude focus:bg-brand-card text-xs text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none transition-all font-medium"
              />
            </div>

            {/* Pílulas de Filtro */}
            <div className="flex items-center gap-1 bg-brand-nude p-1 rounded-xl border border-brand-line overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleFilterChange('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ALL' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
                }`}
              >
                Todos ({produtos.length})
              </button>
              <button
                onClick={() => handleFilterChange('BAIXO')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'BAIXO' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-chocolate hover:text-brand-chocolate'
                }`}
              >
                Estoque Baixo
              </button>
              <button
                onClick={() => handleFilterChange('ZERADO')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ZERADO' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-chocolate hover:text-brand-chocolate'
                }`}
              >
                Sem Estoque
              </button>
              <button
                onClick={() => handleFilterChange('PRONTA_ENTREGA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'PRONTA_ENTREGA' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-chocolate hover:text-brand-chocolate'
                }`}
              >
                Pronta Entrega
              </button>
              <button
                onClick={() => handleFilterChange('ENCOMENDA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'ENCOMENDA' ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-deep'
                }`}
              >
                Encomenda
              </button>
            </div>
          </div>

          {/* TABELA DE ESTOQUE DENSE */}
          <div className="bg-brand-card rounded-2xl border border-brand-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-cream border-b border-brand-line text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Produto & Marca</th>
                    <th className="py-3 px-3 text-center">
                      <select aria-label="Filtrar estoque por local" value={locationFilter} onChange={event => {
                        setLocationFilter(event.target.value as typeof locationFilter);
                        setPage(1);
                      }} className="rounded-lg border border-brand-line bg-brand-card px-2 py-1.5 text-brand-chocolate">
                        <option value="">Todos os locais</option>
                        {(Object.keys(stockLocationLabels) as StockLocation[]).map(city => <option key={city} value={city}>{stockLocationLabels[city]}</option>)}
                      </select>
                    </th>
                    <th className="py-3 px-3 text-center">Reservado</th>
                    <th className="py-3 px-3 text-center">Disponível</th>
                    <th className="py-3 px-3 text-right">Custo Unit.</th>
                    <th className="py-3 px-3 text-right">Investido</th>
                    <th className="py-3 px-3 text-right">Potencial Venda</th>
                    <th className="py-3 px-4 text-right">Movimentação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-nude text-xs">
                  {filteredProdutos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-xs text-brand-muted">
                        Nenhum produto encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedProdutos.map((p) => {
                      const disponivel = Math.max(0, (p.quantidade || 0) - (p.quantidadeReservada || 0));
                      const isBaixo = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade <= (p.estoqueMinimo ?? 2) && p.quantidade > 0;
                      const isZerado = p.tipoDisponibilidade === 'PRONTA_ENTREGA' && p.quantidade === 0;
                      const totalInv = getFifoStockValue(p);
                      const totalPotVenda = (p.precoVista || 0) * (p.quantidade || 0);

                      return (
                        <tr key={p.id} className="hover:bg-brand-cream transition-colors">
                          {/* Produto e Marca */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                disabled={!p.fotos?.[0]}
                                aria-label={`Ampliar foto de ${p.nome}`}
                                title="Ampliar foto"
                                onClick={() => {
                                  setPreviewProduct(p);
                                  photoDialogRef.current?.showModal();
                                }}
                                className="w-9 h-9 rounded-xl bg-brand-cream border border-brand-line overflow-hidden shrink-0 flex items-center justify-center cursor-zoom-in disabled:cursor-default focus-visible:outline-2 focus-visible:outline-brand-chocolate"
                              >
                                {p.fotos && p.fotos[0] ? (
                                  <img src={normalizeImageUrl(p.fotos[0].url)} alt={p.nome} width={36} height={36} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <Package size={16} className="text-brand-muted" />
                                )}
                              </button>
                              <div>
                                <p className="font-bold text-brand-chocolate leading-tight line-clamp-1">{p.nome}</p>
                                <p className="text-[10px] text-brand-muted font-medium">
                                  {p.marca} {p.volume ? `• ${p.volume}` : ''}
                                </p>
                                {p.quantidade > 0 && <details className="mt-1 text-[10px] text-brand-muted">
                                  <summary className="cursor-pointer">Lotes FIFO</summary>
                                  <ul className="mt-1 space-y-1">{getFifoLots(p).filter(lot => lot.quantidade > 0).map(lot => <li key={lot.id}>{lot.quantidade} un. × {lot.custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {lot.recebidoEm ? new Date(lot.recebidoEm).toLocaleDateString('pt-BR') : 'Saldo inicial'} · {lot.origem}</li>)}</ul>
                                </details>}
                              </div>
                            </div>
                          </td>

                          {/* Quantidade Físico */}
                          <td className="py-3 px-3 text-center">
                            <p className="font-semibold text-brand-chocolate">{p.quantidade} un. no total</p>
                            <p className="mt-0.5 whitespace-nowrap text-brand-muted">Sapiranga {p.estoqueSapiranga} · Igrejinha {p.estoqueIgrejinha}</p>
                            {stockLocations(p).unassigned > 0 && <p className="mt-0.5 text-brand-muted">Sem local definido {stockLocations(p).unassigned}</p>}
                            {p.quantidade > 0 && <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                              <button type="button" onClick={() => openLocations(p)} aria-label={`Distribuir estoque de ${p.nome}`}
                                className="rounded-md border border-brand-line bg-brand-card px-2 py-1 text-brand-chocolate hover:bg-brand-nude">Distribuir</button>
                              {p.estoqueSapiranga + p.estoqueIgrejinha > 0 && <button type="button" onClick={() => openLocations(p, true)}
                                aria-label={`Transferir entre cidades o estoque de ${p.nome}`}
                                className="rounded-md border border-brand-line bg-brand-card px-2 py-1 text-brand-chocolate hover:bg-brand-nude">Transferir</button>}
                            </div>}
                          </td>

                          {/* Reservado */}
                          <td className="py-3 px-3 text-center text-brand-muted font-medium">
                            {p.quantidadeReservada || 0}
                          </td>

                          {/* Disponível */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isZerado 
                                ? 'bg-brand-rose-beige text-brand-chocolate'
                                : isBaixo 
                                ? 'bg-brand-nude text-brand-chocolate'
                                : 'bg-brand-nude text-brand-chocolate'
                            }`}>
                              {disponivel} un.
                            </span>
                          </td>

                          {/* Custo Unitário */}
                          <td className="py-3 px-3 text-right font-medium text-brand-muted">
                            {getFifoNextCost(p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Investimento Total */}
                          <td className="py-3 px-3 text-right font-bold text-brand-deep">
                            {totalInv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Potencial Venda */}
                          <td className="py-3 px-3 text-right font-bold text-brand-chocolate">
                            {totalPotVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Botão de Ação Rápida */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenMoveModal(p, 'ENTRADA')}
                                className="p-1.5 rounded-lg bg-brand-nude hover:bg-brand-nude text-brand-chocolate border border-brand-line transition-colors cursor-pointer"
                                title="Entrada rápida de estoque"
                              >
                                <ArrowUpRight size={13} className="text-brand-chocolate" />
                              </button>
                              <button
                                onClick={() => handleOpenMoveModal(p, 'SAIDA')}
                                className="p-1.5 rounded-lg bg-brand-nude hover:bg-brand-nude text-brand-chocolate border border-brand-line transition-colors cursor-pointer"
                                title="Saída / Perda de estoque"
                              >
                                <ArrowDownRight size={13} className="text-brand-chocolate" />
                              </button>
                              <button
                                onClick={() => handleOpenMoveModal(p, 'AJUSTE')}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-brand-chocolate hover:bg-brand-deep text-brand-cream transition-colors cursor-pointer"
                              >
                                Ajustar
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
            {filteredProdutos.length > 0 && (
              <nav aria-label="Paginação do estoque" className="flex flex-col gap-3 border-t border-brand-line px-4 py-3 text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between">
                <span>Mostrando {pageStart + 1}–{Math.min(pageStart + STOCK_PAGE_SIZE, filteredProdutos.length)} de {filteredProdutos.length} produtos</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="rounded-lg border border-brand-line px-3 py-2 font-semibold text-brand-chocolate hover:bg-brand-cream cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >Anterior</button>
                  <span aria-live="polite">Página {currentPage} de {totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className="rounded-lg border border-brand-line px-3 py-2 font-semibold text-brand-chocolate hover:bg-brand-cream cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >Próxima</button>
                </div>
              </nav>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA: HISTÓRICO DE MOVIMENTAÇÕES (AUDITORIA) */}
      {/* ========================================================= */}
      {activeSubTab === 'historico' && <StockMovementHistory />}

      <dialog
        ref={photoDialogRef}
        aria-label="Foto ampliada do produto"
        className="m-auto w-[92vw] max-w-3xl max-h-[92vh] overflow-auto rounded-2xl border border-brand-line bg-brand-card p-4 backdrop:bg-black/70"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {previewProduct?.fotos?.[0] && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-brand-chocolate">{previewProduct.nome}</p>
              <button
                type="button"
                autoFocus
                aria-label="Fechar foto ampliada"
                onClick={() => photoDialogRef.current?.close()}
                className="shrink-0 rounded-full p-2 text-brand-chocolate hover:bg-brand-nude cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={normalizeImageUrl(previewProduct.fotos[0].url)}
              alt={previewProduct.nome}
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />
          </div>
        )}
      </dialog>

      {/* ========================================================= */}
      <dialog ref={locationDialogRef} aria-labelledby="stock-location-title" onCancel={event => { if (savingLocations) event.preventDefault(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-brand-line bg-brand-card p-5 text-brand-chocolate shadow-xl backdrop:bg-black/40">
        {locationProduct && <form onSubmit={saveLocations} className="space-y-4">
          <div>
            <h3 id="stock-location-title" className="text-lg font-bold">{transferOrigin ? 'Transferir entre cidades' : 'Distribuir estoque'}</h3>
            <p className="text-sm text-brand-muted">{locationProduct.nome} · {locationProduct.quantidade} un.</p>
          </div>
          {transferOrigin ? <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Origem
              <select value={transferOrigin} onChange={event => {
                setTransferOrigin(event.target.value === 'sapiranga' ? 'sapiranga' : 'igrejinha');
                setTransferQuantity(1);
              }} className="mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2">
                {(['sapiranga', 'igrejinha'] as const).map(city => <option key={city} value={city} disabled={cities[city] === 0}>
                  {stockLocationLabels[city]} ({cities[city]} un.)
                </option>)}
              </select>
            </label>
            <div className="text-sm font-semibold">
              <span>Destino</span>
              <p className="mt-1 rounded-lg border border-brand-line bg-brand-nude px-3 py-2">{stockLocationLabels[transferDestination]}</p>
            </div>
            <label className="text-sm font-semibold sm:col-span-2">
              Quantidade
              <input type="number" min="1" max={cities[transferOrigin]} required value={transferQuantity}
                onChange={event => setTransferQuantity(Number(event.target.value))}
                className="mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2" />
            </label>
          </div> : <>
            <div className="grid grid-cols-2 gap-3">
              {(['sapiranga', 'igrejinha'] as const).map(city => <label key={city} className="text-sm font-semibold">
                {stockLocationLabels[city]}
                <input type="number" min="0" max={locationProduct.quantidade} required value={cities[city]}
                  onChange={event => setCities(previous => ({ ...previous, [city]: Number(event.target.value) }))}
                  className="mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2" />
              </label>)}
            </div>
            {cities.sapiranga + cities.igrejinha <= locationProduct.quantidade && <p className="text-xs text-brand-muted">
              Sem local definido {locationProduct.quantidade - cities.sapiranga - cities.igrejinha} un.
            </p>}
          </>}
          {locationError && <p role="alert" className="text-sm text-red-700">{locationError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => locationDialogRef.current?.close()} disabled={savingLocations} className="rounded-lg border border-brand-line px-3 py-2 text-sm">Cancelar</button>
            <button type="submit" disabled={savingLocations} className="rounded-lg bg-brand-chocolate px-3 py-2 text-sm font-semibold text-brand-cream disabled:opacity-50">
              {savingLocations ? 'Salvando…' : transferOrigin ? 'Confirmar transferência' : 'Salvar distribuição'}
            </button>
          </div>
        </form>}
      </dialog>

      {/* MODAL DE MOVIMENTAÇÃO RÁPIDA DE ESTOQUE */}
      {/* ========================================================= */}
      {movingProduct && (
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-md rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-brand-chocolate">
                  Movimentar Estoque
                </h3>
                <p className="text-xs text-brand-muted font-medium">
                  {movingProduct.nome} ({movingProduct.marca})
                </p>
              </div>
              <button
                onClick={() => setMovingProduct(null)}
                className="p-1 rounded-full text-brand-muted hover:text-brand-chocolate hover:bg-brand-nude transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {feedbackMsg && (
              <div className="mb-4 p-3 rounded-xl bg-brand-nude border border-brand-line text-brand-chocolate text-xs font-semibold">
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleExecuteMovimentacao} className="space-y-4">
              {/* Saldo Atual */}
              <div className="p-3 rounded-xl bg-brand-nude border border-brand-line flex items-center justify-between text-xs">
                <span className="font-medium text-brand-muted">Saldo Físico Atual:</span>
                <span className="font-bold text-brand-chocolate text-sm">{movingProduct.quantidade} unidades</span>
              </div>

              {/* Tipo de Movimentação */}
              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'ENTRADA', label: 'Entrada (+)' },
                    { key: 'SAIDA', label: 'Saída (-)' },
                    { key: 'AJUSTE', label: 'Ajuste (=)' },
                    { key: 'PERDA', label: 'Perda/Avaria' },
                    { key: 'DEVOLUCAO', label: 'Devolução' },
                    { key: 'RESERVA', label: 'Reserva' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setMovTipo(t.key as typeof movTipo);
                        if (t.key === 'AJUSTE') setMovQtd(movingProduct.quantidade);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        movTipo === t.key
                          ? 'bg-brand-chocolate text-brand-cream border-brand-chocolate shadow-xs'
                          : 'bg-brand-nude text-brand-muted border-brand-line hover:bg-brand-nude'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5">
                  {movTipo === 'AJUSTE' ? 'Nova Quantidade Real em Estoque' : 'Quantidade a Movimentar'}
                </label>
                <input
                  type="number"
                  min={movTipo === 'AJUSTE' ? 0 : 1}
                  required
                  value={movQtd}
                  onChange={(e) => setMovQtd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-brand-nude focus:bg-brand-card text-sm font-bold text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none"
                />
              </div>

              {movementDelta !== 0 && <label className="block text-xs font-semibold text-brand-muted">
                {movementDelta < 0 ? 'Local da saída' : 'Local da entrada'}
                <select value={movementCity || (movementDelta > 0 ? 'unassigned' : '')} onChange={event => setMovementCity(event.target.value as typeof movementCity)}
                  className="mt-1 block w-full rounded-xl border border-brand-line bg-brand-card px-3 py-2 text-brand-chocolate">
                  {movementDelta < 0 && <option value="">Usar saldo disponível</option>}
                  {(['unassigned', 'sapiranga', 'igrejinha'] as const).map(city => <option key={city} value={city}>
                    {stockLocationLabels[city]}{movementDelta < 0 ? ` (${stockLocations(movingProduct)[city]} un.)` : ''}
                  </option>)}
                </select>
              </label>}

              {/* Motivo */}
              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  required
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ex: Chegada de lote, provador de mostruário, ajuste de contagem..."
                  className="w-full px-3.5 py-2.5 bg-brand-nude focus:bg-brand-card text-xs font-medium text-brand-chocolate rounded-xl border border-brand-line focus:border-brand-caramel outline-none"
                />
              </div>

              {/* Usuário Responsável */}
              <p className="text-[11px] text-brand-muted">
                Registrado por: <strong className="text-brand-chocolate">{user?.name || 'Administrador'}</strong>
              </p>

              {/* Botões */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setMovingProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-brand-line text-xs font-bold text-brand-muted hover:bg-brand-nude transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-brand-caramel" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Movimentação</span>
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
