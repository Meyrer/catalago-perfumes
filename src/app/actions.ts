"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import { searchPerfume } from "@/services/perfumeApi";
import { loginAdmin, logoutAdmin, requireAdminAuth, changeAdminPassword } from "@/lib/auth";

export async function loginAdminAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const result = await loginAdmin(username, password);
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

  const count = await prisma.produto.count({ where: { categoriaId: id } });
  if (count > 0) {
    if (targetCategoriaId && targetCategoriaId !== id) {
      await prisma.produto.updateMany({
        where: { categoriaId: id },
        data: { categoriaId: targetCategoriaId }
      });
    } else {
      const otherCat = await prisma.categoria.findFirst({ where: { id: { not: id } } });
      if (otherCat) {
        await prisma.produto.updateMany({
          where: { categoriaId: id },
          data: { categoriaId: otherCat.id }
        });
      } else {
        throw new Error('Não é possível excluir a única categoria existente enquanto houver produtos nela.');
      }
    }
  }

  await prisma.categoria.delete({ where: { id } });
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
  await requireAdminAuth();
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

  await prisma.produto.update({
    where: { id },
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

  const diferenca = tipo === 'AJUSTE' ? qtdNova - qtdAnterior : (tipo === 'ENTRADA' || tipo === 'DEVOLUCAO' ? Math.abs(quantidade) : -Math.abs(quantidade));

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

  await prisma.$transaction([
    prisma.produto.update({
      where: { id: produtoId },
      data: updateData
    }),
    prisma.estoqueMovimentacao.create({
      data: {
        produtoId,
        tipo,
        quantidade: diferenca,
        quantidadeAnterior: qtdAnterior,
        quantidadeNova: qtdNova,
        motivo: motivo.trim() || `Movimentação manual (${tipo})`,
        usuarioResponsavel: session.name
      }
    })
  ]);

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, qtdNova };
}

// -------------------------------------------------------------
// ERP: VENDAS / PDV
// -------------------------------------------------------------

export async function createVendaAction(data: {
  clienteId?: number;
  nomeClienteAvulso?: string;
  contatoClienteAvulso?: string;
  itens: Array<{ produtoId: number; quantidade: number; precoUnitario: number }>;
  formaPagamento: string;
  desconto?: number;
  frete?: number;
  observacoes?: string;
  status?: string;
}) {
  const session = await requireAdminAuth();
  const { clienteId, nomeClienteAvulso, contatoClienteAvulso, itens, formaPagamento, observacoes } = data;
  const desconto = data.desconto || 0;
  const frete = data.frete || 0;
  const status = data.status || "PAGO";

  if (!itens || itens.length === 0) {
    throw new Error("Selecione pelo menos um produto para registrar a venda.");
  }

  // Buscar produtos no banco para checar estoque e custo
  const produtosIds = itens.map(i => i.produtoId);
  const produtosDB = await prisma.produto.findMany({
    where: { id: { in: produtosIds } }
  });

  const produtosMap = new Map(produtosDB.map(p => [p.id, p]));

  let subtotal = 0;
  let custoTotal = 0;

  for (const item of itens) {
    const p = produtosMap.get(item.produtoId);
    if (!p) throw new Error(`Produto #${item.produtoId} não encontrado.`);
    
    // Se for venda confirmada/paga, valida estoque disponível
    if (status === 'PAGO' && p.quantidade < item.quantidade) {
      throw new Error(`Estoque insuficiente para "${p.nome}". Disponível: ${p.quantidade} un.`);
    }

    const itemSubtotal = item.precoUnitario * item.quantidade;
    const itemCusto = (p.precoCusto || 0) * item.quantidade;

    subtotal += itemSubtotal;
    custoTotal += itemCusto;
  }

  const valorTotal = Math.max(0, subtotal - desconto + frete);
  const lucroTotal = (subtotal - desconto) - custoTotal;
  const numeroVenda = `VND-${Date.now().toString().slice(-5)}`;

  const venda = await prisma.venda.create({
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
      custoTotal,
      lucroTotal,
      observacoes: observacoes || null,
      usuarioResponsavel: session.name,
      itens: {
        create: itens.map(item => {
          const p = produtosMap.get(item.produtoId)!;
          const precoUnit = item.precoUnitario;
          const custoUnit = p.precoCusto || 0;
          return {
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: precoUnit,
            custoUnitario: custoUnit,
            lucroUnitario: precoUnit - custoUnit,
            subtotal: precoUnit * item.quantidade
          };
        })
      }
    }
  });

  // Se o status for PAGO ou ENVIADO, deduz automaticamente do estoque e gera movimentação
  if (status === 'PAGO' || status === 'ENVIADO' || status === 'PREPARANDO') {
    for (const item of itens) {
      const p = produtosMap.get(item.produtoId)!;
      const qtdAnterior = p.quantidade;
      const qtdNova = Math.max(0, qtdAnterior - item.quantidade);

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

      await prisma.produto.update({
        where: { id: item.produtoId },
        data: updateData
      });

      await prisma.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: 'VENDA',
          quantidade: -item.quantidade,
          quantidadeAnterior: qtdAnterior,
          quantidadeNova: qtdNova,
          motivo: `Venda #${numeroVenda}`,
          usuarioResponsavel: session.name,
          vendaId: venda.id
        }
      });
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
  return venda;
}

