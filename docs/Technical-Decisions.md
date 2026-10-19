# Fluizer - Technical Decisions

Registro de decisões técnicas que não são óbvias a partir do código ou do
Product-Rules, pra não se perder depois. Ordem cronológica, mais recente no
topo.

---

## Composer do `/app` no celular: foco no play e crescimento até 4 linhas

Data: 2026-10-19

Contexto: nas perguntas de escuta o usuário ouve o áudio várias vezes enquanto escreve. Tocar no play fechava o teclado, e o composer mostrava só uma linha.

- **Foco:** `useKeepComposerFocus` (`src/hooks/use-keep-composer-focus.ts`), usado pelo `NativeAudioPlayer` e pelo `OggAudioPlayer`. O iOS move o foco no `mousedown` sintetizado depois do toque, e o `preventDefault` só no `pointerdown`, que já existia, não bastava. Play e pause cancelam `pointerdown` e `mousedown`. A barra cancela só o `mousedown` vindo de toque, porque no mouse é ele que inicia o arraste. Se o foco sair mesmo assim, `restoreFocus` devolve o foco ao textarea que estava focado, chamado **depois** do `handlePlayPause`. O `unlockAudioContext()`/`audio.play()` continua síncrono e em primeiro lugar no `click` (regra do `AudioContext.resume()` no gesto).
- **Altura:** `useLayoutEffect` sobre o texto mede o `scrollHeight` e limita a `line-height × 4 + padding` lidos do `getComputedStyle`. Passando disso, `overflow-y: auto`. Não usamos `field-sizing: content` porque não existe em iOS antigo. A linha de botões passou para `items-end`, para clipe e enviar ficarem na base. A lista não fica atrás do composer porque o `thread.tsx` já observa a altura dele (`ResizeObserver`), aplica no `paddingBottom` e rola até o fim quando a conversa já estava no fim.

## Rolagem do simulador da home no toque

Data: 2026-10-19

Contexto: no celular, quem descia a home rápido e parava com o simulador no meio da tela passava a rolar o simulador (rolagem própria, 620px de altura) em vez da página e ficava preso vendo metade dele.

- `useInnerScrollGate` (`src/components/home/simulator/use-inner-scroll-gate.ts`) observa o shell com `IntersectionObserver`. A rolagem interna só liga com o shell 90% visível ou cobrindo 90% da altura visível; o segundo caso cobre telas menores que o shell, onde os 90% visíveis nunca chegam. Fora isso o painel fica com `overflow-y: hidden` e o toque rola a página.
- Só vale para `pointer: coarse`. No mouse a rolagem interna fica sempre ligada, como antes.
- Nas bordas, o encadeamento nativo de rolagem (sem `overscroll-behavior: contain`) devolve o gesto para a página. Botões e áudio não são afetados: muda só o `overflow`.

## Telefone no login: `libphonenumber-js` e código do país

Data: 2026-10-19

Contexto: a máscara própria do `/login` tratava o `55` de um número internacional (autofill do Chrome com `autocomplete="tel"`, número copiado de contato) como DDD e cortava o último dígito. O botão desabilitado dependia de um estado que podia ficar defasado do valor do campo.

- **Biblioteca:** `libphonenumber-js` direto, não o `react-phone-number-input`. No modo nacional, o componente dele lê o número colado como nacional e repetiria o bug com `+55…` e `5511…`. A lib dá o parse e a formatação; o visual é o `Input` do projeto (`src/components/shared/phone-input.tsx`). Bandeiras com `country-flag-icons`: a do Brasil estática e as demais em `import()` por país, para não carregar as 260 no login.
- **Um ponto só para o país:** `src/core/phone.ts` (cliente e servidor). O código do país vem dos metadados da lib. O padrão é `DEFAULT_PHONE_COUNTRY` (`constants.ts`), usado só quando o número chega sem código de país. Nenhum outro arquivo tem `55` fixo.
- **Formato gravado inalterado:** `normalizePhoneToWaId` devolve só dígitos, com o código do país (`5511987654321`), igual ao `wa_id`. O cliente envia E.164 (`toE164`); o servidor normaliza de novo.
- **Nono dígito:** não há regra própria; o número fica como veio. O `isValid()` da lib recusaria celular brasileiro sem o 9, que era aceito. `PHONE_NATIONAL_LENGTH_OVERRIDES` mantém o Brasil em 10 ou 11 dígitos nacionais; os outros países usam `isValid()`. O `isPossible()` não serve, porque aceita 8 ou 9 dígitos sem DDD.
- **Nacional antes do internacional:** sem `+`, o número é lido primeiro como nacional do país selecionado (DDD 55 existe). Só se não fechar, e se começar com o código desse país, ele é relido como internacional.
- **Webhook:** o `wa_id` sempre tem código do país e é normalizado como `+wa_id`. Para o Brasil o resultado é o mesmo. Um `wa_id` estrangeiro de 11 dígitos deixou de virar `55…`.
- **Validação no envio:** lê o valor do DOM (`inputRef`), não o estado, para cobrir autofill que não passa pelo `onChange`.

