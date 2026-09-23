-- Baseline schema matching the original Prisma schema before the financial precision migration.
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL, "nome" TEXT NOT NULL, "marca" TEXT NOT NULL, "descricao" TEXT NOT NULL,
    "precoVista" DOUBLE PRECISION NOT NULL, "precoOriginal" DOUBLE PRECISION, "precoCusto" DOUBLE PRECISION,
    "quantidade" INTEGER NOT NULL DEFAULT 1, "quantidadeReservada" INTEGER NOT NULL DEFAULT 0, "estoqueMinimo" INTEGER NOT NULL DEFAULT 2,
    "precoParcelado" TEXT, "volume" TEXT, "modoUso" TEXT, "caracteristicas" TEXT, "garantia" TEXT, "badge" TEXT,
    "disponivel" BOOLEAN NOT NULL DEFAULT true, "tipoDisponibilidade" TEXT NOT NULL DEFAULT 'PRONTA_ENTREGA', "previsaoEntrega" TEXT,
    "destaque" BOOLEAN NOT NULL DEFAULT false, "novidade" BOOLEAN NOT NULL DEFAULT false, "subcategoria" TEXT, "sku" TEXT, "codigoBarras" TEXT,
    "fornecedorId" INTEGER, "familiaOlfativa" TEXT, "notasSaida" JSONB, "notasCoracao" JSONB, "notasFundo" JSONB, "acordesPrincipais" JSONB,
    "concentracao" TEXT, "genero" TEXT, "anoLancamento" INTEGER, "descricaoFragrancia" TEXT, "longevidade" TEXT, "projecao" TEXT,
    "externalId" TEXT, "dataSource" TEXT DEFAULT 'local', "sourceUrl" TEXT, "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "importedAt" TIMESTAMP(3), "lastSyncedAt" TIMESTAMP(3), "categoriaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL, "nome" TEXT NOT NULL, "imagemUrl" TEXT,
    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Foto" (
    "id" SERIAL NOT NULL, "url" TEXT NOT NULL, "produtoId" INTEGER NOT NULL,
    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Banner" (
    "id" SERIAL NOT NULL, "imagemUrl" TEXT NOT NULL, "link" TEXT, "titulo" TEXT, "subtitulo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL, "username" TEXT NOT NULL, "name" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Fornecedor" (
    "id" SERIAL NOT NULL, "nome" TEXT NOT NULL, "contato" TEXT, "cidadePais" TEXT, "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EstoqueMovimentacao" (
    "id" SERIAL NOT NULL, "produtoId" INTEGER NOT NULL, "tipo" TEXT NOT NULL, "quantidade" INTEGER NOT NULL,
    "quantidadeAnterior" INTEGER NOT NULL, "quantidadeNova" INTEGER NOT NULL, "motivo" TEXT, "usuarioResponsavel" TEXT,
    "vendaId" INTEGER, "compraId" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstoqueMovimentacao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Compra" (
    "id" SERIAL NOT NULL, "numero" TEXT NOT NULL, "fornecedorId" INTEGER, "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDO', "moeda" TEXT NOT NULL DEFAULT 'BRL', "cotacao" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "frete" DOUBLE PRECISION NOT NULL DEFAULT 0.0, "taxas" DOUBLE PRECISION NOT NULL DEFAULT 0.0, "outrosCustos" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "custoTotalBRL" DOUBLE PRECISION NOT NULL DEFAULT 0.0, "observacoes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CompraItem" (
    "id" SERIAL NOT NULL, "compraId" INTEGER NOT NULL, "produtoId" INTEGER NOT NULL, "quantidade" INTEGER NOT NULL,
    "valorUnitarioMoeda" DOUBLE PRECISION NOT NULL, "custoUnitarioBRL" DOUBLE PRECISION NOT NULL, "custoTotalBRL" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL, "nome" TEXT NOT NULL, "whatsapp" TEXT, "instagram" TEXT, "email" TEXT, "cidade" TEXT,
    "dataNascimento" TEXT, "observacoes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL, "numero" TEXT NOT NULL, "clienteId" INTEGER, "nomeClienteAvulso" TEXT, "contatoClienteAvulso" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "status" TEXT NOT NULL DEFAULT 'PAGO', "formaPagamento" TEXT NOT NULL DEFAULT 'PIX',
    "subtotal" DOUBLE PRECISION NOT NULL, "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0.0, "frete" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorTotal" DOUBLE PRECISION NOT NULL, "custoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0, "lucroTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "observacoes" TEXT, "usuarioResponsavel" TEXT, "encomendaId" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VendaItem" (
    "id" SERIAL NOT NULL, "vendaId" INTEGER NOT NULL, "produtoId" INTEGER NOT NULL, "quantidade" INTEGER NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL, "custoUnitario" DOUBLE PRECISION NOT NULL, "lucroUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL, CONSTRAINT "VendaItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Encomenda" (
    "id" SERIAL NOT NULL, "numero" TEXT NOT NULL, "clienteId" INTEGER, "nomeCliente" TEXT NOT NULL, "whatsappCliente" TEXT,
    "produtoId" INTEGER, "descricaoItem" TEXT NOT NULL, "marca" TEXT, "volume" TEXT, "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoEstimado" DOUBLE PRECISION, "custoEstimado" DOUBLE PRECISION, "valorAdiantamento" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'SOLICITACAO_RECEBIDA', "fornecedorId" INTEGER, "previsaoChegada" TEXT, "observacoes" TEXT,
    "vendaId" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Encomenda_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DespesaFinanceira" (
    "id" SERIAL NOT NULL, "descricao" TEXT NOT NULL, "categoria" TEXT NOT NULL, "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "tipo" TEXT NOT NULL DEFAULT 'DESPESA', "pago" BOOLEAN NOT NULL DEFAULT true,
    "formaPagamento" TEXT, "observacoes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DespesaFinanceira_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE UNIQUE INDEX "Compra_numero_key" ON "Compra"("numero");
CREATE UNIQUE INDEX "Venda_numero_key" ON "Venda"("numero");
CREATE UNIQUE INDEX "Encomenda_numero_key" ON "Encomenda"("numero");
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstoqueMovimentacao" ADD CONSTRAINT "EstoqueMovimentacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendaItem" ADD CONSTRAINT "VendaItem_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendaItem" ADD CONSTRAINT "VendaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encomenda" ADD CONSTRAINT "Encomenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encomenda" ADD CONSTRAINT "Encomenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encomenda" ADD CONSTRAINT "Encomenda_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
