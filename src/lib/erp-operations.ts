import "server-only";
import { randomUUID } from "node:crypto";
import { changeFifoStock } from "@/lib/fifo-stock";
import { fifoCost, releaseFifo, saleFifoAllocations, type FifoLot } from "@/lib/fifo";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { plainPrismaData } from "@/lib/admin-api";
import { fromCents, roundMoney, toCents } from "@/lib/money";
import { getSaleReceivedAmount, recordSalePayment, validateSaleReceivedAmount } from "@/lib/sale-payment";

function parsePaymentForecast(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-') ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Informe uma data válida para a previsão de pagamento.');
  }
  return date;
}

export async function createSale(data: {
  clienteId?: number;
  nomeClienteAvulso?: string;
  contatoClienteAvulso?: string;
  itens: Array<{ produtoId: number; quantidade: number; precoUnitario: number }>;
  formaPagamento: string;
  desconto?: number;
  frete?: number;
  observacoes?: string;
  status?: string;
  valorRecebido?: number | null;
  previsaoPagamento?: string | null;
  dataPagamento?: string;
  formaRecebimento?: string;
}, actor: string) {
  const { clienteId, nomeClienteAvulso, contatoClienteAvulso, itens, formaPagamento, observacoes } = data;
  const desconto = data.desconto ?? 0;
  const frete = data.frete ?? 0;
  const previsaoPagamento = parsePaymentForecast(data.previsaoPagamento);
  const status = data.status || "PREPARANDO";
  if (!['AGUARDANDO_PAGAMENTO', 'PAGO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'].includes(status)) throw new Error('Status inválido.');
  if (!['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'LINK_PAGAMENTO'].includes(formaPagamento)) throw new Error('Forma de pagamento inválida.');

  if (!itens || itens.length === 0) {
    throw new Error("Selecione pelo menos um produto para registrar a venda.");
  }
  const produtosSelecionados = new Set<number>();
  for (const item of itens) {
    if (!Number.isSafeInteger(item.produtoId) || item.produtoId < 1 || produtosSelecionados.has(item.produtoId)) throw new Error('Produto inválido ou duplicado na venda.');
    produtosSelecionados.add(item.produtoId);
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade < 1) throw new Error("A quantidade dos itens deve ser um inteiro positivo.");
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) throw new Error("Preço unitário inválido.");
  }
  if (![desconto, frete].every(Number.isFinite) || desconto < 0 || frete < 0) throw new Error("Desconto e frete devem ser valores válidos e não negativos.");

  // Buscar produtos no banco para checar estoque e custo
  const produtosIds = itens.map(i => i.produtoId);
  const produtosDB = await prisma.produto.findMany({
    where: { id: { in: produtosIds } }
  });

  const produtosMap = new Map(produtosDB.map(p => [p.id, p]));

  let subtotalCents = 0;
  let custoTotalCents = 0;

  for (const item of itens) {
    const p = produtosMap.get(item.produtoId);
    if (!p) throw new Error(`Produto #${item.produtoId} não encontrado.`);
    
    // Se a venda for ativa (não cancelada), valida estoque disponível
    if (status !== 'CANCELADO' && p.quantidade < item.quantidade) {
      throw new Error(`Estoque insuficiente para "${p.nome}". Disponível: ${p.quantidade} un.`);
    }

    const itemSubtotalCents = toCents(item.precoUnitario) * item.quantidade;
    const itemCustoCents = toCents(Number(p.precoCusto || 0)) * item.quantidade;

    subtotalCents += itemSubtotalCents;
    custoTotalCents += itemCustoCents;
  }

  const subtotal = fromCents(subtotalCents);
  if (toCents(desconto) > subtotalCents) throw new Error('Desconto não pode superar o subtotal.');
  const custoTotal = fromCents(custoTotalCents);
  const valorTotal = fromCents(Math.max(0, subtotalCents - toCents(desconto) + toCents(frete)));
  const lucroTotal = fromCents(subtotalCents - toCents(desconto) - custoTotalCents);
  const valorRecebido = validateSaleReceivedAmount(data.valorRecebido === undefined ? (status === 'PAGO' ? valorTotal : 0) : data.valorRecebido, valorTotal);
  if (status === 'PAGO' && valorRecebido !== valorTotal) throw new Error('Para marcar a venda como Pago, confirme o recebimento do valor total.');
  const numeroVenda = `VND-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const venda = await prisma.$transaction(async (tx) => {
  const custosFIFO = new Map<number, { unitCost: number; allocations: FifoLot[] }>();
  for (const item of itens) {
    const product = produtosMap.get(item.produtoId)!;
    const result = status === 'CANCELADO' ? { cost: Number(product.precoCusto ?? 0) * item.quantidade, taken: [] }
      : await changeFifoStock(tx, product, product.quantidade - item.quantidade, `VENDA ${numeroVenda}`);
    custosFIFO.set(item.produtoId, { unitCost: result.cost / item.quantidade, allocations: result.taken });
  }
  const custoTotal = roundMoney(itens.reduce((sum, item) => sum + custosFIFO.get(item.produtoId)!.unitCost * item.quantidade, 0));
  const lucroTotal = roundMoney(subtotal - desconto - custoTotal);
  const venda = await tx.venda.create({
    data: {
      numero: numeroVenda,
      clienteId: clienteId || null,
      nomeClienteAvulso: nomeClienteAvulso || null,
      contatoClienteAvulso: contatoClienteAvulso || null,
      status,
      formaPagamento,
      subtotal,
      desconto,
      frete,
      valorTotal,
      valorRecebido,
      previsaoPagamento: previsaoPagamento ?? null,
      historicoPagamentos: recordSalePayment({ status: 'PREPARANDO', valorTotal, valorRecebido: 0 }, valorRecebido, data.formaRecebimento || formaPagamento, actor, data.dataPagamento),
      custoTotal,
      lucroTotal,
      observacoes: observacoes || null,
      usuarioResponsavel: actor,
      itens: {
        create: itens.map(item => {
          const p = produtosMap.get(item.produtoId)!;
          const precoUnit = item.precoUnitario;
          const custoUnit = custosFIFO.get(item.produtoId)!.unitCost;
          return {
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: precoUnit,
            custoUnitario: custoUnit,
            lotesCusto: custosFIFO.get(item.produtoId)!.allocations,
            lucroUnitario: precoUnit - custoUnit,
            subtotal: fromCents(toCents(precoUnit) * item.quantidade)
          };
        })
      }
    }
  });

  // Baixa imediata de estoque para qualquer venda ativa (inclusive Aguardando Pagamento, para reserva imediata)
  if (status !== 'CANCELADO') {
    for (const item of itens) {
      const p = produtosMap.get(item.produtoId)!;
      const qtdAnterior = p.quantidade;
      if (qtdAnterior < item.quantidade) throw new Error(`Estoque insuficiente para "${p.nome}". Atualize os dados e tente novamente.`);
      const qtdNova = qtdAnterior - item.quantidade;

      const updateData: {
        quantidade: number;
        tipoDisponibilidade?: string;
        previsaoEntrega?: string;
      } = { quantidade: qtdNova };

      // Se o estoque zerou após a venda, altera a tag automaticamente para Sob Encomenda
      if (qtdNova <= 0) {
        updateData.tipoDisponibilidade = 'ENCOMENDA';
        updateData.previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
      }

      const changed = await tx.produto.updateMany({
        where: { id: item.produtoId, quantidade: qtdAnterior },
        data: updateData
      });
      if (changed.count !== 1) throw new Error(`Estoque de "${p.nome}" foi alterado por outra operação. Atualize a venda e tente novamente.`);

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: 'VENDA',
          quantidade: -item.quantidade,
          quantidadeAnterior: qtdAnterior,
          quantidadeNova: qtdNova,
          motivo: `Venda #${numeroVenda} (${status === 'AGUARDANDO_PAGAMENTO' ? 'Aguardando Pagamento - Reserva' : status})`,
          usuarioResponsavel: actor,
          vendaId: venda.id
        }
      });
    }
  }

  return plainPrismaData(venda);
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return venda;
}

