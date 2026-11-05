"use client";

import { useEffect, useState } from 'react';
import MonthFilter, { getMonthKey } from './MonthFilter';

type Movement = {
  id: number; createdAt: string; produtoId: number; produto: { nome: string };
  tipo: string; quantidade: number; quantidadeAnterior: number; quantidadeNova: number;
  motivo: string | null; usuarioResponsavel: string | null;
};
type Page = { items: Movement[]; total: number; page: number; size: number };

export default function StockMovementHistory() {
  const [month, setMonth] = useState(getMonthKey);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState<Page | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), size: String(size), month });
    fetch(`/api/erp/stock/history?${params}`, { credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || 'Não foi possível carregar o histórico.');
        if (!controller.signal.aborted) {
          const lastPage = Math.max(1, Math.ceil(body.data.total / size));
          if (page > lastPage) setPage(lastPage);
          else setResult(body.data);
        }
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, page, size]);
  const pages = Math.max(1, Math.ceil((result?.total || 0) / size));
  return <section className="rounded-2xl border border-brand-line bg-brand-card overflow-hidden">
    <MonthFilter value={month} onChange={value => { setMonth(value); setPage(1); }} />
    <div className="p-4 text-sm font-bold text-brand-chocolate">Histórico de movimentações · {result?.total ?? '…'} registros</div>
    {error && <p role="alert" className="p-4 text-sm text-brand-chocolate">{error}</p>}
    <div className="overflow-x-auto" aria-busy={loading}>
      <table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-brand-cream text-brand-muted"><tr>{['Data e hora', 'Produto', 'Tipo', 'Variação', 'Saldo anterior → novo', 'Motivo', 'Responsável'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="p-6 text-center">Carregando…</td></tr> : !error && result?.items.length === 0 ? <tr><td colSpan={7} className="p-6 text-center">Nenhuma movimentação neste período.</td></tr> : !error && result?.items.map(item => <tr key={item.id} className="border-t border-brand-line text-brand-chocolate"><td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="p-3 font-semibold">{item.produto.nome}</td><td className="p-3">{item.tipo}</td><td className="p-3 whitespace-nowrap">{item.quantidade > 0 ? '+' : ''}{item.quantidade} un.</td><td className="p-3 whitespace-nowrap">{item.quantidadeAnterior} → {item.quantidadeNova}</td><td className="p-3">{item.motivo || '—'}</td><td className="p-3">{item.usuarioResponsavel || 'Sistema'}</td></tr>)}
      </tbody></table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line p-4 text-xs text-brand-muted">
      <label>Por página <select value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1); }} className="rounded border border-brand-line p-2"><option value={20}>20</option><option value={50}>50</option></select></label>
      <div className="flex items-center gap-3"><button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="rounded border border-brand-line px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {page} de {pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)} className="rounded border border-brand-line px-3 py-2 disabled:opacity-40">Próxima</button></div>
    </div>
  </section>;
}