## Formatos de escuta (`audio_transcription`, `audio_translation`)

Data: 2026-10-09

Contexto: a prática era toda de leitura e escrita. O formato novo toca uma frase em inglês com o termo e o usuário escreve o que ouviu (ver Product-Rules Seção 4). Molde de arquitetura: `image_recognition`. `audio_translation` (escrever em PT o sentido da frase) entrou numa segunda entrega, na mesma estrutura: valor próprio no enum, bloco de exemplos próprio e as mesmas peças de geração, apresentação e score.

Decisões:

- **Status decidido pelo LLM, com regra estrita no bloco de exemplos.** O pedido original previa o status em código (normalização, diff por palavra e tolerância a typo de distância 1 "sem virar outra palavra válida"). A tolerância exigia um dicionário de inglês que o projeto não tem. A decisão foi revisada: a transcrição segue o mesmo fluxo de avaliação dos demais formatos, sem normalização nem diff em código, e o LLM é sempre chamado. A regra fica em `prompts/examples/audio_transcription.md`: ignora caixa, pontuação, espaços, apóstrofo, contração e número por extenso contra dígito; qualquer palavra diferente, faltando ou sobrando é erro, inclusive typo e homófono; partial só com 1 erro em frase de 6+ palavras. O bloco tem exemplos de borda (typo, homófono, contração, pontuação, número, palavra faltando). `answer-evaluation.md` ganhou a regra geral "a regra de status do bloco prevalece".
- **Feedback sem diff.** A primeira versão marcava a correção na frase (`~usuário~ *correto*`, pelo LLM). Foi removida: o feedback da transcrição é a frase limpa e fluida, no mesmo padrão da tradução. O bloco pede `feedback_text` sem marcação em qualquer status, e `cleanAudioFeedbackText` (`formatters.ts`) ainda descarta trecho `~...~` e marcadores caso o modelo marque mesmo assim.
- **O diff não migrou para a dica.** A dica da transcrição continua restrita a `homophone` e `connected_speech` e explica um erro específico em frase curta, sem reproduzir a frase corrigida nem listar divergências (regra e exemplos no bloco). Erro de digitação é `spelling`, silenciado; sem classe aplicável, sem dica.
- **Linha de feedback montada em código, igual nos dois formatos.** `formatFeedback` recebe o formato e, nos formatos de áudio, delega a `formatAudioFeedback`: abertura + resposta correta entre aspas + a outra língua em itálico entre parênteses, numa linha só. Transcrição: `"feedback_text" (_feedback_translation_)`; tradução: `"feedback_translation" (_feedback_text_)`. O código tira aspas que o modelo tenha posto e limpa marcação do lado em itálico, então a forma final não depende do modelo. Os blocos de exemplo fixam o conteúdo de `feedback_translation`: na transcrição, a tradução da frase limpa; na tradução, o primeiro item de `answerKeys`, idêntico. O `right_answer` não entra nessa linha.
- **Frase em `Question.question` e `Media.mediaTranscription`.** A geração devolve `question: ""` e `questionAudioText` (espelho de `questionImageDescription`), então as checagens de vazamento do `validateGeneratedQuestion` passam sem exceção. O código grava a frase em `question` (a avaliação recebe instrução + "Frase do áudio") e força `answerKeys = [frase]`. `formatQuestion` nunca usa `question` nos formatos de áudio: o `text` é só a instrução.
- **Tradução avaliada pelo sentido, referência exata vinda do código.** O bloco `prompts/examples/audio_translation.md` define a avaliação semântica (qualquer PT com o mesmo sentido; partial quando perde parte relevante). A geração devolve de 1 a 3 referências em PT em `answerKeys` (não forçadas em código, ao contrário da transcrição). O `feedback_text` é a frase em EN e o `feedback_translation` é o primeiro item de `answerKeys`, idêntico (regra do bloco), mostrado como resposta correta no feedback.
- **Coluna já existente.** `Question.questionAudioMediaId` (FK `Media`, `onDelete: SetNull`) existia desde a tabela `medias`, sem escrita. Foi reaproveitada; a migration só adiciona valores de enum (`QuestionFormat.audio_transcription`, `EvalTipClass.homophone`, `EvalTipClass.connected_speech`).
- **Ogg/Opus, mesma extensão global.** `storeQuestionAudio` (`question-audio-service.ts`, clone de `storeQuestionImage`) usa `generateSpeech` e grava em `question-audio/<mediaId>.ogg`. A extensão vem de `TTS_AUDIO_EXTENSION` (`tts.vendor.ts`, ao lado de `TTS_MIME_TYPE`), a mesma do feedback; não existe extensão por tipo de áudio.
- **Áudio da pergunta fora do score e do eixo Escuta.** O `playedAt` é gravado para todo áudio, mas `markMessageAsPlayed` só chama `recordFeedbackAudioPlayed` com `intent === "practice_feedback"`, e `countActivityAudios` filtra o mesmo intent. A separação usa o `Message.intent` que já existia (`practice_question` × `practice_feedback`), sem coluna nova; como o feedback era o único produtor de áudio, os números das atividades antigas não mudam.
- **"Ver tradução" travado explicitamente.** Na web, `map-messages` reconhece áudio de bot com `intent === "practice_question"` como `audioKind: "question"` e não anexa tradução nem `textFallback`; o `MessageBubble` ainda passa `translation={undefined}` ao player. Sem a trava, a tradução da avaliação (`feedbackTranslations[questionId]`) apareceria no player da pergunta depois da resposta.
- **Fallback desliga as duas famílias de mídia.** Se imagem ou áudio falham, `buildQuestionData` re-sorteia com `canUseImage: false` e `canUseAudio: false`: no máximo uma tentativa de mídia por pergunta.
- **Picker com família de áudio.** `AUDIO_QUESTION_FORMATS` (`constants.ts`) é a família; o picker a exclui inteira quando o último formato é de áudio (mesmo esquema do `CHOICE_FAMILY`) e quando o sorteio de `AUDIO_QUESTION_ROLLOUT_FRACTION` não permite. Fração separada da `AUDIO_ROLLOUT_FRACTION` do feedback.
- **Dica filtrada por formato em código.** `EVAL_TIP_CLASSES_BY_FORMAT` (`constants.ts`) + `isEvalTipClassAllowed` (`core/eval-tip.ts`): a transcrição só envia `homophone` e `connected_speech`; a tradução só `calque`, `near_synonym`, `literal_idiom`, `register` e `structure` (collocation fora); os demais formatos não enviam as duas de escuta. `spelling`/`none` seguem silenciadas e a dica em acerto continua restrita a `EVAL_TIP_ALTERNATIVE_FORMATS`.
- **Voz não avalia.** Nota de voz numa pergunta de áudio salva a mensagem, envia `formatAudioQuestionNeedsText` e retorna sem avaliar; a pergunta continua pendente. A web não envia voz hoje, mas a trava já existe.
- **WhatsApp sem mudança.** O canal envia só o áudio quando há `audioMediaId` (a instrução se perde); aceitável porque o canal não entrega prática.

