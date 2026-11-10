ALTER TABLE "Compra"
  ADD COLUMN "valorPagoCaixa" DECIMAL(12, 2),
  ADD COLUMN "dataPagamentoCaixa" DATE,
  ADD CONSTRAINT "Compra_pagamento_caixa_valido" CHECK (
    ("valorPagoCaixa" IS NULL AND "dataPagamentoCaixa" IS NULL)
    OR ("valorPagoCaixa" IS NOT NULL AND "valorPagoCaixa" > 0 AND "dataPagamentoCaixa" IS NOT NULL)
  );
