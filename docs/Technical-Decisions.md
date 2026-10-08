# Fluizer - Technical Decisions

Registro de decisões técnicas que não são óbvias a partir do código ou do
Product-Rules, pra não se perder depois. Ordem cronológica, mais recente no
topo.

---

## Áudio TTS em MP3 e player nativo

Data: 2026-10-07

Contexto: o áudio de feedback era gerado em Ogg/Opus por herança do WhatsApp (nota de voz) e do Safari sem suporte nativo, o que forçou um player que decodifica o arquivo via Web Audio API. Esse caminho tem bug conhecido do WebKit: áudio por Web Audio fica distorcido, atrasado ou picotado quando a rota de saída muda para Bluetooth (relato de stuttering no CarPlay sem fio). Além disso, o WhatsApp não entrega mais áudio de prática, então o requisito de Ogg/Opus acabou.

Decisões:

- **MP3 como formato padrão de geração** (`audio/mpeg`, extensão `.mp3`). A escolha original era M4A/AAC, mas a OpenAI só devolve AAC cru (ADTS) e o Google Cloud TTS não tem AAC nem M4A; MP3 é nativo nos dois (`response_format: "mp3"` e `audioEncoding: "MP3"`), sem transcode nem ffmpeg e sem geração dupla.
- **Player em três arquivos** em `src/components/chat/`: `native-audio-player.tsx` (`<audio>` nativo, dono do tipo `AudioPlayerProps`, waveform determinística pela URL, sem decode de PCM), `ogg-audio-player.tsx` (decoder Ogg/Opus original, intacto, só para o acervo legado) e `custom-audio-player.tsx` (fachada). O Ogg é carregado com `next/dynamic` (`ssr: false`) no escopo do módulo. Nenhum call site mudou.
- **Escolha na fachada:** a URL do app (`/api/app/media/<id>`) não tem extensão e a mensagem não carrega o content type, então a fachada usa o nativo e cai para `OggAudioPlayer` quando o `<audio>` dispara erro de mídia (ou a URL termina em `.ogg`, caso do simulador antigo).
- **Sem migração:** Ogg já gravado continua Ogg até o job de limpeza (Seção 17 do Product-Rules). Os áudios fixos da home foram regerados em MP3.
- **WhatsApp:** `sendAudioPart` passa a enviar o `contentType` da própria `Media`; MP3 não vira nota de voz, aceitável porque o canal não entrega áudio de prática.
- **Quando remover `ogg-audio-player.tsx`, `ogg-opus-decoder` e o ajuste de `next.config.ts`:** quando nenhuma `Media` de áudio com path `.ogg` for mais referenciada por uma `Activity` ativa (verificar por query antes).

---

## Lembrete diário e reengajamento unificados

Data: 2026-10-01

Contexto: o lembrete diário de revisão mandava o link de login como texto no
corpo do template `daily_reminder_v2`, e teste real mostrou que até link em texto
puro de template abre no navegador embutido da Meta, quebrando o login
automático. O nudge por steps (h12 a d14, `Activity.lastNudgeStep` /
`lastNudgeAt`) estava comentado desde que a prática migrou para o web, e foi
desenhado para a cadência de 1h, que também está pausada. Com o pricing da Meta
de 1/out/2026 (1.000 mensagens de serviço grátis por número por mês), uma
resposta de sessão depois do template não tem custo relevante.

Decisões:

- **Um cron só, sem estado de nudge.** O cron `/api/cron/daily-reminder`
  (`daily-reminder-cron.service.ts`, mesmo slot de 30 min no `timezone` +
  `dailyReminderTime` do usuário) calcula `daysSince(lastInteractionAt ??
  createdAt)` da Activity ativa e decide em `pickEngagementReminder`
  (`src/core/engagement-reminder.ts`): 0 a 6 dias, `daily_reminder_revision` ou
  `daily_reminder_v2` conforme `countSm2EligibleQuestionsByUser`, só com
  `dailyReminderEnabled`; 7 e 14 `nudge_days` (param = dias), ignorando o toggle;
  resto nada. Por isso o filtro `daily_reminder_enabled = true` saiu do SQL de
  slot e foi para o core. `daysSince` é em blocos de 24h, e como o cron roda uma
  vez por dia no mesmo horário cada número aparece uma vez.
- **`lastInteractionAt` continua em `Activity`.** Já é gravado em toda
  avaliação (`right`, `wrong`, `partial`) em `message-service.ts`, que vira o
  reset natural. Sem campo novo em `User`.
