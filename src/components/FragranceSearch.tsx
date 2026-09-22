"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Sparkles, CheckCircle2, PlusCircle, AlertCircle } from 'lucide-react';
import { FragranceSearchResult, FragranceSearchResponse } from '@/services/fragrance-search/types';
import FragrancePreviewModal from './FragrancePreviewModal';

interface Props {
  placeholder?: string;
  className?: string;
  onSelectLocalProduct?: (productId: number) => void;
  onManualCreate?: () => void;
  onSuccessImport?: (importedProduct: any) => void;
  autoFocus?: boolean;
}

export default function FragranceSearch({
  placeholder = 'Buscar fragrância por nome, marca ou versão...',
  className = '',
  onSelectLocalProduct,
  onManualCreate,
  onSuccessImport,
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FragranceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [previewFragrance, setPreviewFragrance] = useState<FragranceSearchResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search com cancelamento de requisição anterior (AbortController)
  useEffect(() => {
    const cleanQuery = query.trim();

    if (cleanQuery.length < 3) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fragrances/search?q=${encodeURIComponent(cleanQuery)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('Falha na resposta do servidor');
        }

        const data: FragranceSearchResponse = await res.json();
        setResults(data.results || []);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[FragranceSearch] Erro ao buscar:', err);
          setError('Não foi possível carregar as sugestões.');
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350); // 350ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelectItem = useCallback((item: FragranceSearchResult) => {
    setIsOpen(false);
    if (item.isLocal && item.id) {
      if (onSelectLocalProduct) {
        onSelectLocalProduct(item.id);
      }
    } else {
      // Abre modal de prévia antes de importar
      setPreviewFragrance(item);
    }
  }, [onSelectLocalProduct]);

  // Navegação por teclado (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelectItem(results[activeIndex]);
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
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Barra de Busca Input */}
      <div className="relative flex items-center w-full">
        <Search
          size={16}
          className="absolute left-3.5 text-[#09090b] pointer-events-none transition-colors"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-white hover:bg-white focus:bg-white text-xs sm:text-sm text-[#09090b] font-medium placeholder:text-[#64748b] pl-10 pr-10 py-2.5 rounded-full border-2 border-[#dcd5c7] focus:border-[#09090b] focus:ring-4 focus:ring-[#09090b]/5 outline-none transition-all shadow-xs"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 size={15} className="animate-spin text-[#7a5828]" />
          )}

          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-[#09090b] hover:bg-[#faf8f5] rounded-full transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de Resultados Inteligentes */}
      {isOpen && query.trim().length >= 3 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-[#dcd5c7] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 sm:p-2.5 max-h-[380px] overflow-y-auto divide-y divide-[#dcd5c7]">
            {results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a5828] flex items-center justify-between">
                  <span>Fragrâncias Encontradas</span>
                  <span className="font-bold text-[#27272a]">{results.length} resultados</span>
                </div>

                {results.map((item, index) => {
                  const isSelected = index === activeIndex;
                  return (
                    <button
                      key={`${item.source}-${item.externalId || item.id || index}`}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 min-w-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#f5ede2] border border-[#dcd5c7]'
                          : 'hover:bg-[#faf8f5] border border-transparent'
                      }`}
                    >
                      {/* Miniatura do Perfume */}
                      <div className="w-11 h-12 rounded-lg bg-white border border-[#dcd5c7] shrink-0 p-1 flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Sparkles size={16} className="text-[#7a5828]" />
                        )}
                      </div>

                      {/* Informações Principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a5828] truncate">
                            {item.brand || 'Importado'}
                          </span>
                          {item.year && (
                            <>
                              <span className="text-[#dcd5c7] text-[10px] font-bold">•</span>
                              <span className="text-[10px] text-[#27272a] font-semibold">
                                {item.year}
                              </span>
                            </>
                          )}
                          {item.concentration && (
                            <>
                              <span className="text-[#dcd5c7] text-[10px] font-bold">•</span>
                              <span className="text-[10px] text-[#27272a] font-semibold truncate">
                                {item.concentration}
                              </span>
                            </>
                          )}
                        </div>

                        <h5 className="font-serif text-xs sm:text-sm font-bold text-[#09090b] truncate mt-0.5">
                          {item.name}
                        </h5>

                        {item.family && (
                          <p className="text-[10px] text-[#3f3f46] font-medium truncate">
                            {item.family}
                          </p>
                        )}
                      </div>

                      {/* Badge de Status / Preço */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {item.isLocal ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              <CheckCircle2 size={11} className="text-emerald-700" />
                              Já cadastrado
                            </span>
                            {item.priceFormatted && (
                              <span className="text-[11px] font-extrabold text-[#09090b]">
                                {item.priceFormatted}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7a5828] bg-[#f8f3eb] px-2 py-0.5 rounded-full border border-[#dcd5c7]">
                            <PlusCircle size={11} />
                            Importar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div className="py-6 px-4 text-center space-y-2.5">
                <AlertCircle size={22} className="mx-auto text-[#a1a1aa]" />
                <p className="text-xs text-[#71717a] font-medium">
                  Nenhuma fragrância encontrada para <strong className="text-[#18181b]">"{query}"</strong>.
                </p>
                {onManualCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onManualCreate();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#a37941] hover:text-[#7a572a] hover:underline"
                  >
                    <PlusCircle size={14} /> Cadastrar manualmente no catálogo
                  </button>
                )}
              </div>
            ) : null}

            {error && (
              <div className="p-3 text-center text-xs text-red-600 bg-red-50 rounded-xl mt-1">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Prévia antes de Importar */}
      {previewFragrance && (
        <FragrancePreviewModal
          fragrance={previewFragrance}
          onClose={() => setPreviewFragrance(null)}
          onSuccessImport={(newProduct) => {
            if (onSuccessImport) onSuccessImport(newProduct);
          }}
        />
      )}
    </div>
  );
}
