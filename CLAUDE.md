# CLAUDE.md

## O que e o projeto

**Fluizer** -- agente de pratica continua de ingles via WhatsApp para o mercado brasileiro.
O usuario manda o conteúdo da aula (texto, imagem ou PDF) e recebe perguntas sobre aquele conteudo durante o dia, no WhatsApp.

Fontes de verdade:
- Produto e regras de negocio e do produto: `docs/Product-Brief.md` e `docs/Product-Rules.md`
- Backlog macro: `docs/Product-Backlog.mg`
- Contexto geral: `README.md`

Stack: Next.js 15 App Router, Prisma 7, Supabase/PostgreSQL, TypeScript strict, Vercel.

## Regras de git

- Nunca fazer `git commit` nem `git push`, nem quando a tarefa pedir commits separados. O dev revisa e commita tudo.
- Deixar todas as mudancas no working tree, sem stage, para o dev comparar no VS Code. Arquivo novo fica untracked.
- Quando a tarefa tiver partes independentes, listar no resumo final quais arquivos sao de cada parte, para o dev montar os commits.

## Regras de banco de dados

- Nunca acessar o banco diretamente (psql, db execute, SQL raw)
- Toda mudanca de schema vai em `prisma/schema/*`
- Rodar `npx prisma@7.0.0 migrate dev --name <name>` para aplicar; se for complexo ou arriscado, pedir ao usuario via `!`
- Nunca criar migration SQL manualmente salvo revisao explicita do dev
- Siga o padrão do que já existe, id é ulid, nome camelCase e @map("snake_case")

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
npx prisma@7.0.0 migrate dev --name <name>        # Create and apply migration
npx prisma@7.0.0 migrate dev --name <name> --create-only  # Create migration only
npx prisma@7.0.0 migrate deploy                   # Apply migrations in production
npx prisma@7.0.0 migrate reset                    # Reset DB and re-apply all migrations
npx prisma@7.0.0 db seed                          # Seed database
npx prisma@7.0.0 generate                         # Regenerate Prisma client (output: prisma/client/)

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
      cron/       -- activity, activity-ttl
      queue/      -- chat-dispatch, chat-compute, process-doc
      webhooks/   -- whatsapp inbound
      users/      -- endpoints de conta
      waitlist/   -- cadastro de lista de espera
  components/     -- ui/ (shadcn), home/ (landing), shared/ (reutilizavel)
  core/           -- logica de dominio pura, zero I/O
  hooks/          -- custom React hooks
  i18n/ + locales/ -- next-intl: pt.json e en.json
  lib/            -- utilitarios puros: prisma.ts (unico ponto de acesso ao Prisma Client e tipos), llm-schemas.ts, prompts.ts, constants.ts
  repo/           -- queries Prisma, sem regra de negocio
  services/       -- orquestracao de negocio
  vendors/        -- clientes de APIs externas (llm, whatsapp, storage)
