# CLAUDE.md

## O que é o projeto

**Dropuz** — agente de prática contínua de estudos via WhatsApp para o mercado brasileiro.
O usuário manda o material que está estudando (texto, áudio, imagem ou PDF) e recebe perguntas e diálogos sobre aquele conteúdo durante o dia, no WhatsApp.

Fontes de verdade do produto: `docs/*.md`

Stack: Next.js App Router, Prisma, Supabase/PostgreSQL, TypeScript, Vercel.

## Regras de banco de dados

- Nunca acessar o banco diretamente (psql, db execute, SQL raw)
- Toda mudança de schema vai em `prisma/schema/*`
- Rodar `npx prisma@6.10.1 migrate dev --name <name>` para aplicar e se tiver muita alteracao, estiver muito complexo ou tiver um risco algo, pedir para o usuário. (comando interativo — pedir ao usuário via `!` se o ambiente não tiver TTY)
- Nunca criar migration SQL manualmente salvo revisão explícita do dev

## Commands

```bash
# Development
npm run dev           # Start dev server (localhost)
npm run dev:open      # Start dev server (all interfaces, 0.0.0.0)

# Build & Production
npm run build         # prisma generate + next build
npm start             # Production server

# Linting
npm run lint          # ESLint via next lint

# Database (use exact prisma version)
npx prisma@6.10.1 migrate dev --name <name>        # Create and apply migration
npx prisma@6.10.1 migrate dev --name <name> --create-only  # Create migration only
npx prisma@6.10.1 migrate deploy                   # Apply migrations in production
npx prisma@6.10.1 migrate reset                    # Reset DB and re-apply all migrations
npx prisma@6.10.1 db seed                          # Seed database
npx prisma@6.10.1 generate                         # Regenerate Prisma client

# Local queue development
npx @upstash/qstash-cli@latest dev -port=8081
# Set QSTASH_URL=https://127.0.0.1:8081 in local .env
```

No test suite is configured.

## Architecture Overview

Dropuz is a SaaS study practice platform that receives content through WhatsApp, processes it with AI (transcription, OCR, topic extraction) and sends conversational practice messages back throughout the day. Built with Next.js 15 App Router, TypeScript strict mode, and PostgreSQL.

### Directory Structure

- `src/app/` — Next.js App Router pages and API routes. API routes live under `src/app/api/`.
- `src/components/` — UI organized into `ui/` (shadcn primitives), `home/` (landing page), `shared/` (reusable across app).
- `src/lib/` — Pure utilities: Prisma singleton (`prisma.ts`), TanStack Query setup, constants, Zod schemas for LLM outputs, helper functions.
- `src/services/` — Business logic: `ai-service.ts` (OpenAI via Vercel AI SDK), `llm-usage-service.ts` (token tracking), `user-service.ts`, `whatsapp-service.ts`.
- `src/hooks/` — Custom React hooks.
- `src/i18n/` + `src/locales/` — next-intl config with `pt.json` and `en.json` translation files.
- `prisma/schema/` — Split Prisma schema files per domain (`account.prisma`, `core.prisma`).
- `email-templates/` — Handlebars templates per locale (`en/`, `pt/`).
- `src/core/` — lógica de domínio pura, zero I/O
- `src/services/` — orquestração de negócio, chama repo + vendors + core
- `src/repo/` — queries Prisma, sem regra de negócio
- `src/vendors/` — clientes de APIs externas (OpenAI, Meta, S3, etc...)

## Regras de arquitetura

- `src/core/` nunca importa Prisma, fetch ou qualquer módulo Next.js
- `src/repo/` nunca contém regra de negócio
- Todo acesso ao banco passa por `src/repo/`
- Route handlers são finos — parse request, chama service, retorna response
- Vendors são stubs até implementação real — sempre com TODO comment

### Key Patterns

**Async processing via QStash:** Inbound channel messages go through a two-step queue: `POST /api/queue/chat-dispatch` triggers a job, `POST /api/queue/chat-compute` executes it. All queue routes validate Upstash request signatures.

