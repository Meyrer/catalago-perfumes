"use client";

import { useState, type FormEvent } from 'react';
import { registrarRecebimentoAction } from '../../actions';
import { getSaleReceivedAmount } from '@/lib/sale-payment';
import { fromCents, toCents } from '@/lib/money';
import type { AdminVenda } from '../types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const forecastDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const paymentMethods = [
  ['PIX', 'Pix'], ['DINHEIRO', 'Dinheiro'], ['CARTAO_CREDITO', 'Cartão de crédito'],
  ['CARTAO_DEBITO', 'Cartão de débito'], ['LINK_PAGAMENTO', 'Link de pagamento'],
];

export default function ReceivablesView({ vendas }: { vendas: AdminVenda[] }) {
  const [selected, setSelected] = useState<{ sale: AdminVenda; balance: number } | null>(null);
  const [feedback, setFeedback] = useState('');
  const openSales = vendas.filter(sale => sale.status !== 'CANCELADO')
    .map(sale => ({ sale, cents: toCents(sale.valorTotal) - toCents(getSaleReceivedAmount(sale)) }))
    .filter(entry => entry.cents > 0)
    .sort((a, b) => (a.sale.previsaoPagamento ? new Date(a.sale.previsaoPagamento).getTime() : Infinity)
      - (b.sale.previsaoPagamento ? new Date(b.sale.previsaoPagamento).getTime() : Infinity)
      || new Date(a.sale.data).getTime() - new Date(b.sale.data).getTime());

  return (
    <section className="space-y-4" aria-label="Vendas a receber">
      <div className="rounded-2xl border border-brand-line bg-brand-card p-4">
        <h3 className="text-sm font-semibold">Total a receber</h3>
        <p className="mt-1 text-2xl font-bold text-amber-700">{money.format(fromCents(openSales.reduce((sum, entry) => sum + entry.cents, 0)))}</p>
        <p className="text-xs text-brand-muted">Vendas em aberto de todos os meses</p>
      </div>
      {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
      <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-nude text-xs text-brand-muted">
            <tr><th className="p-3">Cliente</th><th className="p-3">Venda</th><th className="p-3">Previsão de pagamento</th><th className="p-3 text-right">Falta receber</th><th className="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {openSales.length === 0 && <tr><td colSpan={5} className="p-5 text-center text-brand-muted">Nenhuma venda a receber.</td></tr>}
            {openSales.map(({ sale, cents }) => (
              <tr key={sale.id}>
                <td className="p-3 font-semibold">{sale.cliente?.nome || sale.nomeClienteAvulso || 'Cliente balcão'}{(sale.cliente?.whatsapp || sale.contatoClienteAvulso) && <span className="block text-xs font-normal text-brand-muted">{sale.cliente?.whatsapp || sale.contatoClienteAvulso}</span>}</td>
                <td className="p-3 text-xs">{sale.numero}</td>
                <td className="p-3 whitespace-nowrap">{sale.previsaoPagamento ? forecastDate.format(new Date(sale.previsaoPagamento)) : 'Sem previsão'}</td>
                <td className="p-3 text-right font-semibold whitespace-nowrap">{money.format(fromCents(cents))}</td>
                <td className="p-3 text-right"><button type="button" className="rounded-lg border border-brand-line px-3 py-2 text-xs font-semibold hover:bg-brand-nude cursor-pointer" onClick={() => { setFeedback(''); setSelected({ sale, balance: fromCents(cents) }); }}>Registrar recebimento</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && <ReceiptDialog {...selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setFeedback('Recebimento registrado.'); }} />}
    </section>
  );
}

function ReceiptDialog({ sale, balance, onClose, onSaved }: {
  sale: AdminVenda; balance: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      await registrarRecebimentoAction(sale.id, {
        updatedAt: new Date(sale.updatedAt).toISOString(),
        valor: Number(form.get('valor')),
        formaPagamento: String(form.get('formaPagamento')),
        dataPagamento: new Date(String(form.get('dataPagamento'))).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o recebimento.');
      setSaving(false);
    }
  }

  const fieldClass = 'mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-sm';
  return (
    <dialog ref={element => { if (element && !element.open) element.showModal(); }} aria-labelledby="receipt-title" onClose={onClose} onCancel={event => { if (saving) event.preventDefault(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-brand-line bg-brand-card p-5 text-brand-chocolate backdrop:bg-black/50">
      <h3 id="receipt-title" className="text-lg font-bold">Registrar recebimento</h3>
      <p className="mb-4 text-sm text-brand-muted">{sale.cliente?.nome || sale.nomeClienteAvulso || 'Cliente balcão'} · Saldo de {money.format(balance)}</p>
      <form onSubmit={submit} className="space-y-3">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <label className="block text-sm font-medium">Valor recebido (R$)<input name="valor" type="number" min="0.01" max={balance} step="0.01" required defaultValue={balance} className={fieldClass} /></label>
        <label className="block text-sm font-medium">Forma de pagamento<select name="formaPagamento" defaultValue={sale.formaPagamento} className={fieldClass}>{paymentMethods.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="block text-sm font-medium">Data e hora do recebimento<input name="dataPagamento" type="datetime-local" required defaultValue={paymentDate} className={fieldClass} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-brand-line px-3 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-chocolate px-3 py-2 text-sm font-semibold text-brand-cream disabled:opacity-50">{saving ? 'Registrando…' : 'Salvar recebimento'}</button>
        </div>
      </form>
    </dialog>
  );
}
