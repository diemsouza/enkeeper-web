# Dropuz — Rules

> Regras de negócio, comportamento do sistema e decisões técnicas.
> Fonte de verdade para implementação. Separado do brief narrativo.

---

## 1. Activity

### O que é
Um ciclo de prática com um material específico. Começa quando o usuário sobe material, termina por inatividade ou substituição. Não tem duração fixa.

### Critério de engajamento
Ao menos 1 resposta do usuário a uma mensagem de prática. Comandos não contam.

### Estados

| Status | Descrição |
| ------ | --------- |
| `active` | Material ativo, prática em andamento |
| `archived` | Substituído por novo material com ao menos 1 resposta |
| `cancelled` | Substituído por novo material sem nenhuma resposta |
| `completed` | Encerrado por inatividade com ao menos 1 resposta. Também é o destino de um `archived` que atingiu o TTL sem retomada |
| `abandoned` | Encerrado por inatividade sem nenhuma resposta |

### Transições ao subir novo material

- Anterior teve resposta → `archived`, nova activity criada como `active`
- Anterior não teve resposta → `cancelled`, nova activity criada como `active`

### Transições por inatividade

TTL calculado a partir de `lastInteractionAt`.

- `active` sem resposta há 7 dias com engajamento → `completed`
- `active` sem resposta há 7 dias sem engajamento → `abandoned`
- `archived` sem retomada há 7 dias → `completed`

Completar todas as perguntas não altera o status — activity permanece `active`. Status só muda por inatividade ou substituição de material.

### lastInteractionAt
Atualizado exclusivamente quando o usuário responde uma mensagem de prática. Comandos não atualizam este campo.

### Visibilidade ao usuário
`/conteudo` exibe apenas `active`, `paused` e `archived`. Demais status são histórico interno.

### deletedAt
Reservado para exclusão de conta (LGPD) ou limpeza sistêmica.

---

## 2. Questions

### O que é
Banco de perguntas geradas no upload do material. Cada `Question` pertence a uma `Section`.

### Status

| Status | Descrição |
| ------ | --------- |
| `null` | Gerada no upload, nunca enviada |
| `pending` | Enviada ao usuário, aguardando resposta |
| `right` | Respondida corretamente |
| `partial` | Respondida parcialmente |
| `wrong` | Respondida errado |

### Campos

- `question` — texto da pergunta enviada ao usuário
- `answerKeys String[]` — respostas válidas esperadas, geradas no upload, nunca exibidas ao usuário
- `answer` — o que o usuário respondeu, copiado da mensagem recebida
- `attemptCount` — quantas vezes essa pergunta foi enviada ao usuário. Incrementa a cada reenvio
- `wrongCount` — quantas vezes a avaliação retornou `wrong` ou `partial`. Incrementa em todo reenvio com esse resultado. Usado no relatório semanal para identificar vocabulário que travou
- `questionType` — `text` (default) | `audio`. Formato em que a pergunta foi enviada ao usuário
- `answerType` — `text` | `audio` | `null`. Preenchido no momento da resposta. Se a mensagem recebida for `audio` (voice note do WhatsApp), marca `audio`; caso contrário, `text`. `null` enquanto não houver resposta
- `sectionId` — relação opcional com `Section`

### Fluxo

1. Upload → `doc-extraction` identifica e separa seções → para cada seção, o prompt de geração correspondente cria as perguntas → salvas com `status: null` → atualiza `Activity.questionCount`
2. Cron seleciona próxima pergunta (ver Seleção abaixo) → envia → `status: pending` → salva `Message` com `questionId` → atualiza `Activity.lastQuestionId`
3. Usuário responde → preenche `answer` e `answerType` → avalia contra `answerKeys` → atualiza `status` para `right`, `partial` ou `wrong` → incrementa `attemptCount` → se `wrong` ou `partial`, incrementa `wrongCount`
4. Toda mensagem de pergunta, resposta do usuário e feedback carrega o `questionId` correspondente

### Seleção da próxima pergunta

Baseada em `Activity.questionRound`:

**`questionRound = 0` (primeira rodada):**
1. Tenta buscar próxima com `status = null`, exceto `lastQuestionId`, `ORDER BY updatedAt DESC LIMIT 1`
2. Retornou resultado → envia
3. Retornou vazio e todas estão `right` → primeira rodada concluída: `questionRound = 1`, envia mensagem de conclusão, busca próxima pela query geral
4. Retornou vazio e ainda há `wrong` ou `partial` → continua repescagem pela query geral sem incrementar `questionRound`