export async function updateVendaStatusAction(vendaId: number, novoStatus: string) {
  const session = await requireAdminAuth();
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true }
  });

  if (!venda) throw new Error("Venda não encontrada.");

  const statusAnterior = venda.status;

  // Se a venda estava AGUARDANDO_PAGAMENTO e agora foi confirmada, deduz do estoque
  if (
    (novoStatus === 'PAGO' || novoStatus === 'ENVIADO' || novoStatus === 'PREPARANDO') &&
    (statusAnterior === 'AGUARDANDO_PAGAMENTO')
  ) {
    for (const item of venda.itens) {
      const p = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (p) {
        const qtdAnterior = p.quantidade;
        const qtdNova = Math.max(0, qtdAnterior - item.quantidade);

        const updateData: {
          quantidade: number;
          tipoDisponibilidade?: string;
          previsaoEntrega?: string;
        } = { quantidade: qtdNova };

        if (qtdNova <= 0) {
          updateData.tipoDisponibilidade = 'ENCOMENDA';
          updateData.previsaoEntrega = 'Sob Encomenda • Próximo lote previsto em 7 a 12 dias';
        }

        await prisma.produto.update({
          where: { id: item.produtoId },
          data: updateData
        });

        await prisma.estoqueMovimentacao.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'VENDA',
            quantidade: -item.quantidade,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdNova,
            motivo: `Confirmação de pagamento da venda #${venda.numero}`,
            usuarioResponsavel: session.name,
            vendaId: venda.id
          }
        });
      }
    }
  }

  // Se a venda foi cancelada e antes deduziu estoque, devolve os itens ao estoque
  if (
    novoStatus === 'CANCELADO' &&
    (statusAnterior === 'PAGO' || statusAnterior === 'ENVIADO' || statusAnterior === 'PREPARANDO')
  ) {
    for (const item of venda.itens) {
      const p = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (p) {
        const qtdAnterior = p.quantidade;
        const qtdNova = qtdAnterior + item.quantidade;

        const updateData: {
          quantidade: number;
          tipoDisponibilidade?: string;
          previsaoEntrega?: string;
        } = { quantidade: qtdNova };

        if (qtdAnterior <= 0 && qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
          updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
          updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
        }

        await prisma.produto.update({
          where: { id: item.produtoId },
          data: updateData
        });
        await prisma.estoqueMovimentacao.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'DEVOLUCAO',
            quantidade: item.quantidade,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdNova,
            motivo: `Devolução por cancelamento da venda #${venda.numero}`,
            usuarioResponsavel: session.name,
            vendaId: venda.id
          }
        });
      }
    }
  }

  await prisma.venda.update({
    where: { id: vendaId },
    data: { status: novoStatus }
  });

  revalidatePath('/admin');
  return { success: true };
}

export async function deleteVendaAction(vendaId: number) {
  await requireAdminAuth();
  await prisma.venda.delete({ where: { id: vendaId } });
  revalidatePath('/admin');
}

// -------------------------------------------------------------
// ERP: ENCOMENDAS
// -------------------------------------------------------------

