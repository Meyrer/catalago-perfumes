"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles, MessageCircle, ShieldCheck, Check, Search, Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { FragranceSearchResult } from "@/services/fragrance-search/types";

interface CustomOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
  whatsappPhone?: string;
}

const COMMON_VOLUMES = ["30 ml", "50 ml", "75 ml", "80 ml", "90 ml", "100 ml", "125 ml", "200 ml", "Outro"];
const CONCENTRATIONS = [
  "Indiferente",
  "Eau de Parfum (EDP)",
  "Eau de Toilette (EDT)",
  "Parfum / Extrait",
  "Body Splash / Mist",
];

export default function CustomOrderModal({
  isOpen,
  onClose,
  initialValue = "",
  whatsappPhone = "5511999999999",
}: CustomOrderModalProps) {
  const [fragranceName, setFragranceName] = useState(initialValue);
  const [brand, setBrand] = useState("");
  const [volume, setVolume] = useState("100 ml");
  const [concentration, setConcentration] = useState("Indiferente");
  const [observations, setObservations] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<FragranceSearchResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [autoFilledSuccess, setAutoFilledSuccess] = useState(false);

  // Selected & Zoom Preview State
  const [selectedItem, setSelectedItem] = useState<FragranceSearchResult | null>(null);
  const [previewItem, setPreviewItem] = useState<FragranceSearchResult | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pre-fill initialValue
  useEffect(() => {
    if (initialValue) {
      setFragranceName(initialValue);
    }
  }, [initialValue]);

  // Click outside suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    const query = fragranceName.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setShowSuggestions(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingSuggestions(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fragrances/search?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions((data.results || []).length > 0);
        setSelectedIndex(-1);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [fragranceName]);

  // Select a suggestion
  const handleSelectSuggestion = (item: FragranceSearchResult) => {
    setFragranceName(item.name);
    if (item.brand) setBrand(item.brand);

    // Auto-select volume
    if (item.volume) {
      const match = COMMON_VOLUMES.find((v) => v.toLowerCase() === item.volume?.toLowerCase());
      if (match) {
        setVolume(match);
      } else {
        setVolume(item.volume);
      }
    }

    // Auto-select concentration
    if (item.concentration) {
      const lower = item.concentration.toLowerCase();
      if (lower.includes("eau de parfum") || lower.includes("edp")) {
        setConcentration("Eau de Parfum (EDP)");
      } else if (lower.includes("eau de toilette") || lower.includes("edt")) {
        setConcentration("Eau de Toilette (EDT)");
      } else if (lower.includes("parfum") || lower.includes("extrait") || lower.includes("elixir")) {
        setConcentration("Parfum / Extrait");
      } else if (lower.includes("body splash") || lower.includes("mist")) {
        setConcentration("Body Splash / Mist");
      } else {
        setConcentration(item.concentration);
      }
    }

    setShowSuggestions(false);
    setSelectedItem(item);
    setAutoFilledSuccess(true);
    setTimeout(() => setAutoFilledSuccess(false), 3000);
  };

  // Keyboard navigation for suggestions
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Escape to close modal / preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewItem) {
          setPreviewItem(null);
          setZoomLevel(1);
        } else if (showSuggestions) {
          setShowSuggestions(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showSuggestions, previewItem]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFragrance = fragranceName.trim();
    if (!cleanFragrance) return;

    let message = `*SOLICITAÇÃO DE ORÇAMENTO SOB ENCOMENDA* ✨\n`;
    message += `Olá! Gostaria de consultar a disponibilidade e o valor para encomendar a seguinte fragrância:\n\n`;
    message += `• *Fragrância:* ${cleanFragrance}\n`;
    if (brand.trim()) message += `• *Marca/Grife:* ${brand.trim()}\n`;
    if (volume.trim()) message += `• *Volume:* ${volume.trim()}\n`;
    if (concentration && concentration !== "Indiferente") {
      message += `• *Concentração:* ${concentration}\n`;
    }
    if (observations.trim()) {
      message += `• *Observações:* ${observations.trim()}\n`;
    }
    if (customerName.trim()) {
      message += `• *Solicitante:* ${customerName.trim()}\n`;
    }

    message += `\nVi no catálogo a condição de *50% de sinal no pedido e 50% na entrega*. Poderia me informar o valor e a previsão de chegada?`;

    window.open(
      `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-order-title"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-[#18181b]/15 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2dcd2] flex items-center justify-between bg-[#fbf9f5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#18181b] flex items-center justify-center text-[#c5a880] shrink-0 shadow-xs">
              <Sparkles size={17} />
            </div>
            <div>
              <h3
                id="custom-order-title"
                className="font-serif text-lg sm:text-xl font-bold text-[#09090b] leading-tight"
              >
                Solicitar Perfume Sob Encomenda
              </h3>
              <p className="text-xs text-[#52525b] font-medium">
                Importamos a fragrância dos seus sonhos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 rounded-full text-[#18181b] hover:bg-[#ebdcc8] transition-colors border border-[#e2dcd2] cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Trust Banner (Alto Contraste) */}
          <div className="bg-[#f5efe4] border-2 border-[#dcd3c0] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#63481e]">
                Como funciona o seu pedido
              </span>
              <span className="text-[11px] font-bold text-white bg-emerald-800 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <ShieldCheck size={13} /> 50% sinal • 50% na entrega
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-[#dcd3c0]/70">
              <div className="space-y-0.5">
                <span className="text-[#18181b] font-extrabold text-xs block">01</span>
                <p className="font-bold text-[#09090b] text-xs">Informe os dados</p>
                <p className="text-[11px] text-[#27272a] font-medium leading-tight">Nome e tamanho da fragrância.</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[#18181b] font-extrabold text-xs block">02</span>
                <p className="font-bold text-[#09090b] text-xs">Cotação rápida</p>
                <p className="text-[11px] text-[#27272a] font-medium leading-tight">Valor e prazo de chegada no WhatsApp.</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[#18181b] font-extrabold text-xs block">03</span>
                <p className="font-bold text-[#09090b] text-xs">Sem surpresas</p>
                <p className="text-[11px] text-[#27272a] font-medium leading-tight">Pague o restante só quando receber.</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="custom-order-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Fragrância com Autocomplete Inteligente */}
            <div ref={searchContainerRef} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="modal-fragrance-name"
                  className="font-bold text-[#09090b] text-xs uppercase tracking-wide flex items-center gap-1.5"
                >
                  <span>Qual perfume ou cosmético você procura? *</span>
                  {isLoadingSuggestions && (
                    <Loader2 size={13} className="animate-spin text-[#a37941]" />
                  )}
                </label>
                {autoFilledSuccess && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-in fade-in">
                    <Check size={12} /> Dados preenchidos automaticamente!
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="modal-fragrance-name"
                  type="text"
                  required
                  autoComplete="off"
                  value={fragranceName}
                  onChange={(e) => {
                    setFragranceName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyDownInput}
                  placeholder="Ex.: 1 Million, Dior Sauvage, Baccarat Rouge..."
                  className="w-full bg-white border-2 border-[#18181b] focus:ring-4 focus:ring-[#18181b]/10 focus:outline-none rounded-xl px-4 py-3 text-sm text-[#09090b] font-semibold placeholder:text-[#64748b] transition-all shadow-sm"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#18181b] pointer-events-none">
                  <Search size={17} />
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border-2 border-[#18181b] rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-[#dcd5c7] animate-in fade-in slide-in-from-top-1">
                  <div className="px-3.5 py-1.5 bg-[#fbf9f5] border-b border-[#dcd5c7] flex items-center justify-between text-[11px] font-bold text-[#7a5828]">
                    <span>Fragrâncias encontradas (clique na foto para ampliar):</span>
                    <span className="text-[10px] text-[#71717a] font-normal">Pressione Enter ou clique</span>
                  </div>
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        selectedIndex === idx ? "bg-[#f5ede2]" : "hover:bg-[#faf7f2]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.imageUrl) {
                              setPreviewItem(item);
                              setZoomLevel(1);
                            }
                          }}
                          title={item.imageUrl ? "Clique para ampliar a foto do perfume" : "Sem foto"}
                          className={`relative group/thumb w-10 h-11 rounded-lg bg-[#f4ebe1] border border-[#dcd6cc] flex items-center justify-center shrink-0 overflow-hidden ${
                            item.imageUrl ? "cursor-zoom-in hover:border-[#09090b] hover:shadow-md transition-all" : ""
                          }`}
                        >
                          {item.imageUrl ? (
                            <>
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-full h-full object-contain p-0.5 group-hover/thumb:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn size={14} className="drop-shadow" />
                              </div>
                            </>
                          ) : (
                            <Sparkles size={14} className="text-[#a37941]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#09090b] text-xs sm:text-sm truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.brand && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a5828] bg-[#f5ede2] px-1.5 py-0.5 rounded">
                                {item.brand}
                              </span>
                            )}
                            {item.concentration && (
                              <span className="text-[10px] font-semibold text-[#18181b] bg-[#f4f4f5] px-1.5 py-0.5 rounded">
                                {item.concentration}
                              </span>
                            )}
                            {item.volume && (
                              <span className="text-[10px] text-[#52525b] font-medium">
                                {item.volume}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 text-[11px] font-bold text-[#a37941] bg-white border border-[#dcd6cc] px-2 py-1 rounded-lg shadow-2xs">
                        Puxar dados ↵
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Mini-card de Fragrância Selecionada com opção de ampliar foto */}
              {selectedItem && (
                <div className="mt-2.5 p-3 bg-[#fdfbf7] border-2 border-[#dcd6cc] rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewItem(selectedItem);
                        setZoomLevel(1);
                      }}
                      title="Clique para ampliar a foto do perfume"
                      className="relative group/selthumb w-12 h-14 rounded-xl bg-white border-2 border-[#dcd6cc] p-1 flex items-center justify-center shrink-0 overflow-hidden cursor-zoom-in hover:border-[#09090b] hover:shadow-sm transition-all"
                    >
                      {selectedItem.imageUrl ? (
                        <>
                          <img
                            src={selectedItem.imageUrl}
                            alt={selectedItem.name}
                            className="w-full h-full object-contain group-hover/selthumb:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/selthumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn size={15} />
                          </div>
                        </>
                      ) : (
                        <Sparkles size={16} className="text-[#a37941]" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-extrabold text-[#7a5828] bg-[#f5ede2] px-1.5 py-0.5 rounded">
                          {selectedItem.brand || "Perfume Selecionado"}
                        </span>
                        {selectedItem.concentration && (
                          <span className="text-[10px] font-semibold text-[#18181b] bg-[#f4f4f5] px-1.5 py-0.5 rounded">
                            {selectedItem.concentration}
                          </span>
                        )}
                      </div>
                      <p className="font-serif font-bold text-xs sm:text-sm text-[#09090b] truncate mt-0.5">
                        {selectedItem.name}
                      </p>
                      {selectedItem.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewItem(selectedItem);
                            setZoomLevel(1);
                          }}
                          className="text-[11px] font-bold text-[#7a5828] hover:text-[#09090b] flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <ZoomIn size={12} /> Clique para ampliar a foto
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                    }}
                    className="text-xs font-bold text-[#52525b] hover:text-[#09090b] bg-white hover:bg-[#f4f4f5] border border-[#dcd6cc] px-2.5 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>

            {/* Marca e Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="modal-fragrance-brand"
                  className="block font-bold text-[#09090b] text-xs uppercase tracking-wide mb-1.5"
                >
                  Marca ou Grife (opcional)
                </label>
                <input
                  id="modal-fragrance-brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex.: Rabanne, Dior, Chanel, Lattafa..."
                  className="w-full bg-white border-2 border-[#cbd5e1] focus:border-[#18181b] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] font-semibold placeholder:text-[#64748b] transition-all shadow-2xs"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-fragrance-volume"
                  className="block font-bold text-[#09090b] text-xs uppercase tracking-wide mb-1.5"
                >
                  Volume Desejado
                </label>
                <select
                  id="modal-fragrance-volume"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-white border-2 border-[#cbd5e1] focus:border-[#18181b] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  {COMMON_VOLUMES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Concentração */}
            <div>
              <label className="block font-bold text-[#09090b] text-xs uppercase tracking-wide mb-2">
                Concentração desejada
              </label>
              <div className="flex flex-wrap gap-2">
                {CONCENTRATIONS.map((c) => {
                  const isSelected = concentration === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConcentration(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#09090b] border-2 border-[#09090b] text-white shadow-xs scale-102"
                          : "bg-white border-2 border-[#cbd5e1] text-[#0f172a] hover:border-[#09090b] hover:bg-[#fafafa]"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label
                htmlFor="modal-fragrance-obs"
                className="block font-bold text-[#09090b] text-xs uppercase tracking-wide mb-1.5"
              >
                Observações adicionais (opcional)
              </label>
              <input
                id="modal-fragrance-obs"
                type="text"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex.: Versão antiga, frasco lacrado, embalagem para presente..."
                className="w-full bg-white border-2 border-[#cbd5e1] focus:border-[#18181b] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] font-semibold placeholder:text-[#64748b] transition-all shadow-2xs"
              />
            </div>

            {/* Seu Nome */}
            <div>
              <label
                htmlFor="modal-fragrance-name-client"
                className="block font-bold text-[#09090b] text-xs uppercase tracking-wide mb-1.5"
              >
                Seu nome (opcional)
              </label>
              <input
                id="modal-fragrance-name-client"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Como prefere ser chamado(a) no WhatsApp?"
                className="w-full bg-white border-2 border-[#cbd5e1] focus:border-[#18181b] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] font-semibold placeholder:text-[#64748b] transition-all shadow-2xs"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#e2dcd2] bg-[#fbf9f5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-[#cbd5e1] hover:border-[#09090b] bg-white text-[#09090b] text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="custom-order-form"
            disabled={!fragranceName.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#09090b] hover:bg-black text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle size={16} className="text-[#25D366]" />
            Solicitar Orçamento no WhatsApp
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Modal do Perfume */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => {
            setPreviewItem(null);
            setZoomLevel(1);
          }}
        >
          {/* Top Bar Controls */}
          <div 
            className="w-full max-w-xl flex items-center justify-between pb-3 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs font-semibold flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                <Sparkles size={13} className="text-[#c5a880]" />
                Visualização Ampliada
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev > 1 ? 1 : 2))}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                title={zoomLevel > 1 ? "Reduzir zoom" : "Ampliar zoom"}
              >
                {zoomLevel > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                <span>{zoomLevel > 1 ? "Zoom 1x" : "Zoom 2x"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewItem(null);
                  setZoomLevel(1);
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Fechar ampliação"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Large Image Box */}
          <div 
            className="relative w-full max-w-xl max-h-[62vh] min-h-[320px] bg-[#121214]/90 border border-white/15 rounded-3xl p-6 sm:p-8 flex items-center justify-center overflow-hidden shadow-2xl cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevel((prev) => (prev > 1 ? 1 : 2));
            }}
            title="Clique na foto para alternar entre 1x e 2x de zoom"
          >
            {previewItem.imageUrl ? (
              <img
                src={previewItem.imageUrl}
                alt={previewItem.name}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
                }}
                className={`max-h-[50vh] max-w-full object-contain drop-shadow-2xl ${
                  zoomLevel > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />
            ) : (
              <div className="text-center text-white/70 py-12">
                <Sparkles size={40} className="mx-auto mb-2 text-[#c5a880]" />
                <p className="text-xs">Foto não disponível</p>
              </div>
            )}

            {/* Hint overlay */}
            <div className="absolute bottom-3 right-4 pointer-events-none bg-black/60 border border-white/15 text-[10px] text-white/80 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
              <ZoomIn size={11} /> Toque para alternar zoom (1x / 2x)
            </div>
          </div>

          {/* Bottom Fragrance Info & Action */}
          <div 
            className="w-full max-w-xl bg-[#1c1c1f] border border-white/15 rounded-2xl p-4 mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-left w-full sm:w-auto min-w-0">
              {previewItem.brand && (
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#c5a880] block">
                  {previewItem.brand}
                </span>
              )}
              <h4 className="font-serif text-sm sm:text-base font-bold text-white truncate">
                {previewItem.name}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {previewItem.concentration && (
                  <span className="text-[10px] font-semibold bg-white/10 text-white/90 px-2 py-0.5 rounded">
                    {previewItem.concentration}
                  </span>
                )}
                {previewItem.volume && (
                  <span className="text-[10px] text-white/70 font-medium">
                    {previewItem.volume}
                  </span>
                )}
                {previewItem.family && (
                  <span className="text-[10px] text-[#c5a880]/90">
                    • {previewItem.family}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPreviewItem(null);
                  setZoomLevel(1);
                }}
                className="px-3.5 py-2 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectSuggestion(previewItem);
                  setPreviewItem(null);
                  setZoomLevel(1);
                }}
                className="px-4 py-2 rounded-xl bg-[#c5a880] hover:bg-[#b09062] text-[#09090b] text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Check size={14} />
                Confirmar este Perfume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
