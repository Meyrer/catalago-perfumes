# API administrativa

Base URL local: `http://localhost:3000/api/admin`

Base URL de produção: `https://perfumio.app/api/admin`

Configure `API_ADMIN_KEY` no ambiente do servidor com uma chave aleatória longa e mantenha-a privada. Envie-a em todas as chamadas administrativas:

```http
Authorization: Bearer SUA_API_ADMIN_KEY
Content-Type: application/json
```

Sem a chave configurada a API responde `503`; com uma chave ausente ou incorreta responde `401`. As respostas seguem `{ "success": true, "data": ... }` ou `{ "success": false, "error": "..." }`.

## Produtos

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/products?limit=100&cursor=123&categoriaId=2` | Lista produtos (até 200 por página). `nextCursor` é o último ID retornado. |
| POST | `/products` | Cadastra produto. |
| GET | `/products/{id}` | Consulta produto. |
| PATCH ou PUT | `/products/{id}` | Atualiza somente os campos enviados. |
| PUT | `/products/{id}/photos` | Substitui as fotos por `{ "fotos": ["https://..."] }`, de 1 a 10 URLs. |
| DELETE | `/products/{id}?confirm=true` | Exclui produto sem vínculos com vendas, compras ou encomendas; com vínculos retorna `409`. |

Exemplo de cadastro:

```json
{
  "nome": "Perfume Exemplo",
  "marca": "Marca Exemplo",
  "descricao": "Eau de parfum",
  "categoriaId": 1,
  "precoVista": 349.9,
  "precoOriginal": 399.9,
  "precoCusto": 180,
  "quantidade": 5,
  "estoqueMinimo": 2,
  "volume": "100ml",
  "tipoDisponibilidade": "PRONTA_ENTREGA",
  "destaque": false,
  "novidade": true,
  "familiaOlfativa": "Amadeirado",
  "notasSaida": ["Bergamota"],
  "notasCoracao": ["Rosa"],
  "notasFundo": ["Âmbar"],
  "acordesPrincipais": ["amadeirado", "cítrico"],
  "fotos": ["https://exemplo.com/perfume.jpg"]
}
```

Campos obrigatórios: `nome`, `marca`, `categoriaId` e `precoVista`. `fotos` aceita URLs HTTP/HTTPS; para envio de arquivo use antes um caminho público `/uploads/...` já existente. Ao criar, a API grava também a movimentação do estoque inicial. Para alterar o estoque após o cadastro, use os endpoints de estoque; PATCH/PUT de produto não aceita `quantidade` nem `quantidadeReservada`.

`disponivel: false` desativa o produto no catálogo sem excluir o histórico. O PATCH de produto acrescenta as fotos enviadas; para substituir a galeria use `PUT /products/{id}/photos`.

A listagem também aceita `q` (busca por nome, marca ou SKU), `marca` (nome completo, sem distinguir maiúsculas), `sku` (exato) e `disponivel=true|false`. Exemplo: `/products?marca=BRAND%20COLLECTION&disponivel=true`.

## Compras

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/purchases?month=2026-11&fornecedorId=1&status=RECEBIDO&limit=100&cursor=1` | Lista compras com fornecedor, itens e produtos. |
| POST | `/purchases` | Registra uma compra usando as regras de cálculo e estoque do painel. |
| GET | `/purchases/{id}` | Consulta a compra completa. |
| PATCH | `/purchases/{id}` | Edita `observacoes`, `data` e status sem recebimento. `updatedAt` é opcional para controle de concorrência. |
| POST | `/purchases/{id}/receive` | Recebe e dá entrada no estoque. Repetir em compra já recebida não duplica as unidades. Não recebe compra cancelada. |
| DELETE | `/purchases/{id}?confirm=true` | Exclui somente compra ainda não recebida. Compra recebida retorna `409` para preservar o histórico do estoque. |

Exemplo de registro:

```json
{
  "fornecedorId": 1,
  "moeda": "USD",
  "cotacao": 5.5,
  "status": "PENDENTE",
  "frete": 0,
  "taxas": 0,
  "outrosCustos": 0,
  "observacoes": "Frete registrado separadamente no DRE.",
  "itens": [{ "produtoId": 75, "quantidade": 2, "valorUnitarioMoeda": 7 }]
}
```

`itens` é obrigatório e aceita de 1 a 200 produtos distintos. Quantidades são inteiros positivos; valores unitários e custos são números não negativos. Moedas: `BRL`, `USD`, `EUR`. `BRL` usa cotação 1; moeda estrangeira exige cotação positiva. Status: `PENDENTE`, `EM_TRANSITO`, `RECEBIDO`, `CANCELADO`; padrão da API: `PENDENTE`. Frete, taxas e outros custos são em BRL e entram no rateio da compra.

