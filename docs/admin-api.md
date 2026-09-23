# API administrativa

Base URL local: `http://localhost:3000/api/admin`

Base URL de produção: `https://perfumes.meyrer.com/api/admin`

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
| DELETE | `/products/{id}?confirm=true` | Exclui o produto e seus registros relacionados configurados em cascata. |

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

## Exemplo com curl

```sh
curl -X POST "https://perfumes.meyrer.com/api/admin/products" \
  -H "Authorization: Bearer $API_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  --data '{"nome":"Perfume Exemplo","marca":"Marca Exemplo","categoriaId":1,"precoVista":349.90,"quantidade":5}'
```

IDs de categoria e fornecedor podem ser consultados pelos respectivos endpoints `GET`. Exclusões sempre exigem `confirm=true`.
