# Fluizer - Product Rules

> Regras de comportamento do produto e decisões de negócio.
> Sem código, sem referência de implementação. Para entender o que o sistema faz e por quê.

---

## 1. Activity

Um ciclo de prática vinculado a um material específico. Começa quando o usuário sobe novo material, termina por substituição (novo material). Não tem duração fixa.

**Engajamento** é definido por ao menos 1 resposta a uma pergunta de prática. Comandos não contam.

### Estados

| Status | Quando ocorre |
| ------ | ------------- |
| `active` | Atividade ativa, prática em andamento |
| `archived` | Substituído por nova atividade com ao menos 1 resposta |
| `cancelled` | Substituído por nova atividade sem nenhuma resposta |

Activity nunca encerra por inatividade. Só muda de status por ação do usuário - envio de novo material. O fluxo de nudge (seção 13) cuida do reengajamento enquanto a activity permanece `active`.

### Recebimento de material (buffer antes da atividade)

O material enviado pelo usuário não vira atividade imediatamente. Existe uma janela de buffer de 45 segundos a partir do primeiro envio, durante a qual o usuário pode mandar mais peças do mesmo material (por exemplo, várias fotos de páginas seguidas) sem que cada envio dispare uma atividade separada.

- Tudo que chega dentro da janela de 45 segundos é tratado como parte do mesmo material.
- Limite de 3 peças por material dentro dessa janela.
- O comando `cancelar` aborta o processamento em andamento antes da janela fechar - nesse caso, nenhuma atividade é criada e o material descartado não conta para o cap diário (seção 15).
- Ao fechar a janela, o material consolidado gera a atividade.

### Transições ao subir novo material (criar nova atividade)

- Atividade anterior teve resposta: vai para `archived`, novo ciclo começa como `active`
- Atividade anterior não teve resposta: vai para `cancelled`, novo ciclo começa como `active`

Completar todas as perguntas não altera o status. A activity permanece `active` indefinidamente até o usuário enviar outro material.

### Resumo ao trocar de material (nova atividade)

Quando o usuário sobe um novo material é criada uma nova atividade e, se a anterior teve ao menos 1 resposta, o sistema gera e envia um resumo do ciclo anterior antes da primeira pergunta do novo. O resumo é gerado uma única vez por activity - se já foi gerado, não gera novamente.

**Formato do resumo:**

```
Enquanto a próxima pergunta não chega, segue um resumo da atividade anterior.

Sua atividade anterior: *{título}*

Período: {duração}
Perguntas: {total gerado}
Respondidas: {total respondido}
Revisadas: {respondidas mais de uma vez}
Corretas: {acertos}
Erradas: {erros + parciais}

{linha de leitura}
```

**Linha de leitura** - determinística, sem IA, tom seco:

- Menos de 5 respondidas: "Você mal começou esse aqui."
- 80%+ de acerto: "Mandou bem nessa atividade."
- 50–79% de acerto: "Essa atividade rendeu, dá pra apertar mais."
- Abaixo de 50%: "Essa atividade travou bastante. Vale revisar."

Sem emoji no texto do resumo. Sem elogio. Leitura de resultado. O emoji de marcação estrutural que abre a mensagem segue a regra da Seção 7 (Padrões visuais).

### Orientação após primeira resposta

Na primeira resposta de uma nova activity, além do feedback normal, o sistema envia uma mensagem extra orientando o usuário sobre o que esperar a seguir: a próxima pergunta chega no ritmo normal da cadência, ou o usuário pode ativar o modo prática intensiva para responder em sequência imediata.

Critério: não exige campo de estado novo. Verifica se a resposta processada é a primeira resposta (`right`, `wrong` ou `partial`) daquela activity. Dispara uma única vez por activity.

Mensagem:

> A próxima pergunta chega mais tarde, no ritmo normal. Se quiser, use *praticar* e ative o modo intensivo agora.

### Visibilidade ao usuário

O comando `atividade` exibe apenas activities `active` e `archived`. Os demais status são histórico interno.

---

## 2. Perguntas

Geradas no upload do material, uma por item de vocabulário e por trecho relevante de texto ou exercício. Cada pergunta pertence a uma seção do material.

### Estados de uma pergunta

| Status | Significado |
| ------ | ----------- |
| sem status | Gerada, nunca enviada |
| pendente | Enviada, aguardando resposta |
| `right` | Respondida corretamente |
| `partial` | Resposta parcialmente correta |
| `wrong` | Respondida errado |

### Ordem de envio - primeira rodada

O sistema prioriza nessa ordem:

