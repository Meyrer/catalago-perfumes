"use server";

import { createSale, updateSale, updateSaleStatus, deleteSale, createPurchase, receivePurchase, createCustomOrder } from "@/lib/erp-operations";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import { searchPerfume } from "@/services/perfumeApi";
import { loginAdmin, logoutAdmin, requireAdminAuth, changeAdminPassword } from "@/lib/auth";
import { plainPrismaData } from "@/lib/admin-api";
import { changeFifoStock, initialFifoStock } from "@/lib/fifo-stock";

export async function loginAdminAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const rememberAccess = formData.get("rememberAccess") === "true";

  const result = await loginAdmin(username, password, rememberAccess);
  if (result.success) {
    revalidatePath("/admin");
  }
  return result;
}

export async function changeAdminPasswordAction(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const result = await changeAdminPassword(newPassword, confirmPassword);
  if (result.success) {
    revalidatePath("/admin");
  }
  return result;
}

export async function logoutAdminAction() {
  await logoutAdmin();
  revalidatePath("/admin");
}

export async function actionSearchPerfume(query: string, brand?: string) {
  return await searchPerfume(query, brand);
}

async function saveFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const path = join(process.cwd(), 'public/uploads', filename);
  await writeFile(path, buffer);
  
  return `/uploads/${filename}`;
}