`status: "RECEBIDO"` no cadastro dá entrada imediata no estoque e atualiza os custos. **Não use para registrar novamente mercadoria cuja entrada já ocorreu**: esse endpoint não concilia compras retroativas com movimentos preexistentes. Para uma compra pendente, use `/receive` apenas quando a mercadoria chegar. O PATCH não altera itens ou custos e não cancela/reabre compras recebidas. Despesas registradas separadamente no DRE não devem ser repetidas no frete da compra.

## Vendas

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/sales?month=2026-11&clienteId=1&status=PAGO&limit=100&cursor=1` | Lista vendas com cliente, itens e produtos. |
| POST | `/sales` | Registra venda e baixa estoque para qualquer status ativo, inclusive aguardando pagamento. |
| GET | `/sales/{id}` | Consulta detalhes, observações e `updatedAt`. |
| PUT | `/sales/{id}` | Edita a venda completa e ajusta o estoque pela diferença dos itens. Exige `data` e `updatedAt` obtido no GET. |
| PATCH | `/sales/{id}` | Edita apenas `{ "observacoes": "...", "updatedAt": "..." }`. `observacoes: null` limpa o texto. |
| PATCH | `/sales/{id}/status` | Altera `{ "status": "CANCELADO" }` com as regras de devolução/baixa do painel. |
| DELETE | `/sales/{id}?confirm=true` | Exclui venda permitida pelo painel, devolvendo estoque quando aplicável. Vendas com recebimentos registrados ou status `PAGO` não podem ser excluídas. |

```json
{
  "clienteId": 1,
  "formaPagamento": "PIX",
  "status": "PREPARANDO",
  "desconto": 0,
  "frete": 0,
  "observacoes": "Combinar retirada com o cliente.",
  "valorRecebido": 0,
  "itens": [{ "produtoId": 75, "quantidade": 1, "precoUnitario": 99.9 }]
}
```

Cliente avulso: omita `clienteId` e envie `nomeClienteAvulso` e `contatoClienteAvulso`. Pagamentos: `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `DINHEIRO`, `LINK_PAGAMENTO`. Status: `AGUARDANDO_PAGAMENTO`, `PAGO`, `PREPARANDO`, `ENVIADO`, `ENTREGUE`, `CANCELADO`; padrão: `PREPARANDO`. Não envie produtos duplicados; consolide a quantidade por produto. Desconto não pode superar o subtotal. Custos, totais e lucro são calculados pelo servidor.

PUT exige os campos do cadastro, `data` em ISO UTC e o `updatedAt` exato retornado pelo GET; omitir campos opcionais limpa/retorna seus valores padrão. Para cancelar ou reativar uma venda, use `/status`; não use o PUT para esse fluxo. Movimentações feitas pela API têm responsável `API`.

`valorRecebido` registra o valor efetivamente recebido, independentemente de envio ou entrega. Aceita número entre zero e o total da venda. Zero, valor em branco na interface e `null` enviado à API significam nenhum recebimento; `null` é normalizado para zero ao salvar. No POST, omitir registra zero, exceto quando o status explicitamente informado é `PAGO`, que registra o total. No PUT, omitir preserva o recebimento conhecido. Para marcar `PAGO`, confirme o total recebido; os outros status preservam o recebimento.

Regra atual: vendas antigas entregues, enviadas ou em preparação com recebimento vazio são pendentes, com zero recebido. Pagamentos antigos explicitamente registrados como `PAGO` continuam confirmados, preservando o histórico existente. Não há classificação, aviso ou filtro de pagamento a conferir.

Vendas, Financeiro e Dashboard usam a mesma base de vendas não canceladas do período. Total vendido = já recebido + falta receber, calculados em centavos. Encomendas e vendas de outros meses não entram no resumo do mês. Na Dashboard, o filtro mensal também vale para lucro, ticket, rankings e gráfico; estoque representa o saldo atual. Os valores recebidos são agrupados pelo mês da venda, conforme preferência da administração, e são valores registrados antes de despesas e taxas, sem integração automática com o banco.

O servidor mantém `historicoPagamentos` automaticamente, sem permitir reescrever eventos pelo payload. Cada aumento de `valorRecebido` registra somente a diferença como recebimento, com responsável, data e forma. Envie opcionalmente `dataPagamento` (ISO UTC) e `formaRecebimento` (mesmos valores de `formaPagamento`); os padrões são o momento do registro e a forma da venda. Reduções são correções, não estornos. Valores antigos já recebidos aparecem como saldo inicial sem inventar data ou forma anteriores. A ação de status `PAGO` também registra o saldo restante recebido.