- **Drop de `lastNudgeStep` / `lastNudgeAt`** (migration
  `drop_activity_nudge_fields`), junto com `NUDGE_STEPS`,
  `NUDGE_THRESHOLDS_MS`, os pools de nudge livre e o bloco comentado de nudge em
  `activity-cron.service.ts`. A cadência comentada continua lá.
- **Dedup diário por `Notification.kind`.** O `kind` passa a ser o nome do
  template, e a busca de candidatos exclui quem já tem qualquer um dos três
  kinds (`ENGAGEMENT_REMINDERS`) no dia, mantendo uma mensagem por dia.
- **Template sem link, Quick Reply cai no catch-all.** Os três templates
  (`formatEngagementReminder` em `formatters.ts`, texto de referência) têm um
  único botão Quick Reply criado na Meta, e o envio continua só nome + body
  params (`sendWhatsAppTemplate`, sem component de botão). O webhook WhatsApp
  já não roda pipeline nenhum (desde a remoção do simulador) e responde
  `formatWhatsAppRedirect(link)` a qualquer mensagem, então o clique não precisa
  de payload nem handler por origem.
- **Link do catch-all.** `resolveWhatsAppAccessLink`
  (`wa-login-link-service.ts`) procura o User pelo telefone normalizado
  (`findUserByIdentifier("web", phone)`); achou, link assinado de login
  automático; não achou ou o `wa_id` não normaliza (BSUID/username), `/app`
  fixo. O caso sem normalização antes recebia erro genérico.
- **Cache do link assinado em `User.metadata`.** `signedLinkToken` guarda o
  código do shortlink (é o que fica na URL `/r/<code>`) e
  `signedLinkExpiresAt` a validade do token (24h). `getOrCreateWaLoginUrl`
  reusa enquanto válido; senão gera e sobrescreve os dois.
- **`updateUserPendingIntent` passou a fazer merge.** Antes sobrescrevia o
  `metadata` inteiro (`{ intent_data }` ou null) em quase toda mensagem web, o
  que apagaria o cache. Agora troca só a chave `intent_data` e preserva o resto.

---

## Passos de captura como lista de opções

Data: 2026-09-30

Contexto: nível (e comando `nivel`), objetivo, assunto e ponto mostravam as
opções numeradas no `text`, com os atalhos "Primeira opção" / "Escolha para
mim" como botões. Como a web já tem lista com seleção por toque e estado
(`choice`/`image_recognition`), os passos passam a usar a mesma lista, para o
onboarding ficar mais rápido. O WhatsApp entrega o mesmo de antes.

Decisões:

- **Opções no `interactive` como fonte.** Um botão por opção
  (`<passo>_option_<n>`), `isOptionList: true`, persistido com a lista
  completa. A web renderiza e reidrata a partir dele.
- **Texto neutro de canal.** `text` = `interactive.body` = cabeçalho de
  progresso + enunciado + aviso de cancelar, sem opções nem "informe o
  número". O texto todo fica em cima e as opções embaixo, em qualquer canal;
  no WhatsApp o aviso de cancelar passa a vir antes da lista numerada.
- **Canal monta a apresentação.** `isCaptureStep` diferencia os passos de
  `choice`/`image_recognition`. No WhatsApp: até 3 opções viram reply
  buttons nativos; acima disso, `formatCaptureStepOptionsText` (corpo,
  opções com emoji e instrução de número) com os atalhos como botões.
  Rótulos dos atalhos em `PICK_SHORTCUTS` (`constants.ts`), compartilhados
  com o parser.
- **Clique segue o caminho da opção.** A web envia `buttonId` e `messageId`.
  `applyCaptureStepSelection` (`message-service.ts`) só aceita se a mensagem é
  do usuário, `assistant` com `isOptionList` (`findOptionListMessageById`), e
  se `resolveOptionIndex` (`core/parser.ts`) confirma botão existente, lista
  livre e rótulo igual à opção atual do passo. A checagem de rótulo barra o
  clique numa lista de outro passo ou de um fluxo anterior. A posição vira
  `String(index + 1)` para objetivo/assunto/ponto (mesmo caminho do número
  digitado; no ponto, número único = chave conhecida, sem reclassificar) e o
  rótulo do nível para o nível (mesmo caminho do reply button do WhatsApp).
  Sem validação, o texto (rótulo) segue exatamente como digitado.
