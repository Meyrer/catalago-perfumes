"use client";

import { useState, useMemo } from 'react';
import type { ERPData } from '../types';
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
  const { vendas, despesas, encomendas } = data;

  const [periodo, setPeriodo] = useState<'hoje' | '7d' | '30d' | 'mes' | 'todos'>('mes');
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

  // Vendas Pagas no Período
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const vDate = new Date(v.data);
      const isPaid = v.status === 'PAGO' || v.status === 'ENVIADO' || v.status === 'ENTREGUE';
      return isPaid && vDate >= dataCorte;
    });
  }, [vendas, dataCorte]);

  // Despesas no Período
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => new Date(d.data) >= dataCorte);
  }, [despesas, dataCorte]);

  // Indicadores DRE
  const receitaBruta = useMemo(() => vendasFiltradas.reduce((acc, v) => acc + v.valorTotal, 0), [vendasFiltradas]);
  const cpvTotal = useMemo(() => vendasFiltradas.reduce((acc, v) => acc + v.custoTotal, 0), [vendasFiltradas]);
  const lucroBruto = receitaBruta - cpvTotal;
  const totalDespesas = useMemo(() => despesasFiltradas.reduce((acc, d) => acc + d.valor, 0), [despesasFiltradas]);
  const lucroLiquido = lucroBruto - totalDespesas;
  const margemLiquida = receitaBruta > 0 ? ((lucroLiquido / receitaBruta) * 100).toFixed(1) : '0';

  // Contas a Receber (Vendas pendentes + Saldo de Encomendas ativas)
  const contasAReceber = useMemo(() => {
    const vendasPendentes = vendas
      .filter(v => v.status === 'AGUARDANDO_PAGAMENTO' || v.status === 'PREPARANDO')
      .reduce((acc, v) => acc + v.valorTotal, 0);

    const saldoEncomendas = encomendas
      .filter(e => e.status !== 'FINALIZADO' && e.status !== 'CANCELADO')
      .reduce((acc, e) => acc + Math.max(0, (e.precoEstimado || 0) - (e.valorAdiantamento || 0)), 0);

    return vendasPendentes + saldoEncomendas;
  }, [vendas, encomendas]);

  // Formas de Pagamento
  const formasPagamentoStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vendasFiltradas) {
      map.set(v.formaPagamento, (map.get(v.formaPagamento) || 0) + v.valorTotal);
    }
    const total = receitaBruta || 1;
    return Array.from(map.entries()).map(([forma, valor]) => ({
      forma,
      valor,
      percent: Math.round((valor / total) * 100)
    }));
  }, [vendasFiltradas, receitaBruta]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <DollarSign size={22} className="text-[#7a5828]" />
            DRE & Gestão Financeira
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Demonstrativo de resultado, custo de produtos vendidos (CPV), despesas operacionais e lucro líquido.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-[#f4efe6] p-1 rounded-2xl border border-[#dcd5c7]">
            {(['hoje', '7d', '30d', 'mes', 'todos'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  periodo === p ? 'bg-[#09090b] text-white shadow-xs' : 'text-[#52525b] hover:text-[#09090b]'
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
            className="px-4 py-2 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} className="text-[#a37941]" />
            <span>Registrar Despesa</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* CARDS DO DRE */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block mb-1">
            Receita Bruta
          </span>
          <p className="text-lg sm:text-xl font-bold text-[#09090b]">
            {receitaBruta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-[#52525b] block mt-1">{vendasFiltradas.length} pedidos pagos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#dcd5c7] shadow-xs">
          <span className="text-[10px] font-bold text-[#7a5828] uppercase tracking-wider block mb-1">
            Custo Produtos (CPV)
          </span>
          <p className="text-lg sm:text-xl font-bold text-[#5c401c]">
            {cpvTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-[#52525b] block mt-1">Custo dos perfumes vendidos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Lucro Bruto Comercial
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-950">
            +{lucroBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-emerald-800 font-bold block mt-1">
            {receitaBruta > 0 ? ((lucroBruto / receitaBruta) * 100).toFixed(1) : 0}% sobre vendas
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block mb-1">
            Despesas Operacionais
          </span>
          <p className="text-lg sm:text-xl font-bold text-red-900">
            -{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-red-700 block mt-1">{despesasFiltradas.length} lançamento(s)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
            Lucro Líquido Real
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-950">
            {lucroLiquido >= 0 ? `+${lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-emerald-800 font-bold block mt-1">Margem Líquida: {margemLiquida}%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/30 shadow-xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
            Contas a Receber
          </span>
          <p className="text-lg sm:text-xl font-bold text-amber-950">
            {contasAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-amber-800 block mt-1">Vendas e encomendas pendentes</span>
        </div>
      </div>

      {/* DETALHAMENTO: FORMAS DE PAGAMENTO & LISTA DE DESPESAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMAS DE PAGAMENTO (1 Coluna) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#dcd5c7] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#09090b] mb-1">
              Divisão por Forma de Pagamento
            </h3>
            <p className="text-xs text-[#52525b] mb-5">
              Volume recebido em cada meio de pagamento
            </p>

            <div className="space-y-4">
              {formasPagamentoStats.length === 0 ? (
                <p className="text-xs text-[#71717a] py-6 text-center">Nenhum recebimento no período.</p>
              ) : (
                formasPagamentoStats.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#09090b]">{item.forma}</span>
                      <div className="text-right font-medium">
                        <span className="text-[#52525b]">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-xs font-bold text-[#7a5828] ml-1.5">({item.percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#f4efe6] rounded-full overflow-hidden border border-[#dcd5c7]/60">
                      <div 
                        className="h-full bg-gradient-to-r from-[#7a5828] to-[#a37941] rounded-full transition-all duration-500"
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
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#dcd5c7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#09090b]">
                  Lançamentos de Despesas Operacionais
                </h3>
                <p className="text-xs text-[#52525b]">
                  Custos fixos e variáveis (embalagens, marketing, logística, estrutura)
                </p>
              </div>
              <span className="text-xs font-bold text-red-700">
                Total: -{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-center">Categoria</th>
                    <th className="py-2.5 px-3 text-center">Pagamento</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe5dc] text-xs">
                  {despesasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-[#71717a]">
                        Nenhuma despesa registrada neste período.
                      </td>
                    </tr>
                  ) : (
                    despesasFiltradas.map((d) => (
                      <tr key={d.id} className="hover:bg-[#fcfbf9] transition-colors">
                        <td className="py-2.5 px-3 text-[#52525b] font-mono text-[11px]">
                          {new Date(d.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#09090b]">
                          {d.descricao}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-[#f4efe6] text-[10px] font-bold text-[#7a5828] border border-[#dcd5c7]">
                            {d.categoria}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#52525b]">
                          {d.formaPagamento || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-red-700">
                          -R$ {d.valor.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDespesa(d.id)}
                            className="p-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#dcd5c7] shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] to-[#a37941]" />

            <div className="flex items-center justify-between pb-3 border-b border-[#dcd5c7] mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#09090b]">Registrar Despesa</h3>
                <p className="text-xs text-[#52525b]">Lançamento financeiro no DRE</p>
              </div>
              <button onClick={() => setIsNewDespesaOpen(false)} className="p-1 text-[#52525b] hover:text-[#09090b] rounded-full hover:bg-[#f4efe6] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDespesa} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Descrição do Gasto *</label>
                <input
                  type="text"
                  required
                  value={descDespesa}
                  onChange={e => setDescDespesa(e.target.value)}
                  placeholder="Ex: Embalagens rígidas de presente, fita dourada..."
                  className="w-full px-3.5 py-2 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={catDespesa}
                    onChange={e => setCatDespesa(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
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
                  <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={valDespesa || ''}
                    onChange={e => setValDespesa(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full px-3 py-1.5 bg-[#fcfbf9] text-xs font-bold text-red-700 rounded-xl border border-[#dcd5c7] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagDespesa}
                  onChange={e => setFormaPagDespesa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#fcfbf9] text-xs font-bold text-[#09090b] rounded-xl border border-[#dcd5c7] outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#dcd5c7] flex items-center justify-end gap-2.5">
                <button type="button" disabled={isSubmitting} onClick={() => setIsNewDespesaOpen(false)} className="px-4 py-2 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#52525b] hover:bg-[#f4efe6] transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin text-[#a37941]" /> : <span>Lançar Despesa</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
