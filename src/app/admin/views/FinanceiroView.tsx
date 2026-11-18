"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { createDespesaAction, deleteDespesaAction, updateFinanceEntryAction } from '../../actions';
import { financePeriods, movementTypes, type FinanceFilter, type FinanceOverview, type Movement } from '@/lib/finance-overview';
import { fromCents, toCents } from '@/lib/money';
import { getDayKey } from '../MonthFilter';
import type { ERPData } from '../types';
import ReceivablesView from './ReceivablesView';
import PartnerFundingBadge from './PartnerFundingBadge';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const tabs = [['resumo', 'Resumo'], ['movimentacoes', 'Movimentações'], ['resultados', 'Resultados']] as const;
const labels = { venda: 'Venda', compra: 'Compra', despesa: 'Despesa', aporte: 'Aporte', entrada: 'Outra entrada' };
const panel = 'rounded-xl border border-brand-line bg-brand-card shadow-xs';
const field = 'rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-sm text-brand-deep';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-sm font-semibold text-brand-deep hover:bg-brand-nude disabled:opacity-50';
const primaryButton = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-chocolate px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50';
const categories = [
  ['EMBALAGENS', 'Embalagens e sacolas'], ['MARKETING', 'Marketing e anúncios'], ['FRETE', 'Frete e logística'],
  ['IMPOSTOS', 'Taxas e impostos'], ['ESTRUTURA', 'Estrutura e loja'], ['OUTROS', 'Outros'],
];
const methods = [
  ['PIX', 'Pix'], ['CARTAO_CREDITO', 'Cartão de crédito'], ['CARTAO_DEBITO', 'Cartão de débito'],
  ['DINHEIRO', 'Dinheiro'], ['BOLETO', 'Boleto bancário'], ['LINK_PAGAMENTO', 'Link de pagamento'],
];

type Tab = typeof tabs[number][0];
type Entry = ERPData['despesas'][number];
type EntryEditor = { type: 'DESPESA' | 'RECEITA_EXTRA'; entry?: Entry };
type OpenSource = (type: 'vendas' | 'compras', code: string) => void;

const amount = (cents: number) => money.format(fromCents(cents));
const formatDay = (day: string | null) => day ? dateFormat.format(new Date(day)) : 'Sem data';
const optionLabel = (options: string[][], value: string) => options.find(([key]) => key === value)?.[1] ?? value;