---

## Limpeza de mídia pausada

Data: 2026-10-09

Contexto: a limpeza diária (`/api/cron/audio-cleanup`) apagava áudio de pergunta 30 dias após a atividade ficar `archived`/`cancelled` e imagens 90 dias após a criação. Com o `image_recognition` e os formatos de escuta, a mídia passou a ser a própria pergunta, reaproveitada em revisão e reexibição; apagar o arquivo deixaria a pergunta sem conteúdo.

Decisões:

- **Nenhuma mídia é excluída por enquanto.** `MEDIA_CLEANUP_ENABLED = false` (`src/lib/constants.ts`); com a flag desligada, a rota não chama `processAudioCleanup` nem `processImageCleanup` e responde `"paused"` nos dois campos.
- **O código continua.** `audio-cleanup-cron.service.ts` e as queries de elegibilidade ficam intactos. O cron segue agendado porque a mesma rota limpa os shortlinks expirados.
- **Para reativar:** antes de virar a flag, excluir do critério a mídia referenciada por perguntas ainda elegíveis para revisão (`questionAudioMediaId`, `questionImageMediaId`), ou aceitar que a pergunta perca a mídia.

---

## Áudio TTS em Ogg/Opus e player nativo

Data: 2026-10-09 (substitui a decisão de MP3 de 2026-10-07)