- **Gravação única e idempotente.** `markOptionListSelection` grava
  `disabled`/`selectedId` e não faz nada se a lista já está travada. Usada pela
  avaliação (`markOptionListAnswered`) e pelo clique nos passos. No passo, roda
  só no ramo que processa a resposta (depois da supressão e dos ramos de
  comando/cancelar) e antes do `saveUserMsg`, que é o sinal de reconciliação
  da web. Texto digitado não grava estado.
- **Escolha única.** A lista da web é de escolha única nos quatro passos. A
  combinação de até 2 pontos fica no texto livre (e no número digitado no
  WhatsApp). Sem seleção múltipla.
- **Consequência aceita.** Se a geração do ponto falhar depois do clique, a
  lista já está travada e a nova tentativa é por texto.

---

## Indicador de digitando controlado pelo servidor

Data: 2026-10-01

Contexto: o "digitando" da web era deduzido pelo cliente (última mensagem do
usuário, até 45s, com 900ms segurando a resposta) e sumia assim que o feedback
chegava, mesmo com a próxima pergunta ainda sendo preparada. Regra de produto
em Product-Rules Seção 19.

Decisões:

- **Contrato por canal.** `MessageChannel.notifyTyping(userId, { replyToMessageId })`
  e `notifyTypingStop(userId)`. Web emite `typing:start`/`typing:stop` no tópico
  `messages-<userId>`; WhatsApp chama a Cloud API com `status: "read"` +
  `typing_indicator` usando o wamid recebido. Sem wamid (fluxos de fila, cron,
  onboarding pela web) e no stop, o WhatsApp é no-op. Falha no aviso só loga:
  é cosmético e não pode derrubar o envio.
- **Broadcast via REST.** Não há client Supabase no servidor;
  `realtime.vendor.ts` faz `POST /realtime/v1/api/broadcast` com a service key,
  `private: true`. As mensagens continuam chegando pelo trigger de INSERT/UPDATE.
- **Pausa conhecida: `waitBeforeSend`** (`message-sender-service.ts`) substitui
  todo `delay` entre mensagens sequenciais. Pausa abaixo de
  `MIN_DELAY_FOR_TYPING_MS` sai em silêncio; acima, espera e acende o indicador
  nos últimos `TYPING_LEAD_MS`. O padrão foi de 3s para 4s para mostrar o
  indicador (1.5s em silêncio + 2.5s digitando), cobrindo o intervalo antes do
  áudio, depois de `praticar` e entre pares que antes saíam colados (dica e
  próxima pergunta, cancelamento e orientação, nível e objetivo). O onboarding
  ficou em 2s, de propósito sem indicador.
- **Duração incerta: chamada direta.** `channel.notifyTyping(...)` na linha
  antes da operação (avaliação, `generateQuestionIfPoolNotFull`, validação de
  tema, geração de conteúdo, extração de material, gráfico de conclusão de
  rodada, resumo de retomada). Sem heartbeat e sem wrapper tipo `withTyping()`.
  Na geração de pergunta, que pode passar dos 25s com imagem,
  `generateQuestionIfPoolNotFull` recebe um `TypingTarget` opcional e renova o
  aviso antes de `storeQuestionImage` e antes do formato de fallback: é aviso
  por etapa, não timer.
- **Stop num ponto só.** O `finally` que já envolvia `handleIncomingMessage`
  chama `notifyTypingStop` quando nada foi enviado. Para saber disso sem flag em
  cada envio, a função embrulha o canal com `trackChannelSends`, que marca o
  primeiro `sendMessage`/`sendTemplate` concluído (helpers recebem o mesmo
  canal, então contam também). Fluxos fora desse handler dependem do TTL.
- **Cliente reativo.** Liga em `typing:start`; desliga em mensagem nova do bot,
  `typing:stop` ou TTL de 25s. Eventos da mensagem do usuário e `UPDATE` não
  desligam: na web a mensagem do usuário é salva depois da avaliação e a seleção
  da lista gera `UPDATE`, então apagariam o indicador no meio da espera. A trava
  do composer (`REPLY_WAIT_TIMEOUT_MS`) é independente e ficou como estava.
- **Sem polling de fallback.** A reconexão do Realtime já busca mensagens de
  novo a cada `SUBSCRIBED`.

---

## Estado da seleção nas listas de opções

Data: 2026-09-30

