# Estoque FIFO

Critério aprovado em 05/11/2026: primeiro entram, primeiro saem. O saldo existente começa como um lote inicial ao custo cadastrado, sem reconstruir compras ou alterar custos de vendas antigas.

## Funcionamento

- Cada cadastro, compra recebida ou entrada manual cria um lote com quantidade e custo. A ordem é a entrada efetiva no estoque, não a data editável da compra.
- Saídas usam os lotes mais antigos com saldo. O produto guarda os saldos em `lotesEstoque`; a venda guarda as unidades e custos consumidos em `lotesCusto` de cada item.
- Se uma linha consumir mais de um lote, seu custo unitário representa a média dos lotes dessa linha. O custo total usa os valores dos lotes e mantém os centavos; isso não transforma a regra de saída em custo médio do estoque.
- Aumentar a quantidade de uma venda consome novas unidades FIFO. Reduzir a quantidade devolve primeiro as últimas unidades consumidas por aquela venda. Cancelar devolve os lotes originais; reativar realiza uma nova saída FIFO pelo saldo disponível naquele momento.
- Vendas anteriores ao FIFO preservam o custo registrado. Se forem devolvidas, suas unidades formam um lote identificado como devolução de venda legada, pelo custo registrado naquela venda.
- Entradas e devoluções manuais sem vínculo com uma venda usam o custo de referência cadastrado. Para recuperar o custo original de uma venda, use a alteração/cancelamento da própria venda.
- Alterar o custo de referência no cadastro não reavalia lotes existentes. Esse valor continua sendo usado para novas entradas manuais e como referência quando não há estoque.
- Estoque e Dashboard calculam o valor investido pelos saldos dos lotes. A tabela de Estoque permite abrir “Lotes FIFO”. O custo unitário exibido para produtos com saldo é o do próximo lote a sair.
- Movimentação física, lotes e registro da venda/compra permanecem na mesma transação. Gravações concorrentes são rejeitadas para evitar sobrescrever saldos.
- Custos e lotes não são enviados ao catálogo público.

## Ativação

O schema e as migrations acompanham esta alteração. O Docker do projeto continua sincronizando o schema na inicialização e executa `scripts/init-fifo.js` antes de iniciar o servidor. Esse script prepara apenas produtos com estoque e sem lotes, de forma idempotente. Não reexecuta compras, não dá entrada em quantidades adicionais e não modifica vendas antigas.

A implementação está local; a preparação do estoque não foi executada no banco de produção nesta tarefa.

## Validação preparada

`tests/fifo-payments.test.cjs` cobre consumo entre lotes de custos diferentes, devolução parcial, cancelamento, centavos, saldo divergente, concorrência e separação de recebimentos antigos/novos. Execução: `node --test tests/fifo-payments.test.cjs`. Não é um teste de integração com a base de produção.

Validação local autorizada em 05/11/2026: 7 testes aprovados e checagem TypeScript sem erros. Não foi executado teste de integração com banco, nem ativação em produção.
