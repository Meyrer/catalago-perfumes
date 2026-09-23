-- Convert monetary values from binary floating point to fixed precision.
-- Existing values are rounded to the cent; PostgreSQL aborts the migration if any value exceeds Decimal(14,2).
ALTER TABLE "Produto"
  ALTER COLUMN "precoVista" TYPE DECIMAL(14,2) USING ROUND("precoVista"::numeric, 2),
  ALTER COLUMN "precoOriginal" TYPE DECIMAL(14,2) USING ROUND("precoOriginal"::numeric, 2),
  ALTER COLUMN "precoCusto" TYPE DECIMAL(14,2) USING ROUND("precoCusto"::numeric, 2);

ALTER TABLE "Compra"
  ALTER COLUMN "cotacao" DROP DEFAULT,
  ALTER COLUMN "frete" DROP DEFAULT,
  ALTER COLUMN "taxas" DROP DEFAULT,
  ALTER COLUMN "outrosCustos" DROP DEFAULT,
  ALTER COLUMN "custoTotalBRL" DROP DEFAULT,
  ALTER COLUMN "cotacao" TYPE DECIMAL(14,6) USING ROUND("cotacao"::numeric, 6),
  ALTER COLUMN "frete" TYPE DECIMAL(14,2) USING ROUND("frete"::numeric, 2),
  ALTER COLUMN "taxas" TYPE DECIMAL(14,2) USING ROUND("taxas"::numeric, 2),
  ALTER COLUMN "outrosCustos" TYPE DECIMAL(14,2) USING ROUND("outrosCustos"::numeric, 2),
  ALTER COLUMN "custoTotalBRL" TYPE DECIMAL(14,2) USING ROUND("custoTotalBRL"::numeric, 2),
  ALTER COLUMN "cotacao" SET DEFAULT 1.0,
  ALTER COLUMN "frete" SET DEFAULT 0.0,
  ALTER COLUMN "taxas" SET DEFAULT 0.0,
  ALTER COLUMN "outrosCustos" SET DEFAULT 0.0,
  ALTER COLUMN "custoTotalBRL" SET DEFAULT 0.0;

ALTER TABLE "CompraItem"
  ALTER COLUMN "valorUnitarioMoeda" TYPE DECIMAL(14,2) USING ROUND("valorUnitarioMoeda"::numeric, 2),
  ALTER COLUMN "custoUnitarioBRL" TYPE DECIMAL(14,2) USING ROUND("custoUnitarioBRL"::numeric, 2),
  ALTER COLUMN "custoTotalBRL" TYPE DECIMAL(14,2) USING ROUND("custoTotalBRL"::numeric, 2);

ALTER TABLE "Venda"
  ALTER COLUMN "desconto" DROP DEFAULT,
  ALTER COLUMN "frete" DROP DEFAULT,
  ALTER COLUMN "custoTotal" DROP DEFAULT,
  ALTER COLUMN "lucroTotal" DROP DEFAULT,
  ALTER COLUMN "subtotal" TYPE DECIMAL(14,2) USING ROUND("subtotal"::numeric, 2),
  ALTER COLUMN "desconto" TYPE DECIMAL(14,2) USING ROUND("desconto"::numeric, 2),
  ALTER COLUMN "frete" TYPE DECIMAL(14,2) USING ROUND("frete"::numeric, 2),
  ALTER COLUMN "valorTotal" TYPE DECIMAL(14,2) USING ROUND("valorTotal"::numeric, 2),
  ALTER COLUMN "custoTotal" TYPE DECIMAL(14,2) USING ROUND("custoTotal"::numeric, 2),
  ALTER COLUMN "lucroTotal" TYPE DECIMAL(14,2) USING ROUND("lucroTotal"::numeric, 2),
  ALTER COLUMN "desconto" SET DEFAULT 0.0,
  ALTER COLUMN "frete" SET DEFAULT 0.0,
  ALTER COLUMN "custoTotal" SET DEFAULT 0.0,
  ALTER COLUMN "lucroTotal" SET DEFAULT 0.0;

ALTER TABLE "VendaItem"
  ALTER COLUMN "precoUnitario" TYPE DECIMAL(14,2) USING ROUND("precoUnitario"::numeric, 2),
  ALTER COLUMN "custoUnitario" TYPE DECIMAL(14,2) USING ROUND("custoUnitario"::numeric, 2),
  ALTER COLUMN "lucroUnitario" TYPE DECIMAL(14,2) USING ROUND("lucroUnitario"::numeric, 2),
  ALTER COLUMN "subtotal" TYPE DECIMAL(14,2) USING ROUND("subtotal"::numeric, 2);

ALTER TABLE "Encomenda"
  ALTER COLUMN "valorAdiantamento" DROP DEFAULT,
  ALTER COLUMN "precoEstimado" TYPE DECIMAL(14,2) USING ROUND("precoEstimado"::numeric, 2),
  ALTER COLUMN "custoEstimado" TYPE DECIMAL(14,2) USING ROUND("custoEstimado"::numeric, 2),
  ALTER COLUMN "valorAdiantamento" TYPE DECIMAL(14,2) USING ROUND("valorAdiantamento"::numeric, 2),
  ALTER COLUMN "valorAdiantamento" SET DEFAULT 0.0;

ALTER TABLE "DespesaFinanceira"
  ALTER COLUMN "valor" TYPE DECIMAL(14,2) USING ROUND("valor"::numeric, 2);