**AI integration:** `AiService` uses `@ai-sdk/openai` with structured outputs via Zod schemas (defined in `src/lib/llm-schemas.ts`). All AI calls are tracked in the `LlmUsage` model (input/output/cached tokens, provider, model, usage type).

**Auth:** NextAuth.js v5 (`@auth/prisma-adapter`). API routes use API key validation. The `SessionProvider` wraps the app in the root layout.

**i18n:** next-intl with PT-BR and EN-US. All user-facing strings go in `src/locales/pt.json` and `en.json`. Add translations to both files when adding new UI.

**Plan limits:** `User.planCode` (trial/pro) and `User.planStatus` gate features — check `src/lib/constants.ts` for plan limits. Trial plan is the same of Pro but it has expiration date like 1 - 7 days; Pro = 5 docs per days.

**Forms:** React Hook Form + Zod validation. Use the `safeCall()` utility from `src/lib/utils.ts` for error-safe async calls that return `[result, error]` tuples.

### Data Models

| Model          | Purpose                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `User`         | Core account; holds `planCode`, `planStatus`, `locale`, `currency`                                         |
| `UserChannel`  | One row per connected channel (whatsapp)                                                                   |
| `Doc`          | Uploaded study material; holds `rawContent`, processed `content`, `topicsData` (JSON), `docType`, `status` |
| `Activity`     | One practice session per `[userId, docId, date]`; tracks `topicIndex`, `nextMessageAt`, cadence            |
| `WeeklyReport` | Weekly evolution summary sent to user every Sunday                                                         |
| `Message`      | WhatsApp message history; linked to `Activity` via `activityId`                                            |
| `LlmUsage`     | Per-call token accounting linked to user and optionally to a `Doc`                                         |

### Infrastructure

- **Database:** PostgreSQL with pgvector (`docker-compose.yml` for local dev)
- **Queue:** Upstash QStash for background job processing
- **Storage:** Supabase (file uploads)
- **Email:** Nodemailer with Handlebars templates
- **Deployment:** Docker standalone build; GitHub Actions auto-releases on push to `main` using version from `package.json`

## Code style

### Geral

- TypeScript strict — sem `any`, sem non-null assertion (`!`) sem comentário justificando
- Return types explícitos em todas as funções exportadas
- Named exports — sem default exports exceto route handlers do Next.js
- Sem barrel files (index.ts re-exportando tudo) — importar direto do arquivo

### Error handling

- Usar padrão de erros tipados de `src/lib/custom-errors.ts`
- Sem silent catches — todo catch deve rethrow ou retornar erro significativo
- Route handlers sempre retornam response — sem unhandled promise rejections

### Async

- Sempre await em chamadas Prisma — sem floating promises
- async/await — sem .then() chains

### Nomenclatura

- Arquivos: kebab-case (`docs.repo.ts`, `message-service.ts`)
- Classes/tipos: PascalCase
- Funções e variáveis: camelCase
- Constantes de config: UPPER_SNAKE_CASE (`FREE_LIMITS`)
- Booleanos e funções booleanas: prefixo `can`, `is`, `has`

### Funções

- Single responsibility — se precisa de comentário pra explicar o que faz, divide
- Máximo ~30 linhas por função
- Sem side effects em `src/core/` — mesma entrada sempre produz mesma saída

### Prisma

- Sem `$queryRaw` salvo necessidade absoluta
- Sempre escopo por `userId` — nunca busca sem filtro de usuário
- Usar `select` para buscar só os campos necessários

### Comentários

- Sem comentários explicando o que o código faz — código deve ser autoexplicativo
- Comentários apenas para: TODOs, justificativa de regra de negócio não óbvia, quirks de API externa
- Código precisa seguir o padrão, clean, aspas duplas e ponto e virgula no final.
- Sempre rode npm run build no final e ajuste o que tiver quebrado.
- Nuca use o — (travessão) em nenhum lugar, nem texto nem código nem comentário!
