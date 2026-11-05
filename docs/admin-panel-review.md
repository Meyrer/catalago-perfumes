# Revisão do painel — 05/11/2026

Revisão estática dos cálculos, filtros e ações principais do painel. As alterações estão locais. Após autorização, a checagem TypeScript passou e os 7 testes focados de FIFO/pagamentos passaram. Não foram executados build, lint, testes de integração com banco ou alterações nos dados comerciais de produção. Esta revisão não garante ausência de outras falhas.

## Falhas corrigidas

| Área | Problema identificado | Correção |
| --- | --- | --- |
| Dashboard | Totais e rankings contavam apenas vendas quitadas, divergindo de Vendas e Financeiro | Considerar vendas não canceladas; identificar os valores como vendido, sem confundir com recebido |
| Dashboard | Filtro do mês sem limite superior e gráfico com exclusão dos últimos milissegundos do dia | Usar o mesmo mês de São Paulo da tela de Vendas; limite diário exclusivo no início do dia seguinte |
| Dashboard e Relatórios | Valores por produto e categoria ignoravam descontos | Ratear descontos em centavos, preservando o total; indicar que esses valores de produtos não incluem frete |
| Relatórios | Vendas em preparação/aguardando pagamento eram excluídas mesmo já tendo sido registradas e baixadas do estoque | Usar vendas não canceladas do período |
| Clientes | Métricas de compras dependiam de pagamento/entrega, omitindo outros pedidos válidos | Usar todas as compras não canceladas e chamar a métrica de total em compras |
| Fornecedores | Compras canceladas inflavam o total; produtos inativos eram contados como ativos | Excluir compras canceladas e contar somente produtos ativos |
| Produtos e Estoque | Mínimo de estoque zero era substituído por dois; editar o produto podia trocar esse zero | Preservar zero com fallback apenas para valor ausente |
| Estoque | Filtro Sem Estoque omitia produtos automaticamente convertidos para Sob Encomenda após a última venda | Filtrar pela quantidade zero, independentemente da disponibilidade comercial |
| Cadastros | Números de venda/compra repetiam a cada 100 segundos e encomendas a cada 10 segundos | Gerar novos números com timestamp e sufixo aleatório; preservar os códigos existentes |
| Vendas e Compras | Ações do painel não tinham todas as validações já existentes nos endpoints | Validar status, formas/moedas, produtos duplicados e desconto maior que subtotal no servidor; avisar duplicidade no formulário de compra |
| Encomendas e Despesas | Valores, quantidade, descrição/data e status podiam chegar inválidos às ações do servidor | Acrescentar validações nas ações responsáveis |
| Compras | A ação de exclusão permitia remover o registro de uma compra recebida, mantendo o estoque sem a compra correspondente | Bloquear exclusão de compras recebidas ou com movimentação de estoque; conferir concorrência ao excluir |
| Histórico de pagamento | Ao marcar explicitamente para conferência, o status antigo podia continuar indicando zero recebido | Respeitar a marcação explícita do histórico antes de aplicar o fallback de dados antigos |
| CSV | Aspas em nomes quebravam colunas; textos podiam ser interpretados como fórmulas | Escapar textos exportados e liberar a URL temporária após o download |

## Ajustes adicionais implementados

1. **FIFO aprovado:** saldo atual vira lote inicial pelo custo cadastrado, sem alterar custos de vendas antigas. Compras, saídas, alterações de venda e devoluções usam os lotes. Detalhes em [fifo-inventory.md](fifo-inventory.md).
2. **Recebimentos por data:** o Financeiro permite alternar entre vendas do período e recebimentos pela data de cada pagamento. Saldos antigos sem data ficam fora do resumo por data e são identificados separadamente. Despesas pagas usam a data do lançamento, pois não há data específica de quitação de despesas.
3. **Pagamentos mistos:** o agrupamento usa a forma registrada em cada parcela. Correções que deixam a distribuição anterior sem comprovação são mostradas sem data/forma atribuída, em vez de supor um recebimento.
4. **Histórico de estoque paginado no servidor:** novo endpoint autenticado, páginas de 20 ou 50 registros, filtro mensal e índice por data/id. A página administrativa não baixa mais todas as movimentações. Também foram retiradas relações de vendas/encomendas carregadas em duplicidade dentro dos clientes. Vendas e compras ainda são carregadas para os indicadores e relatórios; sua agregação e paginação integral no servidor continuam como evolução de escala, sem truncar totais existentes.
5. **Categorias:** transferência de produtos e exclusão passaram a ocorrer na mesma transação serializável.
6. **Importação de perfumes:** o endpoint de criação exige sessão administrativa e inicializa os lotes FIFO.
7. **Construção do container:** `.dockerignore` evita enviar arquivos temporários, dependências locais e arquivos de ambiente para o contexto de build.

## Persistência das imagens na VPS

O `docker-compose.yml` foi conferido: ele já monta `./public/uploads` em `/app/public/uploads`. Isso persiste as imagens fora do container quando esse Compose é usado. Foi conferido no Coolify e por `docker inspect`: a aplicação em produção usa build por Dockerfile, sem volumes (`Mounts: []`), portanto o volume do Compose não se aplica a esse deploy. Foi preservada uma cópia de 169 MB das imagens na pasta `/data/coolify/applications/cqppw9xque03vw2r9wt9hk1q/uploads`, fora do container. O checksum agregado SHA-256 da origem e da cópia é idêntico: `30a92815fa1fc2f770003a6b5e2e69b4c6ab3ade0030d51821b616f94020301e`. A pasta preserva o acesso do aplicativo (1001:1001, 755). Após autorização, a cópia foi atualizada e a montagem em `/app/public/uploads` foi salva e ativada com o deploy `wfvkvpwlkdjgm5t208vf6s9s`. O novo container `cqppw9xque03vw2r9wt9hk1q-20261105T194814` confirmou um bind mount de leitura/escrita para essa pasta. O checksum agregado permaneceu idêntico após o deploy; a pasta é gravável pelo aplicativo. O site e uma foto pública responderam HTTP 200. Foi reutilizada a mesma imagem/commit de produção `5a0ea6f896214fad59a48d824d8ff2be9d87473d`; os ajustes locais de FIFO/financeiro não foram publicados.

## Situação da validação

Após autorização, `node --test tests/fifo-payments.test.cjs` passou: 7 testes, nenhuma falha. A checagem `tsc --noEmit --incremental false` passou após corrigir o uso das vendas do cliente, o campo de disponibilidade e a tipagem do cadastro de produtos. O cliente Prisma foi gerado localmente após a alteração do schema. Não houve migração nem alteração de dados de produção.

## Critérios financeiros preservados

- Entrega não comprova pagamento.
- Total vendido = recebido confirmado + saldo confirmado + valores a conferir, para o mesmo conjunto de vendas.
- Canceladas ficam fora dos totais de vendas e compras.
- O resultado financeiro considera vendas e custos do período, não representa caixa disponível.
- Valores antigos sem comprovação não foram preenchidos por suposição.
