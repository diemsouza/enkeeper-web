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

| Status      | Descrição                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `active`    | Material ativo, prática em andamento                                                                                  |
| `archived`  | Substituído por novo material com ao menos 1 resposta                                                                 |
| `cancelled` | Substituído por novo material sem nenhuma resposta                                                                    |
| `completed` | Encerrado por inatividade com ao menos 1 resposta. Também é o destino de um `archived` que atingiu o TTL sem retomada |
| `abandoned` | Encerrado por inatividade sem nenhuma resposta                                                                        |

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

`/conteudo` exibe apenas `active` e `archived`. Demais status são histórico interno.

### deletedAt

Reservado para exclusão de conta (LGPD) ou limpeza sistêmica.

---

## 2. Questions

### O que é

Banco de perguntas geradas no upload do material. Cada `Question` pertence a uma `Activity`.

### Status

| Status    | Descrição                               |
| --------- | --------------------------------------- |
| `null`    | Gerada no upload, nunca enviada         |
| `pending` | Enviada ao usuário, aguardando resposta |
| `right`   | Respondida corretamente                 |
| `partial` | Respondida parcialmente                 |
| `wrong`   | Respondida errado                       |

### Campos

- `question` — texto da pergunta enviada ao usuário
- `answerKeys String[]` — respostas válidas esperadas, geradas no upload, nunca exibidas ao usuário
- `answer` — o que o usuário respondeu, copiado da mensagem recebida
- `attemptCount` — quantas vezes essa pergunta foi enviada ao usuário. Incrementa a cada reenvio
- `wrongCount` — quantas vezes a avaliação retornou `wrong` ou `partial`. Incrementa em todo reenvio com esse resultado. Usado no relatório semanal para identificar vocabulário que travou
- `questionType` — `text` (default) | `audio`. Formato em que a pergunta foi enviada ao usuário
- `answerType` — `text` | `audio` | `null`. Preenchido no momento da resposta. Se a mensagem recebida for `audio` (voice note do WhatsApp), marca `audio`; caso contrário, `text`. `null` enquanto não houver resposta

### Fluxo

1. Upload → `question-extraction` gera todas as perguntas → salvas com `status: null` → atualiza `Activity.questionCount`
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

## 3. Relatório semanal

- Gerado aos domingos.
- Agrega todas as interações dos últimos 7 dias, independente do status da activity.
- Conteúdo: materiais enviados, trocas totais, % de acerto geral, vocabulário que travou mais (top 3–5), evolução vs semana anterior.

---

## 4. Planos e acesso

### Regra de acesso

Usuário pratica se: `planStatus = active` e `planExpiresAt` no futuro. Independe de `planCode`.

### Valores de planCode

`trial` | `pro`

### Valores de planStatus

`active` | `canceled` | `past_due` | `expired`

### Cenários

| Cenário                                         | planCode | planStatus | planExpiresAt        |
| ----------------------------------------------- | -------- | ---------- | -------------------- |
| Usuário novo                                    | trial    | active     | criação + 1 dia      |
| Trial expirou                                   | trial    | expired    | (no passado)         |
| Trial estendido por campanha                    | trial    | active     | criação + 3 a 7 dias |
| Cortesia permanente (fundador, beta, parceiros) | trial    | active     | 2099-12-31           |
| Pagou Pro                                       | pro      | active     | pagamento + 30 dias  |
| Pro cancelou                                    | pro      | canceled   | data do cancelamento |
| Pro com falha de cobrança                       | pro      | past_due   | data do vencimento   |

### Por que cortesia usa planCode = trial

Separa cortesia de receita real. Query de pagantes filtra só `planCode = pro`. Reverter é só ajustar `planExpiresAt`.

---

## 5. Comandos

| Comando          | Ação                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `/pausar`        | Pausa o envio de mensagens de prática. Zera `intensiveUntil`                                         |
| `/retomar`       | Retoma o envio após pausa                                                                            |
| `/praticar`      | Dispara próxima pergunta imediatamente, sem esperar cadência. Inicia sessão intensiva por 15 minutos |
| `/conteudo`      | Lista a activity `active` e as `archived`                                                            |
| `/suporte`       | Aciona suporte via WhatsApp pessoal do admin                                                         |
| `chega por hoje` | Linguagem natural — encerra o envio do dia                                                           |

### Sessão intensiva (/praticar)

- `intensiveUntil` = `now() + 15min`
- Cada resposta do usuário durante a sessão dispara a próxima pergunta imediatamente
- Sessão encerra quando `intensiveUntil` vence ou quando `/pausar` é chamado — `intensiveUntil` volta a `null`
- Conclusão de rodada não encerra a sessão — apenas zera `intensiveUntil` e envia a mensagem de conclusão; cron retoma cadência normal
- Fora da sessão, cadência normal opera normalmente

### Sem conteúdo ativo

Se o usuário manda mensagem e não há nenhuma `Activity` ativa:

> Ainda não recebi nenhum conteúdo. Manda o material que quer praticar — texto, áudio, foto ou PDF.

---

## 6. Cadência de mensagens

- Primeira mensagem: 1h após o upload.
- Janela padrão: 9h–18h, intervalos de ~1–2h.
- Se o usuário não responde: insiste 1 vez, depois acumula e aguarda.
- 2 dias sem material novo: envia template leve convidando a subir conteúdo.
- Meta: mais de 85% das mensagens dentro da janela de 24h do WhatsApp.

---

## 7. Processamento de material

- Áudio, imagem e PDF processados em memória e descartados após extração.
- Apenas texto extraído, tópicos e perguntas geradas são salvos.
- No upload: 1 chamada para extrair tópicos (`Doc.topicsData`) + 1 chamada para gerar todas as perguntas (`Question[]`).
- Durante o dia: 1 chamada por resposta do usuário para avaliação e feedback.

### Caps técnicos invisíveis

- 5 materiais por dia por usuário
- 30 áudios por dia, máximo 60s cada
- 10 imagens por dia

---

## 8. Regras de geração de perguntas

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

## 9. Regras de feedback

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

## 10. Arquitetura e princípios

- Produto focado em inglês. Arquitetura channel-agnostic e agnóstica de matéria por baixo — expansão futura sem reescrever.
- Identidade via `wa_id`. Schema preparado para `bsuid`.
- Janela de 24h do WhatsApp é regra de ouro.
- API Routes puras. Sem dependência de funcionalidades específicas de plataforma de deploy.
