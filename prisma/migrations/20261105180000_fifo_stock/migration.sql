ALTER TABLE "Produto" ADD COLUMN "lotesEstoque" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "VendaItem" ADD COLUMN "lotesCusto" JSONB NOT NULL DEFAULT '[]';

-- Saldo inicial aprovado: custo cadastrado, sem reconstruir lotes ou vendas antigas.
UPDATE "Produto" SET "lotesEstoque" = jsonb_build_array(jsonb_build_object(
  'id', 'inicial-' || "id", 'ordem', 0, 'quantidade', "quantidade",
  'custoUnitario', ROUND(COALESCE("precoCusto", 0)::numeric, 2),
  'recebidoEm', NULL, 'origem', 'SALDO_INICIAL'
)), "updatedAt" = CURRENT_TIMESTAMP
WHERE "quantidade" > 0 AND "lotesEstoque" = '[]'::jsonb;
