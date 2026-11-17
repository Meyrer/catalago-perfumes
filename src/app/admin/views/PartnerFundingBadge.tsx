import type { PartnerFunding } from '@/lib/partner-funding';

const descriptions = {
  direto: 'Pago diretamente pelos sócios. Sem saída pelo caixa da loja.',
  aporte: 'A saída está coberta por um aporte dos sócios.',
  parcial: 'Parte da saída está coberta por um aporte dos sócios.',
};

export default function PartnerFundingBadge({ funding, explain = false }: { funding?: PartnerFunding; explain?: boolean }) {
  if (!funding) return null;
  return <span className="mt-1 block">
    <span className="inline-block rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800" title={descriptions[funding]}>
      {funding === 'parcial' ? 'Pago em parte pelos sócios' : 'Pago pelos sócios'}
    </span>
    {explain && <span className="mt-1 block text-xs text-brand-muted">{descriptions[funding]}</span>}
  </span>;
}