export async function createCategoria(data: FormData) {
  await requireAdminAuth();
  const nome = data.get('nome') as string;
  const file = data.get('imagem') as File;
  const imagemUrlDirect = data.get('imagemUrlDirect') as string;
  
  let imagemUrl: string | undefined = imagemUrlDirect || undefined;

  if (file && file.size > 0) {
    imagemUrl = await saveFile(file);
  }

  await prisma.categoria.create({
    data: {
      nome,
      imagemUrl
    }
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function updateCategoria(id: number, data: FormData) {
  await requireAdminAuth();
  const nome = (data.get('nome') as string)?.trim();
  if (!nome) throw new Error('O nome da categoria é obrigatório.');
  
  const file = data.get('imagem') as File;
  const imagemUrlDirect = data.get('imagemUrlDirect') as string;
  
  let imagemUrl: string | null | undefined = undefined;

  if (file && file.size > 0) {
    imagemUrl = await saveFile(file);
  } else if (typeof imagemUrlDirect === 'string') {
    imagemUrl = imagemUrlDirect.trim() || null;
  }

  await prisma.categoria.update({
    where: { id },
    data: {
      nome,
      ...(imagemUrl !== undefined ? { imagemUrl } : {})
    }
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteCategoria(id: number, targetCategoriaId?: number) {
  await requireAdminAuth();

  await prisma.$transaction(async tx => {
    const count = await tx.produto.count({ where: { categoriaId: id } });
    if (count > 0) {
      if (targetCategoriaId && targetCategoriaId !== id) {
        await tx.produto.updateMany({
          where: { categoriaId: id },
          data: { categoriaId: targetCategoriaId }
        });
      } else {
        const otherCat = await tx.categoria.findFirst({ where: { id: { not: id } } });
        if (otherCat) {
          await tx.produto.updateMany({
            where: { categoriaId: id },
            data: { categoriaId: otherCat.id }
          });
        } else {
          throw new Error('Não é possível excluir a única categoria existente enquanto houver produtos nela.');
        }
      }
    }
  
    await tx.categoria.delete({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function vincularProdutosCategoria(categoriaId: number, produtoIds: number[]) {
  await requireAdminAuth();
  if (!produtoIds || produtoIds.length === 0) return;

  await prisma.produto.updateMany({
    where: { id: { in: produtoIds } },
    data: { categoriaId }
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function createProduto(data: FormData) {
  const session = await requireAdminAuth();
  const nome = data.get('nome') as string;
  const marca = data.get('marca') as string;
  const descricao = (data.get('descricao') as string) || '';
  const precoVista = parseFloat(data.get('precoVista') as string);
  const precoOriginalStr = data.get('precoOriginal') as string;
  const precoOriginal = precoOriginalStr ? parseFloat(precoOriginalStr) : null;
  const precoCustoStr = data.get('precoCusto') as string;
  const precoCusto = precoCustoStr ? parseFloat(precoCustoStr) : null;
  const quantidadeStr = data.get('quantidade') as string;
  const quantidade = quantidadeStr ? parseInt(quantidadeStr) : 1;
  const estoqueMinimoStr = data.get('estoqueMinimo') as string;
  const estoqueMinimo = estoqueMinimoStr ? parseInt(estoqueMinimoStr) : 2;
  const precoParcelado = (data.get('precoParcelado') as string) || null;
  const volume = (data.get('volume') as string) || null;
  const modoUso = (data.get('modoUso') as string) || null;
  const caracteristicas = (data.get('caracteristicas') as string) || null;
  const badge = (data.get('badge') as string) || null;
  let tipoDisponibilidade = (data.get('tipoDisponibilidade') as string) || 'PRONTA_ENTREGA';
  let previsaoEntrega = (data.get('previsaoEntrega') as string) || null;

  // Se o estoque físico for zero, vira automaticamente Sob Encomenda
  if (quantidade <= 0) {
    tipoDisponibilidade = 'ENCOMENDA';
    if (!previsaoEntrega || previsaoEntrega.includes('imediata') || previsaoEntrega.includes('Disponível')) {
      previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
    }
  }
  const categoriaId = parseInt(data.get('categoriaId') as string);
  const fotoUrlDirect = data.get('fotoUrlDirect') as string;
  const subcategoria = (data.get('subcategoria') as string) || null;
  const sku = (data.get('sku') as string) || null;
  const codigoBarras = (data.get('codigoBarras') as string) || null;
  const fornecedorIdStr = data.get('fornecedorId') as string;
  const fornecedorId = fornecedorIdStr ? parseInt(fornecedorIdStr) : null;
  const novidade = data.get('novidade') === 'true';
  const destaque = data.get('destaque') === 'true';
  
  // Fragrance fields
  const familiaOlfativa = (data.get('familiaOlfativa') as string) || null;
  const notasSaida = data.get('notasSaida') ? JSON.parse(data.get('notasSaida') as string) : null;
  const notasCoracao = data.get('notasCoracao') ? JSON.parse(data.get('notasCoracao') as string) : null;
  const notasFundo = data.get('notasFundo') ? JSON.parse(data.get('notasFundo') as string) : null;
  const acordesPrincipais = data.get('acordesPrincipais') ? JSON.parse(data.get('acordesPrincipais') as string) : null;
  const concentracao = (data.get('concentracao') as string) || null;
  const genero = (data.get('genero') as string) || null;
  const anoLancamento = data.get('anoLancamento') ? parseInt(data.get('anoLancamento') as string) : null;
  const descricaoFragrancia = (data.get('descricaoFragrancia') as string) || null;
  const longevidade = (data.get('longevidade') as string) || null;
  const projecao = (data.get('projecao') as string) || null;
  const externalId = (data.get('externalId') as string) || null;

  const produto = await prisma.produto.create({
    data: { 
      nome, 
      marca, 
      descricao, 
      precoVista, 
      precoOriginal,
      precoCusto,
      quantidade,
      lotesEstoque: initialFifoStock(quantidade, precoCusto ?? 0),
      estoqueMinimo,
      precoParcelado, 
      volume,
      modoUso,
      caracteristicas,
      badge,
      tipoDisponibilidade,
      previsaoEntrega,
      destaque,
      novidade,
      subcategoria,
      sku,
      codigoBarras,
      fornecedorId,
      categoriaId,
      familiaOlfativa,
      notasSaida,
      notasCoracao,
      notasFundo,
      acordesPrincipais,
      concentracao,
      genero,
      anoLancamento,
      descricaoFragrancia,
      longevidade,
      projecao,
      externalId
    }
  });

  // Grava movimentação de estoque inicial
  await prisma.estoqueMovimentacao.create({
    data: {
      produtoId: produto.id,
      tipo: 'ENTRADA',
      quantidade: quantidade,
      quantidadeAnterior: 0,
      quantidadeNova: quantidade,
      motivo: 'Cadastro inicial do produto',
      usuarioResponsavel: session.name
    }
  });

  // Direct image URL
  if (fotoUrlDirect && fotoUrlDirect.trim().length > 0) {
    await prisma.foto.create({ data: { url: fotoUrlDirect.trim(), produtoId: produto.id } });
  }

  // Uploaded files
  const files = data.getAll('fotos') as File[];
  for (const file of files) {
    if (file && file.size > 0) {
      const url = await saveFile(file);
      await prisma.foto.create({ data: { url, produtoId: produto.id } });
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleDisponibilidade(id: number) {
  await requireAdminAuth();
  const p = await prisma.produto.findUnique({ where: { id } });
  if (!p) return;

  // Se o estoque físico for 0 ou negativo, não permite mudar para Pronta Entrega
  if (p.tipoDisponibilidade === 'ENCOMENDA' && p.quantidade <= 0) {
    throw new Error("Não é possível alterar para Pronta Entrega pois o estoque está zerado (0 unidades). Dê entrada no estoque primeiro.");
  }

  const novoTipo = p.tipoDisponibilidade === 'PRONTA_ENTREGA' ? 'ENCOMENDA' : 'PRONTA_ENTREGA';
  const novaPrevisao = novoTipo === 'PRONTA_ENTREGA' 
    ? 'Disponível em estoque • Envio ou retirada imediata'
    : 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';

  await prisma.produto.update({
    where: { id },
    data: { 
      tipoDisponibilidade: novoTipo,
      previsaoEntrega: novaPrevisao
    }
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleAtivo(id: number) {
  await requireAdminAuth();
  const p = await prisma.produto.findUnique({ where: { id } });
  if (!p) return;

  await prisma.produto.update({
    where: { id },
    data: { disponivel: !p.disponivel }
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function updateProduto(id: number, data: FormData) {
  const session = await requireAdminAuth();
  const nome = data.get('nome') as string;
  const marca = data.get('marca') as string;
  const categoriaId = parseInt(data.get('categoriaId') as string);
  const precoVista = parseFloat(data.get('precoVista') as string);
  const precoOriginalStr = data.get('precoOriginal') as string;
  const precoOriginal = precoOriginalStr ? parseFloat(precoOriginalStr) : null;
  const precoCustoStr = data.get('precoCusto') as string;
  const precoCusto = precoCustoStr ? parseFloat(precoCustoStr) : null;
  const quantidadeStr = data.get('quantidade') as string;
  const quantidade = quantidadeStr ? parseInt(quantidadeStr) : 1;
  const estoqueMinimoStr = data.get('estoqueMinimo') as string;
  const estoqueMinimo = estoqueMinimoStr ? parseInt(estoqueMinimoStr) : 2;
  const precoParcelado = (data.get('precoParcelado') as string) || null;
  const volume = (data.get('volume') as string) || null;
  const badge = (data.get('badge') as string) || null;
  let tipoDisponibilidade = (data.get('tipoDisponibilidade') as string) || 'PRONTA_ENTREGA';
  let previsaoEntrega = (data.get('previsaoEntrega') as string) || null;

  // Se o estoque físico for 0 ou negativo, vira automaticamente Sob Encomenda
  if (quantidade <= 0) {
    tipoDisponibilidade = 'ENCOMENDA';
    if (!previsaoEntrega || previsaoEntrega.includes('imediata') || previsaoEntrega.includes('Disponível')) {
      previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
    }
  }
  const descricao = (data.get('descricao') as string) || '';
  const fotoUrlDirect = (data.get('fotoUrlDirect') as string) || null;
  const disponivel = data.get('disponivel') === 'false' ? false : true;
  const destaque = data.get('destaque') === 'true';
  const novidade = data.get('novidade') === 'true';
  const subcategoria = (data.get('subcategoria') as string) || null;
  const sku = (data.get('sku') as string) || null;
  const codigoBarras = (data.get('codigoBarras') as string) || null;
  const fornecedorIdStr = data.get('fornecedorId') as string;
  const fornecedorId = fornecedorIdStr ? parseInt(fornecedorIdStr) : null;

  // Dados Olfativos (Perfumes/Fragrâncias)
  const familiaOlfativa = (data.get('familiaOlfativa') as string) || null;
  const notasSaidaStr = data.get('notasSaida') as string;
  const notasSaida = notasSaidaStr ? notasSaidaStr.split(/[,•;]/).map(s => s.trim()).filter(Boolean) : null;
  const notasCoracaoStr = data.get('notasCoracao') as string;
  const notasCoracao = notasCoracaoStr ? notasCoracaoStr.split(/[,•;]/).map(s => s.trim()).filter(Boolean) : null;
  const notasFundoStr = data.get('notasFundo') as string;
  const notasFundo = notasFundoStr ? notasFundoStr.split(/[,•;]/).map(s => s.trim()).filter(Boolean) : null;
  const acordesPrincipaisStr = data.get('acordesPrincipais') as string;
  const acordesPrincipais = acordesPrincipaisStr ? acordesPrincipaisStr.split(/[,•;]/).map(s => s.trim()).filter(Boolean) : null;
  const concentracao = (data.get('concentracao') as string) || null;
  const genero = (data.get('genero') as string) || null;
  const anoLancamento = data.get('anoLancamento') ? parseInt(data.get('anoLancamento') as string) : null;
  const descricaoFragrancia = (data.get('descricaoFragrancia') as string) || null;

  await prisma.$transaction(async (tx) => {
    const current = await tx.produto.findUnique({ where: { id } });
    if (!current) throw new Error("Produto não encontrado.");
    await changeFifoStock(tx, current, quantidade, 'AJUSTE_CADASTRO', precoCusto ?? Number(current.precoCusto ?? 0));
    const changed = await tx.produto.updateMany({
      where: { id, quantidade: current.quantidade },
      data: {
      nome,
      marca,
      categoriaId,
      precoVista,
      precoOriginal,
      precoCusto,
      quantidade,
      estoqueMinimo,
      precoParcelado,
      volume,
      badge,
      tipoDisponibilidade,
      previsaoEntrega,
      descricao,
      disponivel,
      destaque,
      novidade,
      subcategoria,
      sku,
      codigoBarras,
      fornecedorId,
      familiaOlfativa,
      notasSaida: notasSaida && notasSaida.length > 0 ? notasSaida : Prisma.DbNull,
      notasCoracao: notasCoracao && notasCoracao.length > 0 ? notasCoracao : Prisma.DbNull,
      notasFundo: notasFundo && notasFundo.length > 0 ? notasFundo : Prisma.DbNull,
      acordesPrincipais: acordesPrincipais && acordesPrincipais.length > 0 ? acordesPrincipais : Prisma.DbNull,
      concentracao,
      genero,
      anoLancamento,
      descricaoFragrancia
      }
    });
    if (changed.count !== 1) throw new Error("Estoque alterado por outra operação. Atualize o produto e tente novamente.");
    if (current.quantidade !== quantidade) {
      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: id,
          tipo: "AJUSTE",
          quantidade: quantidade - current.quantidade,
          quantidadeAnterior: current.quantidade,
          quantidadeNova: quantidade,
          motivo: "Ajuste pelo cadastro do produto",
          usuarioResponsavel: session.name
        }
      });
    }
  });

  if (fotoUrlDirect) {
    const existingFoto = await prisma.foto.findFirst({ where: { produtoId: id } });
    if (existingFoto) {
      await prisma.foto.update({ where: { id: existingFoto.id }, data: { url: fotoUrlDirect } });
    } else {
      await prisma.foto.create({ data: { url: fotoUrlDirect, produtoId: id } });
    }
  }

  const files = data.getAll('fotos') as File[];
  for (const file of files) {
    if (file && file.size > 0) {
      const url = await saveFile(file);
      await prisma.foto.create({ data: { url, produtoId: id } });
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteProduto(id: number) {
  await requireAdminAuth();
  await prisma.produto.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function duplicarProdutoAction(produtoId: number) {
  const session = await requireAdminAuth();
  const original = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: { fotos: true }
  });

  if (!original) throw new Error("Produto não encontrado");

  const duplicate = await prisma.produto.create({
    data: {
      nome: `${original.nome} (Cópia)`,
      marca: original.marca,
      categoriaId: original.categoriaId,
      descricao: original.descricao,
      precoVista: original.precoVista,
      precoOriginal: original.precoOriginal,
      precoCusto: original.precoCusto,
      quantidade: 1,
      lotesEstoque: initialFifoStock(1, Number(original.precoCusto ?? 0)),
      estoqueMinimo: original.estoqueMinimo,
      volume: original.volume,
      tipoDisponibilidade: original.tipoDisponibilidade,
      previsaoEntrega: original.previsaoEntrega,
      familiaOlfativa: original.familiaOlfativa,
      notasSaida: original.notasSaida ? original.notasSaida : Prisma.DbNull,
      notasCoracao: original.notasCoracao ? original.notasCoracao : Prisma.DbNull,
      notasFundo: original.notasFundo ? original.notasFundo : Prisma.DbNull,
      acordesPrincipais: original.acordesPrincipais ? original.acordesPrincipais : Prisma.DbNull,
      concentracao: original.concentracao,
      genero: original.genero,
      anoLancamento: original.anoLancamento,
      descricaoFragrancia: original.descricaoFragrancia,
      sku: `${original.sku || 'SKU'}-COPY-${Date.now().toString().slice(-3)}`,
      fornecedorId: original.fornecedorId,
      fotos: {
        create: original.fotos.map(f => ({ url: f.url }))
      }
    }
  });

  await prisma.estoqueMovimentacao.create({
    data: {
      produtoId: duplicate.id,
      tipo: 'ENTRADA',
      quantidade: 1,
      quantidadeAnterior: 0,
      quantidadeNova: 1,
      motivo: `Duplicação a partir do produto #${original.id}`,
      usuarioResponsavel: session.name
    }
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return duplicate;
}

// -------------------------------------------------------------
// ERP: GESTÃO DE ESTOQUE E MOVIMENTAÇÕES
// -------------------------------------------------------------

export async function movimentarEstoqueAction(
  produtoId: number,
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'DEVOLUCAO' | 'PERDA' | 'RESERVA',
  quantidade: number,
  motivo: string
) {
  const session = await requireAdminAuth();
  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) throw new Error("Produto não encontrado.");

  if (!Number.isSafeInteger(quantidade) || quantidade < (tipo === 'AJUSTE' ? 0 : 1)) throw new Error('Quantidade inválida.');
  if (['SAIDA', 'VENDA', 'PERDA'].includes(tipo) && quantidade > produto.quantidade) throw new Error('Quantidade de saída maior que o estoque disponível.');

  const qtdAnterior = produto.quantidade;
  let qtdNova = qtdAnterior;
  let reservadaNova = produto.quantidadeReservada;

  if (tipo === 'ENTRADA' || tipo === 'DEVOLUCAO') {
    qtdNova = qtdAnterior + Math.abs(quantidade);
  } else if (tipo === 'SAIDA' || tipo === 'VENDA' || tipo === 'PERDA') {
    qtdNova = Math.max(0, qtdAnterior - Math.abs(quantidade));
  } else if (tipo === 'AJUSTE') {
    qtdNova = Math.max(0, quantidade);
  } else if (tipo === 'RESERVA') {
    reservadaNova = Math.min(qtdAnterior, produto.quantidadeReservada + Math.abs(quantidade));
  }

  const diferenca = qtdNova - qtdAnterior;

  const updateData: {
    quantidade: number;
    quantidadeReservada: number;
    tipoDisponibilidade?: string;
    previsaoEntrega?: string;
  } = {
    quantidade: qtdNova,
    quantidadeReservada: reservadaNova
  };

  // Se o estoque físico zerou, muda automaticamente a tag para Sob Encomenda
  if (qtdNova <= 0) {
    updateData.tipoDisponibilidade = 'ENCOMENDA';
    updateData.previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
  } else if (qtdAnterior <= 0 && qtdNova > 0 && produto.tipoDisponibilidade === 'ENCOMENDA') {
    // Se estava zerado/encomenda e agora entrou estoque físico, muda automaticamente para Pronta Entrega
    updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
    updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
  }

  await prisma.$transaction(async (tx) => {
    await changeFifoStock(tx, produto, qtdNova, `MANUAL_${tipo}`);
    const changed = await tx.produto.updateMany({
      where: { id: produtoId, quantidade: qtdAnterior, quantidadeReservada: produto.quantidadeReservada },
      data: updateData
    });
    if (changed.count !== 1) throw new Error("Estoque alterado por outra operação. Consulte o saldo e tente novamente.");
    await tx.estoqueMovimentacao.create({
      data: {
        produtoId,
        tipo,
        quantidade: diferenca,
        quantidadeAnterior: qtdAnterior,
        quantidadeNova: qtdNova,
        motivo: motivo.trim() || `Movimentação manual (${tipo})`,
        usuarioResponsavel: session.name
      }
    });
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, qtdNova };
}

// -------------------------------------------------------------
// ERP: VENDAS / PDV
// -------------------------------------------------------------

export async function createVendaAction(data: Parameters<typeof createSale>[0]) {
  const session = await requireAdminAuth();
  return createSale(data, session.name);
}

export async function updateVendaAction(vendaId: number, data: Parameters<typeof updateSale>[1]) {
  const session = await requireAdminAuth();
  return updateSale(vendaId, data, session.name);
}

export async function updateVendaStatusAction(vendaId: number, novoStatus: string) {
  const session = await requireAdminAuth();
  return updateSaleStatus(vendaId, novoStatus, session.name);
}

export async function deleteVendaAction(vendaId: number) {
  const session = await requireAdminAuth();
  return deleteSale(vendaId, session.name);
}

// -------------------------------------------------------------
// ERP: ENCOMENDAS
// -------------------------------------------------------------

export async function createEncomendaAction(data: Parameters<typeof createCustomOrder>[0]) {
  await requireAdminAuth();
  return createCustomOrder(data);
}

export async function updateEncomendaStatusAction(encomendaId: number, status: string) {
  await requireAdminAuth();
  if (!['SOLICITACAO_RECEBIDA', 'AGUARDANDO_PAGAMENTO', 'PEDIDO_REALIZADO', 'EM_TRANSITO', 'RECEBIDO', 'PRONTO_ENTREGA', 'FINALIZADO', 'CANCELADO'].includes(status)) throw new Error('Status da encomenda inválido.');
  await prisma.encomenda.update({
    where: { id: encomendaId },
    data: { status }
  });
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteEncomendaAction(encomendaId: number) {
  await requireAdminAuth();
  await prisma.encomenda.delete({ where: { id: encomendaId } });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// ERP: COMPRAS E IMPORTAÇÕES MULTI-MOEDA
// -------------------------------------------------------------

export async function createCompraAction(data: Parameters<typeof createPurchase>[0]) {
  const session = await requireAdminAuth();
  return createPurchase(data, session.name);
}

export async function receberCompraAction(compraId: number) {
  const session = await requireAdminAuth();
  return receivePurchase(compraId, session.name);
}

export async function deleteCompraAction(compraId: number) {
  await requireAdminAuth();
  await prisma.$transaction(async tx => {
    const compra = await tx.compra.findUnique({ where: { id: compraId } });
    if (!compra) throw new Error('Compra não encontrada.');
    const movimento = await tx.estoqueMovimentacao.findFirst({ where: { compraId } });
    if (compra.status === 'RECEBIDO' || movimento) throw new Error('Compras com entrada no estoque não podem ser excluídas. O registro deve ser preservado para conferência.');
    const deleted = await tx.compra.deleteMany({ where: { id: compraId, updatedAt: compra.updatedAt, status: compra.status } });
    if (deleted.count !== 1) throw new Error('A compra foi alterada por outra operação. Atualize a página.');
  });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// ERP: CLIENTES
// -------------------------------------------------------------

export async function createClienteAction(data: {
  nome: string;
  whatsapp?: string;
  instagram?: string;
  email?: string;
  cidade?: string;
  dataNascimento?: string;
  observacoes?: string;
}) {
  await requireAdminAuth();
  const cliente = await prisma.cliente.create({
    data: {
      nome: data.nome.trim(),
      whatsapp: data.whatsapp?.trim() || null,
      instagram: data.instagram?.trim() || null,
      email: data.email?.trim() || null,
      cidade: data.cidade?.trim() || null,
      dataNascimento: data.dataNascimento?.trim() || null,
      observacoes: data.observacoes?.trim() || null
    }
  });
  revalidatePath('/admin');
  return cliente;
}

export async function updateClienteAction(id: number, data: {
  nome: string;
  whatsapp?: string;
  instagram?: string;
  email?: string;
  cidade?: string;
  dataNascimento?: string;
  observacoes?: string;
}) {
  await requireAdminAuth();
  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      nome: data.nome.trim(),
      whatsapp: data.whatsapp?.trim() || null,
      instagram: data.instagram?.trim() || null,
      email: data.email?.trim() || null,
      cidade: data.cidade?.trim() || null,
      dataNascimento: data.dataNascimento?.trim() || null,
      observacoes: data.observacoes?.trim() || null
    }
  });
  revalidatePath('/admin');
  return cliente;
}

export async function deleteClienteAction(id: number) {
  await requireAdminAuth();
  await prisma.cliente.delete({ where: { id } });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// ERP: FORNECEDORES
// -------------------------------------------------------------

export async function createFornecedorAction(data: {
  nome: string;
  contato?: string;
  cidadePais?: string;
  observacoes?: string;
}) {
  await requireAdminAuth();
  const fornecedor = await prisma.fornecedor.create({
    data: {
      nome: data.nome.trim(),
      contato: data.contato?.trim() || null,
      cidadePais: data.cidadePais?.trim() || null,
      observacoes: data.observacoes?.trim() || null
    }
  });
  revalidatePath('/admin');
  return fornecedor;
}

export async function updateFornecedorAction(id: number, data: {
  nome: string;
  contato?: string;
  cidadePais?: string;
  observacoes?: string;
}) {
  await requireAdminAuth();
  const fornecedor = await prisma.fornecedor.update({
    where: { id },
    data: {
      nome: data.nome.trim(),
      contato: data.contato?.trim() || null,
      cidadePais: data.cidadePais?.trim() || null,
      observacoes: data.observacoes?.trim() || null
    }
  });
  revalidatePath('/admin');
  return fornecedor;
}

export async function deleteFornecedorAction(id: number) {
  await requireAdminAuth();
  await prisma.fornecedor.delete({ where: { id } });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// ERP: DESPESAS FINANCEIRAS
// -------------------------------------------------------------

export async function createDespesaAction(data: {
  descricao: string;
  categoria: string;
  valor: number;
  data?: string;
  tipo?: string;
  pago?: boolean;
  formaPagamento?: string;
  observacoes?: string;
}) {
  await requireAdminAuth();
  if (!data.descricao?.trim() || !Number.isFinite(data.valor) || data.valor <= 0) throw new Error('Informe uma descrição e um valor positivo para a despesa.');
  if (data.data && !Number.isFinite(new Date(data.data).getTime())) throw new Error('Data da despesa inválida.');
  const despesa = await prisma.despesaFinanceira.create({
    data: {
      descricao: data.descricao.trim(),
      categoria: data.categoria || "OUTROS",
      valor: data.valor,
      data: data.data ? new Date(data.data) : new Date(),
      tipo: data.tipo || "DESPESA",
      pago: data.pago !== undefined ? data.pago : true,
      formaPagamento: data.formaPagamento || null,
      observacoes: data.observacoes?.trim() || null
    }
  });
  revalidatePath('/admin');
  return despesa;
}

export async function deleteDespesaAction(id: number) {
  await requireAdminAuth();
  await prisma.despesaFinanceira.delete({ where: { id } });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// BANNERS
// -------------------------------------------------------------

export async function createBanner(data: FormData) {
  await requireAdminAuth();
  const titulo = data.get('titulo') as string;
  const subtitulo = data.get('subtitulo') as string;
  const link = data.get('link') as string;
  const file = data.get('imagem') as File;
  const imagemUrlDirect = data.get('imagemUrlDirect') as string;
  
  let imagemUrl = imagemUrlDirect || '';
  if (file && file.size > 0) {
    imagemUrl = await saveFile(file);
  }

  if (imagemUrl) {
    await prisma.banner.create({ 
      data: { 
        imagemUrl, 
        titulo, 
        subtitulo, 
        link 
      } 
    });
    revalidatePath('/');
    revalidatePath('/admin');
  }
}

export async function deleteBanner(id: number) {
  await requireAdminAuth();
  await prisma.banner.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin');
}