## Encomendas

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/orders?month=2026-11&clienteId=1&fornecedorId=1&produtoId=75&limit=100` | Lista encomendas; também aceita `status` e `cursor`. |
| POST | `/orders` | Registra solicitação, sem movimentar estoque ou gerar venda. |
| GET | `/orders/{id}` | Consulta encomenda com cliente, fornecedor e produto. |
| PATCH | `/orders/{id}` | Edita `status`, `observacoes` e `previsaoChegada`; `updatedAt` opcional detecta edição concorrente. |
| DELETE | `/orders/{id}?confirm=true` | Exclui encomenda sem venda vinculada e sem adiantamento; caso contrário retorna `409`. |

Obrigatórios: `nomeCliente`, `descricaoItem`. Opcionais: `clienteId`, `whatsappCliente`, `produtoId`, `marca`, `volume`, `quantidade` (padrão 1), `precoEstimado`, `custoEstimado`, `valorAdiantamento` (padrão 0), `fornecedorId`, `previsaoChegada`, `observacoes`.

Status inicial: `SOLICITACAO_RECEBIDA`. Status aceitos no PATCH: `SOLICITACAO_RECEBIDA`, `AGUARDANDO_PAGAMENTO`, `PEDIDO_REALIZADO`, `EM_TRANSITO`, `RECEBIDO`, `PRONTO_ENTREGA`, `FINALIZADO`, `CANCELADO`. Mudar o status da encomenda não recebe compra nem registra venda automaticamente, conforme o funcionamento atual do painel.

As listagens de compras, vendas e encomendas retornam `{ "items": [...], "nextCursor": 123 }`. Use `nextCursor` na próxima chamada até retornar `null`. `limit` aceita 1 a 200; padrão 100. `month` filtra o mês em UTC no formato `YYYY-MM`; sem esse parâmetro, consulta todos os meses. Compras/vendas usam `data`; encomendas usam `createdAt`. Os filtros e paginação devem ser preservados entre chamadas.

## Arquivos de imagem

`POST /uploads`, com a mesma autenticação Bearer, recebe `multipart/form-data` com o campo `file`. Aceita JPEG, PNG e WebP até 10 MB; o MIME deve corresponder à assinatura do arquivo. SVG e nomes/caminhos fornecidos pelo cliente não são usados para salvar o arquivo.

Retorna `{ "path": "/uploads/api-....png", "url": "https://perfumio.app/api/uploads/api-....png", "contentType": "image/png", "size": 12345 }`. Use **`url`** em `PUT /products/{id}/photos`, no cadastro de produto ou em banners/categorias. Enviar arquivo não altera nenhum cadastro. O armazenamento usa `public/uploads`. O Compose do projeto monta esse diretório; deployments pelo Dockerfile no Coolify precisam de uma montagem própria em `/app/public/uploads`. Em 05/11/2026, a montagem de produção foi ativada no Coolify: `/data/coolify/applications/cqppw9xque03vw2r9wt9hk1q/uploads` → `/app/public/uploads`. Os 169 MB de arquivos foram preservados e tiveram integridade confirmada após o deploy.

`GET /api/uploads/{filename}` serve publicamente somente imagens com os nomes aleatórios gerados pelo upload autenticado. Isso permite mostrar fotos recém-enviadas sem reiniciar o Next.js para atualizar o inventário de arquivos estáticos. `path` identifica onde o arquivo foi salvo; não use esse campo como URL pública imediata.

```sh
curl -X POST "https://perfumio.app/api/admin/uploads" \
  -H "Authorization: Bearer $API_ADMIN_KEY" \
  -F "file=@foto.png;type=image/png"
```

## Categorias

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/categories` | Lista categorias. |
| POST | `/categories` | Cria `{ "nome": "Perfumes", "imagemUrl": "https://..." }`. |
| PATCH ou PUT | `/categories/{id}` | Atualiza nome e/ou `imagemUrl`. |
| DELETE | `/categories/{id}?confirm=true&targetCategoriaId=2` | Exclui; produtos são transferidos para o destino indicado ou para outra categoria existente. |

## Estoque

| Método | Caminho | Ação |
| --- | --- | --- |
| POST | `/stock/entry` | Entrada: `{ "produtoId": 1, "quantidade": 3, "motivo": "Reposição" }`. |
| POST | `/stock/exit` | Saída: mesma estrutura; rejeita quantidade maior que o saldo. |
| POST | `/stock/adjustment` | Define o saldo contado: `{ "produtoId": 1, "quantidade": 8, "motivo": "Inventário" }`. |
| GET | `/stock/movements?produtoId=1&limit=100` | Lista o histórico mais recente. |

