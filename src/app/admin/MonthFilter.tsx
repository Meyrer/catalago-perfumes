"use client";

import { useId } from 'react';

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo',
});
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo',
});

export function getDayKey(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

export function getMonthKey(value: Date | string = new Date()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = monthFormatter.formatToParts(date);
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`;
}

export function isInMonth(value: Date | string, month: string): boolean {
  return !month || getMonthKey(value) === month;
}

export default function MonthFilter({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-line bg-brand-card p-4 text-xs text-brand-chocolate">
      <label htmlFor={id} className="font-semibold">Mês e ano</label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg border border-brand-line bg-brand-cream px-3 py-2 text-sm outline-none focus:border-brand-caramel"
      />
      <button type="button" onClick={() => onChange(getMonthKey())} className="rounded-lg border border-brand-line px-3 py-2 font-semibold hover:bg-brand-cream cursor-pointer">Mês atual</button>
      <button type="button" onClick={() => onChange('')} className="rounded-lg border border-brand-line px-3 py-2 font-semibold hover:bg-brand-cream cursor-pointer">Todos os meses</button>
    </div>
  );
}
