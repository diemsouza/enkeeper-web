# CLAUDE.md

## O que e o projeto

**Dropuz** -- agente de pratica continua de ingles via WhatsApp para o mercado brasileiro.
O usuario manda o material da aula (texto, audio, imagem ou PDF) e recebe perguntas sobre aquele conteudo durante o dia, no WhatsApp.

Fontes de verdade:
- Produto e regras de negocio: `docs/Product-Brief.md` e `docs/Rules.md`
- Contexto geral: `README.md`

Stack: Next.js 15 App Router, Prisma 6, Supabase/PostgreSQL, TypeScript strict, Vercel.

## Regras de banco de dados

- Nunca acessar o banco diretamente (psql, db execute, SQL raw)
- Toda mudanca de schema vai em `prisma/schema/*`
- Rodar `npx prisma@6.10.1 migrate dev --name <name>` para aplicar; se for complexo ou arriscado, pedir ao usuario via `!`
- Nunca criar migration SQL manualmente salvo revisao explicita do dev

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

## Estrutura de diretorios

```
src/
  app/            -- Next.js App Router: pages e API routes
    api/
      cron/       -- activity, activity-ttl (+ develop-* variants)
      queue/      -- chat-dispatch, chat-compute, process-doc
      webhooks/   -- whatsapp inbound
      simulate/   -- disparo manual para dev
      users/      -- endpoints de conta
  components/     -- ui/ (shadcn), home/ (landing), shared/ (reutilizavel)
  core/           -- logica de dominio pura, zero I/O
  formats/        -- dados tipados por QuestionFormat (choice, gap_fill, recall, etc.)
  hooks/          -- custom React hooks
  i18n/ + locales/ -- next-intl: pt.json e en.json
  lib/            -- utilitarios puros: prisma.ts, llm-schemas.ts, prompts.ts, constants.ts
  repo/           -- queries Prisma, sem regra de negocio
  services/       -- orquestracao de negocio
  vendors/        -- clientes de APIs externas (llm, whatsapp, storage)
prisma/schema/    -- schemas por dominio: account.prisma, core.prisma
prompts/          -- arquivos .md de prompt por etapa LLM
email-templates/  -- Handlebars por locale (en/, pt/)
docs/             -- Product-Brief.md, Rules.md
```

### Camadas e regras

- `src/core/` nunca importa Prisma, fetch ou qualquer modulo Next.js
- `src/repo/` nunca contem regra de negocio -- so queries
- Todo acesso ao banco passa por `src/repo/`
- Route handlers sao finos: parse request, chama service, retorna response
- `src/vendors/` encapsula APIs externas; sem logica de negocio

## Padrao de arquitetura

**Inbound WhatsApp (QStash):**
`POST /api/webhooks/whatsapp` -> `POST /api/queue/chat-dispatch` -> `POST /api/queue/chat-compute`
Todas as rotas de fila validam assinatura Upstash.

**Processamento de documento:**
Upload -> `POST /api/queue/process-doc` -> `process-doc-service` -> `llm.vendor.ts` (extracao de secoes + geracao de perguntas)

**Cadencia de pratica:**
Vercel Cron bate em `/api/cron/activity` a cada intervalo; `activity-cron.service` envia a proxima pergunta pendente via WhatsApp.

**Auth:** NextAuth.js v5 com `@auth/prisma-adapter`. API routes usam validacao por API key.

**i18n:** next-intl PT-BR e EN-US. Strings de UI vao em `src/locales/pt.json` e `en.json`.

**Planos:** `User.planCode` (trial/pro) e `User.planStatus` controlam acesso. Trial = mesmas features do Pro com `planExpiresAt`. Ver limites em `src/lib/constants.ts`.

**Forms:** React Hook Form + Zod. Usar `safeCall()` de `src/lib/utils.ts` para chamadas async que retornam `[result, error]`.

## Data models

| Model          | Proposito                                                                             |
| -------------- | --------------------------------------------------------------------------------------|
| `User`         | Conta; `planCode`, `planStatus`, `planExpiresAt`, `locale`, `currency`                |
| `UserChannel`  | Canal conectado (whatsapp); `channelUserId`, `phoneNumber`                            |
| `Doc`          | Material enviado; `rawContent`, `content`, `docType`, `level`, `status`               |
| `Section`      | Secao do material (vocabulary/text/exercise); ligada ao `Doc`                         |
| `Question`     | Pergunta gerada; `questionFormat`, `answerKeys`, `questionOptions`, `status`          |
| `Activity`     | Sessao de pratica por `[userId, docId, date]`; `nextMessageAt`, cadencia              |
| `WeeklyReport` | Relatorio semanal enviado aos domingos                                                |
| `Message`      | Historico de mensagens WhatsApp; ligado a `Activity`                                 |
| `LlmUsage`     | Contabilidade de tokens por chamada (provider, model, tipo de uso)                    |
| `LlmLog`       | Payload completo de cada chamada LLM (input, output, durationMs, success, error)      |

## Sistema de formatos de pergunta

Formatos validos (`QuestionFormat` enum): `gap_fill`, `recall`, `recall_inverted`, `scenario`, `choice`, `open_text`, `open_question`.

Cada formato tem um arquivo em `src/formats/<format>.ts` exportando `QuestionFormatData`:

```typescript
type QuestionFormatData = {
  format: string;
  question_info?: string;   // instrucao adicional pro LLM gerar a pergunta
  feedback_info?: string;   // instrucao adicional pro LLM gerar o feedback
  levels: {
    basic: FormatLevel;
    intermediate: FormatLevel;
    advanced: FormatLevel;
  };
};
type FormatLevel = {
  question: string;    // exemplo de pergunta nesse nivel
  feedback: { right: string; wrong: string; partial?: string; };
};
```

Funcoes em `src/core/question-format.ts`:
- `getFormatsBySectionType(sectionType)` -- retorna formatos validos para o tipo de secao
- `getQuestionExamples(formats, level)` -- string formatada com exemplos de pergunta por formato
- `getFeedbackExamples(formats, level)` -- string formatada com exemplos de feedback por formato

O LLM decide o formato de cada pergunta no JSON de saida. O codigo nao faz rotacao manual.

**Choice shuffle:** opcoes sao embaralhadas uma vez antes de salvar no banco (`updateQuestion`). `formatChoiceQuestion` apenas aplica labels `a) b) c)` -- nao embaralha.

## LLM vendor

`src/vendors/llm.vendor.ts` centraliza todas as chamadas LLM:

| Funcao                    | Stage             | Modelo padrao      |
| ------------------------- | ----------------- | ------------------ |
| `generateDocSections`     | doc-extraction    | gpt-4.1-mini       |
| `generateSectionQuestions`| gen-{sectionType} | PROVIDER_STANDARD  |
| `generateAnswerEvaluation`| answer-evaluation | PROVIDER_STANDARD  |
| `extractTextFromImage`    | ocr               | gpt-4o-mini        |
| `extractTextFromPdf`      | --                | unpdf (sem LLM)    |

`PROVIDER_STANDARD` alterna entre `"anthropic"` (claude-haiku-4-5) e `"openai"` (gpt-4.1). Mudar a constante no topo do arquivo para trocar.

Schemas Zod para saidas estruturadas: `src/lib/llm-schemas.ts`.
Textos dos prompts: `prompts/*.md`, carregados em `src/lib/prompts.ts`.

## LLM logging

`src/services/llm-log-service.ts` registra cada chamada em `LlmLog`:
- `stage`, `provider`, `model`, `input` (system + prompt), `output` (raw text), `parsedOutput`, tokens, `durationMs`, `success`, `error`
- Falha no log nunca afeta o fluxo principal (catch silencioso)
- Desativar com `DISABLE_LLM_LOGS=true` ou `DISABLE_LLM_LOGS=1`

## Prompts

Cada prompt vive em `prompts/<etapa>.md`. Formato e convencoes em `prompts/standard.md`.

Arquivos de prompt ativos:
- `doc-extraction.md` -- extrai secoes do material
- `gen-vocabulary.md`, `gen-text.md`, `gen-exercise.md` -- geram perguntas por tipo de secao
- `answer-evaluation.md` -- avalia resposta do usuario e gera feedback
- `voice.md` -- persona e tom de voz (injetado nos prompts acima)

## Infra

- **Database:** PostgreSQL (Supabase em producao, docker-compose local)
- **Queue:** Upstash QStash para jobs assincronos
- **Storage:** Supabase Storage (uploads de arquivo)
- **Email:** Nodemailer + Handlebars templates
- **Deploy:** Vercel (producao); GitHub Actions auto-release em push para `main`

## Code style

### Geral

- TypeScript strict -- sem `any`, sem non-null assertion (`!`) sem comentario justificando
- Return types explicitos em todas as funcoes exportadas
- Named exports -- sem default exports exceto route handlers do Next.js
- Sem barrel files (index.ts re-exportando tudo) -- importar direto do arquivo
- Aspas duplas e ponto e virgula em todo o codigo

### Error handling

- Usar erros tipados de `src/lib/custom-errors.ts`
- Sem silent catches -- todo catch deve rethrow ou retornar erro significativo (excecao: llm-log-service)
- Route handlers sempre retornam response -- sem unhandled promise rejections

### Async

- Sempre await em chamadas Prisma -- sem floating promises
- async/await -- sem .then() chains

### Nomenclatura

- Arquivos: kebab-case (`docs.repo.ts`, `message-service.ts`)
- Classes/tipos: PascalCase
- Funcoes e variaveis: camelCase
- Constantes de config: UPPER_SNAKE_CASE
- Booleanos e funcoes booleanas: prefixo `can`, `is`, `has`

### Funcoes

- Single responsibility -- se precisa de comentario pra explicar o que faz, divide
- Maximo ~30 linhas por funcao
- Sem side effects em `src/core/` -- mesma entrada sempre produz mesma saida

### Prisma

- Sem `$queryRaw` salvo necessidade absoluta
- Sempre escopo por `userId` -- nunca busca sem filtro de usuario
- Usar `select` para buscar so os campos necessarios

### Comentarios

- Sem comentarios explicando o que o codigo faz -- codigo deve ser autoexplicativo
- Comentarios apenas para: TODOs, justificativa de regra de negocio nao obvia, quirks de API externa
- NUNCA use o -- (travessao) gerado por IA em nenhum lugar: texto, codigo, comentario ou doc

### Build

- Sempre rodar `npm run build` ao final e corrigir o que quebrar