1. Perguntas elegíveis para revisão pelo SM-2 (ver Seção 8)
2. Perguntas ainda não enviadas
3. Perguntas erradas ou parciais
4. Qualquer pergunta por ordem de atualização

Quando todas as perguntas forem respondidas ao menos uma vez, o sistema avisa e passa para revisão contínua.

### Ordem de envio - revisão contínua

1. Perguntas elegíveis pelo SM-2
2. Erradas e parciais primeiro, depois certas

Sem critério de encerramento - loop infinito natural.

### Conclusão da primeira rodada

Mensagem enviada ao usuário:

> Você respondeu todas as perguntas dessa rodada. Envie novo material ou continue praticando.

---

## 3. Seções do material

O material é dividido em blocos por tipo antes de gerar as perguntas. Cada bloco tem seu próprio conjunto de perguntas e formatos.

| Tipo | Descrição | Formatos de pergunta |
| ---- | --------- | -------------------- |
| `vocabulary` | Lista de palavras ou expressões isoladas | gap fill, recall, recall invertido, cenário, múltipla escolha |
| `text` | Texto corrido, frase, diálogo ou parágrafo | pergunta aberta |
| `exercise` | Lista de perguntas do próprio material | pergunta direta |

`exercise` só é classificado assim quando o material contém uma lista explícita de perguntas. Uma ou duas perguntas soltas num texto não qualificam.

---

## 4. Formatos de pergunta

Sete formatos disponíveis. O sorteio de formato para vocabulário acontece antes de gerar - o modelo executa, não decide.

| Formato | O que faz |
| ------- | --------- |
| gap fill | Frase com lacuna cobrindo o termo. Sempre em inglês, significado em PT entre parênteses |
| recall | Dado o significado, trazer o termo |
| recall invertido | Dado o termo, trazer o significado ou uso |
| cenário | Situação realista que leva ao uso do termo |
| múltipla escolha | 2 a 5 opções, embaralhadas antes de salvar |
| pergunta aberta | Sobre texto corrido - compreensão, reformulação, inferência |
| pergunta direta | Baseada nas perguntas do próprio material |

---

## 5. Nível e idioma das perguntas

O nível pode vir de duas fontes: informado pelo usuário ou detectado automaticamente no material enviado.

O usuário informa seu nível uma vez (no início do uso, ou quando quiser trocar) e esse nível passa a valer para qualquer atividade futura, tendo prioridade sobre o nível do material. Se o usuário não informar nível, o sistema usa o nível detectado no material enviado.

Cada atividade guarda o nível que foi usado para gerar suas perguntas, então o histórico permanece consistente mesmo se o usuário trocar de nível depois.

| Nível | Idioma da pergunta |
| ----- | ----------------- |
| Básico | Pergunta em PT, termo em EN |
| Intermediário | Misto PT/EN natural |
| Avançado | Majoritariamente em EN |

Se nenhum nível for identificado (nem do usuário, nem do material), assume básico.

---

## 6. Feedback

Avaliado contra as respostas esperadas geradas no upload. Tom direto, sem rodeios.

**Abertura por resultado:**
- Certo: "Boa!", "Correto!", "Exato!" ou "Perfeito!"
- Errado: "Errado!", "Infelizmente não!", "Ops, errado!" ou "Hmmm, errou!"
- Parcial: "Quase!", "Por pouco!" ou "Quase lá!"

**Proibido em qualquer feedback:**
- Explicar o significado óbvio do termo
- Traduzir o termo
- Repetir ou parafrasear a pergunta
- Encerrar com pergunta
- Usar travessão como separador
- Usar emoji fora do padrão definido na Seção 7

---

## 7. Padrões visuais

Produto é só texto, sem imagem, áudio de interface ou botão nativo. Emoji é usado de forma restrita, só como marcador estrutural em pontos onde a mensagem se perde no meio do fluxo de texto corrido, nunca como decoração.

Três marcadores fixos:

| Emoji | Uso | Onde aparece |
| ----- | --- | ------------- |
| 📘 | Início ou continuação de atividade/seção | Mensagem de transição ao começar a praticar um novo bloco de conteúdo |
| 📊 | Fechamento com números | Resumo da atividade anterior (Seção 1) |
| ⚠️ | Limite atingido ou estado que trava o fluxo | Limite diário de atividades, limite de materiais por atividade, pergunta pendente ao ativar modo intensivo |

Fora esses três casos, destaque de texto é feito com `*negrito*` (comandos, títulos) e `_itálico_` (instruções secundárias), nunca com emoji novo. Dicas de comando pontuais, mensagens de menu e nudges de reengajamento (Seção 13) não usam emoji - nudge em especial depende de variação textual, não de marcador fixo, para não perder a naturalidade do sorteio de combinações.

