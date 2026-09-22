"use client";

import { useState } from 'react';
import { 
  Image as ImageIcon, Plus, Trash2, ExternalLink, Sparkles, AlertCircle, CheckCircle2, Eye 
} from 'lucide-react';
import type { Banner } from '@prisma/client';
import { createBanner, deleteBanner } from '@/app/actions';

interface BannersViewProps {
  banners: Banner[];
}

export function BannersView({ banners }: BannersViewProps) {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData(e.currentTarget);
      await createBanner(formData);
      setFeedback({ type: 'success', message: 'Banner publicado com sucesso!' });
      setIsNewOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao publicar banner.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, titulo?: string | null) => {
    if (!confirm(`Deseja remover o banner ${titulo ? `"${titulo}"` : `#${id}`}?`)) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteBanner(id);
      setFeedback({ type: 'success', message: 'Banner removido com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao remover banner.' });
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
            <ImageIcon className="text-[#7a5828]" size={22} />
            <h2 className="font-serif text-xl font-bold text-[#09090b]">Banners & Vitrine Visual</h2>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">
            Gerencie os destaques promocionais exibidos no carrossel de topo da loja
          </p>
        </div>

        <button
          onClick={() => setIsNewOpen(!isNewOpen)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#09090b] hover:bg-[#18181b] text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0"
        >
          <Plus size={15} />
          {isNewOpen ? 'Fechar' : 'Novo Banner'}
        </button>
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

      {/* FORMULÁRIO DE NOVO BANNER */}
      {isNewOpen && (
        <div className="bg-white border border-[#dcd5c7] rounded-2xl p-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#f4efe6]">
            <div>
              <h3 className="font-serif text-base font-bold text-[#09090b]">Criar Novo Destaque</h3>
              <p className="text-xs text-[#71717a]">Configuração visual do slide principal da home</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a5828] bg-[#fdfbf7] px-2.5 py-1 rounded-md border border-[#e8dfd3]">
              Recomendado: 1920x600px ou Proporção Panorâmica
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  Título Principal
                </label>
                <input 
                  name="titulo" 
                  type="text" 
                  placeholder="Ex: Coleção Privilège 2026"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  Subtítulo / Frase de Impacto
                </label>
                <input 
                  name="subtitulo" 
                  type="text" 
                  placeholder="Ex: Fragrâncias de nicho e importados raros com pronta entrega"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  Link de Redirecionamento (Opcional)
                </label>
                <input 
                  name="link" 
                  type="text" 
                  placeholder="Ex: /categoria/1 ou https://..."
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090b] mb-1">
                  URL da Imagem (Web)
                </label>
                <input 
                  name="imagemUrlDirect" 
                  type="url" 
                  placeholder="https://... link de alta resolução"
                  className="w-full bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl px-3.5 py-2.5 text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#fdfbf7] rounded-xl border border-[#e8dfd3]">
              <label className="block text-xs font-bold text-[#09090b] mb-1">
                Ou selecione uma imagem do seu computador:
              </label>
              <input 
                name="imagem" 
                type="file" 
                accept="image/*" 
                className="text-xs text-[#71717a] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#09090b] file:text-white hover:file:bg-black cursor-pointer"
              />
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
                {isLoading ? 'Publicando...' : 'Publicar Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTAGEM DE BANNERS COM PREVIEWS */}
      <div className="space-y-4">
        {banners.map((b, idx) => (
          <div 
            key={b.id} 
            className="bg-white rounded-2xl border border-[#dcd5c7] overflow-hidden shadow-xs hover:border-[#7a5828]/50 transition-all flex flex-col md:flex-row items-stretch"
          >
            {/* Visual Preview */}
            <div className="md:w-72 h-44 bg-neutral-900 relative shrink-0 overflow-hidden group">
              <img 
                src={b.imagemUrl} 
                alt={b.titulo || 'Banner'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                <span className="text-[10px] font-mono font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                  Slide #{idx + 1}
                </span>
              </div>
            </div>

            {/* Info and Actions */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a5828]">
                      Banner Ativo na Home
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#09090b] mt-0.5">
                      {b.titulo || '(Sem título definido)'}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDelete(b.id, b.titulo)}
                    disabled={isLoading}
                    className="p-2 text-[#a1a1aa] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                    title="Remover banner"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {b.subtitulo && (
                  <p className="text-xs text-[#71717a] mt-2 leading-relaxed">
                    {b.subtitulo}
                  </p>
                )}

                {b.link && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#7a5828] font-medium">
                    <ExternalLink size={13} />
                    <span>Redireciona para: <strong className="font-mono">{b.link}</strong></span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#f4efe6] flex items-center justify-between text-[11px] text-[#a1a1aa]">
                <span className="truncate max-w-md font-mono text-[10px]">{b.imagemUrl}</span>
                <a 
                  href={b.imagemUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#09090b] hover:text-[#7a5828] flex items-center gap-1"
                >
                  <Eye size={13} /> Ver original
                </a>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="p-12 bg-white rounded-2xl border border-[#dcd5c7] text-center text-[#a1a1aa]">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum banner cadastrado no momento.</p>
            <p className="text-xs text-[#71717a] mt-1">Clique em "Novo Banner" acima para adicionar um slide à página inicial.</p>
          </div>
        )}
      </div>
    </div>
  );
}