**`questionRound = 1` (revisão contínua):**
```sql
WHERE activityId = :activityId
  AND id != :lastQuestionId
ORDER BY
  CASE WHEN status IS NULL THEN 1 ELSE 0 END DESC,
  updatedAt DESC
LIMIT 1
```
Loop infinito natural — revisão contínua sem critério de encerramento.

### Conclusão da primeira rodada

Quando `questionRound` vai de `0` para `1`, envia:

> Você respondeu todas as perguntas dessa rodada. Manda novo conteúdo ou continue praticando.

O cron continua funcionando normalmente após a mensagem.

---

## 3. Sections

### O que é
Divisão do material em blocos por tipo. Cada `Section` pertence a uma `Activity` e contém suas próprias `Question[]`. É criada no upload junto com o `Doc` — não tem estado de processamento próprio, pois erros de processamento pertencem ao `Doc`.

### Tipos

| sectionType | Descrição |
| ----------- | --------- |
| `vocabulary` | Lista de palavras ou expressões isoladas para fixar |
| `text` | Texto corrido, frase, diálogo ou parágrafo para compreensão e uso |
| `exercise` | Lista de perguntas do material, com ou sem gabarito |

### Status de progresso

| status | Descrição |
| ------ | --------- |
| `null` | Nenhuma pergunta respondida ainda |
| `pending` | Ao menos 1 pergunta respondida |
| `partial` | Respondeu ao menos 1, mas não todas |
| `completed` | Todas as perguntas respondidas |

### Identificação de exercise
Só é classificado como `exercise` quando o material contém uma lista explícita de perguntas — uma ou duas perguntas soltas num texto não qualificam. O critério é estrutura de lista identificável.

---

## 4. Relatório semanal

- Gerado aos domingos.
- Agrega todas as interações dos últimos 7 dias, independente do status da activity.
- Conteúdo: materiais enviados, trocas totais, % de acerto geral, vocabulário que travou mais (top 3–5), evolução vs semana anterior.

---

## 5. Planos e acesso

### Regra de acesso
Usuário pratica se: `planStatus = active` e `planExpiresAt` no futuro. Independe de `planCode`.

### Valores de planCode
`trial` | `pro`

### Valores de planStatus
`active` | `canceled` | `past_due` | `expired`

### Cenários

| Cenário | planCode | planStatus | planExpiresAt |
| ------- | -------- | ---------- | ------------- |
| Usuário novo | trial | active | criação + 1 dia |
| Trial expirou | trial | expired | (no passado) |
| Trial estendido por campanha | trial | active | criação + 3 a 7 dias |
| Cortesia permanente (fundador, beta, parceiros) | trial | active | 2099-12-31 |
| Pagou Pro | pro | active | pagamento + 30 dias |
| Pro cancelou | pro | canceled | data do cancelamento |
| Pro com falha de cobrança | pro | past_due | data do vencimento |

### Por que cortesia usa planCode = trial
Separa cortesia de receita real. Query de pagantes filtra só `planCode = pro`. Reverter é só ajustar `planExpiresAt`.

---

## 6. Comandos

| Comando | Ação |
| ------- | ---- |
| `/ajuda` | Lista os comandos disponíveis |
| `/praticar` | Dispara próxima pergunta imediatamente, sem esperar cadência. Inicia sessão intensiva por 15 minutos |
| `/pausar` | Pausa o envio de mensagens de prática. Zera `intensiveUntil` |
| `/retomar` | Retoma o envio após pausa |
| `/conteudo` | Lista a activity `active`, `paused` e as `archived`, independente de estar pausada |
| `/suporte` | Aciona suporte via WhatsApp pessoal do admin |
| `chega por hoje` | Linguagem natural — encerra o envio do dia |

### Parse de comandos

- `/` sozinho → mesmo comportamento de `/ajuda`
- `/ajuda` → exibe menu de comandos
- `/comando` não reconhecido → "Comando não reconhecido. Manda /ajuda pra ver o que está disponível."
- Qualquer mensagem começando com `/` nunca é avaliada como resposta de prática

### Menu de comandos (/ajuda)

```
*Comandos disponíveis:*

*/ajuda* - ver essa lista
*/conteudo* - seu conteúdo atual
*/praticar* - prática intensiva
*/pausar* - pausar prática
*/retomar* - retomar prática pausada
*/suporte* - falar com suporte

_Mande um texto, áudio, imagem ou PDF para praticar._
```

