# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Enkeeper is a SaaS note-taking platform that receives content through multiple messaging channels (WhatsApp, Telegram, Slack, Discord, SMS) and processes it with AI (transcription, OCR, summarization). Built with Next.js 15 App Router, TypeScript strict mode, and PostgreSQL + pgvector.

### Directory Structure

- `src/app/` — Next.js App Router pages and API routes. API routes live under `src/app/api/`.
- `src/components/` — UI organized into `ui/` (shadcn primitives), `home/` (landing page), `shared/` (reusable across app).
- `src/lib/` — Pure utilities: Prisma singleton (`prisma.ts`), TanStack Query setup, constants, Zod schemas for LLM outputs, helper functions.
- `src/services/` — Business logic: `ai-service.ts` (OpenAI via Vercel AI SDK), `llm-usage-service.ts` (token tracking), `user-service.ts`, `whatsapp-service.ts`.
- `src/hooks/` — Custom React hooks.
- `src/i18n/` + `src/locales/` — next-intl config with `pt.json` and `en.json` translation files.
- `prisma/schema/` — Split Prisma schema files per domain (account, billing, etc.).
- `email-templates/` — Handlebars templates per locale (`en/`, `pt/`).

### Key Patterns

**Async processing via QStash:** Inbound channel messages go through a two-step queue: `POST /api/queue/chat-dispatch` triggers a job, `POST /api/queue/chat-compute` executes it. All queue routes validate Upstash request signatures.

**AI integration:** `AiService` uses `@ai-sdk/openai` with structured outputs via Zod schemas (defined in `src/lib/llm-schemas.ts`). All AI calls are tracked in the `LlmUsage` model (input/output/cached tokens, provider, model, usage type).

**Auth:** NextAuth.js v5 (`@auth/prisma-adapter`). API routes use API key validation. The `SessionProvider` wraps the app in the root layout.

**i18n:** next-intl with PT-BR and EN-US. All user-facing strings go in `src/locales/pt.json` and `en.json`. Add translations to both files when adding new UI.

**Usage limits:** `DailyUsage` tracks note counts per user per day. `User.planCode` (free/pro) and `User.planStatus` gate features — check `src/lib/constants.ts` for plan limits.

**Forms:** React Hook Form + Zod validation. Use the `safeCall()` utility from `src/lib/utils.ts` for error-safe async calls that return `[result, error]` tuples.

### Data Models

| Model             | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `User`            | Core account; holds `planCode`, `planStatus`, `locale`, `currency`               |
| `UserChannel`     | One row per connected channel (whatsapp/telegram/slack/discord/sms)              |
| `Note`            | Stored note with `content` (processed), `rawContent` (transcript/OCR), `fileUrl` |
| `Tag` / `NoteTag` | User-defined tags; `Tag.noteCount` is a cached counter                           |
| `DailyUsage`      | Unique per `[userId, date]`; tracks daily note count                             |
| `LlmUsage`        | Per-call token accounting linked to user and optionally to a note                |

Billing models exist in `prisma/schema/billing.prisma` but are currently commented out.

### Infrastructure

- **Database:** PostgreSQL 16 with pgvector (`docker-compose.yml` for local dev)
- **Queue:** Upstash QStash for background job processing
- **Storage:** Supabase (file uploads)
- **Email:** Nodemailer with Handlebars templates
- **Deployment:** Docker standalone build; GitHub Actions auto-releases on push to `main` using version from `package.json`