export default function FinanceiroView({ data, onOpenSource }: { data: ERPData; onOpenSource: OpenSource }) {
  const [tab, setTab] = useState<Tab>('resumo');
  const [period, setPeriod] = useState<FinanceFilter['period']>('mes');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<FinanceFilter['type']>('');
  const [scope, setScope] = useState<'period' | 'pending'>('period');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<{ request: string; data?: FinanceOverview; error?: string }>();
  const [selected, setSelected] = useState<Movement>();
  const [editor, setEditor] = useState<EntryEditor>();
  const [feedback, setFeedback] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { vendas, compras, despesas } = data;

  const listing = tab === 'movimentacoes';
  const filter: FinanceFilter = {
    period,
    query: listing ? query : '', type: listing ? type : '', scope: listing ? scope : 'recent', page: listing ? page : 1,
  };
  const params = new URLSearchParams({ ...filter, page: String(filter.page) }).toString();
  const request = `${params}&refresh=${refresh}`;
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await fetch(`/api/erp/finance?${request}`, { signal: controller.signal, cache: 'no-store' });
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error || 'Não foi possível carregar o financeiro.');
        if (!controller.signal.aborted) setResponse({ request, data: payload.data });
      } catch (error) {
        if (!controller.signal.aborted) setResponse({ request, error: error instanceof Error ? error.message : 'Não foi possível carregar o financeiro.' });
      }
    })();
    return () => controller.abort();
  }, [request, vendas, compras, despesas]);

  const overview = response?.request === request ? response.data : undefined;
  const error = response?.request === request ? response.error : undefined;
  const selectedEntry = selected && ['despesa', 'entrada'].includes(selected.type)
    ? despesas.find(entry => entry.id === selected.sourceId) : undefined;

  function openLedger(nextScope: 'period' | 'pending' = 'period', nextType: FinanceFilter['type'] = '') {
    setScope(nextScope);
    setType(nextType);
    setSearch('');
    setQuery('');
    setPage(1);
    setTab('movimentacoes');
  }

  async function deleteExpense() {
    if (deleting || selected?.type !== 'despesa' || !window.confirm(`Excluir a despesa “${selected.description}”?`)) return;
    setDeleting(true);
    try {
      await deleteDespesaAction(selected.sourceId);
      setSelected(undefined);
      setFeedback('Despesa excluída.');
      setRefresh(value => value + 1);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível excluir a despesa.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 text-brand-deep">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button type="button" className={primaryButton} onClick={() => { setFeedback(''); setEditor({ type: 'RECEITA_EXTRA' }); }}><Plus size={16} /> Registrar entrada</button>
        <button type="button" className={button} onClick={() => { setFeedback(''); setEditor({ type: 'DESPESA' }); }}><Plus size={16} /> Registrar despesa</button>
      </div>
      <nav aria-label="Financeiro" className="flex flex-wrap gap-x-3 border-b border-brand-line sm:gap-x-6">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
            className={`border-b-2 px-2 py-2 sm:px-3 ${tab === id ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-transparent text-brand-muted hover:text-brand-deep'}`}>
            {label}
          </button>
        ))}
      </nav>

      <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
        <legend className="sr-only">Período</legend>
        <span aria-hidden="true" className="mr-1 text-sm font-semibold">Período</span>
        {financePeriods.map(([id, label]) => <button type="button" key={id} aria-pressed={period === id} className={`${button} ${period === id ? 'border-brand-chocolate bg-brand-nude text-brand-chocolate' : ''}`}
          onClick={() => { setPeriod(id); setPage(1); }}>{label}</button>)}
      </fieldset>
      {feedback && <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-line bg-brand-card px-4"><p role="status">{feedback}</p>
        <button type="button" aria-label="Fechar mensagem" onClick={() => setFeedback('')}><X size={16} /></button></div>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800">
        <p>{error}</p><button type="button" className={button} onClick={() => setRefresh(value => value + 1)}>Tentar novamente</button>
      </div>}

      {tab === 'resumo' && overview && <CashSummary overview={overview} />}
      {tab !== 'resultados' && (
        <section className={panel} aria-labelledby="finance-movements-title">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <h3 id="finance-movements-title" className="text-lg font-bold">
              {listing ? scope === 'pending' ? 'Pendências de data' : 'Movimentações' : 'Últimas movimentações'}
            </h3>
            {listing ? <button type="button" className={button} onClick={() => openLedger(scope === 'pending' ? 'period' : 'pending')}>
              <CalendarDays size={16} /> {scope === 'pending' ? 'Ver movimentações do período' : 'Pendências de data'}
            </button> : <button type="button" className={button} onClick={() => openLedger()}>Ver movimentações <ChevronRight size={16} /></button>}
          </div>
          {listing && <div className="flex flex-wrap items-center gap-2 border-t border-brand-line px-4 py-3 sm:px-5">
            <form role="search" className="flex min-w-0 flex-1 gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
              <input className={`w-full ${field}`} type="search" aria-label="Pesquisar movimentações" placeholder="Descrição, cliente ou código" value={search} maxLength={160}
                onChange={event => { setSearch(event.target.value); if (!event.target.value) { setQuery(''); setPage(1); } }} />
              <button type="submit" className={button} aria-label="Pesquisar"><Search size={16} /></button>
            </form>
            <select aria-label="Tipo de movimentação" className={field} value={type} onChange={event => { setType(event.target.value as FinanceFilter['type']); setPage(1); }}>
              <option value="">Todos os tipos</option>
              {movementTypes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>}
          {overview ? <MovementTable rows={overview.rows} onOpen={row => { setFeedback(''); setSelected(row); }} /> : !error && <p role="status" className="p-5 text-sm text-brand-muted">Carregando movimentações…</p>}
          {listing && overview && overview.pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-line p-3 text-xs text-brand-muted sm:px-5">
            <span>Página {overview.page} de {overview.pageCount} · {overview.count} movimentações</span>
            <div className="flex gap-2">
              <button type="button" className={button} aria-label="Página anterior" disabled={overview.page === 1} onClick={() => setPage(overview.page - 1)}><ChevronLeft size={16} /></button>
              <button type="button" className={button} aria-label="Próxima página" disabled={overview.page === overview.pageCount} onClick={() => setPage(overview.page + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>}
          {tab === 'resumo' && overview && overview.pending.count > 0 && (
            <button type="button" className="m-3 flex w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-2 rounded-lg bg-brand-nude px-3 py-2 text-left text-brand-deep hover:bg-brand-rose-beige sm:m-5 sm:w-[calc(100%-2.5rem)]" onClick={() => openLedger('pending')}>
              <CalendarDays size={16} /><strong>Pendências de data</strong><span className="flex-1 text-brand-muted">{overview.pending.count} registro(s) · {amount(overview.pending.incoming)} em entradas{overview.pending.outgoing > 0 && ` · ${amount(overview.pending.outgoing)} em saídas`}</span><ChevronRight size={16} />
            </button>
          )}
          {listing && scope === 'pending' && <p className="px-4 py-3 text-xs text-brand-muted sm:px-5">Valores confirmados sem data comprovada. Entram no saldo acumulado e ficam fora dos totais por período.</p>}
        </section>
      )}
      {tab === 'resultados' && (
        <>
          {overview ? <Results overview={overview} onExpenses={() => openLedger('period', 'despesa')} /> : !error && <p role="status" className="text-sm text-brand-muted">Carregando resultados…</p>}
          <ReceivablesView vendas={vendas} />
        </>
      )}

      {selected && <FinanceDialog title={selected.description} onClose={() => setSelected(undefined)} busy={deleting}>
        <PartnerFundingBadge funding={selected.partnerFunding} explain />
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Detail label="Valor" value={amount(selected.cents)} />
          <Detail label={selected.dateFromRegistration ? 'Data de cadastro (referência)' : selected.type === 'compra' && selected.cash === 0 ? 'Data da compra' : 'Data'} value={formatDay(selected.day)} />
          <Detail label="Código" value={selected.code} />
          <Detail label="Tipo" value={labels[selected.type]} />
          {selected.name && <Detail label={selected.type === 'venda' ? 'Cliente' : 'Fornecedor'} value={selected.name} />}
          {selected.method && <Detail label="Forma de pagamento" value={optionLabel(methods, selected.method)} />}
          {selected.category && <Detail label="Categoria" value={optionLabel(categories, selected.category)} />}
          {selected.status && <Detail label="Situação" value={selected.status} />}
          {selected.notes && <div className="col-span-2"><Detail label="Observação" value={selected.notes} /></div>}
        </dl>
        {deleting && <p role="status" className="mt-3 text-sm text-brand-muted">Excluindo despesa…</p>}
        {feedback && <p role="status" className="mt-3 text-sm text-brand-muted">{feedback}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-brand-line pt-3">
          {selectedEntry && <button type="button" className={button} disabled={deleting} onClick={() => {
            setEditor({ type: selected.type === 'despesa' ? 'DESPESA' : 'RECEITA_EXTRA', entry: selectedEntry });
            setSelected(undefined);
          }}><Pencil size={15} /> Editar</button>}
          {selected.type === 'despesa' && <button type="button" className={`${button} text-red-700`} disabled={deleting} onClick={deleteExpense}><Trash2 size={15} /> Excluir despesa</button>}
          {selected.type === 'venda' && <button type="button" className={button} onClick={() => onOpenSource('vendas', selected.code)}>Abrir venda</button>}
          {selected.type === 'compra' && <button type="button" className={button} onClick={() => onOpenSource('compras', selected.code)}>Abrir compra</button>}
        </div>
      </FinanceDialog>}
      {editor && <EntryForm {...editor} onClose={() => setEditor(undefined)} onSaved={message => {
        setEditor(undefined); setFeedback(message); setRefresh(value => value + 1);
      }} />}
    </div>
  );
}

function CashSummary({ overview }: { overview: FinanceOverview }) {
  const { cash, range } = overview;
  const cards = [
    { label: 'Saldo em caixa', value: cash.balance, color: cash.balance < 0 ? 'text-red-700' : 'text-[var(--admin-primary)]' },
    { label: 'Vendas recebidas', value: cash.received, color: 'text-emerald-700' },
    { label: 'Saídas', value: cash.outgoing, color: 'text-red-700' },
    { label: 'Aportes dos sócios', value: cash.contributions, color: 'text-brand-deep' },
  ];
  return <section className={panel} aria-label="Resumo de caixa">
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-xl bg-brand-line lg:grid-cols-4">
      {cards.map(card => <div key={card.label} className="bg-brand-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-brand-muted">{card.label}</h3>
        <p className={`mt-1 text-lg font-bold tabular-nums sm:text-2xl ${card.color}`}>{amount(card.value)}</p>
        <p className="mt-1 text-xs text-brand-muted">{card.label === 'Saldo em caixa' ? range.end ? `Acumulado até ${formatDay(range.end)}` : 'Saldo acumulado' : 'No período'}
          {card.label === 'Saldo em caixa' && overview.pending.count > 0 && <span className="block">Inclui valores sem data</span>}
        </p>
      </div>)}
    </div>
    <details className="border-t border-brand-line px-4 py-3 text-xs sm:px-5">
      <summary className="cursor-pointer font-semibold text-brand-chocolate">Como o saldo é calculado</summary>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Detail label="Saldo anterior com data" value={amount(cash.opening)} />
        <Detail label="Outras entradas no período" value={amount(cash.other)} />
        <Detail label="Compras pagas pela loja" value={amount(cash.purchases)} />
        <Detail label="Despesas pagas pela loja" value={amount(cash.expenses)} />
        {cash.coveredByPartners > 0 && <Detail label="Pagamentos cobertos por aportes" value={amount(cash.coveredByPartners)} />}
        <Detail label="Entradas menos saídas no período" value={amount(cash.net)} />
        <Detail label="Saldo de lançamentos sem data" value={amount(cash.undatedNet)} />
      </dl>
    </details>
  </section>;
}

function MovementTable({ rows, onOpen }: { rows: Movement[]; onOpen: (row: Movement) => void }) {
  return <table className="w-full table-fixed text-left text-sm">
    <thead className="bg-brand-nude text-xs font-semibold text-brand-muted">
      <tr><th scope="col" className="hidden w-28 px-4 py-2 sm:table-cell">Data</th>
        <th scope="col" className="px-3 py-2 sm:px-4">Descrição</th>
        <th scope="col" className="hidden w-32 px-3 py-2 md:table-cell">Tipo</th>
        <th scope="col" className="w-25 px-2 py-2 text-right sm:w-36 sm:px-3">Valor</th>
        <th scope="col" className="w-14 px-2 py-2 text-right sm:w-24"><span className="sr-only">Detalhes</span></th></tr>
    </thead>
    <tbody className="divide-y divide-brand-line">
      {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-brand-muted">Nenhuma movimentação para os filtros selecionados.</td></tr>}
      {rows.map(row => {
        const color = row.cash < 0 ? 'text-red-700' : row.cash > 0 && row.type !== 'aporte' ? 'text-emerald-700' : 'text-brand-deep';
        return <tr key={row.key} className="hover:bg-brand-cream">
          <td className="hidden px-4 py-2 tabular-nums text-brand-muted sm:table-cell">{formatDay(row.day)}
            {row.dateFromRegistration && <span className="block text-xs">Data de cadastro</span>}
          </td>
          <td className="px-3 py-2 sm:px-4"><span className="font-semibold">{row.description}</span>
            {row.name && <span className="block text-xs text-brand-muted">{row.name}</span>}
            {row.status && <span className="block text-xs text-brand-muted">{row.status}</span>}
            <PartnerFundingBadge funding={row.partnerFunding} />
            <span className="block text-xs text-brand-muted md:hidden">{labels[row.type]}<span className="sm:hidden"> · {formatDay(row.day)}{row.dateFromRegistration && ' (cadastro)'}</span></span>
          </td>
          <td className="hidden px-3 py-2 md:table-cell"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${row.cash < 0 ? 'bg-red-50 text-red-700' : row.cash > 0 && row.type !== 'aporte' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-nude text-brand-muted'}`}>{labels[row.type]}</span></td>
          <td className={`px-2 py-2 text-right font-semibold tabular-nums sm:px-3 ${color}`}>{amount(row.cash || row.cents)}</td>
          <td className="px-2 py-2 text-right"><button type="button" className="rounded-lg px-2 text-brand-muted hover:bg-brand-nude hover:text-brand-deep" aria-label={`Ver detalhes de ${row.description}${row.name ? ` de ${row.name}` : ''}`} onClick={() => onOpen(row)}><Eye size={17} /></button></td>
        </tr>;
      })}
    </tbody>
  </table>;
}

function Results({ overview, onExpenses }: { overview: FinanceOverview; onExpenses: () => void }) {
  const { results } = overview;
  const margin = results.total > 0 ? results.profit / toCents(results.total) : 0;
  const metrics = [
    ['Vendas', toCents(results.total)], ['Custo das mercadorias vendidas', -results.cost],
    ['Despesas operacionais', -results.expenses], ['Lucro estimado', results.profit],
  ] as const;
  return <section className={`space-y-4 p-4 sm:p-5 ${panel}`} aria-labelledby="finance-result-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 id="finance-result-title" className="text-lg font-bold">Resultado do período</h3>
        <p className="text-sm text-brand-muted">Vendas pela data da venda e despesas pela data do lançamento.</p></div>
      <button type="button" className={button} onClick={onExpenses}>Ver despesas <ChevronRight size={16} /></button>
    </div>
    <dl className="grid grid-cols-2 gap-4 rounded-lg bg-brand-nude p-4 lg:grid-cols-4">
      {metrics.map(([label, cents]) => <div key={label}><dt className="text-sm font-semibold text-brand-muted">{label}</dt>
        <dd className={`mt-1 text-xl font-bold tabular-nums ${cents < 0 ? 'text-red-700' : 'text-brand-deep'}`}>{amount(cents)}</dd>
        {label === 'Vendas' && <dd className="text-xs text-brand-muted">{results.count} venda(s)</dd>}
        {label === 'Lucro estimado' && <dd className="text-xs text-brand-muted">Margem de {margin.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 })}</dd>}
      </div>)}
    </dl>
    <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <Detail label="Já recebido dessas vendas" value={money.format(results.received)} />
      <Detail label="Falta receber dessas vendas" value={money.format(results.outstanding)} />
    </dl>
    <details className="border-t border-brand-line pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-brand-chocolate">Recebido por forma de pagamento</summary>
      {results.paymentMethods.length === 0 ? <p className="mt-2 text-sm text-brand-muted">Nenhum recebimento registrado para essas vendas.</p> : <dl className="mt-3 flex flex-wrap gap-4">
        {results.paymentMethods.map(([method, cents]) => <Detail key={method} label={optionLabel(methods, method)} value={amount(cents)} />)}
      </dl>}
    </details>
  </section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-brand-muted">{label}</dt><dd className="whitespace-pre-wrap break-words font-semibold">{value}</dd></div>;
}

function FinanceDialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  return <dialog ref={node => { if (node && !node.open) node.showModal(); }} aria-labelledby="finance-dialog-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-brand-line bg-brand-card p-5 text-brand-deep shadow-xl backdrop:bg-black/50">
    <div className="flex items-center justify-between gap-3"><h3 id="finance-dialog-title" className="text-lg font-bold">{title}</h3>
      <button type="button" aria-label="Fechar" className={button} disabled={busy} onClick={onClose}><X size={16} /></button></div>
    {children}
  </dialog>;
}

function EntryForm({ type, entry, onClose, onSaved }: EntryEditor & { onClose: () => void; onSaved: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const expense = type === 'DESPESA';
  const entryDate = entry ? getDayKey(new Date(entry.data)) : getDayKey();
  const title = entry ? 'Editar lançamento' : expense ? 'Registrar despesa' : 'Registrar entrada';
  const input = `mt-1 block w-full ${field}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const date = String(form.get('date'));
    const payload = {
      descricao: String(form.get('description')),
      valor: Number(form.get('value')),
      categoria: expense ? String(form.get('category')) : 'OUTROS',
      formaPagamento: expense ? String(form.get('method') || '') : undefined,
      observacoes: String(form.get('notes') || ''),
      pago: entry ? form.get('paid') === 'on' : true,
      data: (entry || expense) && date === entryDate ? undefined : `${date}T12:00:00.000Z`,
    };
    setBusy(true);
    setError('');
    try {
      if (entry) await updateFinanceEntryAction(entry.id, { ...payload, formaPagamento: payload.formaPagamento || null });
      else await createDespesaAction({ ...payload, tipo: type, pagoPelosSocios: expense && form.get('partnerPaid') === 'on' });
      onSaved(entry ? 'Lançamento atualizado.' : expense ? 'Despesa registrada.' : 'Entrada registrada.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setBusy(false);
    }
  }

  return <FinanceDialog title={title} busy={busy} onClose={onClose}>
    <form className="mt-4 space-y-3 text-sm" onSubmit={submit}>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <label className="block font-medium">Descrição<input className={input} name="description" required defaultValue={entry?.descricao ?? (expense ? '' : 'Rendimento bancário')} /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="font-medium">Valor (R$)<input name="value" type="number" min="0.01" step={entry ? 'any' : '0.01'} required className={input} defaultValue={entry?.valor} /></label>
        <label className="font-medium">Data do lançamento<input name="date" type="date" required className={input} defaultValue={entryDate} /></label>
        {expense && <>
          <label className="font-medium">Categoria<select name="category" className={input} defaultValue={entry?.categoria ?? 'EMBALAGENS'}>
            {entry && !categories.some(([value]) => value === entry.categoria) && <option value={entry.categoria}>{entry.categoria}</option>}
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="font-medium">Forma de pagamento<select name="method" className={input} defaultValue={entry ? entry.formaPagamento ?? '' : 'PIX'}>
            {entry && <option value="">Sem forma informada</option>}
            {entry?.formaPagamento && !methods.some(([value]) => value === entry.formaPagamento) && <option value={entry.formaPagamento}>{entry.formaPagamento}</option>}
            {methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </>}
      </div>
      <label className="block font-medium">Observação<textarea name="notes" rows={2} defaultValue={entry?.observacoes ?? ''} className={input} /></label>
      {expense && !entry && <label className="flex items-center gap-2"><input name="partnerPaid" type="checkbox" />Pago pelos sócios</label>}
      {entry && <label className="flex items-center gap-2"><input name="paid" type="checkbox" defaultChecked={entry.pago} />{expense ? 'Pagamento confirmado' : 'Crédito confirmado'}</label>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-brand-line pt-3">
        <button type="button" className={button} disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="submit" className={primaryButton} disabled={busy}>{busy ? 'Salvando…' : 'Salvar lançamento'}</button>
      </div>
    </form>
  </FinanceDialog>;
}