Contexto: em `choice` e `image_recognition`, os botões da web continuavam
iguais e clicáveis depois da resposta, sem mostrar a opção escolhida. Ajuste
só de UX: avaliação, feedback, SM-2 e score não mudam.

Decisões:

- **Estado no próprio `interactive`.** `disabled` e `selectedId` opcionais no
  jsonb da `Message`, sem coluna nova, sem migração e sem backfill.
- **Escrita só na avaliação.** `markOptionListAnswered` (`message-service.ts`)
  roda logo após o `updateQuestion` e antes do `saveUserMsg`. Nenhum outro
  caminho (comando, fluxo de nova atividade, limite, supressão) toca a
  mensagem.
- **Alvo por `question_id`.** Mensagem `assistant` com `isOptionList`, a mais
  recente sem `disabled` (a pergunta pode ter sido reenviada). Segunda
  avaliação não acha mensagem livre e não faz nada.
- **Resolução da opção em código, não no LLM.** `resolveSelectedButtonId`
  (`src/core/parser.ts`): `buttonId` enviado pela web se existir na mensagem,
  senão número via `parseNumericSelection`, senão texto normalizado; sem
  correspondência grava só `disabled`.
- **Cliente antecipa e reconcilia.** O POST processa em `after()` e não diz
  se houve avaliação. O sinal é a ordem de escrita: quando o INSERT da
  mensagem do usuário chega pelo realtime, o estado da lista já é final, então
  o cliente faz `refreshMessages` e descarta a seleção otimista (servidor
  vence). Falha no POST reverte na hora. UPDATE de mensagem de bot já
  conhecida passa a fazer merge do `interactive` por id, sem re-render quando
  o valor é igual.

---

## Padronização do armazenamento de mídia

Data: 2026-09-29

Contexto: o `image_recognition` estreou o caminho `question-image/<mediaId>.png`.
As demais mídias seguiam padrões soltos (`feedback/<questionId>_<ts>.ogg`,
`answer/<questionId>_<ts>.<ext>`, `ocr/<ulid>.<ext>`,
`charts/activity-completed/<ulid>.png`), e os charts não eram referenciados
por nenhuma coluna: o pentágono do histórico era achado por prefixo de caminho.

Decisões:

- **Toda mídia nova em `<pasta>/<mediaId>.<ext>`**, via `buildMediaPath`
  (`src/lib/utils.ts`), com uma constante por pasta em `src/lib/constants.ts`:
  `FEEDBACK_AUDIO_FOLDER`, `ANSWER_AUDIO_FOLDER`, `OCR_IMAGE_FOLDER`,
  `QUESTION_IMAGE_FOLDER` e `CHART_FOLDER`. O pentágono e o gauge dividem a
  pasta `chart`; o que diferencia os dois é a coluna que aponta para cada um.
- **`mediaId` gerado antes do upload** (`ulid()`) e passado como `id` no
  `createMedia`, para o nome do arquivo ser o id da Media. No OCR, a rota de
  upload gera o id e o repassa no `mediaMetadata` até o `saveImageMedia`
  (`message-service.ts`), que cria a Media depois.
- **`Activity.chartCompletedMediaId` e `Activity.chartRoundMediaId`**, com FK
  para `Media` (`onDelete: SetNull`), no mesmo padrão das colunas `*MediaId`
  da `Question`. Gravadas pelo `chart-service` logo após salvar o chart;
  regenerar um chart sobrescreve a coluna com o mais recente.
- **Sem backfill.** Mídias antigas ficam nas pastas antigas.
  `findClosingSummaryMedia` usa `chartCompletedMediaId` quando existe e mantém
  o fallback por prefixo `charts/activity-completed/` só para atividades
  arquivadas antes da coluna.
- **A limpeza não depende de pasta.** `processImageCleanup` e
  `processAudioCleanup` filtram por `mediaType`, então pegam as pastas novas e
  antigas igualmente.

---

## Formato de pergunta `image_recognition`

Data: 2026-09-29

Contexto: a prática estava textual demais. O novo formato mostra uma imagem
gerada que ilustra o termo e o usuário escolhe a opção que ela representa
(ver Product-Rules Seção 4).

Decisões:

- **Formato próprio derivado do `choice`, não uma variação dele.** Reaproveita
  a mecânica (opções em `questionOptions`, embaralhamento em
  `sanitizeQuestionData`, avaliação binária), mas tem valor próprio no enum
  `QuestionFormat`, bloco de exemplos próprio
  (`prompts/examples/image_recognition.md`) e montagem própria em
  `formatQuestion`.