### Sessão intensiva (/praticar)

- `intensiveUntil` = `now() + 15min`
- Cada resposta do usuário durante a sessão dispara a próxima pergunta imediatamente
- Sessão encerra quando `intensiveUntil` vence ou quando `/pausar` é chamado — `intensiveUntil` volta a `null`
- Conclusão de rodada não encerra a sessão — apenas zera `intensiveUntil` e envia a mensagem de conclusão; cron retoma cadência normal
- Fora da sessão, cadência normal opera normalmente

### /conteudo e pausa

`/conteudo` exibe activities com status `active`, `paused` e `archived` independente de `waitingUser`. Pausar não arquiva nem remove o conteúdo — apenas para o envio. O conteúdo só some do `/conteudo` quando substituído ou arquivado pelo fluxo padrão.

### Sem conteúdo ativo

Se o usuário manda mensagem e não há nenhuma `Activity` ativa:

> Ainda não recebi nenhum conteúdo. Manda o material que quer praticar — texto, áudio, foto ou PDF.

---

## 7. Onboarding

### Primeiro contato

Disparado quando `wa_id` é criado pela primeira vez (`onboardedAt` nulo). Quatro mensagens em sequência com ~2s de intervalo entre cada uma:

```
Hi! Bem-vindo ao *Dropuz*. 👋
```
```
Manda o material da sua aula de inglês — texto, áudio, foto ou PDF — e recebe perguntas sobre ele ao longo do dia, aqui mesmo.
```
```
Você tem 24 horas de acesso completo. Aproveite pra sentir na prática.
```
```
Mande agora pra começar. Ou use / pra ver os comandos disponíveis.
```

### Pós-primeiro-material

Disparado quando o usuário sobe o primeiro material (`activityCount === 1`). Substitui qualquer msg genérica de confirmação de upload:

```
Em alguns minutos chega a primeira pergunta. Responde de cabeça, sem consultar — o sistema avalia e guarda o que travou pra reforçar depois.

Se quiser praticar em sequência agora, use /praticar ou apenas aguarde.
```

---

## 8. Cadência de mensagens

- Primeira mensagem: 1h após o upload.
- Janela padrão: 9h–18h, intervalos de ~1–2h.
- 2 dias sem material novo: envia template leve convidando a subir conteúdo.
- Meta: mais de 85% das mensagens dentro da janela de 24h do WhatsApp.

### Fluxo de inatividade após pergunta

Quando a última mensagem do assistente é `practice_question` ou `practice_nudge` e o usuário não responde:

1. **No slot da próxima pergunta (~1–2h)** — em vez da próxima pergunta, envia lembrete leve (`intent: practice_nudge`). Agenda `nextMessageAt` para 8h depois.
2. **Após 8h** — se `lastMsg.intent = practice_nudge` e `nextMessageAt` ainda existe, envia msg de encerramento e zera `nextMessageAt` para `null`.
3. **Após isso** — silencia. Não envia mais nada até o usuário responder ou mandar novo conteúdo.

### Mensagens de inatividade

**Lembrete leve** (`practice_nudge`):
> Ainda dá tempo de responder. Quando quiser, é só mandar.

**Encerramento** (após 8h sem resposta ao nudge):
> Sua prática está pausada. Quando quiser continuar, é só responder ou mandar novo conteúdo.

---

## 9. Processamento de material

- Áudio, imagem e PDF processados em memória e descartados após extração.
- Apenas texto extraído, seções e perguntas geradas são salvos.
- No upload: 1 chamada para `doc-extraction` (identifica seções e limpa conteúdo) + 1 chamada por seção para o prompt de geração correspondente.
- Durante o dia: 1 chamada por resposta do usuário para avaliação e feedback.

### Caps técnicos invisíveis
- 5 materiais por dia por usuário
- 30 áudios por dia, máximo 60s cada
- 10 imagens por dia

---

## 10. Prompts

### Estrutura

```
prompts/
  voice.md              — persona compartilhada, usada por todos os prompts de geração e avaliação
  standard.md           — padrão de estrutura de prompt do projeto
  doc-extraction.md     — identifica seções, classifica por tipo, limpa conteúdo
  gen-vocabulary.md     — gera perguntas para seções do tipo vocabulary
  gen-text.md           — gera perguntas para seções do tipo text
  gen-exercise.md       — coleta e gera perguntas para seções do tipo exercise
  answer-evaluation.md  — avalia resposta do usuário e gera feedback
  approaches/           — prompts legados, não usar em novos fluxos
```