export async function updateSale(vendaId: number, data: Parameters<typeof createSale>[0] & { updatedAt: string; data: string }, actor: string) {
  const status = data.status || 'PAGO';
  const desconto = roundMoney(data.desconto ?? 0);
  const frete = roundMoney(data.frete ?? 0);
  const date = new Date(data.data);
  const previsaoPagamento = parsePaymentForecast(data.previsaoPagamento);
  if (!Number.isSafeInteger(vendaId) || vendaId < 1 || Number.isNaN(date.getTime())) throw new Error('Venda ou data inválida.');
  if (!['AGUARDANDO_PAGAMENTO', 'PAGO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'].includes(status)) throw new Error('Status inválido.');
  if (!['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'LINK_PAGAMENTO'].includes(data.formaPagamento)) throw new Error('Forma de pagamento inválida.');
  if (desconto < 0 || frete < 0) throw new Error('Desconto e frete não podem ser negativos.');
  if (!Array.isArray(data.itens) || data.itens.length === 0) throw new Error('Adicione pelo menos um produto à venda.');
  const ids = new Set<number>();
  for (const item of data.itens) {
    if (!Number.isSafeInteger(item.produtoId) || item.produtoId < 1 || ids.has(item.produtoId)) throw new Error('Produto inválido ou duplicado.');
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade < 1) throw new Error('A quantidade deve ser um inteiro positivo.');
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) throw new Error('Preço unitário inválido.');
    ids.add(item.produtoId);
  }

  await prisma.$transaction(async tx => {
    const venda = await tx.venda.findUnique({ where: { id: vendaId }, include: { itens: true } });
    if (!venda) throw new Error('Venda não encontrada.');
    if (venda.updatedAt.toISOString() !== data.updatedAt) throw new Error('A venda foi alterada. Atualize a página antes de editar novamente.');
    if (status === 'CANCELADO' && venda.status !== 'CANCELADO') throw new Error('Cancelado não está disponível para edição.');
    if (data.clienteId && !await tx.cliente.findUnique({ where: { id: data.clienteId } })) throw new Error('Cliente não encontrado.');

    const movimentos = await tx.estoqueMovimentacao.findMany({
      where: { vendaId, tipo: { in: ['VENDA', 'DEVOLUCAO'] } }
    });
    const deduzidos = new Map<number, number>();
    for (const movimento of movimentos) {
      deduzidos.set(movimento.produtoId, (deduzidos.get(movimento.produtoId) || 0) - movimento.quantidade);
    }
    const produtos = await tx.produto.findMany({ where: { id: { in: [...new Set([...ids, ...deduzidos.keys()])] } } });
    const produtosMap = new Map(produtos.map(p => [p.id, p]));
    const itens = data.itens.map(item => {
      const produto = produtosMap.get(item.produtoId);
      if (!produto) throw new Error(`Produto #${item.produtoId} não encontrado.`);
      const anterior = venda.itens.find(it => it.produtoId === item.produtoId);
      const custoUnitario = Number(anterior?.custoUnitario ?? produto.precoCusto ?? 0);
      const precoUnitario = roundMoney(item.precoUnitario);
      return {
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario,
        custoUnitario,
        lucroUnitario: precoUnitario - custoUnitario,
        lotesCusto: anterior ? saleFifoAllocations(anterior, vendaId) : [] as FifoLot[],
        subtotal: fromCents(toCents(precoUnitario) * item.quantidade),
      };
    });

    for (const produto of produtos) {
      const quantidadeDesejada = status === 'CANCELADO' ? 0 : (itens.find(it => it.produtoId === produto.id)?.quantidade || 0);
      const diferenca = quantidadeDesejada - (deduzidos.get(produto.id) || 0);
      if (diferenca === 0) continue;
      const quantidadeNova = produto.quantidade - diferenca;
      if (quantidadeNova < 0) throw new Error(`Estoque insuficiente para "${produto.nome}". Disponível para esta venda: ${produto.quantidade + (deduzidos.get(produto.id) || 0)} un.`);
      const previousItem = venda.itens.find(item => item.produtoId === produto.id);
      const targetItem = itens.find(item => item.produtoId === produto.id);
      let allocations = previousItem && (deduzidos.get(produto.id) || 0) > 0 ? saleFifoAllocations(previousItem, vendaId) : [];
      if (diferenca < 0) {
        const released = releaseFifo(allocations, -diferenca);
        await changeFifoStock(tx, produto, quantidadeNova, `DEVOLUCAO ${venda.numero}`, undefined, released.returned);
        allocations = released.kept;
      } else {
        const consumed = await changeFifoStock(tx, produto, quantidadeNova, `VENDA ${venda.numero}`);
        allocations = [...allocations, ...consumed.taken];
      }
      if (targetItem) {
        targetItem.lotesCusto = allocations;
        targetItem.custoUnitario = fifoCost(allocations) / targetItem.quantidade;
        targetItem.lucroUnitario = targetItem.precoUnitario - targetItem.custoUnitario;
      }

      const changed = await tx.produto.updateMany({
        where: { id: produto.id, quantidade: produto.quantidade },
        data: {
          quantidade: quantidadeNova,
          ...(quantidadeNova === 0 ? {
            tipoDisponibilidade: 'ENCOMENDA',
            previsaoEntrega: 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias',
          } : produto.quantidade === 0 && produto.tipoDisponibilidade === 'ENCOMENDA' ? {
            tipoDisponibilidade: 'PRONTA_ENTREGA',
            previsaoEntrega: 'Disponível em estoque • Envio ou retirada imediata',
          } : {}),
        },
      });
      if (changed.count !== 1) throw new Error('O estoque foi alterado por outra operação. Atualize a página e tente novamente.');
      await tx.estoqueMovimentacao.create({ data: {
        produtoId: produto.id,
        tipo: diferenca > 0 ? 'VENDA' : 'DEVOLUCAO',
        quantidade: -diferenca,
        quantidadeAnterior: produto.quantidade,
        quantidadeNova,
        motivo: `Edição da venda #${venda.numero}`,
        usuarioResponsavel: actor,
        vendaId,
      } });
    }

    const subtotalCents = itens.reduce((sum, item) => sum + toCents(item.subtotal), 0);
    if (toCents(desconto) > subtotalCents) throw new Error('Desconto não pode superar o subtotal.');
    const custoTotalCents = itens.reduce((sum, item) => sum + toCents(item.custoUnitario * item.quantidade), 0);
    const valorTotal = fromCents(Math.max(0, subtotalCents - toCents(desconto) + toCents(frete)));
    const valorRecebido = validateSaleReceivedAmount(data.valorRecebido === undefined ? getSaleReceivedAmount(venda) : data.valorRecebido, valorTotal);
    if (status === 'PAGO' && valorRecebido !== valorTotal) throw new Error('Para marcar a venda como Pago, confirme o recebimento do valor total.');
    await tx.venda.update({ where: { id: vendaId }, data: {
      clienteId: data.clienteId || null,
      nomeClienteAvulso: data.clienteId ? null : data.nomeClienteAvulso?.trim() || null,
      contatoClienteAvulso: data.clienteId ? null : data.contatoClienteAvulso?.trim() || null,
      formaPagamento: data.formaPagamento,
      status,
      data: date,
      desconto,
      frete,
      observacoes: data.observacoes?.trim() || null,
      subtotal: fromCents(subtotalCents),
      custoTotal: fromCents(custoTotalCents),
      valorTotal,
      valorRecebido,
      ...(previsaoPagamento === undefined ? {} : { previsaoPagamento }),
      historicoPagamentos: recordSalePayment(venda, valorRecebido, data.formaRecebimento || data.formaPagamento, actor, data.dataPagamento),
      lucroTotal: fromCents(subtotalCents - toCents(desconto) - custoTotalCents),
      itens: { deleteMany: {}, create: itens },
    } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export async function updateSaleStatus(vendaId: number, novoStatus: string, actor: string) {
  if (!['AGUARDANDO_PAGAMENTO', 'PAGO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'].includes(novoStatus)) throw new Error('Status inválido.');
  await prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true }
    });

    if (!venda) throw new Error("Venda não encontrada.");

    const statusAnterior = venda.status;
    if (statusAnterior === novoStatus) return;

    // Verificar se esta venda já teve baixa de estoque registrada e se já foi devolvida
    const movsVenda = await tx.estoqueMovimentacao.findMany({
      where: { vendaId: venda.id, tipo: 'VENDA' }
    });
    const movsDevolucao = await tx.estoqueMovimentacao.findMany({
      where: { vendaId: venda.id, tipo: 'DEVOLUCAO' }
    });

    const estoqueAtualmenteDeduzido = [...movsVenda, ...movsDevolucao].reduce((saldo, mov) => saldo + mov.quantidade, 0) < 0;

    // 1. Se foi alterado para CANCELADO e o estoque estava deduzido, devolve os itens ao estoque
    if (novoStatus === 'CANCELADO' && estoqueAtualmenteDeduzido) {
      for (const item of venda.itens) {
        const p = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (p) {
          const qtdAnterior = p.quantidade;
          const qtdNova = qtdAnterior + item.quantidade;
          await changeFifoStock(tx, p, qtdNova, `DEVOLUCAO ${venda.numero}`, undefined, saleFifoAllocations(item, venda.id));

          const updateData: {
            quantidade: number;
            tipoDisponibilidade?: string;
            previsaoEntrega?: string;
          } = { quantidade: qtdNova };

          if (qtdAnterior <= 0 && qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
            updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
            updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
          }

          const changed = await tx.produto.updateMany({
            where: { id: item.produtoId, quantidade: qtdAnterior },
            data: updateData
          });
          if (changed.count !== 1) throw new Error(`Estoque de "${p.nome}" foi alterado por outra operação. Tente novamente.`);

          await tx.estoqueMovimentacao.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'DEVOLUCAO',
              quantidade: item.quantidade,
              quantidadeAnterior: qtdAnterior,
              quantidadeNova: qtdNova,
              motivo: `Devolução por cancelamento da venda #${venda.numero}`,
              usuarioResponsavel: actor,
              vendaId: venda.id
            }
          });
        }
      }
    }

    let custoReativado: number | undefined;
    // 2. Se está saindo de CANCELADO (ou é uma venda legada que ainda não teve baixa) para qualquer status ativo, deduz do estoque
    if (novoStatus !== 'CANCELADO' && !estoqueAtualmenteDeduzido) {
      custoReativado = 0;
      for (const item of venda.itens) {
        const p = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (p) {
          const qtdAnterior = p.quantidade;
          if (qtdAnterior < item.quantidade) {
            throw new Error(`Estoque insuficiente para "${p.nome}". Disponível: ${qtdAnterior} un, necessário: ${item.quantidade} un.`);
          }
          const qtdNova = qtdAnterior - item.quantidade;
          const consumed = await changeFifoStock(tx, p, qtdNova, `REATIVACAO ${venda.numero}`);
          const custoUnitario = consumed.cost / item.quantidade;
          custoReativado = roundMoney((custoReativado ?? 0) + consumed.cost);
          await tx.vendaItem.update({ where: { id: item.id }, data: { custoUnitario, lucroUnitario: item.precoUnitario - custoUnitario, lotesCusto: consumed.taken } });

          const updateData: {
            quantidade: number;
            tipoDisponibilidade?: string;
            previsaoEntrega?: string;
          } = { quantidade: qtdNova };

          if (qtdNova <= 0) {
            updateData.tipoDisponibilidade = 'ENCOMENDA';
            updateData.previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
          }

          const changed = await tx.produto.updateMany({
            where: { id: item.produtoId, quantidade: qtdAnterior },
            data: updateData
          });
          if (changed.count !== 1) throw new Error(`Estoque de "${p.nome}" foi alterado por outra operação. Tente novamente.`);

          await tx.estoqueMovimentacao.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'VENDA',
              quantidade: -item.quantidade,
              quantidadeAnterior: qtdAnterior,
              quantidadeNova: qtdNova,
              motivo: `Baixa de estoque da venda #${venda.numero} (status: ${novoStatus})`,
              usuarioResponsavel: actor,
              vendaId: venda.id
            }
          });
        }
      }
    }

    const statusUpdated = await tx.venda.updateMany({
      where: { id: vendaId, status: statusAnterior, updatedAt: venda.updatedAt },
      data: {
        status: novoStatus,
        ...(custoReativado === undefined ? {} : { custoTotal: custoReativado, lucroTotal: roundMoney(venda.subtotal - venda.desconto - custoReativado) }),
        valorRecebido: novoStatus === 'PAGO' ? venda.valorTotal : getSaleReceivedAmount(venda),
        historicoPagamentos: recordSalePayment(venda, novoStatus === 'PAGO' ? venda.valorTotal : getSaleReceivedAmount(venda), venda.formaPagamento, actor),
      }
    });
    if (statusUpdated.count !== 1) throw new Error("O status da venda foi alterado por outra operação. Atualize os dados e tente novamente.");
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export async function deleteSale(vendaId: number, actor: string) {
  await prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true }
    });
    if (!venda) throw new Error("Venda não encontrada.");
    if (venda.status === 'PAGO' || (getSaleReceivedAmount(venda) ?? 0) > 0) throw new Error("Vendas com recebimentos registrados não podem ser excluídas.");

    const movsVenda = await tx.estoqueMovimentacao.findMany({
      where: { vendaId: venda.id, tipo: 'VENDA' }
    });
    const movsDevolucao = await tx.estoqueMovimentacao.findMany({
      where: { vendaId: venda.id, tipo: 'DEVOLUCAO' }
    });

    const estoqueAtualmenteDeduzido = [...movsVenda, ...movsDevolucao].reduce((saldo, mov) => saldo + mov.quantidade, 0) < 0;

    // Se tinha debitado do estoque e não foi cancelado, devolve os itens ao estoque antes de excluir
    if (estoqueAtualmenteDeduzido && venda.status !== 'CANCELADO') {
      for (const item of venda.itens) {
        const p = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (p) {
          const qtdAnterior = p.quantidade;
          const qtdNova = qtdAnterior + item.quantidade;
          await changeFifoStock(tx, p, qtdNova, `DEVOLUCAO ${venda.numero}`, undefined, saleFifoAllocations(item, venda.id));

          const updateData: {
            quantidade: number;
            tipoDisponibilidade?: string;
            previsaoEntrega?: string;
          } = { quantidade: qtdNova };

          if (qtdAnterior <= 0 && qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
            updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
            updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
          }

          const changed = await tx.produto.updateMany({
            where: { id: item.produtoId, quantidade: qtdAnterior },
            data: updateData
          });
          if (changed.count !== 1) throw new Error('O estoque foi alterado por outra operação. Atualize a página e tente novamente.');

          await tx.estoqueMovimentacao.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'DEVOLUCAO',
              quantidade: item.quantidade,
              quantidadeAnterior: qtdAnterior,
              quantidadeNova: qtdNova,
              motivo: `Devolução por exclusão da venda #${venda.numero}`,
              usuarioResponsavel: actor
            }
          });
        }
      }
    }

    await tx.venda.delete({ where: { id: vendaId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath('/admin');
  revalidatePath('/');
}

export async function createPurchase(data: {
  fornecedorId?: number;
  moeda: 'BRL' | 'USD' | 'EUR';
  cotacao: number;
  frete: number;
  taxas: number;
  outrosCustos: number;
  observacoes?: string;
  itens: Array<{ produtoId: number; quantidade: number; valorUnitarioMoeda: number }>;
  status?: string;
}, actor: string) {
  const { fornecedorId, moeda, cotacao, frete, taxas, outrosCustos, observacoes, itens } = data;
  const status = data.status || 'RECEBIDO';
  if (!['PENDENTE', 'EM_TRANSITO', 'RECEBIDO', 'CANCELADO'].includes(status)) throw new Error('Status da compra inválido.');
  if (!['BRL', 'USD', 'EUR'].includes(moeda) || (moeda === 'BRL' && cotacao !== 1)) throw new Error('Moeda inválida ou cotação do real diferente de 1.');

  if (!itens || itens.length === 0) {
    throw new Error("Adicione pelo menos um item à compra.");
  }
  if (![cotacao, frete, taxas, outrosCustos].every(Number.isFinite) || cotacao <= 0 || frete < 0 || taxas < 0 || outrosCustos < 0) {
    throw new Error("Cotação deve ser positiva e custos não podem ser negativos.");
  }
  const produtosDaCompra = new Set<number>();
  for (const item of itens) {
    if (!Number.isSafeInteger(item.produtoId) || item.produtoId < 1 || produtosDaCompra.has(item.produtoId)) throw new Error('Produto inválido ou duplicado na compra. Consolide a quantidade em uma única linha.');
    produtosDaCompra.add(item.produtoId);
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || !Number.isFinite(item.valorUnitarioMoeda) || item.valorUnitarioMoeda < 0) {
      throw new Error("Itens da compra devem ter quantidade inteira positiva e valor unitário válido.");
    }
  }

  // Calcula subtotal na moeda original e em BRL
  let subtotalMoeda = 0;
  for (const it of itens) {
    subtotalMoeda += fromCents(toCents(it.valorUnitarioMoeda) * it.quantidade);
  }

  subtotalMoeda = roundMoney(subtotalMoeda);
  const subtotalBRL = roundMoney(subtotalMoeda * cotacao);
  const custosExtrasBRL = roundMoney(frete + taxas + outrosCustos);
  const custoTotalBRL = roundMoney(subtotalBRL + custosExtrasBRL);
  const numero = `COMP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  // Rateio proporcional dos custos extras
  const compra = await prisma.$transaction(async (tx) => {
  const compra = await tx.compra.create({
    data: {
      numero,
      fornecedorId: fornecedorId || null,
      status,
      moeda,
      cotacao,
      frete,
      taxas,
      outrosCustos,
      custoTotalBRL,
      observacoes: observacoes || null,
      itens: {
        create: itens.map(item => {
          const itemValorBRL = roundMoney(item.valorUnitarioMoeda * cotacao);
          const proporcao = subtotalBRL > 0 ? (itemValorBRL * item.quantidade) / subtotalBRL : 1 / itens.length;
          const custoExtraItem = roundMoney((custosExtrasBRL * proporcao) / item.quantidade);
          const custoUnitFinal = roundMoney(itemValorBRL + custoExtraItem);
          
          return {
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitarioMoeda: item.valorUnitarioMoeda,
            custoUnitarioBRL: custoUnitFinal,
            custoTotalBRL: fromCents(toCents(custoUnitFinal) * item.quantidade)
          };
        })
      }
    },
    include: { itens: true }
  });

  // Se o status for RECEBIDO, adiciona imediatamente ao estoque e atualiza preço de custo
  if (status === 'RECEBIDO') {
    for (const item of compra.itens) {
      const p = await tx.produto.findUnique({ where: { id: item.produtoId } });
      if (p) {
        const qtdAnterior = p.quantidade;
        const qtdNova = qtdAnterior + item.quantidade;
        await changeFifoStock(tx, p, qtdNova, `COMPRA ${compra.numero}`, Number(item.custoUnitarioBRL));

        const updateData: {
          quantidade: number;
          precoCusto: number;
          tipoDisponibilidade?: string;
          previsaoEntrega?: string;
        } = {
          quantidade: qtdNova,
          precoCusto: Number(item.custoUnitarioBRL)
        };

        if (qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
          updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
          updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
        }

        const changed = await tx.produto.updateMany({
          where: { id: item.produtoId, quantidade: qtdAnterior },
          data: updateData
        });
        if (changed.count !== 1) throw new Error(`Estoque de "${p.nome}" foi alterado por outra operação. Tente novamente.`);

        await tx.estoqueMovimentacao.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'ENTRADA',
            quantidade: item.quantidade,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdNova,
            motivo: `Recebimento da Compra #${numero}`,
            usuarioResponsavel: actor,
            compraId: compra.id
          }
        });
      }
    }
  }

  return compra;
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return plainPrismaData(compra);
}

