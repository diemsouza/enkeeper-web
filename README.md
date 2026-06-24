# fluizer-web

## Prisma

O Prisma Client e gerado em `prisma/client/` (gitignored). Todos os tipos e enums
do Prisma sao importados exclusivamente de `src/lib/prisma.ts`.

## reset database

rm -rf prisma/schema/migrations
npx prisma@7.0.0 migrate reset
npx prisma@7.0.0 migrate dev --name init
npx prisma@7.0.0 migrate dev --name name --create-only
npx prisma@7.0.0 db seed (never used)

## update database

npx prisma@7.0.0 migrate dev --name [update-name]

## deploy database

npx prisma@7.0.0 generate
npx prisma@7.0.0 migrate deploy

## Upstash localhost

```bash
npx @upstash/qstash-cli@latest dev -port=8081
```

Set local .env QSTASH_URL=https://127.0.0.1:8081

# Terminal 1: Next.js rodando

npm run dev

# Terminal 2: ngrok expondo a porta

ngrok http 3000

Example url: https://1bb0-187-56-243-58.ngrok-free.app
