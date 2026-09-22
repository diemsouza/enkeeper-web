# Fluizer - Technical Decisions

Registro de decisões técnicas que não são óbvias a partir do código ou do
Product-Rules, pra não se perder depois. Ordem cronológica, mais recente no
topo.

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
  a mesma função já usada no lembrete diário via WhatsApp
  (`daily-reminder-cron.service.ts`), sem somar perguntas com `status: "pending"`
  — essa contagem na prática nunca passa de 0 ou 1 por Activity e não faz parte
  da definição de "dívida de revisão" já documentada no produto.
