# enkeeper

## reset database

rm -rf prisma@6.10.1/migrations
npx prisma@6.10.1 migrate reset
npx prisma@6.10.1 migrate dev --name name
npx prisma@6.10.1 migrate dev --name name --create-only
npx prisma@6.10.1 db seed

## update database

npx prisma@6.10.1 migrate dev --name [update-name]

## deploy database

npx prisma@6.10.1 generate
npx prisma@6.10.1 migrate deploy

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