Onboarding (Seção 11) mantém o emoji já em uso (👋) como exceção histórica de abertura, não como parte deste padrão.

---

## 8. Repetição espaçada (SM-2 adaptado)

Controla quando cada pergunta volta como revisão prioritária. Não controla o ritmo de envio - isso é a cadência. O SM-2 só decide a ordem e o intervalo de elegibilidade.

**Princípio:** quanto mais o usuário erra, mais rápido a pergunta volta. Quanto mais acerta, mais espaço ganha entre revisões. Teto de 3 dias - ajustado ao ciclo curto de troca de material do produto.

**Como o intervalo é calculado a cada resposta:**

- Errou ou parcial: próxima revisão em 1 dia
- Acertou: próxima revisão em `intervalo_anterior * fator_de_facilidade`, máximo 3 dias

O fator de facilidade começa em 2.5, sobe com acertos (+0.1) e cai com erros (-0.2) ou parciais (-0.15). Mínimo de 1.3.

**Quando o SM-2 recalcula:**

- Primeira resposta: sempre calcula
- Resposta por elegibilidade SM-2: recalcula
- Resposta pelo fallback (pergunta ainda não estava elegível): não recalcula. O SM-2 permanece inalterado até a pergunta aparecer como elegível

Perguntas respondidas várias vezes no mesmo dia pelo fallback não recalculam o SM-2. Só recalcula no dia seguinte, quando a elegibilidade vencer.

---

## 9. Cadência e sessão intensiva

Sem janela de horário fixa. Mensagens enviadas 24h, respeitando o ritmo do usuário.

O sistema para de enviar perguntas quando o usuário não responde e aguarda retomada via nudge.

**Sessão intensiva** (`praticar`): perguntas chegam em sequência imediata, uma após a outra, sem esperar a cadência. Encerra por dois motivos: uso do comando `pausar`, ou 15 minutos sem resposta do usuário. Não interfere no SM-2.

Entre o feedback de uma resposta e o envio da próxima pergunta, existe um pequeno intervalo (poucos segundos) antes do disparo. Isso evita que o usuário receba a próxima pergunta antes de processar o feedback da anterior, mantendo o modo intensivo fluido sem virar disparo instantâneo sem pausa nenhuma.

---

## 10. Comandos disponíveis

| Comando | O que faz |
| ------- | --------- |
| `ajuda` | Lista os comandos disponíveis |
| `praticar` | Inicia sessão intensiva - perguntas chegam em sequência até pausar ou 15 minutos sem resposta |
| `pausar` | Para o envio de perguntas |
| `retomar` | Retoma após pausa |
| `atividade` | Lista a atividade ativa e as anteriores |
| `nivel` | Atualiza o nível de inglês declarado pelo usuário (básico, intermediário ou avançado) |
| `cancelar` | Aborta o processamento do material em andamento, dentro da janela de buffer (ver Seção 1) |
| `suporte` | Aciona suporte via WhatsApp do admin |

Comandos não atualizam o histórico de prática nem contam como interação.

---

## 11. Onboarding

**Primeiro contato** (4 mensagens em sequência):

```
Hi! Bem-vindo ao *Fluizer*. 👋

Envie o material da sua aula de inglês - texto, imagem ou PDF - e recebe perguntas sobre ele ao longo do dia, aqui mesmo.

Você tem 24 horas pra sentir na prática. Aproveita!

Mande agora pra começar. Ou use ajuda pra ver os comandos disponíveis.
```

**Após primeiro material:**

```
Em alguns minutos chega a primeira pergunta.
```

---

## 12. Planos e acesso

Dois planos: Trial e Pro. Sem tier gratuito permanente.

| Plano | Duração | Acesso |
| ----- | ------- | ------ |
| Trial padrão | 3 dias | Produto completo |
| Trial por indicação de professor | 7 dias | Produto completo |
| Trial por campanha sazonal | 7 dias | Produto completo |
| Cortesia permanente | Sem expiração | Produto completo |
| Pro | 30 dias renovável | Produto completo |

Após expirar o trial: conta bloqueada até converter. Sem degradação gradual - o produto inteiro ou nada.

A regra de acesso é simples: plano ativo com data de expiração no futuro. Independe do tipo de plano.

---

## 13. Nudge de reengajamento

Fluxo automático de mensagens quando o usuário para de responder. O objetivo não é recuperar o usuário para o app - é lembrar que a prática de inglês não deve parar. O Fluizer é o meio, não o fim.

