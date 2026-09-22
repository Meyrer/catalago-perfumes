const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedERP() {
  console.log('[SEED ERP] Iniciando população inicial do sistema de gestão...');

  // 1. Fornecedores
  const fornecedoresData = [
    {
      nome: 'Star Perfumes Miami LLC',
      contato: '+1 (305) 555-0199 / sales@starperfumesmiami.com',
      cidadePais: 'Miami, Estados Unidos',
      observacoes: 'Fornecedor principal de grifes francesas e americanas (Dior, YSL, Chanel, Tom Ford).'
    },
    {
      nome: 'Monalisa Perfumaria Importados',
      contato: '+595 61 500-123 / pedidos@monalisa.com.py',
      cidadePais: 'Ciudad del Este, Paraguai',
      observacoes: 'Distribuidor autorizado de marcas árabes (Lattafa, Armaf) e Brand Collection 25ml.'
    },
    {
      nome: 'Prestige Fragrances Brasil',
      contato: '(11) 98765-4321 / contato@prestigebrasil.com.br',
      cidadePais: 'São Paulo, Brasil',
      observacoes: 'Distribuidor nacional para reposições urgentes de pronta entrega e hidratantes Victoria’s Secret.'
    }
  ];

  const fornecedores = [];
  for (const f of fornecedoresData) {
    let forn = await prisma.fornecedor.findFirst({ where: { nome: f.nome } });
    if (!forn) {
      forn = await prisma.fornecedor.create({ data: f });
    }
    fornecedores.push(forn);
  }
  console.log(`[SEED ERP] ${fornecedores.length} fornecedores configurados.`);

  // 2. Associar fornecedor e gerar movimentação inicial para produtos existentes se ainda não tiver
  const produtos = await prisma.produto.findMany();
  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    const fornId = fornecedores[i % fornecedores.length].id;
    const skuCode = `ELG-${p.marca ? p.marca.substring(0, 3).toUpperCase() : 'PRF'}-${String(p.id).padStart(3, '0')}`;
    
    await prisma.produto.update({
      where: { id: p.id },
      data: {
        fornecedorId: fornId,
        sku: p.sku || skuCode,
        estoqueMinimo: p.estoqueMinimo || 2,
        novidade: i < 5 // Primeiros 5 como novidades
      }
    });

    const movCount = await prisma.estoqueMovimentacao.count({ where: { produtoId: p.id } });
    if (movCount === 0) {
      await prisma.estoqueMovimentacao.create({
        data: {
          produtoId: p.id,
          tipo: 'ENTRADA',
          quantidade: p.quantidade || 1,
          quantidadeAnterior: 0,
          quantidadeNova: p.quantidade || 1,
          motivo: 'Saldo inicial de implantação do sistema',
          usuarioResponsavel: 'Meyrer'
        }
      });
    }
  }
  console.log(`[SEED ERP] ${produtos.length} produtos atualizados com SKU, estoque mínimo e histórico inicial.`);

  // 3. Clientes
  const clientesData = [
    {
      nome: 'Dra. Mariana Siqueira',
      whatsapp: '11988887777',
      instagram: '@dra.marianasiqueira',
      email: 'mariana.siqueira@clinica.com.br',
      cidade: 'São Paulo - SP',
      dataNascimento: '1988-05-14',
      observacoes: 'Cliente VIP. Prefere fragrâncias florais e gourmands marcantes (Good Girl, Libre).'
    },
    {
      nome: 'Rodrigo Albuquerque',
      whatsapp: '21977776666',
      instagram: '@rodrigo.albuquerque',
      email: 'rodrigo.eng@gmail.com',
      cidade: 'Rio de Janeiro - RJ',
      dataNascimento: '1992-11-20',
      observacoes: 'Gosta de perfumes amadeirados e aromáticos (Sauvage, Terre d’Hermès).'
    },
    {
      nome: 'Camila Vasconcelos',
      whatsapp: '31999995555',
      instagram: '@camilavasc',
      email: 'camila.vasconcelos@advocacia.com',
      cidade: 'Belo Horizonte - MG',
      dataNascimento: '1995-03-08',
      observacoes: 'Compra frequentemente miniaturas da Brand Collection para viagem e presentes.'
    }
  ];

  const clientes = [];
  for (const c of clientesData) {
    let cli = await prisma.cliente.findFirst({ where: { nome: c.nome } });
    if (!cli) {
      cli = await prisma.cliente.create({ data: c });
    }
    clientes.push(cli);
  }
  console.log(`[SEED ERP] ${clientes.length} clientes cadastrados.`);

  // 4. Vendas Históricas (Últimos 15 dias)
  const vendasCount = await prisma.venda.count();
  if (vendasCount === 0 && produtos.length >= 3) {
    const hoje = new Date();
    
    // Venda 1 (Hoje)
    const p1 = produtos[0];
    const qtd1 = 1;
    const preco1 = p1.precoVista || 350;
    const custo1 = p1.precoCusto || 200;
    const lucro1 = preco1 - custo1;

    await prisma.venda.create({
      data: {
        numero: 'VND-1001',
        clienteId: clientes[0].id,
        data: hoje,
        status: 'PAGO',
        formaPagamento: 'PIX',
        subtotal: preco1,
        desconto: 0,
        frete: 0,
        valorTotal: preco1,
        custoTotal: custo1,
        lucroTotal: lucro1,
        observacoes: 'Entrega rápida via motoboy',
        usuarioResponsavel: 'Meyrer',
        itens: {
          create: [
            {
              produtoId: p1.id,
              quantidade: qtd1,
              precoUnitario: preco1,
              custoUnitario: custo1,
              lucroUnitario: lucro1,
              subtotal: preco1
            }
          ]
        }
      }
    });

    // Venda 2 (3 dias atrás)
    const p2 = produtos[1];
    const p3 = produtos[2];
    const data2 = new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000);
    const preco2 = (p2.precoVista || 280) + (p3.precoVista || 90);
    const custo2 = (p2.precoCusto || 160) + (p3.precoCusto || 45);
    const lucro2 = preco2 - custo2;

    await prisma.venda.create({
      data: {
        numero: 'VND-1002',
        clienteId: clientes[1].id,
        data: data2,
        status: 'PAGO',
        formaPagamento: 'CARTAO_CREDITO',
        subtotal: preco2,
        desconto: 20,
        frete: 25,
        valorTotal: preco2 - 20 + 25,
        custoTotal: custo2,
        lucroTotal: lucro2 - 20,
        observacoes: 'Combo importado + mini brand',
        usuarioResponsavel: 'Felipe',
        itens: {
          create: [
            {
              produtoId: p2.id,
              quantidade: 1,
              precoUnitario: p2.precoVista || 280,
              custoUnitario: p2.precoCusto || 160,
              lucroUnitario: (p2.precoVista || 280) - (p2.precoCusto || 160),
              subtotal: p2.precoVista || 280
            },
            {
              produtoId: p3.id,
              quantidade: 1,
              precoUnitario: p3.precoVista || 90,
              custoUnitario: p3.precoCusto || 45,
              lucroUnitario: (p3.precoVista || 90) - (p3.precoCusto || 45),
              subtotal: p3.precoVista || 90
            }
          ]
        }
      }
    });

    // Venda 3 (7 dias atrás)
    const data3 = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const p4 = produtos[3] || produtos[0];
    const preco4 = (p4.precoVista || 420);
    const custo4 = (p4.precoCusto || 260);

    await prisma.venda.create({
      data: {
        numero: 'VND-1003',
        clienteId: clientes[2].id,
        data: data3,
        status: 'PAGO',
        formaPagamento: 'PIX',
        subtotal: preco4,
        desconto: 0,
        frete: 0,
        valorTotal: preco4,
        custoTotal: custo4,
        lucroTotal: preco4 - custo4,
        observacoes: 'Primeira compra da cliente',
        usuarioResponsavel: 'Meyrer',
        itens: {
          create: [
            {
              produtoId: p4.id,
              quantidade: 1,
              precoUnitario: preco4,
              custoUnitario: custo4,
              lucroUnitario: preco4 - custo4,
              subtotal: preco4
            }
          ]
        }
      }
    });
    console.log('[SEED ERP] 3 vendas de demonstração registradas.');
  }

  // 5. Encomendas
  const encCount = await prisma.encomenda.count();
  if (encCount === 0) {
    await prisma.encomenda.create({
      data: {
        numero: 'ENC-501',
        clienteId: clientes[0].id,
        nomeCliente: 'Dra. Mariana Siqueira',
        whatsappCliente: '11988887777',
        descricaoItem: 'Tom Ford Lost Cherry EDP 50ml',
        marca: 'Tom Ford',
        volume: '50ml',
        quantidade: 1,
        precoEstimado: 1450,
        custoEstimado: 920,
        valorAdiantamento: 500,
        status: 'EM_TRANSITO',
        fornecedorId: fornecedores[0].id,
        previsaoChegada: 'Em 5 dias úteis',
        observacoes: 'Pedido enviado do fornecedor de Miami com código de rastreio.'
      }
    });

    await prisma.encomenda.create({
      data: {
        numero: 'ENC-502',
        clienteId: clientes[1].id,
        nomeCliente: 'Rodrigo Albuquerque',
        whatsappCliente: '21977776666',
        descricaoItem: 'Creed Aventus EDP 100ml',
        marca: 'Creed',
        volume: '100ml',
        quantidade: 1,
        precoEstimado: 2100,
        custoEstimado: 1350,
        valorAdiantamento: 700,
        status: 'PEDIDO_REALIZADO',
        fornecedorId: fornecedores[0].id,
        previsaoChegada: 'Em 10 a 12 dias',
        observacoes: 'Aguardando embarque no próximo lote internacional.'
      }
    });
    console.log('[SEED ERP] 2 encomendas ativas registradas.');
  }

  // 6. Despesas Financeiras
  const despCount = await prisma.despesaFinanceira.count();
  if (despCount === 0) {
    await prisma.despesaFinanceira.createMany({
      data: [
        {
          descricao: 'Sacolas rígidas pretas e fita de cetim com gravação dourada (500 un)',
          categoria: 'EMBALAGENS',
          valor: 380.0,
          tipo: 'DESPESA',
          pago: true,
          formaPagamento: 'PIX',
          observacoes: 'Embalagens premium para presentes de alta perfumaria'
        },
        {
          descricao: 'Anúncios direcionados Instagram / Meta Ads catálogo perfumes',
          categoria: 'MARKETING',
          valor: 250.0,
          tipo: 'DESPESA',
          pago: true,
          formaPagamento: 'CARTAO_CREDITO',
          observacoes: 'Campanha regional público classe A/B'
        }
      ]
    });
    console.log('[SEED ERP] Despesas operacionais registradas.');
  }

  console.log('[SEED ERP] Concluído com sucesso!');
}

seedERP()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