Cada operação atualiza o produto e grava a movimentação na mesma transação. O estoque zerado marca o produto como `ENCOMENDA`; uma entrada em item nessa condição o marca como `PRONTA_ENTREGA`.

## Fornecedores e clientes

| Recurso | GET/POST | PATCH/PUT/DELETE |
| --- | --- | --- |
| Fornecedores | `/suppliers` | `/suppliers/{id}` |
| Clientes | `/customers?limit=100` e `/customers` | `/customers/{id}` |

Fornecedor: `nome` obrigatório; aceita `contato`, `cidadePais` e `observacoes`. Cliente: `nome` obrigatório; aceita `whatsapp`, `instagram`, `email`, `cidade`, `dataNascimento` e `observacoes`. Exclusões usam `?confirm=true` e retornam `409` se houver compras/encomendas ou vendas/encomendas vinculadas.

## Banners

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/banners` | Lista banners. |
| POST | `/banners` | Cria banner; `imagemUrl` é obrigatório. |
| PATCH ou PUT | `/banners/{id}` | Atualiza `imagemUrl`, `titulo`, `subtitulo` e/ou `link`. |
| DELETE | `/banners/{id}?confirm=true` | Exclui banner. |

Imagens aceitam URL HTTP/HTTPS ou caminho `/uploads/...`. Esta API recebe endereços de imagem, não upload de arquivo.

## Despesas

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/expenses?limit=100` | Lista as despesas mais recentes (até 200). |
| POST | `/expenses` | Registra uma despesa separada no DRE, sem alterar custos ou estoque dos produtos. |
| GET | `/expenses/{id}` | Consulta uma despesa. |
| PATCH | `/expenses/{id}` | Edita apenas os campos enviados: `descricao`, `categoria`, `valor`, `data`, `pago`, `formaPagamento`, `observacoes`. |
| DELETE | `/expenses/{id}?confirm=true` | Exclui a despesa confirmada. Não altera receitas extras. |

Campos obrigatórios: `descricao` e `valor` (número em reais, mínimo de R$ 0,01). Campos opcionais: `categoria` (`EMBALAGENS`, `FRETE`, `MARKETING`, `IMPOSTOS`, `ESTRUTURA` ou `OUTROS`, padrão `OUTROS`), `data` (ISO em UTC, padrão agora), `pago` (booleano, padrão `true`), `formaPagamento` e `observacoes`.

Exemplo de corpo para frete separado:

```json
{
  "descricao": "Barbara Freteira — Frete Brand Collection / Dora",
  "categoria": "FRETE",
  "valor": 571.55,
  "observacoes": "Frete registrado separadamente, sem rateio no custo dos perfumes."
}
```

## Exemplo com curl

```sh
curl -X POST "https://perfumio.app/api/admin/products" \
  -H "Authorization: Bearer $API_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  --data '{"nome":"Perfume Exemplo","marca":"Marca Exemplo","categoriaId":1,"precoVista":349.90,"quantidade":5}'
```

IDs de categoria e fornecedor podem ser consultados pelos respectivos endpoints `GET`. Exclusões sempre exigem `confirm=true`.


## FIFO e recebimentos por data

O estoque passou a usar FIFO, com saldo inicial ao custo cadastrado aprovado pela administração. `lotesEstoque` no produto e `lotesCusto` no item da venda são mantidos pelo servidor e não devem ser enviados em cadastros/PATCH. Compras recebidas e entradas criam lotes; vendas e saídas consomem os mais antigos. Alterações, cancelamentos e exclusões de venda devolvem os lotes correspondentes na mesma transação do estoque. Custos de vendas antigas permanecem registrados; a reativação de uma venda cancelada representa uma nova saída pelos lotes disponíveis.

O custo unitário de uma linha pode representar a média dos lotes efetivamente consumidos por essa linha. Para totalizar, arredonde `custoUnitario * quantidade`, e não o custo unitário antes de multiplicar. A avaliação do estoque deve somar os saldos e custos de cada lote, sem multiplicar o saldo inteiro pelo último custo de compra. Consulte [fifo-inventory.md](fifo-inventory.md).

O resumo financeiro tem dois critérios explícitos: vendas pela data da venda e recebimentos pela data de cada pagamento. O segundo inclui somente pagamentos com data registrada; valores antigos sem data ficam separados. As formas de pagamento são obtidas das parcelas do histórico, preservando os meios diferentes usados na mesma venda. Correções de valores não criam uma entrada/saída de caixa presumida.

`GET /api/erp/stock/history?month=2026-11&page=1&size=20` é o endpoint interno da tela de estoque, com autenticação por sessão administrativa. `month` vazio consulta todos os meses; `size` aceita 20 ou 50. Retorna os registros daquela página e o total filtrado. A autenticação Bearer de `/api/admin` permanece independente.
