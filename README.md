This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API administrativa

Configure `API_ADMIN_KEY` no ambiente do servidor antes de usar os endpoints protegidos. No Docker Compose, defina também `ADMIN_SESSION_SECRET` e `API_ADMIN_KEY` no arquivo `.env` local, usando valores aleatórios fortes. Consulte [docs/admin-api.md](docs/admin-api.md) para autenticação, endpoints e exemplos de cadastro de produtos, categorias, estoque, fornecedores, clientes e banners.

O schema do banco é atualizado por migrations em `prisma/migrations`; o container executa `prisma migrate deploy` ao iniciar. Para bancos existentes que ainda não têm histórico de migrations, faça backup e, usando a imagem nova com o banco antigo ainda acessível, registre o baseline inicial uma vez antes de iniciar o serviço: `docker compose run --rm --no-deps --entrypoint node web node_modules/prisma/build/index.js migrate resolve --applied 20260923000000_initial --schema prisma/schema.prisma`. Em seguida, inicie o serviço; `migrate deploy` aplica as migrations seguintes. Bancos novos aplicam todas as migrations normalmente. A migration de valores monetários converte os valores existentes para centavos (arredondamento de duas casas); verifique valores fora do limite de `Decimal(14,2)` antes de implantá-la.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