### Responsabilidades

**`doc-extraction.md`**
Lê o material bruto, identifica seções, classifica cada uma por `sectionType`, limpa o conteúdo. Não gera perguntas. Retorna JSON com `title`, `isValid`, `invalidReason` e `sections[]`.

**`gen-vocabulary.md`**
Recebe o `content` limpo de uma seção `vocabulary`. Gera perguntas de recall e produção — gap fill, cenário, recall invertido. Nunca pede tradução isolada. Cobre todos os itens antes de repetir.

**`gen-text.md`**
Recebe o `content` limpo de uma seção `text`. Gera perguntas ancoradas no conteúdo — compreensão, reformulação, uso em contexto. Nunca referencia posição no texto.

**`gen-exercise.md`**
Recebe o `content` limpo de uma seção `exercise`. Coleta perguntas já existentes no material. `answerKeys` vem do gabarito se houver; se não houver mas houver contexto, a IA gera respostas baseadas nesse contexto; se não houver nada, a IA gera uma ou mais respostas plausíveis.

**`answer-evaluation.md`**
Avalia a resposta do usuário contra `answerKeys`. Comportamento único independente do `sectionType` — `answerKeys` com uma entrada é mais restrito, com várias é mais aberto. Retorna `status` e `feedback`.

### Contrato de saída do doc-extraction

```json
{
  "title": "título curto, máx 8 palavras",
  "isValid": true,
  "invalidReason": null,
  "sections": [
    {
      "title": "nome da seção",
      "sectionType": "vocabulary | text | exercise",
      "order": 1,
      "content": "conteúdo limpo e fiel ao original"
    }
  ]
}
```

### Identificação de exercise
Só classifica como `exercise` quando o material contém lista explícita de perguntas. Uma ou duas perguntas soltas num texto não qualificam.

---

## 11. Regras de geração de perguntas

### Quantidade por tipo de seção

| Tipo | Regra |
| --- | --- |
| `vocabulary` | Cobre todos os itens antes de repetir. Remove ambiguidades. Máximo: 50 por seção |
| `text` | Pequeno (até 1 parágrafo): até 5. Médio (2-4 parágrafos): até 10. Grande (5+ parágrafos): até 15 |
| `exercise` | Fiel ao material. Se mais de 30 perguntas, remove ambiguidades e duplicatas. Máximo: 30 por seção |

### Persona
Cara de 50 anos, leu muito, viveu bastante, sabe de tudo um pouco. Português culto mas informal, nunca gíria, nunca formalidade de e-mail.

### Tamanho
1 a 2 frases. Máximo 30 palavras. Quanto mais curto, melhor.

### Nível e idioma
- Calibra pelo nível do material. Se não identificado, assume básico.
- Básico: pergunta em PT, termo em EN.
- Intermediário: misto PT/EN natural.
- Avançado: majoritariamente em EN, resposta esperada em EN.
- Nunca simplifique o que o material não simplificou.

### Ancoragem
Toda pergunta ancorada no material. O usuário não tem o material à mão — nunca referencie posição ou localização no texto.

### Gabarito
NUNCA coloque a resposta na própria pergunta.

### Gap fill
Underline longo: `______`. Nunca use "palavra que começa/termina com XYZ" como pista.

### Variação
Nunca repita o mesmo formato duas vezes seguidas. Formatos: `gap_fill`, `scenario`, `production`, `reformulation`, `choice`, `recall`.

---

## 12. Regras de feedback

### Correto
Confirma com leveza. Adiciona fato, variação ou uso real se couber naturalmente.

### Parcial ou errado
Traz o ponto certo como quem explica pra um amigo, não como quem corrige prova. Sem negação direta — só o certo naturalizado. Usa `answerKeys` quando relevante — forma mais natural, variações aceitas, usos reais.

### Pergunta aberta
Sem certo/errado. Enriquece com contexto ou exemplo concreto. Encerra com afirmação.

### Proibido
- "Você acertou", "muito bem", "parabéns", "ótimo"
- Repetir a pergunta anterior
- Encerrar com pergunta

---

## 13. Arquitetura e princípios

- Produto focado em inglês. Arquitetura channel-agnostic e agnóstica de matéria por baixo — expansão futura sem reescrever.
- Identidade via `wa_id`. Schema preparado para `bsuid`.
- Janela de 24h do WhatsApp é regra de ouro.
- API Routes puras. Sem dependência de funcionalidades específicas de plataforma de deploy.