Contexto: o Ogg/Opus não era nativo no Safari até o iOS/macOS 18.4, o que forçou o `ogg-audio-player.tsx`, que decodifica via Web Audio. Web Audio no iOS respeita a chave de silencioso (daí o `navigator.audioSession.type = "playback"` em `src/lib/audio-unlock.ts`) e tem bug conhecido do WebKit em rota Bluetooth (stuttering no CarPlay). A troca para MP3 tirou o Web Audio, mas o MP3 no player de mídia do iOS trava no início: medido em gravação de tela, o `playing` chega ~460 ms antes do som sair, o `currentTime` extrapola nesse intervalo e depois fica parado até o áudio real alcançar. Acontece também com o MP3 aberto direto numa aba (player nativo do navegador), na home com arquivo estático e no chat, então não é código nosso; é o [WebKit bug 181537](https://bugs.webkit.org/show_bug.cgi?id=181537). O mesmo teste com Ogg/Opus numa aba nativa toca fluido, e o `<audio>` nativo toca com o iPhone no silencioso.

Decisões:

- **Ogg/Opus como formato de geração** (`audio/ogg`, extensão `.ogg`): OpenAI `response_format: "opus"` e Google `audioEncoding: "OGG_OPUS"`, nativos nos dois, sem transcode. No WhatsApp volta a ser nota de voz.
- **Ogg toca no `<audio>` nativo** sempre que `canPlayType('audio/ogg; codecs="opus"')` aceita (Safari 18.4+, Chrome, Firefox). Sem Web Audio no caminho, sem unlock de silencioso e sem o problema do CarPlay.
- **`ogg-audio-player.tsx` só como fallback** para navegador sem Ogg nativo (iOS < 18.4), decidido pela fachada `custom-audio-player.tsx` após montar (`canPlayType`) ou por erro `SRC_NOT_SUPPORTED` do `<audio>` (`onUnsupported`).
- **Player nativo** (`native-audio-player.tsx`, dono do tipo `AudioPlayerProps`): a barra e o botão seguem o elemento `<audio>`. O rAF pinta o `audio.currentTime` só na variável CSS `--p` (sem setState por frame) e o texto do tempo e o slider seguem o `timeupdate`/`seeked`. Retomar, seek e `ended` são nativos, sem lógica nossa. **Trava inicial aceita:** do segundo play em diante o iOS arranca o `currentTime` na hora, o som só sai ~210 ms depois e o `currentTime` fica parado ~290 ms até o áudio alcançá-lo (medido em gravação de tela; o primeiro play é limpo; acontece também no player nativo do navegador, então não é código nosso nem formato). Uma timeline simulada (relógio próprio ancorado no `playing` com latência medida e correção contra o `currentTime`) foi implementada e **rejeitada**: acabava a trava, mas não ficava fluida nem precisa em retomadas. O player carrega ao entrar na tela (`preload="auto"` + `load()`, `none` fora da tela) e mostra o spinner no lugar do play só até ficar pronto (`canplay`/`loadeddata`, com timeout de 2 s porque o iOS ignora preload sem gesto), nunca no clique. O `OfflineAudioContext` decodifica só para dados (waveform por picos reais e duração real), sem saída de som, um decode por vez, só para player visível e nunca durante reprodução.
- **Home:** os `.ogg` originais do simulador foram restaurados do git; os `.mp3` saíram.
- **Sem migração:** MP3 já gravado continua tocando no nativo (com a travada do iOS) até o job de limpeza (Seção 17 do Product-Rules).
- **Duplo clique no timer do áudio** abre o arquivo numa nova aba (download/compartilhar e teste do player nativo), nos dois players.

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
  (`src/core/engagement-reminder.ts`): 0 a 6 dias, `daily_reminder_revision_v2` ou
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
  entra a descrição, sai o arquivo (`gpt-image-2.5-flare`, qualidade `low`,
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

- **Last-touch, cookie de 90 dias (`fz_attribution`).** A última campanha
  que trouxe a pessoa é a que conta; o middleware (`src/middleware.ts`)
  grava o cookie sempre que a URL traz `utm_*`/`gclid`/`fbclid` (substituindo
  o anterior) e, sem esses params, só grava se o cookie ainda não existir.
  Vale em qualquer rota, inclusive nas respostas de redirect. O cookie não é apagado depois de gravado o cadastro,
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
  `setUserId` (`src/lib/analytics.ts`) empurra `{ user_id }` (sem `event`) no
  `dataLayer`, e os eventos de funil (`sign_up`, `login`, `begin_checkout`,
  `purchase`) saem por `track()`, tipado por mapa de eventos GA4, sem dado
  pessoal. A configuração do lado do GTM/GA4 (variável de
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

## Pill "Praticar" (`/app`)

- **Fonte única do estado:** `Activity.intensiveUntil`. Já é reiniciado a cada pergunta enviada e setado no `practice_now`, então "dentro da janela de 15 min desde a última pergunta" equivale a `intensiveUntil > now`. Não há campo novo nem uso de `Question.updatedAt`.
- **Limite diário:** `canPracticeToday(..., true)` em `src/core/practice-pill.ts`, mesmo cálculo do `practice_now`.
- **Estado compartilhado:** `PracticePillProvider` envolve sidebar, header e página no layout, porque o header fica fora do `LiveThreadClient`. A thread registra `handleSend` como sender, então o clique segue o mesmo caminho do banner (que some sozinho).
- **Realtime:** reaproveita a única assinatura de `useRealtimeMessages`; mensagem nova ou reconexão chama `GET /api/app/practice-state`.

## Dica em acerto (`EvalTipClass.alternative`)

- **Enum:** `alternative` foi adicionado a `EvalTipClass` (banco) e ao zod de `answerEvaluationSchema`. `none` e `spelling` continuam só no zod, nunca persistidos.
- **Gate no código, não no prompt:** o prompt de avaliação não sabe o formato. Em `message-service.ts`, o `silent` agora também bloqueia quando `evalStatus === "right"` e não vale `alternative` + formato em `EVAL_TIP_ALTERNATIVE_FORMATS` (`src/lib/constants.ts`: recall, recall_inverted, gap_fill, scenario) + `hasAlternativeKeyInTip` (`src/core/eval-tip.ts`): a dica cita, normalizada, uma answerKey diferente da resposta do usuário.
- **Correção (2026-10-09):** a primeira versão quase nunca disparava. Os exemplos de feedback (`recall`, `gap_fill`, `scenario`) mandavam usar "o primeiro termo de answerKeys", o que vencia a regra do prompt e trocava a forma do usuário pela esperada; a classe `alternative` exigia uma key diferente do usuário **e** do right_answer (um terceiro termo); e o gate `answerKeys.length > 1` cortava acerto por equivalência com uma key só. Agora, em right, `right_answer` e a frase do feedback usam a forma do usuário, as fórmulas citam "o termo de right_answer", e `alternative` vale para qualquer key diferente do que o usuário escreveu, citada literalmente na dica.
- **Descarte total:** quando silenciada, a dica some inteira (`evalTip` e `evalTipClass` nulos). Antes, com classe `none`/`spelling` só a classe era anulada e o texto ainda seguia.
- **Sem efeito colateral:** status, nota e SM-2 não leem a dica. Envio e ordem (feedback, áudio, dica) inalterados.

## Exportar bolha do chat como PNG

- **Gatilho:** duplo clique ou botão de exportar na bolha (`message-bubble.tsx`), que chama `exportBubbleAsPng` (`src/lib/export-bubble.ts`), baseado em `html-to-image`.
- **Clone off-screen:** a bolha viva nunca é alterada. O export clona o nó, posiciona fora da tela (`position: fixed; left: -10000px`, sem `visibility: hidden`, que a lib copiaria e deixaria a imagem invisível) e renderiza o clone.
- **Imagem via `?inline=1`:** `/api/app/media/<id>` responde 302 para uma signed URL do Supabase (cross-origin), e o fetch interno do `html-to-image` falha em silêncio. No clone, o `src` das imagens ganha `MEDIA_INLINE_PARAM` (`buildMediaUrl(id, { inline: true })`) e a rota devolve os bytes via `downloadFile`, na mesma origem. Sem o parâmetro o comportamento é o redirect.
- **Fonte:** o Figtree (`next/font`) tem nome e URL hasheados; o embed automático falha. `getFontEmbedCSS(clone)` é passado como `fontEmbedCSS`.
- **Renderização dupla:** quando há `img`, o `toPng` roda uma vez de aquecimento (descartada). Na primeira renderização o data URL da imagem ainda não foi decodificado dentro do SVG e sai em branco.

## Assinatura recorrente (`subscriptions`)

- **Acesso × pagamento:** `User` é o dono do acesso (`planCode`, `planStatus`, `planExpiresAt`) e a única fonte lida por `canPractice`. A tabela `subscriptions` (model `Subscription`, 1:N com `User`) é dona do pagamento e nunca é consultada para liberar ou bloquear. Cortesia e acesso manual são gravados direto no `User`.
- **Uma linha por assinatura:** cancelar e assinar de novo gera outra assinatura na Stripe, logo outra linha. A assinatura atual é a mais recente (`findLatestSubscriptionByUser`, índice `[userId, createdAt]`). Período pago por fora vira linha cadastrada manualmente, sem `paymentSubscriptionId`.
- **Colunas sem fornecedor:**
  - `paymentProvider` e `paymentMethod` são texto livre, não enum. O provider é `stripe` ou qualquer valor para pagamento recebido por fora. O método é `card_credit` ou `card_debit` (a partir de `card.funding`), ou o `type` do método; por fora, `pix`, por exemplo.
  - `amount` é inteiro em centavos e `currency` é texto, com padrão `BRL`. O valor é gravado no checkout (`amount_total`) e atualizado no `invoice.paid` com `amount_paid`.
- **Webhook:**
  - O tratamento fica em `src/services/stripe-webhook-service.ts`; a route só despacha.
  - `checkout.session.completed` e `invoice.paid` fazem upsert por `paymentSubscriptionId`, a partir de `stripe.subscriptions.retrieve` com `default_payment_method`, porque a ordem de chegada dos dois não é garantida.
  - O `userId` vem de `subscription.metadata.userId`, gravado via `subscription_data.metadata` no checkout. `currentPeriodEnd` sai de `items.data[0].current_period_end` (campo de item na API atual).
  - `invoice.payment_failed` só atualiza o `status` da linha.
  - `customer.subscription.updated` grava `status` e `cancelAtPeriodEnd` (coluna booleana, padrão `false`). A marcação é `cancel_at_period_end || cancel_at !== null` (`isCancelScheduled`), porque versões novas do Portal podem programar o fim por `cancel_at`. Reativar pelo Portal desfaz a marcação no mesmo evento. Não toca no `User`. O evento entra no `stripe listen --events` do README.
- **Idempotência por valor:** `invoice.paid` só atualiza o `User` quando o `planExpiresAt` muda ou o plano não está Pro ativo. Reenvio do mesmo evento encontra o valor já gravado e não faz nada, sem tabela de eventos.
- **Mensagem só na primeira cobrança:** `formatSubscriptionConfirmed` sai só com `invoice.billing_reason === "subscription_create"`. `subscription_cycle` (renovação) e `subscription_update` (troca de plano pelo portal) atualizam o acesso sem mensagem.
- **Cancelamento:** `customer.subscription.deleted` grava `canceledAt` e `status`.
  - Fim de período (programado pelo Portal): não toca no `User`; o acesso segue até o `planExpiresAt` já pago.
  - Imediato (forçado pelo painel): detectado por `ended_at < items.data[0].current_period_end` (`isEndedBeforePeriodEnd`). `resolveAccessAfterEarlyCancel(createdAt, endedAt, now)` (`src/core/subscription.ts`): ainda no trial (`now < createdAt + TRIAL_DAYS`), `planExpiresAt = createdAt + TRIAL_DAYS`; trial encerrado, `planExpiresAt = ended_at` e o acesso expira na hora. A regra é aplicada sempre, sem comparar com o `planExpiresAt` anterior. `planCode` e `planStatus` não mudam: quem cancela no trial continua `pro` até a data.
- **Página de planos como entrada única:** o item "Assinatura" do menu aparece para todo usuário logado e sempre leva a `/app/plans`, nunca ao Portal direto. Os estados da página saem de `resolveOpenSubscriptionInterval` (Stripe aberta: "Plano atual" + Portal; com `cancelAtPeriodEnd`, a linha de renovação vira "Assinatura cancelada. Acesso até {data}", data por `formatRelativeDay`, "hoje"/"amanhã"/dd/mm/aaaa no fuso do usuário) e de `planCode === "pro" && canPractice` com assinatura mais recente que não é Stripe, ou nenhuma (aviso de acesso ativo até a data, com renovação pelo suporte). Exigir provedor não Stripe evita mostrar o aviso a quem cancelou o cartão durante o trial e ficou `pro` até o fim do teste. O Portal é gerado no clique por `GET /api/app/billing/portal`, porque a sessão expira rápido.
- **Trava contra duplicidade:** `getOrCreateCheckoutUrl` checa `hasOpenStripeSubscription` antes de tudo e, com assinatura Stripe aberta, devolve a URL do Portal em vez de criar sessão. Sem assinatura aberta, reaproveita o customer da assinatura Stripe mais recente. `User.checkoutData` guarda `interval` junto da URL, e o cache só vale para o mesmo plano.
- **Link do bloqueio:** `resolveBlockedPaymentLink` aponta para o Portal com assinatura Stripe aberta e para `/app/plans` nos demais casos. O texto do bloqueio depende de `planCode` (`formatPlanExpired`).
- **Mesma aba e retorno por ambiente:**
  - Botão de link no chat cujo origin é o `NEXT_PUBLIC_APP_URL` (`isAppUrl`, `src/lib/utils.ts`) navega na própria aba e sem ícone externo; os demais abrem em nova aba. Comparar com a env, e não com `window.location`, mantém o render igual no servidor e no cliente.
  - `success_url` (`/app?payment=success`, `PAYMENT_SUCCESS_PARAM`, que mostra um toast e limpa o parâmetro), `cancel_url` (`/app/plans`) e `return_url` do Portal (`/app/plans`) são montados a partir de `NEXT_PUBLIC_APP_URL`, então cada ambiente volta para o próprio domínio.
  - `/payment` segue no ar para links de checkout antigos ainda em cache.
- **Env:** `STRIPE_PRICE_MONTHLY` e `STRIPE_PRICE_YEARLY` (Prices recorrentes) substituem `STRIPE_PRICE_ID`, que era o Price avulso e não é reaproveitado.

## Origem no cadastro: `sourceData` em snake_case

Data: 2026-10-15

- `User.source` segue `resolveSource` (`meta_ads`, `google_ads`, `utm_source`
  cru, `direct`, `organic_search`, `referral`). `User.sourceData` passou a
  guardar só `{ utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  gclid, fbclid }` (`buildSourceData`); `referrer`, `landingPath` e
  `firstSeenAt` ficam só no cookie. Contas anteriores a esta data têm o
  formato antigo (camelCase, cookie inteiro): consultas por canal devem
  tratar os dois.
- O cookie é último toque: visita sem UTM nunca apaga uma campanha já
  gravada, e uma visita com UTM substitui o cookie anterior (inclusive um
  cookie vazio de visita direta).
- O redirect `/app` -> `/login` repete `utm_*`, `gclid` e `fbclid` na raiz da
  URL do `/login`, para a tag do GA4 atribuir a sessão.
- `purchase` só dispara depois de o servidor consultar a sessão da Stripe
  (`findPaidPurchase`): paga, do usuário logado, em BRL.