prisma/schema/    -- schemas por dominio: account.prisma, core.prisma
prisma/client/    -- Prisma Client gerado (gitignored, gerado via prisma generate)
prompts/          -- arquivos .md de prompt por etapa LLM
docs/             -- Product-Brief.md, Product-Rules.md, Product-Backlog.md
```

### Camadas e regras

- `src/core/` nunca importa diretamente de `@prisma/client` ou do client gerado -- tipos Prisma devem vir de `src/lib/prisma.ts`
- `src/core/` nunca importa `prisma` (o singleton client), fetch ou qualquer modulo Next.js
- `src/repo/` nunca contem regra de negocio -- so queries
- Todo acesso ao banco passa por `src/repo/`
- Route handlers sao finos: parse request, chama service, retorna response
- `src/vendors/` encapsula APIs externas; sem logica de negocio

## Padrao de arquitetura

**Inbound WhatsApp (QStash):**
`POST /api/webhooks/whatsapp` -> `POST /api/queue/chat-dispatch` -> `POST /api/queue/chat-compute`
Todas as rotas de fila validam assinatura Upstash.

**Processamento de documento:**
Upload -> `POST /api/queue/process-doc` -> `process-doc-service` -> `llm.vendor.ts` (extracao de vocabulario + geracao de perguntas)

**Nova atividade (modal):** toda atividade nasce em `NewActivityModal` (`src/components/app/new-activity-modal.tsx`, aberta por `useNewActivity().openNewActivity()` de `NewActivityProvider`). O comando `new_activity` (texto, voz, aliases como o botao "Criar atividade", sidebar) passa pelo chat como qualquer comando; a resposta e uma mensagem de comando (`open_create_activity`), sem balao, que abre a modal (ver "Mensagem de comando" abaixo). O card de `formatCreateActivityPrompt` fica so no convite iniciado pelo sistema. O clipe do composer abre direto na tela de material. Texto: `POST /api/app/activities` com `source: "text"` -> `prepareTextActivity` (`new-activity-service.ts`: plano, cap, trava, `generateActivityRequest` pulado para sugestao de `TOPIC_SUGGESTIONS` nao editada, `resolveActivityRequest` de `src/core/activity-request.ts`) e `createTextActivity` em `after()` (subtopicos, `generateFocusContent`, arquiva a anterior so com conteudo pronto, "Pronto" com nivel e foco, primeira pergunta). Material: cada arquivo por `POST /api/app/activities/material/extract` (`material-extract-service.ts`, imagem vira `Media` com `messageId` pre-gerado), depois `source: "material"` -> `prepareMaterialActivity` + `mergeDoc` em `after()`. Falha da geracao manda `formatActivityCreationFailed` com o botao `RETRY_NEW_ACTIVITY_BUTTON_ID`, enviado pelo chat com `buttonId` e tratado por `retryActivityCreation` em `message-service.ts` (pedido em `users.metadata.lastActivityRequest`). Toda modal (Dialog, AlertDialog, Drawer) segue `MODAL_*_CLASS` de `src/components/ui/dialog.tsx` (centralizada, `rounded-modal`); `DialogContent` com `isFullScreenOnMobile` vira tela cheia abaixo de `sm` (hoje so a `NewActivityModal`); ver "Escala de UI".

**Mensagem de comando (servidor controla o front):** `sendCommand({ userId, command })` (`message-sender-service.ts`) grava `Message` com `intent: "client_command"`, `content: ""` e `metadata.command = { action, payload, replyTo }` (tipos em `src/types/client-command.ts`, parse em `src/core/client-command.ts`). Nao passa pelo canal; chega pelo trigger do Realtime. No front, `Message.command` nunca vira balao e `LiveThreadClient` executa o handler da action so quando `consumeSentInSession(replyTo)` (`src/lib/session-sent-messages.ts`) confirma um envio desta aba. Nova action: tipo em `ClientCommandPayloads`, schema em `PAYLOAD_SCHEMAS`, handler no mapa do `LiveThreadClient`. Actions hoje: `open_create_activity`, `open_support` e `open_level` (todas enviadas por `sendOpenCommand` em `message-service.ts`). Onboarding termina com `formatCreateActivityPrompt`, sem pergunta de nivel. Ver Product-Rules Secao 15.

**Cadencia de pratica:**
Vercel Cron bate em `/api/cron/activity` a cada intervalo; `activity-cron.service` envia a proxima pergunta pendente via WhatsApp.

**Auth:** sessao propria em JWT (`fz_session`, `src/core/session-token.ts`), gravada so por `setSessionCookie`/`writeSessionCookies`. Login por codigo no WhatsApp (`/api/auth/otp/*`, `wa_token` em `/api/auth/wa-login`) e com Google (`/api/auth/google/start` e `/callback`, `google-login-service.ts`, `google-oauth.vendor.ts` com `google-auth-library`; conta achada por `users.email`, so e-mail verificado, em minusculas; sem ID do provedor). O callback redireciona para `/login/google`, que dispara `sign_up`/`login` no GTM. Navegador embutido: `src/core/embedded-browser.ts`, checado so no clique do Google. O NextAuth em `src/auth.ts` nao esta em uso. API routes usam validacao por API key.

**Numero em conta sem telefone:** `PhoneConfirmModal` (`src/components/shared/phone-confirm-modal.tsx`, titulo/subtitulo de quem abre, `onConfirmed`) reusa `PhoneStep`/`CodeStep` e `otp-client.ts` do login; o codigo sai por `/api/auth/otp/request` e a confirmacao vai em `POST /api/app/account/phone` (`confirmAccountPhone`, `account-phone-service.ts`), que usa `consumeOtp` (`otp-service.ts`, mesma validacao do `verifyOtp`) e grava o numero na conta logada sem mexer na sessao; numero de outra conta vira `PhoneTakenError`. `ReminderFlowProvider` (`useReminderFlow().openReminder()`) abre o modal de numero antes do `AddToCalendarModal` quando a conta nao tem telefone. Abertura automatica: `LiveThreadClient` 3s depois da mensagem `guide_after_first_feedback`, uma vez, registrada em `users.metadata.phonePromptedAt` (`/api/app/account/phone-prompt`, `hasPhonePrompted`). Ver Product-Rules Secao 11.3.3.

**i18n:** next-intl PT-BR e EN-US. Strings de UI vao em `src/locales/pt.json` e `en.json`.

**Planos:** `User.planCode` (trial/pro) e `User.planStatus` controlam acesso. Trial = mesmas features do Pro com `planExpiresAt`. Ver limites em `src/lib/constants.ts`.

**Forms:** React Hook Form + Zod. Usar `safeCall()` de `src/lib/utils.ts` para chamadas async que retornam `[result, error]`.

## Data models

| Model          | Proposito                                                                             |
| -------------- | --------------------------------------------------------------------------------------|
| `User`         | Conta e identidade; `phone` (unico, formato `normalizePhoneToWaId`), `email` (unico, minusculas), pelo menos um dos dois (CHECK no banco), `planCode`, `planStatus`, `planExpiresAt` |
| `Subscription` | Pagamento (1:N com User, mais recente = atual); nunca lido para liberar acesso, que fica no `User` |
| `Doc`          | Material enviado; `rawContent`, `content`, `docType`, `level`, `status`               |
| `Question`     | Pergunta gerada; `questionFormat`, `answerKeys`, `questionOptions`, `status`, `revisionCount` |
| `Activity`     | Sessao de pratica por `[userId, docId, date]`; `nextMessageAt`, cadencia              |
| `WeeklyReport` | Relatorio semanal enviado aos domingos                                                |
| `Message`      | Historico de mensagens WhatsApp; ligado a `Activity`                                 |
| `LlmUsage`     | Contabilidade de tokens por chamada (provider, model, tipo de uso)                    |
| `LlmLog`       | Payload completo de cada chamada LLM (input, output, durationMs, success, error)      |
| `Waitlist`     | Lista de espera; `email`, `status` (pending/invited/active)                           |

## Sistema de formatos de pergunta

Formatos validos (`QuestionFormat` enum): `gap_fill`, `recall`, `recall_inverted`, `scenario`, `choice`, `image_recognition`, `audio_transcription`, `audio_translation`, `open_text`, `open_question`.

Cada formato tem um arquivo de exemplo em `prompts/examples/<format>.md` com blocos por nivel (`## BASIC`, `## INTERMEDIATE`, `## ADVANCED`) e secao (`### question`, `### feedback`).

Selecao de formato ativa hoje: `pickNextFormat()` em `src/core/question-format-picker.ts`, que rotaciona os 8 formatos de vocabulario (`gap_fill`, `recall`, `recall_inverted`, `scenario`, `choice`, `image_recognition`, `audio_transcription`, `audio_translation`) de forma balanceada: sorteia so entre os formatos permitidos menos usados na atividade (`countQuestionFormatsByActivity`). `image_recognition` que cai em fallback nao conta, entao ganha prioridade nas perguntas seguintes. `image_recognition` so entra quando o sorteio de `IMAGE_QUESTION_ROLLOUT_FRACTION` permite e nunca sai logo antes ou logo depois de `choice`. Formatos de audio (`AUDIO_QUESTION_FORMATS`) so entram quando o sorteio de `AUDIO_QUESTION_ROLLOUT_FRACTION` permite e nunca saem dois em sequencia. Falha de midia (imagem ou audio) re-sorteia com as duas familias desligadas. `open_text`/`open_question` existem no enum mas nao tem call site ativo (eram usados por `text`/`exercise`, que nao existem mais como tipo de conteudo, ver Product-Rules.md Secao 3).

Funcoes em `src/core/format-loader.ts`:
- `getQuestionExamples(formats, level)` -- string formatada com exemplos de pergunta por formato
- `getFeedbackExamples(formats, level)` -- string formatada com exemplos de feedback por formato
- `validateGeneratedQuestion(question)` -- filtra perguntas invalidas por sourceItem

O LLM decide o formato de cada pergunta no JSON de saida. O codigo nao faz rotacao manual do texto da pergunta, so decide qual formato pedir (`pickNextFormat`).

**image_recognition:** a geracao devolve `imageable` e `questionImageDescription`; a imagem sai de `src/vendors/image.vendor.ts` (`gpt-image-2.5-flare`) via `src/services/question-image-service.ts`, salva em `question-image/<mediaId>.jpg` (JPEG comprimido, landscape 1536x1024 por padrao ou `square` via parametro `orientation`; largura/altura em `Media.metadata`; Media `image`, removida pela limpeza de imagens apos 90 dias). Falha ou `imageable: false` cai para outro formato em `buildQuestionData` (`activity-cron.service.ts`). `formatQuestion` aplica o enunciado e monta `text` + `imageMediaId` + `interactive`. O estilo visual fixo (foto realista) fica em `prompts/question-image.md`, anexado a descricao pelo `image.vendor`, seguido do adendo de composicao da orientacao ("Wide landscape composition, subject centered."); a descricao gerada fala so da cena, com o termo no ambiente real onde aparece.

**audio_transcription / audio_translation:** a geracao devolve `question: ""` e `questionAudioText` (a frase); `buildAudioQuestion` (`activity-cron.service.ts`) gera o audio via `storeQuestionAudio` (`src/services/question-audio-service.ts`, Ogg em `question-audio/<mediaId>.ogg`, frase em `Media.mediaTranscription`), grava a frase em `Question.question`, na transcricao forca `answerKeys = [frase]` (na traducao, `answerKeys` sao as referencias em PT geradas) e preenche `questionAudioMediaId`. `formatQuestion` devolve so a instrucao em `text` + `audioMediaId` (a frase nunca vai na mensagem). Transcricao: status decidido pelo LLM com regra estrita no bloco `prompts/examples/audio_transcription.md`, `feedback_text` sempre limpo, sem diff (`cleanAudioFeedbackText` remove marcacao residual); a dica explica um erro especifico, nunca a frase corrigida. Traducao: avaliacao semantica (`prompts/examples/audio_translation.md`). Feedback montado em codigo por `formatAudioFeedback` numa linha: transcricao `"feedback_text" (_feedback_translation_)`, traducao `"feedback_translation" (_feedback_text_)`. Nos dois: sem audio de feedback; nota de voz nao avalia (`formatAudioQuestionNeedsText`). Na web, audio de bot com intent `practice_question` vira `audioKind: "question"` (instrucao em cima, sem "Ver tradução"). So o audio com intent `practice_feedback` conta para o bonus e o eixo Escuta.

**Resposta por voz (web):** o composer troca o enviar pelo microfone com o campo vazio (`useVoiceRecorder`, `RecordingBar`, `MicPermissionDialog`); limite em `VOICE_MAX_SEC`/`VOICE_WARN_SEC`/`VOICE_MIN_MS` (`constants.ts`). Formato escolhido por `pickRecorderMimeType` (`src/lib/voice-recording.ts`): Ogg/Opus direto, WebM/Opus remuxado para Ogg no cliente (`remuxWebmToOgg`, `src/lib/webm-to-ogg.ts`, Mediabunny carregado sob demanda) ou AAC salvo como m4a. Upload pela rota `POST /api/app/messages/upload` com `mediaType: "audio"` (`storeVoiceNote`); depois da resposta, `processVoiceNote` (`voice-note-service.ts`) transcreve (Whisper), cria a `Media` com `parentType: message` e chama `handleIncomingMessage` com `isVoiceNote`, `messageId` e `mediaId`. A partir dai e o mesmo caminho da resposta digitada; `linkAnswerAudio` liga a `Media` em `Question.answerAudioMediaId`. Transcricao sem letra (`isInaudibleTranscription`) responde `formatVoiceNoteInaudible` sem avaliar. Barras de onda: `WaveformBars` (players e gravacao). AudioContext unico: `src/lib/shared-audio-context.ts`. Ver Product-Rules Secao 2 (Resposta por voz).

**Choice shuffle:** opcoes sao embaralhadas uma vez antes de salvar no banco (`updateQuestion`). **Opcoes por canal:** choice e image_recognition devolvem so a pergunta em `text` e as opcoes em `interactive.buttons` com `isOptionList: true`. O `WhatsAppChannel` anexa a lista numerada via `formatNumberedOptions` (texto ou legenda); a web salva so a pergunta e o cliente renderiza os botoes. `formatNumberedOptions` nao embaralha.

**Suporte e nivel (modais):** nenhum dos dois passa pelo chat nem deixa `pendingIntent`. Comando `suporte`/`nivel` (texto, voz, aliases) grava a mensagem do usuario e responde `open_support`/`open_level`; o menu da conta (`sidebar-footer.tsx`) abre direto. Suporte: `SupportModal` (`useSupportFlow().openSupport()`, `support-flow-provider.tsx`) -> `POST /api/app/support` -> `sendSupportRequest` (`support-service.ts`, e-mail para `EMAIL_SUPPORT`); toast diz o canal da resposta (WhatsApp com telefone, senao e-mail). Nivel: `LevelModal` (`useProfileLevel().openLevel()`, `profile-level-provider.tsx`) -> `POST /api/app/account/level`. `ProfileLevelProvider` e a fonte unica do nivel no cliente: a `NewActivityModal` abre com ele e atualiza ao criar. Card de nivel antigo no historico (`isCaptureStep` no JSON) e renderizado travado por `map-messages.ts`. Ver Product-Rules Secoes 5 e 9.1.

**Estado da selecao:** o `interactive` de lista de opcoes ganha `disabled` e `selectedId`, gravados por `markOptionListSelection` (`message-service.ts`, idempotente): na avaliacao (`markOptionListAnswered`, antes do `saveUserMsg`) na mensagem mais recente e livre da pergunta (`question_id`). A resolucao da opcao e `resolveSelectedButtonId` (`src/core/parser.ts`): id do botao, senao numero, senao texto. A web antecipa a selecao no clique e reconcilia quando a mensagem do usuario chega pelo realtime.

## LLM vendor

`src/vendors/llm.vendor.ts` centraliza todas as chamadas LLM:

| Funcao                    | Stage             | Modelo padrao      |
| ------------------------- | ----------------- | ------------------ |
| `generateDocSections`     | doc-extraction    | gpt-4.1-mini       |
| `generateNextQuestion`    | gen-vocabulary    | PROVIDER_STANDARD  |
| `generateActivityRequest` | activity-request  | PROVIDER_STANDARD  |
| `generateTopicValidation` | topic-validation  | PROVIDER_STANDARD  |
| `generateFocusContent`    | gen-content        | PROVIDER_STANDARD  |
| `generateAnswerEvaluation`| answer-evaluation | PROVIDER_STANDARD  |
| `extractTextFromImage`    | ocr               | gpt-4o-mini        |
| `extractTextFromPdf`      | --                | unpdf (sem LLM)    |

Geracao de imagem: `src/vendors/image.vendor.ts` (OpenAI gpt-image-2.5-flare, stage `question-image` no `LlmLog`).

`PROVIDER_STANDARD` alterna entre `"anthropic"` (claude-haiku-4-5) e `"openai"` (gpt-4.1). Mudar a constante no topo do arquivo para trocar.

Transcricao de audio: `src/vendors/whisper.vendor.ts` (OpenAI whisper-1).

Schemas Zod para saidas estruturadas: `src/lib/llm-schemas.ts`.

**evalTip em right:** o feedback usa a forma que o usuario escreveu (`right_answer`); a dica so e enviada com `eval_tip_class` `alternative`, formato em `EVAL_TIP_ALTERNATIVE_FORMATS` e `hasAlternativeKeyInTip` (`src/core/eval-tip.ts`: a dica cita uma answerKey diferente da resposta); o gate fica em `message-service.ts` (o prompt nao conhece o formato). Classes permitidas por formato: `EVAL_TIP_CLASSES_BY_FORMAT` + `isEvalTipClassAllowed` (transcricao so `homophone`/`connected_speech`; traducao `calque`/`near_synonym`/`literal_idiom`/`register`/`structure`). Ver Product-Rules Secao 6.2.
**SM-2 em acerto com alternativa:** `eval_tip_class` `alternative` + resposta fora das answerKeys (`isAnswerInKeys`) passa `isAlternativeAnswer` ao `calcSm2` (`src/core/sm2.ts`): fator de facilidade fica igual (equivalente ao q=4) em vez de +0.1. Ver Product-Rules Secao 7.
**Origem na avaliacao:** `{content_origin}` recebe `Doc.source` cru (`generated` | `upload`); generated aceita equivalente natural, upload so answerKeys. Ver Product-Rules Secao 6.
Textos dos prompts: `prompts/*.md`, exemplos de formato em `prompts/examples/*.md`.

## LLM logging

`src/services/llm-log-service.ts` registra cada chamada em `LlmLog`:
- `stage`, `provider`, `model`, `input` (system + prompt), `output` (raw text), `parsedOutput`, tokens, `durationMs`, `success`, `error`
- Falha no log nunca afeta o fluxo principal (catch silencioso)
- Desativar com `DISABLE_LLM_LOGS=true` ou `DISABLE_LLM_LOGS=1`

## Prompts

Cada prompt vive em `prompts/<etapa>.md`. Formato e convencoes em `prompts/standard.md`.

Arquivos de prompt ativos:
- `doc-extraction.md` -- extrai vocabulario do material (lista unica, sem seçoes tipadas, ver Product-Rules.md Secao 3)
- `activity-request.md` -- modera o pedido da modal de nova atividade, checa se ha informacao suficiente e extrai objetivo, assunto, nivel e focos
- `topic-validation.md` -- revalida o assunto e gera os 5 subtopicos
- `gen-content.md` -- gera o conteudo da atividade a partir das chaves de foco ja resolvidas (ate 3)
- `gen-vocabulary.md` -- gera perguntas de vocabulario (unico prompt de geracao de pergunta em uso hoje)
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
- Sempre veja se já tem algo pra ser reutilizado antes de criar ou modificar.
- Antes de criar qualquer helper, grep o projeto para ver como a operacao ja e feita e replicar o mesmo padrao. Nao criar wrappers de uma linha para operacoes que ja tem padrao estabelecido.

### Padrao de mensagem WhatsApp

Sempre que enviar uma mensagem ao usuario, usar `sendAndSaveMessage` (`src/services/message-sender-service.ts`):
```typescript
const msg = formatX();
await sendAndSaveMessage({ channel, userId, message: msg, today });
```
`sendAndSaveMessage` passa o `userId` como destino (todo envio por ali vai para a web, que ignora o destino; WhatsApp envia direto pelo telefone, via `sendWhatsAppTemplate`), envia via `channel.sendMessage`/`sendTemplate`, captura o `externalId` (wamid) retornado pela Cloud API e so entao salva a `Message` ja com esse valor -- envio sempre antes do save, nunca depois. Passar `today` quando a mensagem deve contar para `incrementAgentMessageCount`; omitir quando o fluxo nunca contou (ex: `process-doc-service.ts`, `merge-doc-service.ts`).

`MessageChannel.sendMessage`/`sendTemplate` enviam uma mensagem por chamada (sem array, sem `{ delay }`). Para pausas entre mensagens, usar `waitBeforeSend(channel, userId, ms, { replyToMessageId })` de `src/services/message-sender-service.ts` entre chamadas de `sendAndSaveMessage`, nunca `delay` cru: ele acende o "digitando" nos ultimos `TYPING_LEAD_MS` quando a pausa passa de `MIN_DELAY_FOR_TYPING_MS`.

**Digitando:** antes de chamada de duracao incerta (LLM, geracao de pergunta/imagem, TTS), chamar `await channel.notifyTyping(userId, { replyToMessageId })` direto na linha anterior, sem wrapper nem heartbeat. `replyToMessageId` e o `externalId` da mensagem recebida (wamid no WhatsApp; sem ele o WhatsApp nao mostra nada). Em fluxo com varias etapas lentas, passar `TypingTarget` (`{ channel, replyToMessageId }`) para renovar o aviso antes de cada etapa (ex: `generateQuestionIfPoolNotFull`). Duas mensagens de uma mesma sequencia nunca saem coladas: sempre `waitBeforeSend` entre elas. `notifyTypingStop` so existe no `finally` de `handleIncomingMessage`, via `trackChannelSends`. Regra em Product-Rules Secao 19.

### Escala de UI

Valores de tamanho e raio ficam em um lugar so: tokens em `tailwind.config.ts` (registrados no `cn` de `src/lib/utils.ts` para o `twMerge` resolver conflito) e variaveis do chat em `src/app/globals.css`. Nunca escrever altura, raio ou tamanho de titulo solto em botao ou modal.
- `Button` (`src/components/ui/button.tsx`): base com raio de 12px (`rounded-control`), 16px, peso 600. `default`/`lg` = 48px (`h-control`), `compact` = 36px e 15px com toque de 44px (sidebar, aviso de revisao), `mini` = 32px e 14px com toque de 44px (barra do topo no mobile), `icon` = circulo de 40px com toque de 44px. Botao de acao com texto e retangulo arredondado; so icone e circulo; seletores (abas, chips, filtros) e o composer ficam em pilula.
- Raios: `rounded-control` (12px, botoes e controles), `rounded-panel` (16px, superficies internas), `rounded-modal` (24px, caixa da modal), `rounded-composer` (20px, o composer e o proprio campo, sem fundo interno) e `rounded-tray` (20px, bandeja do aviso de revisao; fundo translucido com blur, como o composer).
- Aviso de revisao pendente: e a bandeja do composer (`notice`/`isNoticeVisible` do `Composer`, linha em `pending-review-banner.tsx`). Mobile: largura total, cantos so em cima, cobre a area segura (`pb-2` com teclado aberto via `data-keyboard-open` do wrapper no `thread.tsx`). Desktop: flutua com os quatro cantos. So a linha e clicavel; a linha sobe e desce por `grid-template-rows`.
- Area de toque: `touch-target` (`globals.css`) garante 44px sem mudar o visual; `h-touch`/`min-h-touch` para itens de menu e lista (44px, 16px).
- Texto: `text-chat` (bolha, 16px, altura de linha 1.5), `text-chat-meta` (horario, 12px), `text-caption` (12px, minimo para texto auxiliar).
- Chat e composer leem `--chat-*`/`--composer-*` de `globals.css`; o simulador da home usa `data-chat-density="compact"` para manter a escala anterior.

### Padrao de telefone

Todo parse, validacao e formatacao de telefone passa por `src/core/phone.ts` (`libphonenumber-js`): `normalizePhoneToWaId` (formato do banco, so digitos com codigo do pais, igual ao `wa_id`), `toE164`, `formatPhoneForInput` e `formatPhoneForDisplay`. Nunca escrever `55`/`+55` fixo; o pais padrao e `DEFAULT_PHONE_COUNTRY` (`constants.ts`), usado so quando o numero chega sem codigo de pais. Campo de telefone na UI: `PhoneInput` (`src/components/shared/phone-input.tsx`). Regra de produto em Product-Rules Secao 11.3.

### Padrao de armazenamento de midia

Toda midia nova vai em `<pasta>/<mediaId>.<ext>`, com o nome do arquivo igual ao id da `Media`:
```typescript
const mediaId = ulid();
const mediaPath = buildMediaPath(FEEDBACK_AUDIO_FOLDER, mediaId, "mp3");
await uploadFile({ filePath: mediaPath, file });
await createMedia({ id: mediaId, userId, source: MEDIA_SOURCE.SYSTEM, mediaPath, parentId, parentType, mediaType, contentType });
```
- Pastas sao constantes `*_FOLDER` em `src/lib/constants.ts` (`FEEDBACK_AUDIO_FOLDER`, `QUESTION_AUDIO_FOLDER`, `ANSWER_AUDIO_FOLDER`, `OCR_IMAGE_FOLDER`, `QUESTION_IMAGE_FOLDER`, `CHART_FOLDER`). Pasta nova entra como nova constante, nunca string solta.
- Midia ligada a uma entidade e referenciada por coluna `<algo>MediaId` com FK para `Media` (ex: `Question.feedbackAudioMediaId`, `Activity.chartCompletedMediaId`, `Message.mediaId`), nunca localizada por prefixo de caminho.
- Caminho e extensao so existem no upload. Depois disso tudo circula pelo id da `Media` (`FormattedMessage.imageMediaId`/`audioMediaId`, `Message.mediaId`) e quem precisa do arquivo le `Media.mediaPath`. Nunca remontar caminho com `buildMediaPath` fora da criacao.
- Toda `Media` tem dono (`userId`) e origem (`source`: `MEDIA_SOURCE.USER` para o que o usuario enviou, voz e foto; `MEDIA_SOURCE.SYSTEM` para o que geramos, IA, TTS e grafico).
- A web abre midia por `/api/app/media/<mediaId>` (`buildMediaUrl`), que busca a `Media` por id + `userId` e redireciona para a signed URL.
- `sendAndSaveMessage` grava `mediaType`/`mediaId` a partir de `imageMediaId`/`audioMediaId` da mensagem; nao passar esses campos a mao.
- Limpeza (`audio-cleanup-cron.service.ts`) filtra por `mediaType`, nao por pasta. Hoje esta pausada (`MEDIA_CLEANUP_ENABLED = false`): midia compoe perguntas, nada e excluido.
- Audio gerado e sempre Ogg: extensao via `TTS_AUDIO_EXTENSION` (`tts.vendor.ts`), nunca string solta. Midias antigas continuam nas pastas legadas (`feedback/`, `answer/`, `ocr/`, `charts/...`), sem backfill.

### Prisma

- Sem `$queryRaw` salvo necessidade absoluta
- Sempre escopo por `userId` -- nunca busca sem filtro de usuario
- Usar `select` para buscar so os campos necessarios
- Nunca importar diretamente de `prisma/client` ou `@prisma/client` -- usar sempre `src/lib/prisma.ts`
- `src/lib/prisma.ts` re-exporta todos os tipos, enums e namespace `Prisma` necessarios

### Comentarios

- Sem comentarios explicando o que o codigo faz -- codigo deve ser autoexplicativo
- Comentarios apenas para: TODOs, justificativa de regra de negocio nao obvia, quirks de API externa
- NUNCA use o -- (travessao) gerado por IA em nenhum lugar: texto, codigo, comentario ou doc
- Evite criar 

### Build

- Sempre rodar `npm run build` ao final e corrigir o que quebrar