export async function receivePurchase(compraId: number, actor: string) {
  await prisma.$transaction(async (tx) => {
  const compra = await tx.compra.findUnique({
    where: { id: compraId },
    include: { itens: true }
  });

  if (!compra) throw new Error("Compra não encontrada.");
  if (compra.status === 'RECEBIDO') return { success: true };
  if (compra.status === 'CANCELADO') throw new Error("Uma compra cancelada não pode ser recebida.");

  for (const item of compra.itens) {
    const p = await tx.produto.findUnique({ where: { id: item.produtoId } });
    if (p) {
      const qtdAnterior = p.quantidade;
      const qtdNova = qtdAnterior + item.quantidade;
      await changeFifoStock(tx, p, qtdNova, `COMPRA ${compra.numero}`, Number(item.custoUnitarioBRL));

      const updateData: {
        quantidade: number;
        precoCusto: number;
        tipoDisponibilidade?: string;
        previsaoEntrega?: string;
      } = {
        quantidade: qtdNova,
        precoCusto: Number(item.custoUnitarioBRL)
      };

      if (qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
        updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
        updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
      }

      const changed = await tx.produto.updateMany({
        where: { id: item.produtoId, quantidade: qtdAnterior },
        data: updateData
      });
      if (changed.count !== 1) throw new Error(`Estoque de "${p.nome}" foi alterado por outra operação. Tente novamente.`);

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: 'ENTRADA',
          quantidade: item.quantidade,
          quantidadeAnterior: qtdAnterior,
          quantidadeNova: qtdNova,
          motivo: `Recebimento da Compra #${compra.numero}`,
          usuarioResponsavel: actor,
          compraId: compra.id
        }
      });
    }
  }

  const statusUpdated = await tx.compra.updateMany({
    where: { id: compraId, status: compra.status },
    data: { status: 'RECEBIDO' }
  });
  if (statusUpdated.count !== 1) throw new Error("O status da compra foi alterado por outra operação. Atualize os dados e tente novamente.");
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function createCustomOrder(data: {
  clienteId?: number;
  nomeCliente: string;
  whatsappCliente?: string;
  produtoId?: number;
  descricaoItem: string;
  marca?: string;
  volume?: string;
  quantidade: number;
  precoEstimado?: number;
  custoEstimado?: number;
  valorAdiantamento?: number;
  fornecedorId?: number;
  previsaoChegada?: string;
  observacoes?: string;
}) {
  if (!data.nomeCliente?.trim() || !data.descricaoItem?.trim()) throw new Error('Informe cliente e descrição da encomenda.');
  if (!Number.isSafeInteger(data.quantidade) || data.quantidade < 1) throw new Error('Quantidade deve ser um inteiro positivo.');
  if (![data.precoEstimado ?? 0, data.custoEstimado ?? 0, data.valorAdiantamento ?? 0].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Valores da encomenda devem ser válidos e não negativos.');
  const numero = `ENC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const enc = await prisma.encomenda.create({
    data: {
      numero,
      clienteId: data.clienteId || null,
      nomeCliente: data.nomeCliente.trim(),
      whatsappCliente: data.whatsappCliente?.replace(/\D/g, '') || null,
      produtoId: data.produtoId || null,
      descricaoItem: data.descricaoItem.trim(),
      marca: data.marca?.trim() || null,
      volume: data.volume?.trim() || null,
      quantidade: data.quantidade || 1,
      precoEstimado: data.precoEstimado || null,
      custoEstimado: data.custoEstimado || null,
      valorAdiantamento: data.valorAdiantamento || 0,
      fornecedorId: data.fornecedorId || null,
      previsaoChegada: data.previsaoChegada?.trim() || null,
      observacoes: data.observacoes?.trim() || null,
      status: 'SOLICITACAO_RECEBIDA'
    }
  });

  revalidatePath('/admin');
  return plainPrismaData(enc);
}
