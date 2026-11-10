"use client";

import { useState, useMemo } from 'react';
import type { ERPData } from '../types';
import MonthFilter, { getDayKey, getMonthKey, isInMonth } from '../MonthFilter';
import { getSalePaymentAllocations, summarizeSalePayments } from '@/lib/sale-payment';
import { fromCents, toCents } from '@/lib/money';
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, 
  Calendar, PieChart, CreditCard, ArrowUpRight, 
  ArrowDownRight, Trash2, X, Loader2, Filter
} from 'lucide-react';
import { createDespesaAction, deleteDespesaAction } from '../../actions';

type Props = {
  data: ERPData;
};

export default function FinanceiroView({ data }: Props) {
  const { vendas, despesas, compras } = data;

  const [periodo, setPeriodo] = useState<'hoje' | '7d' | '30d' | 'mes' | 'todos'>('mes');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey());
  const [resumo, setResumo] = useState<'vendas' | 'recebimentos'>('vendas');
  const [isNewDespesaOpen, setIsNewDespesaOpen] = useState(false);
  const [descDespesa, setDescDespesa] = useState('');
  const [catDespesa, setCatDespesa] = useState('EMBALAGENS');
  const [valDespesa, setValDespesa] = useState<number>(0);
  const [formaPagDespesa, setFormaPagDespesa] = useState('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Filtro de Data
  const agora = new Date();
  const dataCorte = useMemo(() => {
    if (periodo === 'hoje') {
      return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    } else if (periodo === '7d') {
      return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodo === '30d') {
      return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (periodo === 'mes') {
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
    }
    return new Date(0); // todos
  }, [periodo, agora]);

  // Mesma base da tela de Vendas: período da venda, sem canceladas.
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const vDate = new Date(v.data);
      return v.status !== 'CANCELADO' && (periodo === 'mes' ? isInMonth(v.data, selectedMonth) : vDate >= dataCorte);
    });
  }, [vendas, dataCorte, periodo, selectedMonth]);

  // Despesas no Período
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => periodo === 'mes' ? isInMonth(d.data, selectedMonth) : new Date(d.data) >= dataCorte);
  }, [despesas, dataCorte, periodo, selectedMonth]);

  // Indicadores DRE
  const paymentSummary = useMemo(() => summarizeSalePayments(vendasFiltradas), [vendasFiltradas]);
  const receitaBruta = paymentSummary.total;
  const cpvTotal = useMemo(() => fromCents(vendasFiltradas.reduce((acc, v) => acc + toCents(v.custoTotal), 0)), [vendasFiltradas]);
  const lucroBruto = fromCents(toCents(receitaBruta) - toCents(cpvTotal));
  const totalDespesas = useMemo(() => fromCents(despesasFiltradas.reduce((acc, d) => acc + toCents(d.valor), 0)), [despesasFiltradas]);
  const lucroLiquido = fromCents(toCents(lucroBruto) - toCents(totalDespesas));
  const margemLiquida = receitaBruta > 0 ? ((lucroLiquido / receitaBruta) * 100).toFixed(1) : '0';

  const recebimentos = useMemo(() => vendas.flatMap(venda => getSalePaymentAllocations(venda).map((entry, index) => ({
    ...entry, vendaId: venda.id, numero: venda.numero, key: `${venda.id}-${index}`,
  }))), [vendas]);
  const recebimentosFiltrados = useMemo(() => recebimentos.filter(entry => entry.data !== null
    && (periodo === 'mes' ? isInMonth(entry.data, selectedMonth) : new Date(entry.data) >= dataCorte)), [recebimentos, periodo, selectedMonth, dataCorte]);
  const recebidoNoPeriodo = fromCents(recebimentosFiltrados.reduce((sum, entry) => sum + toCents(entry.valor), 0));
  const semData = fromCents(recebimentos.filter(entry => entry.data === null).reduce((sum, entry) => sum + toCents(entry.valor), 0));
  const despesasExibidas = resumo === 'recebimentos' ? despesasFiltradas.filter(despesa => despesa.pago) : despesasFiltradas;
  const despesasPagas = fromCents(despesasExibidas.reduce((sum, despesa) => sum + toCents(despesa.valor), 0));
  const corteCaixa = getDayKey(periodo === 'hoje' ? agora : dataCorte);
  const comprasPagas = compras.filter(compra => {
    if (!compra.dataPagamentoCaixa || compra.valorPagoCaixa === null) return false;
    const diaPagamento = new Date(compra.dataPagamentoCaixa).toISOString().slice(0, 10);
    if (periodo === 'mes') return !selectedMonth || diaPagamento.slice(0, 7) === selectedMonth;
    return periodo === 'todos' || diaPagamento >= corteCaixa;
  });
  const comprasPagasCentavos = comprasPagas.reduce((sum, compra) => sum + toCents(compra.valorPagoCaixa ?? 0), 0);

  // Usar os meios registrados em cada parcela, nunca a forma atual da venda.
  const formasPagamentoStats = useMemo(() => {
    const map = new Map<string, number>();
    const entries = resumo === 'recebimentos' ? recebimentosFiltrados : vendasFiltradas.flatMap(getSalePaymentAllocations);
    for (const entry of entries) {
      const method = entry.formaPagamento || 'Sem forma informada';
      map.set(method, (map.get(method) || 0) + toCents(entry.valor));
    }
    const total = entries.reduce((sum, entry) => sum + toCents(entry.valor), 0) || 1;
    return Array.from(map.entries()).map(([forma, cents]) => ({
      forma,
      valor: fromCents(cents),
      percent: Math.round((cents / total) * 100)
    }));
  }, [vendasFiltradas, recebimentosFiltrados, resumo]);

  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descDespesa.trim() || valDespesa <= 0) return;
    setIsSubmitting(true);
    try {
      await createDespesaAction({
        descricao: descDespesa,
        categoria: catDespesa,
        valor: valDespesa,
        formaPagamento: formaPagDespesa
      });
      setFeedback('Despesa registrada com sucesso!');
      setIsNewDespesaOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar despesa.';
      setFeedback(msg);
      setIsSubmitting(false);
    }
  };

  const handleDeleteDespesa = async (id: number) => {
    if (!confirm('Deseja excluir este lançamento de despesa?')) return;
    try {
      await deleteDespesaAction(id);
      setFeedback('Despesa excluída.');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir.';
      setFeedback(msg);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER E FILTRO DE PERÍODO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-5 sm:p-6 rounded-3xl border border-brand-line shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-chocolate flex items-center gap-2.5">
            <DollarSign size={22} className="text-brand-muted" />
            DRE & Gestão Financeira
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Demonstrativo de resultado, custo de produtos vendidos (CPV), despesas operacionais e lucro líquido.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-brand-nude p-1 rounded-2xl border border-brand-line">
            {(['hoje', '7d', '30d', 'mes', 'todos'] as const).map(p => (
              <button
                key={p}
                onClick={() => {
                  setPeriodo(p);
                  if (p === 'mes') setSelectedMonth(getMonthKey());
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  periodo === p && (p !== 'mes' || selectedMonth === getMonthKey()) ? 'bg-brand-chocolate text-brand-cream shadow-xs' : 'text-brand-muted hover:text-brand-chocolate'
                }`}
              >
                {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : p === 'mes' ? 'Mês Atual' : 'Todo o Histórico'}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setIsNewDespesaOpen(true);
              setDescDespesa('');
              setValDespesa(0);
            }}
            className="px-4 py-2 bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} className="text-brand-caramel" />
            <span>Registrar Despesa</span>
          </button>
        </div>
      </div>

      <MonthFilter
        value={periodo === 'mes' ? selectedMonth : ''}
        onChange={month => {
          setSelectedMonth(month);
          setPeriodo(month ? 'mes' : 'todos');
        }}
      />

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-brand-nude border border-brand-line text-brand-chocolate text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* RESUMO DAS MESMAS VENDAS DO PERÍODO */}
      <div className="flex flex-wrap gap-2" aria-label="Critério do resumo financeiro">
        {(['vendas', 'recebimentos'] as const).map(mode => <button key={mode} type="button" onClick={() => setResumo(mode)} aria-pressed={resumo === mode} className={`rounded-xl border border-brand-line px-4 py-2 text-xs font-bold ${resumo === mode ? 'bg-brand-chocolate text-brand-cream' : 'bg-brand-card text-brand-chocolate'}`}>{mode === 'vendas' ? 'Vendas do período' : 'Recebimentos do período'}</button>)}
      </div>
      <p className="text-xs text-brand-muted">{resumo === 'vendas' ? 'Valores das vendas do período selecionado, mesmo quando o pagamento acontece em outro mês.' : 'Recebimentos e compras pela data do pagamento. Despesas pagas pela data do lançamento.'}</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${resumo === 'vendas' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {(resumo === 'vendas' ? [
          { label: 'Total vendido', value: receitaBruta, detail: `${paymentSummary.count} venda(s) · canceladas excluídas` },
          { label: 'Já recebido', value: paymentSummary.received, detail: 'Pagamentos confirmados, incluindo parciais' },
          { label: 'Falta receber', value: paymentSummary.outstanding, detail: 'Saldo pendente de pagamento' },
          { label: 'Custo dos produtos vendidos', value: -cpvTotal, detail: 'Custo dos produtos dessas vendas' },
          { label: 'Despesas', value: -totalDespesas, detail: `${despesasFiltradas.length} lançamento(s) no período` },
          { label: 'Resultado das vendas', value: lucroLiquido, detail: `Vendido − custo − despesas · margem ${margemLiquida}%` },
        ] : [
          { label: 'Recebido no período', value: recebidoNoPeriodo, detail: `${recebimentosFiltrados.length} recebimento(s) com data registrada` },
          { label: 'Despesas pagas', value: -despesasPagas, detail: `${despesasExibidas.length} lançamento(s) pago(s)` },
          { label: 'Compras pagas pelo caixa', value: -fromCents(comprasPagasCentavos), detail: `${comprasPagas.length} compra(s) com pagamento registrado` },
          { label: 'Saldo do período', value: fromCents(toCents(recebidoNoPeriodo) - toCents(despesasPagas) - comprasPagasCentavos), detail: 'Recebimentos menos despesas e compras pagas, sem saldo anterior' },
        ]).map(card => (
          <div key={card.label} className="bg-brand-card p-4 rounded-2xl border border-brand-line shadow-xs min-w-0">
            <p className="text-xs font-semibold text-brand-muted">{card.label}</p>
            <p className="text-xl font-bold text-brand-chocolate mt-2">{card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-[11px] text-brand-muted mt-1">{card.detail}</p>
          </div>
        ))}
      </div>
      {resumo === 'vendas' ? <p className="text-[11px] text-brand-muted">O resultado considera todas as vendas do período e não representa dinheiro disponível em caixa.</p> : semData > 0 && <p className="text-[11px] text-brand-muted">Recebimentos sem data comprovada, de todo o histórico: {semData.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Não entram nos totais por data.</p>}

      {resumo === 'recebimentos' && <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-card p-4">
        <h3 className="mb-3 text-sm font-bold text-brand-chocolate">Pagamentos recebidos</h3>
        <table className="w-full text-left text-xs"><thead><tr className="text-brand-muted"><th className="p-2">Data do pagamento</th><th className="p-2">Venda</th><th className="p-2">Forma</th><th className="p-2 text-right">Valor</th></tr></thead><tbody>
          {recebimentosFiltrados.length === 0 ? <tr><td colSpan={4} className="p-4 text-brand-muted">Nenhum recebimento com data registrada neste período.</td></tr> : recebimentosFiltrados.map(entry => <tr key={entry.key} className="border-t border-brand-line"><td className="p-2">{new Date(entry.data!).toLocaleString('pt-BR')}</td><td className="p-2 font-mono">{entry.numero}</td><td className="p-2">{entry.formaPagamento?.replaceAll('_', ' ') || 'Sem forma informada'}</td><td className="p-2 text-right">{entry.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}
        </tbody></table>
      </div>}

      {/* DETALHAMENTO: FORMAS DE PAGAMENTO & LISTA DE DESPESAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMAS DE PAGAMENTO (1 Coluna) */}
        <div className="bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate mb-1">
              Recebido por forma de pagamento
            </h3>
            <p className="text-xs text-brand-muted mb-5">
              Meios registrados em cada parcela, incluindo pagamentos parciais. Saldos antigos sem comprovação aparecem separados.
            </p>

            <div className="space-y-4">
              {formasPagamentoStats.length === 0 ? (
                <p className="text-xs text-brand-muted py-6 text-center">Nenhum recebimento no período.</p>
              ) : (
                formasPagamentoStats.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-chocolate">{item.forma}</span>
                      <div className="text-right font-medium">
                        <span className="text-brand-muted">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-xs font-bold text-brand-muted ml-1.5">({item.percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-brand-nude rounded-full overflow-hidden border border-brand-line/60">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-caramel to-brand-caramel rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, item.percent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LISTA DE DESPESAS OPERACIONAIS (2 Colunas) */}
        <div className="lg:col-span-2 bg-brand-card rounded-3xl p-5 sm:p-6 border border-brand-line shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-brand-chocolate">
                  Lançamentos de Despesas Operacionais
                </h3>
                <p className="text-xs text-brand-muted">
                  Custos fixos e variáveis (embalagens, marketing, logística, estrutura)
                </p>
              </div>
              <span className="text-xs font-bold text-brand-chocolate">
                Total: -{despesasPagas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-cream border-b border-brand-line text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-center">Categoria</th>
                    <th className="py-2.5 px-3 text-center">Pagamento</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-nude text-xs">
                  {despesasExibidas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-brand-muted">
                        Nenhuma despesa registrada neste período.
                      </td>
                    </tr>
                  ) : (
                    despesasExibidas.map((d) => (
                      <tr key={d.id} className="hover:bg-brand-cream transition-colors">
                        <td className="py-2.5 px-3 text-brand-muted font-mono text-[11px]">
                          {new Date(d.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-brand-chocolate">
                          {d.descricao}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-brand-nude text-[10px] font-bold text-brand-muted border border-brand-line">
                            {d.categoria}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-brand-muted">
                          {d.formaPagamento || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-brand-chocolate">
                          -R$ {d.valor.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDespesa(d.id)}
                            className="p-1 rounded text-brand-chocolate hover:text-brand-chocolate hover:bg-brand-rose-beige transition-colors cursor-pointer"
                            title="Excluir despesa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR DESPESA */}
      {isNewDespesaOpen && (
        <div className="fixed inset-0 bg-brand-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-md max-h-[calc(100dvh-2rem)] rounded-3xl border border-brand-line shadow-2xl p-6 relative overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel to-brand-caramel" />

            <div className="flex items-center justify-between pb-3 border-b border-brand-line mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-brand-chocolate">Registrar Despesa</h3>
                <p className="text-xs text-brand-muted">Lançamento financeiro no DRE</p>
              </div>
              <button onClick={() => setIsNewDespesaOpen(false)} className="p-1 text-brand-muted hover:text-brand-chocolate rounded-full hover:bg-brand-nude cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDespesa} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Descrição do Gasto *</label>
                <input
                  type="text"
                  required
                  value={descDespesa}
                  onChange={e => setDescDespesa(e.target.value)}
                  placeholder="Ex: Embalagens para presente"
                  className="w-full px-3.5 py-2 bg-brand-cream text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={catDespesa}
                    onChange={e => setCatDespesa(e.target.value)}
                    className="w-full px-3 py-1.5 bg-brand-cream text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none"
                  >
                    <option value="EMBALAGENS">Embalagens & Sacolas</option>
                    <option value="MARKETING">Marketing & Anúncios</option>
                    <option value="FRETE">Frete & Logística</option>
                    <option value="IMPOSTOS">Taxas & Impostos</option>
                    <option value="ESTRUTURA">Estrutura & Loja</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={valDespesa || ''}
                    onChange={e => setValDespesa(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full px-3 py-1.5 bg-brand-cream text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagDespesa}
                  onChange={e => setFormaPagDespesa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-cream text-xs font-bold text-brand-chocolate rounded-xl border border-brand-line outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
              </div>

              <div className="pt-3 border-t border-brand-line flex items-center justify-end gap-2.5">
                <button type="button" disabled={isSubmitting} onClick={() => setIsNewDespesaOpen(false)} className="px-4 py-2 rounded-xl border border-brand-line text-xs font-bold text-brand-muted hover:bg-brand-nude transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-xl bg-brand-chocolate hover:bg-brand-deep text-brand-cream text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin text-brand-caramel" /> : <span>Lançar Despesa</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
