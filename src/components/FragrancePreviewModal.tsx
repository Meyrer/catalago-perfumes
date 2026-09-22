"use client";

import { useState } from 'react';
import { FragranceSearchResult } from '@/services/fragrance-search/types';
import { X, Sparkles, Plus, ExternalLink, Check, AlertCircle, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  fragrance: FragranceSearchResult | null;
  onClose: () => void;
  onSuccessImport?: (importedProduct: any) => void;
}

export default function FragrancePreviewModal({ fragrance, onClose, onSuccessImport }: Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-[#dcd5c7] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#dcd5c7] flex items-center justify-between bg-[#fdfbf7]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#7a5828]" />
            <h3 className="font-serif text-base font-bold text-[#09090b]">
              Prévia de Fragrância Externa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#09090b] hover:text-black hover:bg-[#faf8f5] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Info */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-[#faf8f5] border border-[#f0ece4] p-2 flex items-center justify-center shrink-0 relative overflow-hidden">
              {fragrance.imageUrl ? (
                <img
                  src={fragrance.imageUrl}
                  alt={fragrance.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#a1a1aa] text-center p-2">
                  <Sparkles size={24} className="mb-1 text-[#d4d4d8]" />
                  <span className="text-[10px]">Sem foto</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3835a] block">
                {fragrance.brand || 'Marca não informada'}
              </span>
              <h4 className="font-serif text-lg font-medium text-[#18181b] leading-tight mt-0.5">
                {fragrance.name}
              </h4>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {fragrance.concentration && (
                  <span className="text-[10px] bg-[#f5efe6] text-[#7a572a] px-2 py-0.5 rounded-full font-medium">
                    {fragrance.concentration}
                  </span>
                )}
                {fragrance.year && (
                  <span className="text-[10px] bg-[#f4f4f5] text-[#52525b] px-2 py-0.5 rounded-full font-medium">
                    Ano: {fragrance.year}
                  </span>
                )}
                {fragrance.volume && (
                  <span className="text-[10px] bg-[#f4f4f5] text-[#52525b] px-2 py-0.5 rounded-full font-medium">
                    {fragrance.volume}
                  </span>
                )}
              </div>

              {fragrance.family && (
                <p className="text-xs text-[#71717a] mt-2 font-medium">
                  Família: <span className="text-[#18181b]">{fragrance.family}</span>
                </p>
              )}
            </div>
          </div>

          {/* Pirâmide se houver */}
          {(fragrance.topNotes?.length || fragrance.middleNotes?.length || fragrance.baseNotes?.length) ? (
            <div className="p-3.5 bg-[#fcfaf7] border border-[#dcd5c7] rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a5828] block">
                Notas Olfativas Documentadas
              </span>
              {fragrance.topNotes && fragrance.topNotes.length > 0 && (
                <p className="text-[#27272a] font-medium">
                  <strong className="text-[#09090b]">Saída:</strong> {fragrance.topNotes.join(', ')}
                </p>
              )}
              {fragrance.middleNotes && fragrance.middleNotes.length > 0 && (
                <p className="text-[#27272a] font-medium">
                  <strong className="text-[#09090b]">Coração:</strong> {fragrance.middleNotes.join(', ')}
                </p>
              )}
              {fragrance.baseNotes && fragrance.baseNotes.length > 0 && (
                <p className="text-[#27272a] font-medium">
                  <strong className="text-[#09090b]">Fundo:</strong> {fragrance.baseNotes.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[#faf8f5] border border-[#dcd5c7] rounded-xl text-xs text-[#27272a] font-medium">
              ℹ️ A fonte desta fragrância não documenta pirâmide olfativa. Os campos permanecerão vazios no cadastro para preservar a autenticidade técnica.
            </div>
          )}

          {/* Acordes */}
          {fragrance.accords && fragrance.accords.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#27272a] block mb-1.5">
                Acordes Principais
              </span>
              <div className="flex flex-wrap gap-1">
                {fragrance.accords.map((a, i) => (
                  <span key={i} className="text-[10px] bg-[#f4f4f5] text-[#09090b] px-2 py-0.5 rounded-md font-semibold border border-[#dcd5c7]">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rastreabilidade & Status */}
          <div className="pt-3 border-t border-[#dcd5c7] flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-[#27272a]">
              <span>Fonte dos Dados:</span>
              <span className="font-bold text-[#09090b] uppercase">
                {fragrance.source === 'openbeautyfacts' ? 'Open Beauty Facts' : 'Catálogo Local / Manual'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#27272a]">Status de Verificação:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                <ShieldAlert size={12} /> Não verificado (unverified)
              </span>
            </div>

            {fragrance.sourceUrl && (
              <a
                href={fragrance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#7a5828] font-bold hover:underline flex items-center gap-1 self-start mt-1"
              >
                Ver registro original na fonte <ExternalLink size={11} />
              </a>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <Check size={15} className="shrink-0 text-emerald-600" />
              <span>Fragrância adicionada ao catálogo com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#dcd5c7] bg-[#fdfbf7] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl border border-[#dcd5c7] text-[#09090b] hover:bg-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || success}
            className="px-5 py-2.5 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Adicionando...
              </>
            ) : success ? (
              <>
                <Check size={14} className="text-emerald-400" />
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
    </div>
  );
}
