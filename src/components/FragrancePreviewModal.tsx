"use client";

import { useState } from 'react';
import { FragranceSearchResult } from '@/services/fragrance-search/types';
import { X, Sparkles, Plus, ExternalLink, Check, AlertCircle, Loader2, ShieldCheck, ShieldAlert, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  fragrance: FragranceSearchResult | null;
  onClose: () => void;
  onSuccessImport?: (importedProduct: any) => void;
}

export default function FragrancePreviewModal({ fragrance, onClose, onSuccessImport }: Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  if (!fragrance) return null;

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/fragrances/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fragrance.name,
          brand: fragrance.brand,
          concentration: fragrance.concentration,
          year: fragrance.year,
          volume: fragrance.volume,
          gender: fragrance.gender,
          family: fragrance.family,
          imageUrl: fragrance.imageUrl,
          topNotes: fragrance.topNotes,
          middleNotes: fragrance.middleNotes,
          baseNotes: fragrance.baseNotes,
          accords: fragrance.accords,
          source: fragrance.source,
          sourceUrl: fragrance.sourceUrl,
          externalId: fragrance.externalId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao importar produto');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccessImport) onSuccessImport(data.product);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao importar');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-deep/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-brand-card rounded-3xl w-full max-w-lg shadow-2xl border-2 border-brand-line overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-brand-line flex items-center justify-between bg-brand-card">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-muted" />
            <h3 className="font-serif text-base font-bold text-brand-chocolate">
              Prévia de Fragrância Externa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-chocolate hover:text-brand-deep hover:bg-brand-nude transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Info */}
          <div className="flex gap-4 items-start">
            <div 
              onClick={() => {
                if (fragrance.imageUrl) {
                  setIsZoomOpen(true);
                  setZoomScale(1);
                }
              }}
              title={fragrance.imageUrl ? "Clique para ampliar a foto" : undefined}
              className={`w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-brand-nude border border-brand-nude p-2 flex items-center justify-center shrink-0 relative overflow-hidden group ${
                fragrance.imageUrl ? "cursor-zoom-in hover:border-brand-chocolate shadow-2xs transition-all" : ""
              }`}
            >
              {fragrance.imageUrl ? (
                <>
                  <img
                    src={fragrance.imageUrl}
                    alt={fragrance.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-brand-deep/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-brand-cream">
                    <ZoomIn size={18} />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-brand-muted text-center p-2">
                  <Sparkles size={24} className="mb-1 text-brand-line" />
                  <span className="text-[10px]">Sem foto</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted block">
                {fragrance.brand || 'Marca não informada'}
              </span>
              <h4 className="font-serif text-lg font-medium text-brand-deep leading-tight mt-0.5">
                {fragrance.name}
              </h4>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {fragrance.concentration && (
                  <span className="text-[10px] bg-brand-nude text-brand-muted px-2 py-0.5 rounded-full font-medium">
                    {fragrance.concentration}
                  </span>
                )}
                {fragrance.year && (
                  <span className="text-[10px] bg-brand-nude text-brand-muted px-2 py-0.5 rounded-full font-medium">
                    Ano: {fragrance.year}
                  </span>
                )}
                {fragrance.volume && (
                  <span className="text-[10px] bg-brand-nude text-brand-muted px-2 py-0.5 rounded-full font-medium">
                    {fragrance.volume}
                  </span>
                )}
              </div>

              {fragrance.family && (
                <p className="text-xs text-brand-muted mt-2 font-medium">
                  Família: <span className="text-brand-deep">{fragrance.family}</span>
                </p>
              )}
            </div>
          </div>

          {/* Pirâmide se houver */}
          {(fragrance.topNotes?.length || fragrance.middleNotes?.length || fragrance.baseNotes?.length) ? (
            <div className="p-3.5 bg-brand-card border border-brand-line rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                Notas Olfativas Documentadas
              </span>
              {fragrance.topNotes && fragrance.topNotes.length > 0 && (
                <p className="text-brand-muted font-medium">
                  <strong className="text-brand-chocolate">Saída:</strong> {fragrance.topNotes.join(', ')}
                </p>
              )}
              {fragrance.middleNotes && fragrance.middleNotes.length > 0 && (
                <p className="text-brand-muted font-medium">
                  <strong className="text-brand-chocolate">Coração:</strong> {fragrance.middleNotes.join(', ')}
                </p>
              )}
              {fragrance.baseNotes && fragrance.baseNotes.length > 0 && (
                <p className="text-brand-muted font-medium">
                  <strong className="text-brand-chocolate">Fundo:</strong> {fragrance.baseNotes.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-brand-nude border border-brand-line rounded-xl text-xs text-brand-muted font-medium">
              ℹ️ A fonte desta fragrância não documenta pirâmide olfativa. Os campos permanecerão vazios no cadastro para preservar a autenticidade técnica.
            </div>
          )}

          {/* Acordes */}
          {fragrance.accords && fragrance.accords.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1.5">
                Acordes Principais
              </span>
              <div className="flex flex-wrap gap-1">
                {fragrance.accords.map((a, i) => (
                  <span key={i} className="text-[10px] bg-brand-nude text-brand-chocolate px-2 py-0.5 rounded-md font-semibold border border-brand-line">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rastreabilidade & Status */}
          <div className="pt-3 border-t border-brand-line flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-brand-muted">
              <span>Fonte dos Dados:</span>
              <span className="font-bold text-brand-chocolate uppercase">
                {fragrance.source === 'openbeautyfacts' ? 'Open Beauty Facts' : 'Catálogo Local / Manual'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-brand-muted">Status de Verificação:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-chocolate bg-brand-nude px-2 py-0.5 rounded-full border border-brand-line">
                <ShieldAlert size={12} /> Não verificado (unverified)
              </span>
            </div>

            {fragrance.sourceUrl && (
              <a
                href={fragrance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-muted font-bold hover:underline flex items-center gap-1 self-start mt-1"
              >
                Ver registro original na fonte <ExternalLink size={11} />
              </a>
            )}
          </div>

          {error && (
            <div className="p-3 bg-brand-rose-beige border border-brand-terracotta rounded-xl flex items-center gap-2 text-xs text-brand-deep">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-brand-nude border border-brand-line rounded-xl flex items-center gap-2 text-xs text-brand-chocolate">
              <Check size={15} className="shrink-0 text-brand-chocolate" />
              <span>Fragrância adicionada ao catálogo com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-brand-line bg-brand-card flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl border border-brand-line text-brand-chocolate hover:bg-brand-card text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || success}
            className="px-5 py-2.5 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Adicionando...
              </>
            ) : success ? (
              <>
                <Check size={14} className="text-brand-caramel" />
                Adicionado
              </>
            ) : (
              <>
                <Plus size={14} />
                Adicionar ao Catálogo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom da Foto */}
      {isZoomOpen && fragrance.imageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-brand-deep/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => {
            setIsZoomOpen(false);
            setZoomScale(1);
          }}
        >
          {/* Top Bar */}
          <div 
            className="w-full max-w-xl flex items-center justify-between pb-3 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-brand-cream/80 text-xs font-semibold flex items-center gap-1.5 bg-brand-card/10 px-3 py-1.5 rounded-full border border-brand-cream/15">
              <Sparkles size={13} className="text-brand-rose-beige" />
              {fragrance.brand || 'Fragrância'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => (prev > 1 ? 1 : 2))}
                className="flex items-center gap-1.5 bg-brand-card/10 hover:bg-brand-card/20 border border-brand-cream/20 text-brand-cream text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                {zoomScale > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                <span>{zoomScale > 1 ? "Zoom 1x" : "Zoom 2x"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsZoomOpen(false);
                  setZoomScale(1);
                }}
                className="w-9 h-9 rounded-full bg-brand-card/10 hover:bg-brand-card text-brand-cream hover:text-brand-deep border border-brand-cream/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div 
            className="relative w-full max-w-xl max-h-[62vh] min-h-[320px] bg-brand-deep/90 border border-brand-cream/15 rounded-3xl p-6 sm:p-8 flex items-center justify-center overflow-hidden shadow-2xl cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              setZoomScale((prev) => (prev > 1 ? 1 : 2));
            }}
          >
            <img
              src={fragrance.imageUrl}
              alt={fragrance.name}
              style={{
                transform: `scale(${zoomScale})`,
                transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
              }}
              className={`max-h-[50vh] max-w-full object-contain drop-shadow-2xl ${
                zoomScale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
          </div>

          {/* Info */}
          <div 
            className="w-full max-w-xl bg-brand-deep border border-brand-cream/15 rounded-2xl p-4 mt-3 flex items-center justify-between gap-3 shadow-2xl z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] uppercase font-extrabold text-brand-rose-beige block">
                {fragrance.brand}
              </span>
              <h4 className="font-serif text-sm sm:text-base font-bold text-brand-cream truncate">
                {fragrance.name}
              </h4>
            </div>
            {fragrance.concentration && (
              <span className="text-[11px] font-semibold bg-brand-card/10 text-brand-cream px-2.5 py-1 rounded-lg">
                {fragrance.concentration}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