- **Opções renderizadas pelo canal.** Choice e image_recognition devolvem só
  o enunciado em `text` e as opções em `interactive.buttons` com
  `isOptionList: true`. O WhatsApp (limite de 3 botões e 20 chars) anexa a
  lista numerada (`formatNumberedOptions`) ao texto ou à legenda da imagem; a
  web salva só o enunciado e o cliente desenha os botões. A avaliação monta a
  pergunta com a lista numerada para o LLM mapear respostas como "2".
- **`imageable` decidido na própria geração on-demand.** A mesma chamada
  `generateNextQuestion` devolve `imageable` e `questionImageDescription`
  (campos nullable em `sectionQuestionSchema`, `null` nos demais formatos).
  Sem chamada extra de classificação antes de gerar.
- **Descrição da cena + guia de estilo fixo.** A descrição gerada fala só da
  cena, com o termo no ambiente real onde aparece e em uso quando faz sentido
  (objeto solto em fundo vazio fica ambíguo); o estilo visual (foto realista,
  pessoas reais, sem texto) vem de `prompts/question-image.md`, anexado pelo
  `image.vendor`. Foto em vez de ilustração porque a prática é de uso real, e
  quanto mais perto do real, mais a imagem ajuda. Sem chamada de visão para
  validar a imagem gerada depois. A descrição fica em
  `Question.questionImageDescription` e em `Media.mediaTranscription`, como
  auditoria do que originou a imagem.
- **`image.vendor` separado do `llm.vendor`.** Mesmo padrão do `tts.vendor`:
  entra a descrição, sai o arquivo (`gpt-image-1-mini`, qualidade `low`,
  landscape 1536x1024 por padrão ou square 1024x1024, JPEG com compressão 80;
  a composição entra como adendo no fim do prompt e largura/altura vão em
  `Media.metadata`). Cada chamada é registrada em `llm_logs` (stage
  `question-image`, sem o base64 no `output`) e em `llm_usage`
  (`question_image`).
- **Fallback para outro formato, não para texto da mesma pergunta.**
  `imageable: false`, falha na geração da pergunta, do vendor, do upload ou do
  registro de mídia fazem `buildQuestionData` (`activity-cron.service.ts`)
  sortear outro formato para o mesmo bloco de conteúdo, com
  `console.warn` do motivo. Rollout por `IMAGE_QUESTION_ROLLOUT_FRACTION`,
  mesmo padrão de `AUDIO_ROLLOUT_FRACTION`.
- **Rotação balanceada no picker.** O sorteio uniforme fazia o
  image_recognition quase sumir: o item da pergunta é fixo por posição, o
  formato era sorteado às cegas e item abstrato cai em fallback. Agora
  `pickNextFormat` sorteia só entre os formatos permitidos com menor contagem
  na atividade (`countQuestionFormatsByActivity`). Fallback não gera pergunta,
  então o image_recognition atrasado tem prioridade nas perguntas seguintes.
  Custo aceito: em material quase todo abstrato, uma geração extra por
  pergunta até aparecer um item ilustrável (melhoria em Product-Backlog item 5).
- **Adjacência com `choice` imposta no picker.** `pickNextFormat` sorteia
  entre os formatos restantes, então a ordem do array sozinha
  não impediria a sequência. O picker exclui a família de escolha inteira
  (`choice` e `image_recognition`) quando o último formato é de escolha. No
  array, `image_recognition` fica no índice 2, a posição mais distante de
  `choice` (distância 3 na ordem linear e circular).
- **Avaliação por LLM, igual ao choice.** O pedido original previa avaliação
  determinística, mas o choice já é avaliado pelo `generateAnswerEvaluation`,
  que também gera `feedback_text`, tradução e dica de erro. O status
  determinístico não economizaria chamada e abriria um caminho novo no
  `message-service`. O botão da web envia o texto da opção como resposta.
- **Imagem salva em `question-image/<mediaId>.png`**, primeira mídia na
  convenção `<pasta>/<mediaId>.<ext>`, depois estendida às demais (ver
  "Padronização do armazenamento de mídia"). O path é derivado do
  `questionImageMediaId`, então `formatQuestion` segue puro.
