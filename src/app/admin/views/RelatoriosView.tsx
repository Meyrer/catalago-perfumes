"use client";

import { useState, useMemo } from 'react';
import type { ERPData } from '../types';
import { 
  BarChart3, Download, Copy, CheckCheck, 
  TrendingUp, TrendingDown, Percent, DollarSign, 
  Package, AlertTriangle, Printer, Layers
} from 'lucide-react';

type Props = {
  data: ERPData;
};

export default function RelatoriosView({ data }: Props) {
  const { produtos, vendas } = data;

  const [activeReport, setActiveReport] = useState<'mais_vendidos' | 'maior_lucro' | 'maior_margem' | 'estoque_parado' | 'marcas'>('mais_vendidos');
  const [copied, setCopied] = useState(false);

  // Vendas pagas
  const vendasPagas = useMemo(() => {
    return vendas.filter(v => v.status === 'PAGO' || v.status === 'ENVIADO' || v.status === 'ENTREGUE');
  }, [vendas]);

  // Vendas por produto
  const statsPorProduto = useMemo(() => {
    const map = new Map<number, { produto: typeof produtos[0]; qtdVendida: number; faturamento: number; lucroReal: number }>();
    
    // Inicializa com todos os produtos do catálogo
    for (const p of produtos) {
      map.set(p.id, { produto: p, qtdVendida: 0, faturamento: 0, lucroReal: 0 });
    }

    for (const v of vendasPagas) {
      for (const it of v.itens) {
        const itemP = map.get(it.produtoId);
        if (itemP) {
          itemP.qtdVendida += it.quantidade;
          itemP.faturamento += it.subtotal;
          itemP.lucroReal += (it.lucroUnitario * it.quantidade);
        }
      }
    }
    return Array.from(map.values());
  }, [produtos, vendasPagas]);

  // Ranking Mais Vendidos
  const maisVendidos = useMemo(() => {
    return [...statsPorProduto].sort((a, b) => b.qtdVendida - a.qtdVendida);
  }, [statsPorProduto]);

  // Ranking Maior Lucro Nominal
  const maiorLucro = useMemo(() => {
    return [...statsPorProduto].sort((a, b) => b.lucroReal - a.lucroReal);
  }, [statsPorProduto]);

  // Ranking Maior Margem Percentual
  const maiorMargem = useMemo(() => {
    return [...produtos].sort((a, b) => {
      const aVenda = a.precoVista || 0;
      const aCusto = a.precoCusto || 0;
      const aMargem = aVenda > 0 ? ((aVenda - aCusto) / aVenda) : 0;

      const bVenda = b.precoVista || 0;
      const bCusto = b.precoCusto || 0;
      const bMargem = bVenda > 0 ? ((bVenda - bCusto) / bVenda) : 0;

      return bMargem - aMargem;
    });
  }, [produtos]);

  // Estoque Parado (Sem vendas)
  const estoqueParado = useMemo(() => {
    return statsPorProduto.filter(sp => sp.qtdVendida === 0 && sp.produto.quantidade > 0);
  }, [statsPorProduto]);

  // Marcas Mais Vendidas
  const marcasRanking = useMemo(() => {
    const map = new Map<string, { marca: string; qtd: number; total: number; lucro: number }>();
    for (const sp of statsPorProduto) {
      if (sp.qtdVendida === 0) continue;
      const m = sp.produto.marca || 'Outras';
      const cur = map.get(m) || { marca: m, qtd: 0, total: 0, lucro: 0 };
      cur.qtd += sp.qtdVendida;
      cur.total += sp.faturamento;
      cur.lucro += sp.lucroReal;
      map.set(m, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [statsPorProduto]);

  // Exportar CSV
  const handleExportCSV = () => {
    let csv = '\uFEFF';
    csv += 'Relatório;Produto;Marca;Volume;Estoque Físico;Custo Unitário (R$);Preço Venda (R$);Qtd Vendida;Faturamento (R$);Lucro Gerado (R$)\n';

    for (const sp of statsPorProduto) {
      const p = sp.produto;
      csv += `"Geral";"${p.nome}";"${p.marca}";"${p.volume || ''}";${p.quantidade};${(p.precoCusto || 0).toFixed(2).replace('.', ',')};${(p.precoVista || 0).toFixed(2).replace('.', ',')};${sp.qtdVendida};${sp.faturamento.toFixed(2).replace('.', ',')};${sp.lucroReal.toFixed(2).replace('.', ',')}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-geral-elegance-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#dcd5c7] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#09090b] flex items-center gap-2.5">
            <BarChart3 size={22} className="text-[#7a5828]" />
            Relatórios Estratégicos & Curva ABC
          </h2>
          <p className="text-xs text-[#52525b] mt-0.5">
            Análise aprofundada de produtos mais rentáveis, marcas líderes, margens e estoque parado.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Download size={15} className="text-[#a37941]" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* SELEÇÃO DO TIPO DE RELATÓRIO */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'mais_vendidos', label: 'Mais Vendidos (Volume)' },
          { key: 'maior_lucro', label: 'Maior Lucro Nominal (R$)' },
          { key: 'maior_margem', label: 'Maior Margem %' },
          { key: 'marcas', label: 'Ranking por Grifes / Marcas' },
          { key: 'estoque_parado', label: `Estoque Parado (${estoqueParado.length})` },
        ].map(r => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key as typeof activeReport)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
              activeReport === r.key
                ? 'bg-[#09090b] text-white border-[#09090b] shadow-xs'
                : 'bg-white text-[#52525b] border-[#dcd5c7] hover:bg-[#f4efe6] hover:text-[#09090b]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DO RELATÓRIO ATIVO */}
      <div className="bg-white rounded-2xl border border-[#dcd5c7] shadow-xs overflow-hidden">
        
        {/* RELATÓRIO: MAIS VENDIDOS OU MAIOR LUCRO */}
        {(activeReport === 'mais_vendidos' || activeReport === 'maior_lucro') && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  <th className="py-3 px-4">Posição / Produto</th>
                  <th className="py-3 px-3">Marca</th>
                  <th className="py-3 px-3 text-center">Qtd Vendida</th>
                  <th className="py-3 px-3 text-right">Preço de Venda</th>
                  <th className="py-3 px-3 text-right">Faturamento Total</th>
                  <th className="py-3 px-3 text-right">Lucro Total Gerado</th>
                  <th className="py-3 px-4 text-center">Saldo em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5dc] text-xs">
                {(activeReport === 'mais_vendidos' ? maisVendidos : maiorLucro).map((sp, idx) => (
                  <tr key={sp.produto.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#7a5828] mr-2">#{idx + 1}</span>
                      <strong className="text-[#09090b]">{sp.produto.nome}</strong>
                    </td>
                    <td className="py-3 px-3 text-[#52525b] font-medium">{sp.produto.marca}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#09090b]">{sp.qtdVendida} un.</td>
                    <td className="py-3 px-3 text-right text-[#52525b]">
                      {(sp.produto.precoVista || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                      {sp.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      +{sp.lucroReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-[#f4efe6] text-[10px] font-bold text-[#09090b]">
                        {sp.produto.quantidade} un. físico
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO: MAIOR MARGEM */}
        {activeReport === 'maior_margem' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  <th className="py-3 px-4">Produto & Marca</th>
                  <th className="py-3 px-3 text-right">Custo de Aquisição</th>
                  <th className="py-3 px-3 text-right">Preço de Venda</th>
                  <th className="py-3 px-3 text-right">Lucro Unitário</th>
                  <th className="py-3 px-3 text-center">Margem Percentual</th>
                  <th className="py-3 px-3 text-center">Markup</th>
                  <th className="py-3 px-4 text-center">Disponibilidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5dc] text-xs">
                {maiorMargem.map((p) => {
                  const custo = p.precoCusto || 0;
                  const venda = p.precoVista || 0;
                  const lucro = venda - custo;
                  const margem = venda > 0 ? ((lucro / venda) * 100).toFixed(1) : '0';
                  const markup = custo > 0 ? (venda / custo).toFixed(2) : '—';

                  return (
                    <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#09090b]">
                        {p.nome} <span className="text-[#52525b] font-normal">({p.marca})</span>
                      </td>
                      <td className="py-3 px-3 text-right text-[#52525b]">
                        {custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                        {venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        +{lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[11px]">
                          {margem}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#52525b]">
                        {markup}x
                      </td>
                      <td className="py-3 px-4 text-center text-[#52525b]">
                        {p.tipoDisponibilidade === 'PRONTA_ENTREGA' ? 'Pronta Entrega' : 'Encomenda'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO: MARCAS MAIS VENDIDAS */}
        {activeReport === 'marcas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  <th className="py-3 px-4">Posição / Grife</th>
                  <th className="py-3 px-3 text-center">Unidades Vendidas</th>
                  <th className="py-3 px-3 text-right">Faturamento Total</th>
                  <th className="py-3 px-3 text-right">Lucro Total Capturado</th>
                  <th className="py-3 px-4 text-right">Ticket Médio por Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5dc] text-xs">
                {marcasRanking.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-xs text-[#71717a]">
                      Nenhuma venda registrada ainda para calcular ranking de marcas.
                    </td>
                  </tr>
                ) : (
                  marcasRanking.map((m, idx) => (
                    <tr key={m.marca} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#7a5828] mr-2">#{idx + 1}</span>
                        <strong className="text-[#09090b]">{m.marca}</strong>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#09090b]">{m.qtd} un.</td>
                      <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                        {m.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        +{m.lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4 text-right text-[#52525b]">
                        {(m.total / m.qtd).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO: ESTOQUE PARADO */}
        {activeReport === 'estoque_parado' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#dcd5c7] text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  <th className="py-3 px-4">Produto & Marca</th>
                  <th className="py-3 px-3 text-center">Estoque Parado</th>
                  <th className="py-3 px-3 text-right">Custo Parado (R$)</th>
                  <th className="py-3 px-3 text-right">Potencial de Venda</th>
                  <th className="py-3 px-4">Sugestão Comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe5dc] text-xs">
                {estoqueParado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-xs text-emerald-800 font-bold">
                      Excelente! Não há produtos de pronta entrega estagnados sem vendas.
                    </td>
                  </tr>
                ) : (
                  estoqueParado.map((sp) => {
                    const custoParado = (sp.produto.precoCusto || 0) * sp.produto.quantidade;
                    const vendaPot = (sp.produto.precoVista || 0) * sp.produto.quantidade;

                    return (
                      <tr key={sp.produto.id} className="hover:bg-[#fcfbf9] transition-colors">
                        <td className="py-3 px-4">
                          <strong className="text-[#09090b]">{sp.produto.nome}</strong>
                          <span className="text-[11px] text-[#52525b] block">{sp.produto.marca}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-900">
                          {sp.produto.quantidade} un.
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#5c401c]">
                          {custoParado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#09090b]">
                          {vendaPot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-[#7a5828] font-medium text-[11px]">
                          Criar campanha no WhatsApp ou incluir como brinde / combo promocional
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
