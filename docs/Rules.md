# Dropuz — Rules

> Regras de negócio, comportamento do sistema e decisões técnicas.
> Fonte de verdade para implementação. Separado do brief narrativo.

---

## 1. Activity

### O que é
Um ciclo de prática com um material específico. Começa quando o usuário sobe material, termina por inatividade ou substituição. Não tem duração fixa — pode durar 1 dia ou várias semanas dependendo do engajamento.

### Critério de engajamento
Ao menos 1 resposta do usuário a uma mensagem de prática. Mensagens de comando (`/pausar`, `/conteudo` etc.) não contam.

### Estados

| Status | Descrição |
| ------ | --------- |
| `active` | Material ativo, prática em andamento |
| `archived` | Substituído por novo material com ao menos 1 resposta. Pode ser retomado no futuro |
| `cancelled` | Substituído por novo material sem nenhuma resposta |
| `completed` | Encerrado por inatividade com ao menos 1 resposta. Também é o destino de um `archived` que atingiu o TTL sem retomada |
| `abandoned` | Encerrado por inatividade sem nenhuma resposta |

### Transições ao subir novo material

- Anterior teve resposta → `archived`, nova activity criada como `active`
- Anterior não teve resposta → `cancelled`, nova activity criada como `active`

### Transições por inatividade

TTL calculado sempre a partir da última resposta do usuário à prática (`lastInteractionAt`), não da criação da activity.

- `active` sem resposta há 7 dias com engajamento → `completed`
- `active` sem resposta há 7 dias sem engajamento → `abandoned`
- `archived` sem retomada há 7 dias → `completed`

### lastInteractionAt
Atualizado exclusivamente quando o usuário responde uma mensagem de prática da activity ativa. Comandos e mensagens fora de contexto de prática não atualizam este campo.

### Visibilidade ao usuário
`/conteudo` exibe apenas `active` e `archived`. Os demais status são histórico interno — usados para métricas e relatório semanal, nunca exibidos.

### deletedAt
Campo operacional. Nunca acionado pelo fluxo normal de prática. Reservado para exclusão de conta (LGPD) ou limpeza sistêmica.

---

## 2. Relatório semanal

- Gerado aos domingos.
- Agrega todas as interações dos últimos 7 dias, independente do status da activity.
- Uma activity iniciada no meio da semana entra normalmente no relatório do domingo seguinte.
- Conteúdo: materiais enviados, trocas totais, tópicos praticados, conceitos com boa resposta, pontos de travamento.

---

## 3. Planos e acesso

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
Separa cortesia de receita real automaticamente. Query de pagantes ativos filtra apenas `planCode = pro`. Métricas de MRR não são contaminadas. Reverter uma cortesia é só ajustar `planExpiresAt`.

---

## 4. Comandos

| Comando | Ação |
| ------- | ---- |
| `/pausar` | Pausa o envio de mensagens de prática |
| `/retomar` | Retoma o envio após pausa |
| `/conteudo` | Lista a activity `active` e as `archived` |
| `/suporte` | Aciona suporte via WhatsApp pessoal do admin |
| `chega por hoje` | Linguagem natural — encerra o envio do dia |

---

## 5. Cadência de mensagens

- Primeira mensagem: 1h após o upload.
- Janela padrão: 9h–18h, intervalos de ~1–2h.
- Se o usuário não responde: insiste 1 vez, depois acumula e aguarda.
- 2 dias sem material novo: envia template leve convidando a subir conteúdo.
- Meta: mais de 85% das mensagens enviadas dentro da janela de 24h do WhatsApp (sem custo de template).

---

## 6. Processamento de material

- Áudio, imagem e PDF são processados em memória e descartados após extração.
- Apenas o texto extraído e os tópicos derivados são salvos.
- No upload: 1 chamada para detectar tipo de material e extrair 8–12 tópicos centrais.
- Durante o dia: 1 chamada por interação, usando o próximo tópico e a última resposta do usuário.

### Caps técnicos invisíveis
- 5 materiais por dia por usuário
- 30 áudios por dia, máximo 60s cada
- 10 imagens por dia
- 12 mensagens geradas por dia

---

## 7. Regras de geração de mensagens

### Persona
Cara de 50 anos, leu muito, viveu bastante, sabe de tudo um pouco. Conversa sobre qualquer assunto com a mesma naturalidade — de vocabulário em inglês a devocional, de fórmula de química a filosofia. Português culto mas informal, nunca gíria, nunca formalidade de e-mail.

### Tamanho
1 frase. 2 frases só se inevitável. Corta se passar de 25 palavras.

### Contexto de uso
O usuário não está com o material na frente. A mensagem chega horas depois do upload. Todo conteúdo necessário para responder deve estar na própria mensagem — o usuário responde de cabeça, não de consulta.

### Estrutura
Cada mensagem tem exatamente um movimento: um pedido, uma pergunta ou um mini-cenário. A mensagem provoca e encerra.

### Encerramento
Sempre com afirmação ou fato. Nunca com pergunta — incluindo perguntas disfarçadas de curiosidade ou enriquecimento.

### Gap fill
Usa underline longo: `______`. Nunca underline curto ou único.

### Idioma
- Padrão: português brasileiro.
- Material em inglês com abordagem `practice`: alterna PT/EN naturalmente na mesma mensagem.
- Material em inglês com outras abordagens: cita termos em inglês quando necessário, conversa em português.

---

## 8. Regras de feedback

### Correto
Confirma em meia frase. Adiciona fato, variação ou uso real relacionado se couber naturalmente.

### Parcial ou errado
Traz o ponto certo direto, sem nomear o erro. Nunca usa "errado", "incorreto" ou equivalentes.

### Pergunta aberta ou reflexão (abordagem reflect)
Sem certo/errado. Enriquece o que o usuário disse com contexto ou exemplo concreto. Encerra com afirmação.

### Proibido em qualquer feedback
- "Você acertou", "muito bem", "parabéns", "ótimo"
- Repetir a pergunta anterior
- Encerrar com pergunta

---

## 9. Arquitetura e princípios

- Schema agnóstico: tipo de material é coluna, não tabela separada.
- Channel-agnostic: a lógica de negócio não conhece o canal de origem. WhatsApp, Telegram e outros são adaptadores.
- Identidade via número de telefone (`wa_id`). Schema preparado para transição para `bsuid`.
- Janela de 24h do WhatsApp é regra de ouro: todo fluxo é otimizado para manter a conversa dentro dela e evitar custo de template.
- API Routes puras. Sem dependência de funcionalidades específicas de plataforma de deploy.
