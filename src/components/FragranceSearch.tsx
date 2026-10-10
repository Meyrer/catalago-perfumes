"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface RegisteredProduct {
  id: number;
  nome: string;
  marca: string;
  descricao?: string;
  precoVista: number;
  volume?: string | null;
  caracteristicas?: string | null;
  tipoDisponibilidade?: string;
  quantidade?: number;
  categoria?: { nome: string };
  fotos?: { url: string }[];
}

interface Props {
  placeholder?: string;
  className?: string;
  query?: string;
  products?: RegisteredProduct[];
  onQueryChange?: (query: string) => void;
  onSelectLocalProduct?: (productId: number) => void;
  onManualCreate?: (query?: string) => void;
  autoFocus?: boolean;
}

function isProdutoEmEstoque(p: RegisteredProduct): boolean {
  return p.tipoDisponibilidade === 'PRONTA_ENTREGA' && (p.quantidade ?? 1) > 0;
}

export default function FragranceSearch({
  placeholder = 'Buscar perfume, marca ou produto...',
  className = '',
  query: controlledQuery,
  products = [],
  onQueryChange,
  onSelectLocalProduct,
  onManualCreate,
  autoFocus = false,
}: Props) {
  const [internalQuery, setInternalQuery] = useState('');
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Busca estrita e inteligente apenas nos produtos cadastrados
  const matchingProducts = useMemo(() => {
    const clean = query.trim();
    if (clean.length < 2 || !products || products.length === 0) return [];

    const q = clean.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = q.split(/\s+/).filter(Boolean);

    const scored = products
      .map(p => {
        const nomeNorm = (p.nome || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const marcaNorm = (p.marca || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const catNorm = (p.categoria?.nome || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const caracNorm = (p.caracteristicas || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const fullText = `${nomeNorm} ${marcaNorm} ${catNorm} ${caracNorm}`;

        // Todos os termos digitados devem estar presentes em algum campo do produto cadastrado
        const allTokensMatch = tokens.every(token => fullText.includes(token));
        if (!allTokensMatch) return null;

        // Cálculo de pontuação de relevância
        let score = 0;
        if (nomeNorm === q) score += 100;
        else if (nomeNorm.startsWith(q)) score += 60;
        else if (nomeNorm.includes(q)) score += 40;

        if (marcaNorm === q) score += 50;
        else if (marcaNorm.startsWith(q)) score += 30;
        else if (marcaNorm.includes(q)) score += 20;

        if (isProdutoEmEstoque(p)) score += 5; // Leve prioridade para itens em pronta entrega

        return { product: p, score };
      })
      .filter((item): item is { product: RegisteredProduct; score: number } => item !== null);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.product);
  }, [query, products]);

  const handleSelectItem = (product: RegisteredProduct) => {
    setIsOpen(false);
    if (onSelectLocalProduct) {
      onSelectLocalProduct(product.id);
    }
  };

  // Navegação por teclado (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || matchingProducts.length === 0) {
      if (e.key === 'ArrowDown' && matchingProducts.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < matchingProducts.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : matchingProducts.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < matchingProducts.length) {
          handleSelectItem(matchingProducts[activeIndex]);
        } else {
          setIsOpen(false);
          requestAnimationFrame(() => {
            document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
          });
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Barra de Busca Input */}
      <div className="relative flex items-center w-full">
        <Search
          size={16}
          className="absolute left-3.5 text-brand-chocolate pointer-events-none transition-colors"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-brand-card hover:bg-brand-card focus:bg-brand-card text-xs sm:text-sm text-brand-chocolate font-medium placeholder:text-brand-muted pl-10 pr-10 py-2.5 rounded-xl border border-brand-line focus:border-brand-chocolate focus:ring-4 focus:ring-brand-chocolate/5 outline-none transition-all shadow-xs"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-brand-chocolate hover:bg-brand-nude rounded-full transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de Sugestões: Apenas produtos cadastrados */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-brand-card rounded-2xl border-2 border-brand-line shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 sm:p-2.5 max-h-[70vh] sm:max-h-[420px] overflow-y-auto divide-y divide-brand-line">
            {matchingProducts.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center justify-between">
                  <span>Produtos no Catálogo</span>
                  <span className="font-bold text-brand-muted">{matchingProducts.length} encontrados</span>
                </div>

                {matchingProducts.map((item, index) => {
                  const isSelected = index === activeIndex;
                  const inStock = isProdutoEmEstoque(item);
                  const fotoUrl = item.fotos && item.fotos[0]?.url;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 min-w-0 cursor-pointer ${
                        isSelected
                          ? 'bg-brand-nude border border-brand-line'
                          : 'hover:bg-brand-nude border border-transparent'
                      }`}
                    >
                      {/* Miniatura do Perfume Cadastrado */}
                      <div className="w-11 h-12 rounded-lg bg-brand-cream border border-brand-line shrink-0 p-1 flex items-center justify-center overflow-hidden">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={item.nome}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Sparkles size={16} className="text-brand-muted" />
                        )}
                      </div>

                      {/* Informações Principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted truncate">
                            {item.marca}
                          </span>
                          {item.volume && (
                            <>
                              <span className="text-brand-line text-[10px] font-bold">•</span>
                              <span className="text-[10px] text-brand-muted font-semibold truncate">
                                {item.volume}
                              </span>
                            </>
                          )}
                          {item.categoria?.nome && (
                            <>
                              <span className="text-brand-line text-[10px] font-bold">•</span>
                              <span className="text-[10px] text-brand-muted font-semibold truncate">
                                {item.categoria.nome}
                              </span>
                            </>
                          )}
                        </div>

                        <h5 className="font-serif text-xs sm:text-sm font-bold text-brand-chocolate truncate mt-0.5">
                          {item.nome}
                        </h5>
                      </div>

                      {/* Preço e Badge de Disponibilidade Real */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[11px] sm:text-xs font-extrabold text-brand-chocolate">
                          {item.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            inStock
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              : 'text-amber-800 bg-amber-50 border-amber-200'
                          }`}
                        >
                          {inStock ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {inStock ? 'Em estoque' : 'Encomenda'}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Atalho sob encomenda quando houver resultados */}
                {onManualCreate && (
                  <div className="pt-2 mt-1 border-t border-brand-line text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onManualCreate(query);
                      }}
                      className="text-[11px] font-semibold text-brand-muted hover:text-brand-chocolate inline-flex items-center gap-1 cursor-pointer transition-colors py-1"
                    >
                      <Sparkles size={12} className="text-brand-caramel" />
                      Procurando outro produto? Peça sob encomenda
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 px-4 text-center space-y-2.5">
                <AlertCircle size={22} className="mx-auto text-brand-muted" />
                <p className="text-xs text-brand-muted font-medium">
                  Nenhum produto cadastrado para <strong className="text-brand-deep">&ldquo;{query}&rdquo;</strong>.
                </p>
                {onManualCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onManualCreate(query);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-chocolate hover:text-brand-deep underline cursor-pointer mt-1"
                  >
                    <Sparkles size={13} className="text-brand-caramel" />
                    Pedir perfume sob encomenda pelo WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