Nenhuma mensagem deve soar como notificação de app pedindo atenção. Cada uma tem uma razão ligada ao aprendizado.

### Fluxo de steps

| Step | Tempo desde última resposta | Tipo |
| ---- | --------------------------- | ---- |
| h3 | 3 horas | Nudge livre (janela 24h) |
| h12 | 12 horas | Nudge livre (janela 24h) |
| h23 | 23 horas | Nudge livre (janela 24h) |
| d2 | 2 dias | Template Meta - Utility |
| d3 | 3 dias | Template Meta - Utility |
| d7 | 7 dias | Template Meta - Utility |
| d14 | 14 dias | Template Meta - Utility |

Após d14 sem resposta: usuário entra na lista de abordagem manual. Sem mensagem adicional automática.

**Reset:** qualquer resposta a uma pergunta de prática zera o fluxo completamente - `lastNudgeStep` e `lastNudgeAt` voltam a `null`.

**Step inicial baseado no tempo real:** quando `lastNudgeStep` é `null`, o cron não assume h2 automaticamente. Calcula quanto tempo passou desde `lastInteractionAt` e entra diretamente no step correspondente, pulando os já vencidos. Isso evita que um usuário que sumiu há 5 dias receba o nudge de 2h.

### Lista de abordagem manual

Usuários que chegaram ao d14 e ficaram mais de 21 dias sem interação são candidatos à abordagem pelo fundador. A saída da lista é automática quando o usuário responde qualquer pergunta.

### Mensagens - nudges livres (h3, h12, h23)

Compostas por sorteio: 1 corpo + 1 encerramento, escolhidos aleatoriamente entre pools de texto. Nunca terminam com pergunta - a resposta do usuário é sempre a resposta da pergunta pendente, não uma interação com o nudge. Sem emoji, conforme Seção 7.

Texto dos pools não é regra fixa de produto, pode ser ajustado a qualquer momento sem impacto estrutural. Exemplos de corpo: "Não deixa o inglês esfriar.", "Consistência é o que separa quem aprende de quem tenta.", "A repetição é o que fixa o aprendizado.". Exemplos de encerramento: "É só responder.", "A pergunta continua aqui te esperando.", "Pode responder quando quiser.".

### Mensagens - templates fixos (d2 a d14)

**d2:**
> Já faz 2 dias sem praticar. O vocabulário novo esquece rápido sem repetição. É só responder pra retomar.

**d3:**
> 3 dias sem praticar. O que você aprendeu começa a escapar. Retoma quando puder, é só mandar uma resposta.

**d7:**
> Uma semana sem praticar. Boa parte do que você treinou já começou a sumir. Ainda dá pra recuperar, é só retomar.

**d14:**
> Duas semanas. Ainda dá pra voltar do zero ou continuar de onde parou. É só mandar uma resposta ou um material novo.

---

## 14. Relatório semanal

> **Pendente de implementação.** Recurso importante para retenção e percepção de valor - o usuário vê sua evolução real ao longo do tempo. Não existe ainda.

Quando implementado: gerado aos domingos, agrega todas as interações dos últimos 7 dias independente do status da activity.

Conteúdo planejado: materiais enviados, trocas totais, percentual de acerto geral, vocabulário que travou mais (top 3 a 5), evolução vs semana anterior.

---

## 15. Processamento de material

Áudio, imagem e PDF são processados em memória e descartados após extração. Nada é armazenado além do texto extraído, das seções identificadas e das perguntas geradas.

**Cap diário invisível: 5 atividades por usuário por dia.** O cap conta atividades criadas, não peças de material enviadas - várias fotos ou páginas mandadas dentro da janela de buffer de 45 segundos (Seção 1) formam um único material e consomem uma única vaga do cap. Material abortado via `cancelar` antes do fechamento da janela não consome o cap, porque nenhuma atividade chegou a ser criada.

Caps adicionais por tipo de envio, por usuário por dia: 30 áudios (máximo 60s cada), 10 imagens.

---

## 16. Princípios de produto

- Produto focado em inglês. A arquitetura suporta expansão para outros idiomas e matérias, mas expansão só após validação e churn controlado.
- Janela de 24h do WhatsApp é regra de ouro. Mais de 85% das mensagens devem ser enviadas dentro dela.
- O sistema não depende de o usuário abrir um app. Toda a prática acontece no WhatsApp.
- Nenhuma mensagem do sistema deve terminar com pergunta quando a resposta esperada é a de uma pergunta de prática pendente.
- Copy nunca menciona "IA", "bot" ou "agente". Linguagem tangível: o que o usuário faz e o que recebe.
- Posicionamento de complemento - não compete com professor, trabalha com ele.