- **Imagem de pergunta é Media `image` como as demais.** Sem tipo próprio:
  entra no `processImageCleanup` junto com OCR e charts, cujo TTL passou de
  30 para 90 dias (`IMAGE_CLEANUP_TTL_DAYS`). `processAudioCleanup` passou a
  filtrar `mediaType: "audio"`; antes buscava toda mídia de pergunta e teria
  apagado a imagem junto com o áudio, pelo critério de status da activity.

---

## Atribuição de origem (UTM) no cadastro web

Data: 2026-09-22

Contexto: `User.source`/`sourceData` só eram gravados de verdade no login web
por telefone, sempre hardcoded como `source: "site"`. Com a entrada 100% web
(o webhook do WhatsApp não cria mais conta, só redireciona pro app), não
havia nenhuma captura de UTM/referrer em lugar nenhum do app.

Decisões:

- **First-touch, cookie de 30 dias (`fz_attribution`).** A primeira origem
  que trouxe a pessoa é a que conta; o middleware (`src/middleware.ts`) só
  grava o cookie se ele ainda não existir, em qualquer página pública fora de
  `/app` e `/login`. O cookie não é apagado depois de gravado o cadastro,
  fica disponível pra eventos futuros (ex: primeira assinatura paga).
- **Taxonomia de `source`:** `meta_ads`, `google_ads`, `direct`,
  `organic_search`, `referral`, ou o valor literal de `utm_source` quando
  presente sem indicar mídia paga (ex: `newsletter`). Ver
  `src/core/attribution.ts` (`resolveSource`) para as regras exatas.
- **`resolveSource()`/`AttributionCookie` em `src/core/attribution.ts` é o
  ponto único de resolução**, função pura sem I/O, pensada pra ser reaproveitada
  se o canal WhatsApp voltar a criar conta — hoje só há um caminho ativo de
  cadastro (login web por OTP), então não há duplicação de lógica a resolver
  agora, só o ponto de extensão.
- **Indicação de professor ficou fora.** Não havia implementação nenhuma
  (sem campo no `User`, sem registro de professores, sem extensão de trial),
  só uma regra documentada. Produto é B2C por enquanto — a regra e as menções
  ao canal de parceria com professor saíram de `Product-Rules.md` e
  `Product-Brief.md` junto dessa mudança.
- **Identificação de usuário no GA4 via `dataLayer.push`, não `gtag.js`.**
  Não existe `gtag.js` carregado no app, só o container GTM. Em vez de
  carregar um `gtag.js` novo em paralelo (risco de contagem duplicada),
  `setAnalyticsUserId` (`src/lib/analytics.ts`) empurra
  `{ event: "set_user_id", user_id }` no `dataLayer`, seguindo o mesmo padrão
  do `logEvent` já existente. A configuração do lado do GTM/GA4 (variável de
  Data Layer + campo User-ID na tag de configuração, recurso User-ID
  habilitado na propriedade) é feita no console, fora deste repo.

---

## Banner de revisão pendente (`/app`)

Data: 2026-09-17

Contexto: aviso fixo no chat de prática avisando o usuário que existem
perguntas elegíveis por revisão espaçada aguardando resposta, com botão que
inicia a sessão intensiva (ver Product-Rules Seção 8.3).

Decisões:

- **Banner fixo, sem opção de dispensar manualmente.** Não existe um "x" pra
  fechar o banner sem praticar. Ele só some quando a sessão intensiva começa.
- **Contagem calculada de forma síncrona no carregamento do server component**,
  junto do mesmo `Promise.all` que já busca as mensagens da página. Decisão
  deliberada de não introduzir um fetch client separado por ora, pra manter o
  carregamento da página em um único caminho. Revisar para async/streaming só
  se algum dado real de performance justificar depois, não antecipar.
- **Número exibido cru, sem truncamento tipo "9+".** O volume real do produto
  (pool de até 25 perguntas por atividade, revisão espaçada limitando
  concorrência) não passa de duas casas, então não há necessidade de lógica de
  abreviação.
- **Reaproveita `countSm2EligibleQuestions`** (`src/repo/questions.repo.ts`),
  mesma regra de elegibilidade da variante por usuário
  (`countSm2EligibleQuestionsByUser`) usada no lembrete diário via WhatsApp
  (`daily-reminder-cron.service.ts`), sem somar perguntas com `status: "pending"`
  — essa contagem na prática nunca passa de 0 ou 1 por Activity e não faz parte
  da definição de "dívida de revisão" já documentada no produto.