export async function createEncomendaAction(data: {
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
  await requireAdminAuth();
  const numero = `ENC-${Date.now().toString().slice(-4)}`;

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
  return enc;
}

export async function updateEncomendaStatusAction(encomendaId: number, status: string) {
  await requireAdminAuth();
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

export async function createCompraAction(data: {
  fornecedorId?: number;
  moeda: 'BRL' | 'USD' | 'EUR';
  cotacao: number;
  frete: number;
  taxas: number;
  outrosCustos: number;
  observacoes?: string;
  itens: Array<{ produtoId: number; quantidade: number; valorUnitarioMoeda: number }>;
  status?: string;
}) {
  const session = await requireAdminAuth();
  const { fornecedorId, moeda, cotacao, frete, taxas, outrosCustos, observacoes, itens } = data;
  const status = data.status || 'RECEBIDO';

  if (!itens || itens.length === 0) {
    throw new Error("Adicione pelo menos um item à compra.");
  }

  // Calcula subtotal na moeda original e em BRL
  let subtotalMoeda = 0;
  for (const it of itens) {
    subtotalMoeda += it.valorUnitarioMoeda * it.quantidade;
  }

  const subtotalBRL = subtotalMoeda * cotacao;
  const custosExtrasBRL = frete + taxas + outrosCustos;
  const custoTotalBRL = subtotalBRL + custosExtrasBRL;
  const numero = `COMP-${Date.now().toString().slice(-5)}`;

  // Rateio proporcional dos custos extras
  const compra = await prisma.compra.create({
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
          const itemValorBRL = (item.valorUnitarioMoeda * cotacao);
          const proporcao = subtotalBRL > 0 ? (itemValorBRL * item.quantidade) / subtotalBRL : 1 / itens.length;
          const custoExtraItem = (custosExtrasBRL * proporcao) / item.quantidade;
          const custoUnitFinal = itemValorBRL + custoExtraItem;
          
          return {
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitarioMoeda: item.valorUnitarioMoeda,
            custoUnitarioBRL: custoUnitFinal,
            custoTotalBRL: custoUnitFinal * item.quantidade
          };
        })
      }
    },
    include: { itens: true }
  });

  // Se o status for RECEBIDO, adiciona imediatamente ao estoque e atualiza preço de custo
  if (status === 'RECEBIDO') {
    for (const item of compra.itens) {
      const p = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (p) {
        const qtdAnterior = p.quantidade;
        const qtdNova = qtdAnterior + item.quantidade;

        const updateData: {
          quantidade: number;
          precoCusto: number;
          tipoDisponibilidade?: string;
          previsaoEntrega?: string;
        } = {
          quantidade: qtdNova,
          precoCusto: item.custoUnitarioBRL
        };

        if (qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
          updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
          updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
        }

        await prisma.produto.update({
          where: { id: item.produtoId },
          data: updateData
        });

        await prisma.estoqueMovimentacao.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'ENTRADA',
            quantidade: item.quantidade,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdNova,
            motivo: `Recebimento da Compra #${numero}`,
            usuarioResponsavel: session.name,
            compraId: compra.id
          }
        });
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
  return compra;
}

export async function receberCompraAction(compraId: number) {
  const session = await requireAdminAuth();
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { itens: true }
  });

  if (!compra) throw new Error("Compra não encontrada.");
  if (compra.status === 'RECEBIDO') return { success: true };

  for (const item of compra.itens) {
    const p = await prisma.produto.findUnique({ where: { id: item.produtoId } });
    if (p) {
      const qtdAnterior = p.quantidade;
      const qtdNova = qtdAnterior + item.quantidade;

      const updateData: {
        quantidade: number;
        precoCusto: number;
        tipoDisponibilidade?: string;
        previsaoEntrega?: string;
      } = {
        quantidade: qtdNova,
        precoCusto: item.custoUnitarioBRL
      };

      if (qtdNova > 0 && p.tipoDisponibilidade === 'ENCOMENDA') {
        updateData.tipoDisponibilidade = 'PRONTA_ENTREGA';
        updateData.previsaoEntrega = 'Disponível em estoque • Envio ou retirada imediata';
      }

      await prisma.produto.update({
        where: { id: item.produtoId },
        data: updateData
      });

      await prisma.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: 'ENTRADA',
          quantidade: item.quantidade,
          quantidadeAnterior: qtdAnterior,
          quantidadeNova: qtdNova,
          motivo: `Recebimento da Compra #${compra.numero}`,
          usuarioResponsavel: session.name,
          compraId: compra.id
        }
      });
    }
  }

  await prisma.compra.update({
    where: { id: compraId },
    data: { status: 'RECEBIDO' }
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteCompraAction(compraId: number) {
  await requireAdminAuth();
  await prisma.compra.delete({ where: { id: compraId } });
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
