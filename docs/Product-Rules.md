# Fluizer - Product Rules

> Regras de comportamento do produto e decisões de negócio.
> Sem código, sem referência de implementação. Para entender o que o sistema faz e por quê.

**Sobre a natureza deste documento:** este arquivo registra regras de negócio, não copy nem código. Qualquer texto de mensagem, nome de comando ou trecho ilustrativo aqui presente é exemplo de como a regra se manifesta hoje, não especificação a ser mantida palavra por palavra. Copy muda com frequência conforme o produto evolui, regra de negócio muda raramente e com decisão deliberada. Quando um exemplo for crítico o suficiente para não poder variar sem quebrar a regra, isso é sinalizado explicitamente como exceção dentro da seção correspondente.

---

## 1. Activity

Um ciclo de prática vinculado a um material ou conteúdo específico. Começa quando o usuário sobe novo material ou conclui o fluxo de nova atividade, termina por substituição. Não tem duração fixa.

Uma activity pode nascer de duas origens: material enviado pelo usuário (upload) ou conteúdo gerado a partir do fluxo de nova atividade (Seção 15). As regras de estado e transição desta seção valem igualmente para as duas origens.

**Engajamento** é definido por ao menos 1 resposta a uma pergunta de prática. Comandos não contam.

### Estados

| Status | Quando ocorre |
| ------ | ------------- |
| `active` | Atividade ativa, prática em andamento |
| `archived` | Substituído por nova atividade com ao menos 1 resposta |
| `cancelled` | Substituído por nova atividade sem nenhuma resposta |

Activity nunca encerra por inatividade. Só muda de status por ação do usuário, envio de novo material, ou conclusão do fluxo de nova atividade. O fluxo de nudge (seção 12) cuida do reengajamento enquanto a activity permanece `active`.

### Recebimento de material (buffer antes da atividade)

O material enviado pelo usuário não vira atividade imediatamente. Existe uma janela de buffer de 45 segundos a partir do primeiro envio, durante a qual o usuário pode enviar mais peças do mesmo material (por exemplo, várias fotos de páginas seguidas) sem que cada envio dispare uma atividade separada.

- Tudo que chega dentro da janela de 45 segundos é tratado como parte do mesmo material.
- Limite de 3 peças por material dentro dessa janela.
- O comando `cancelar` aborta o processamento em andamento antes da janela fechar, nesse caso, nenhuma atividade é criada e o material descartado não conta para o cap diário (seção 14).
- Ao fechar a janela, o material consolidado gera a atividade.

Essa janela de buffer não se aplica ao fluxo de nova atividade (Seção 15), que gera a atividade assim que o tema é validado e o conteúdo é gerado, sem etapa de acúmulo de peças.

### Transições ao subir novo material ou concluir o fluxo de nova atividade

- Atividade anterior teve resposta: vai para `archived`, novo ciclo começa como `active`
- Atividade anterior não teve resposta: vai para `cancelled`, novo ciclo começa como `active`

Completar todas as perguntas não altera o status. A activity permanece `active` indefinidamente até o usuário enviar outro material ou concluir o fluxo de nova atividade.

### Resumo ao trocar de atividade

Quando o usuário sobe um novo material ou conclui o fluxo de nova atividade, é criada uma nova atividade e, se a anterior teve ao menos 1 resposta, o sistema gera e envia um resumo do ciclo anterior antes da primeira pergunta do novo. O resumo é gerado uma única vez por activity, se já foi gerado, não gera novamente.

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

**Linha de leitura**, determinística, sem IA, tom seco:

- Menos de 5 respondidas: "Você mal começou esse aqui."
- 80%+ de acerto: "Mandou bem nessa atividade."
- 50 a 79% de acerto: "Essa atividade rendeu, dá pra apertar mais."
- Abaixo de 50%: "Essa atividade travou bastante. Vale revisar."

Sem emoji. Sem elogio. Leitura de resultado.

### Visibilidade ao usuário

O comando `atividade` exibe apenas activities `active` e `archived`. Os demais status são histórico interno.

---

## 2. Perguntas

Geradas na criação da atividade (upload ou fluxo de nova atividade), uma por item de vocabulário e por trecho relevante de texto ou exercício. Cada pergunta pertence a uma seção do material.

### Estados de uma pergunta

| Status | Significado |
| ------ | ----------- |
| sem status | Gerada, nunca enviada |
| pendente | Enviada, aguardando resposta |
| `right` | Respondida corretamente |
| `partial` | Resposta parcialmente correta |
| `wrong` | Respondida errado |

### Ordem de envio, primeira rodada

O sistema prioriza nessa ordem:

1. Perguntas elegíveis para revisão pelo SM-2 (ver Seção 7)
2. Perguntas ainda não enviadas
3. Perguntas erradas ou parciais
4. Qualquer pergunta por ordem de atualização

Quando todas as perguntas forem respondidas ao menos uma vez, o sistema avisa e passa para revisão contínua.

### Ordem de envio, revisão contínua

1. Perguntas elegíveis pelo SM-2
2. Erradas e parciais primeiro, depois certas

Sem critério de encerramento, loop infinito natural.

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

Conteúdo gerado pelo fluxo de nova atividade (Seção 15) já nasce classificado como `vocabulary`, não passa pela classificação desta seção.

---

## 4. Formatos de pergunta

Sete formatos disponíveis. O sorteio de formato para vocabulário acontece antes de gerar, o modelo executa, não decide.

| Formato | O que faz |
| ------- | --------- |
| gap fill | Frase com lacuna cobrindo o termo. Sempre em inglês, significado em PT entre parênteses |
| recall | Dado o significado, trazer o termo |
| recall invertido | Dado o termo, trazer o significado ou uso |
| cenário | Situação realista que leva ao uso do termo |
| múltipla escolha | 2 a 5 opções, embaralhadas antes de salvar |
| pergunta aberta | Sobre texto corrido, compreensão, reformulação, inferência |
| pergunta direta | Baseada nas perguntas do próprio material |

---

## 5. Nível e idioma das perguntas

O nível pode vir de duas fontes: informado pelo usuário ou detectado automaticamente no material enviado.

O usuário informa seu nível uma vez (no início do uso, ou quando quiser trocar) e esse nível passa a valer para qualquer atividade futura, tendo prioridade sobre o nível do material. Se o usuário não informar nível, o sistema usa o nível detectado no material enviado. Para conteúdo gerado pelo fluxo de nova atividade (Seção 15), o nível declarado do usuário é sempre a referência, não há detecção automática nesse caminho.

Cada atividade guarda o nível que foi usado para gerar suas perguntas, então o histórico permanece consistente mesmo se o usuário trocar de nível depois.

| Nível | Idioma da pergunta |
| ----- | ----------------- |
| Básico | Pergunta em PT, termo em EN |
| Intermediário | Misto PT/EN natural |
| Avançado | Majoritariamente em EN |

Se nenhum nível for identificado (nem do usuário, nem do material), assume básico.

---

## 6. Feedback

Avaliado contra as respostas esperadas geradas na criação da atividade. Tom direto, sem rodeios.

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

---

## 7. Repetição espaçada (SM-2 adaptado)

Controla quando cada pergunta volta como revisão prioritária. Não controla o ritmo de envio, isso é a cadência. O SM-2 só decide a ordem e o intervalo de elegibilidade.

**Princípio:** quanto mais o usuário erra, mais rápido a pergunta volta. Quanto mais acerta, mais espaço ganha entre revisões. Teto de 3 dias, ajustado ao ciclo curto de troca de material do produto.

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

## 8. Cadência e sessão intensiva

Sem janela de horário fixa. Mensagens enviadas 24h, respeitando o ritmo do usuário.

O sistema para de enviar perguntas quando o usuário não responde e aguarda retomada via nudge.

**Sessão intensiva** (`praticar`): perguntas chegam em sequência imediata, uma após a outra, sem esperar a cadência. Não interfere no SM-2.

### 8.1 Supressão de mensagens concorrentes

Enquanto o sistema está processando uma mensagem do usuário e ainda não enviou resposta, qualquer nova mensagem recebida nesse intervalo é ignorada, silenciosamente, sem retorno ao usuário. Isso vale para qualquer tipo de mensagem, resposta de prática ou comando, não só para o par pergunta-resposta.

Objetivo: evitar avaliação duplicada quando o usuário corrige uma resposta digitada errado em sequência rápida, e evitar que um comando enviado durante o processamento de uma resposta anterior gere resposta fora de ordem.

Janela de segurança: intervalo curto, medido em segundos, que também serve como proteção contra falha silenciosa. Se o processamento de uma mensagem travar ou não retornar, o bloqueio expira sozinho após esse intervalo, liberando o usuário para nova tentativa sem necessidade de intervenção manual.

O mesmo princípio de supressão se aplica à cadência e ao nudge enquanto o usuário está dentro do fluxo de nova atividade (Seção 15): nenhuma pergunta de cadência ou mensagem de nudge é enviada enquanto o usuário está respondendo os passos do fluxo, para não competir pela atenção com uma pergunta que ainda não existe.

### 8.2 Limite diário de prática

Controle de volume por custo, separado da cadência de envio, que já é naturalmente limitada pelo próprio ritmo de disparo.

**Limite total:** 60 práticas avaliadas (`right`, `wrong`, `partial`) por usuário por dia, cadência e intensivo somados.

**Reserva de cadência:** 24 práticas do total são reservadas. O intensivo não pode consumir mais que `60 - 24 = 36` práticas por dia. Cadência normal não tem teto próprio, é protegida por essa reserva dentro do total.

**Verificação:** antes de avaliar qualquer resposta, o sistema checa o contador do dia. Se o total já atingiu 60, bloqueia qualquer prática, cadência ou intensivo. Se for prática intensiva e o subcontador de intensivo já atingiu 36, bloqueia só o canal intensivo, cadência segue liberada até o teto total.

**Reset:** automático, pela mesma lógica de chave por usuário e data já usada nos demais contadores diários (atividades, imagens, áudios). Sem cron dedicado.

**Sessão intensiva sem teto de tempo:** o limite de 15 minutos de inatividade deixa de ser o único controle da sessão intensiva. Controle passa a ser por volume, não por duração.

Os 15 minutos de inatividade são medidos a partir do envio de cada pergunta pelo sistema, não da última resposta do usuário. A cada pergunta enviada durante a sessão, o timer se reinicia. Enquanto o usuário responde ativamente, a sessão nunca expira por tempo. Na prática, o único controle efetivo é o volume diário.

**Conclusão de rodada não encerra a sessão intensiva.** Quando todas as perguntas da primeira rodada são respondidas durante uma sessão intensiva, o usuário recebe a mensagem de conclusão de rodada seguida imediatamente pela primeira pergunta da próxima rodada, sem pausa na sessão.

**Geração de perguntas sob demanda:** quando o pool de perguntas não está completo, o sistema gera novas perguntas durante a sessão intensiva. Se a geração ainda estiver em processamento no momento em que o usuário responde, o sistema informa que a próxima pergunta está sendo preparada, em vez de aguardar a cadência normal.

**Mensagens:**

Limite total atingido:
> Você usou toda sua prática disponível de hoje, mas amanhã tem mais.

Limite do intensivo atingido, cadência ainda disponível:
> Você atingiu o limite diário de prática intensiva. Sua prática ao longo do dia continua normal.

**Números sujeitos a revisão:** calibrados por estimativa de custo por resposta avaliada, sem dado real de produção ainda. Revisar após medição real de custo por resposta, e novamente quando a geração de perguntas migrar de lote para sob demanda, o que muda a estrutura de custo por interação.

---

## 9. Comandos disponíveis

| Comando | O que faz |
| ------- | --------- |
| `ajuda` | Lista os comandos disponíveis |
| `praticar` | Inicia sessão intensiva, perguntas chegam em sequência até o limite diário (ver Seção 8.2) |
| `pausar` | Para o envio de perguntas |
| `retomar` | Retoma após pausa |
| `atividade` | Lista a atividade ativa e as anteriores |
| `nova atividade` | Inicia o fluxo de captura de nível, objetivo, tipo de conteúdo e tema, e gera uma atividade individual a partir da combinação escolhida (ver Seção 15) |
| `nivel` | Atualiza o nível de inglês declarado pelo usuário (básico, intermediário ou avançado) |
| `cancelar` | Sai do fluxo ou ação em andamento: processamento de material dentro da janela de buffer (ver Seção 1), ou qualquer passo do fluxo de nova atividade (ver Seção 15) |
| `suporte` | Aciona suporte via WhatsApp do admin |

Comandos não atualizam o histórico de prática nem contam como interação.

Usuário sem nenhuma atividade criada recebe, junto da resposta ao comando `ajuda`, orientação sobre como começar a praticar (ver Seção 10). É a mesma orientação usada no onboarding e no fallback de usuário sem atividade (ver Seção 10.1), com uma única fonte de conteúdo para as três situações, evitando que a mesma regra fique escrita de formas diferentes em pontos distintos do produto.

---

## 10. Onboarding

Sequência fixa de mensagens no primeiro contato. A estrutura, sequência com ordem fixa e prazo de trial declarado antes de qualquer ação, é regra de negócio. A quantidade de mensagens não é regra fixa, pode variar conforme necessidade de copy, desde que a ordem lógica seja preservada: saudação, proposta de valor, instrução da ação (contar o tema que quer praticar ou enviar material), o que acontece depois, prazo de trial e comandos disponíveis.

Ao final da sequência fixa, o sistema já inicia automaticamente a captura de nível (se ainda não informado) seguida do fluxo de nova atividade (Seção 15), sem que o usuário precise usar nenhum comando. Upload de material continua disponível a qualquer momento, inclusive durante esse fluxo, e cancela o fluxo automaticamente quando chega (ver Seção 15).

Mensagens da sequência não são enviadas simultaneamente. Existe intervalo deliberado entre uma e outra, simulando envio natural e evitando que o usuário receba um bloco único de texto. O valor exato do intervalo é parâmetro de configuração, não regra de negócio, e pode ser ajustado sem necessidade de atualizar este documento.

O texto abaixo é exemplo da versão atual, sujeito a revisão de copy sem que isso altere a estrutura:

**Primeiro contato** (exemplo do texto atual, em sequência):

```
Hi 👋 Bem-vindo a *Fluizer*.

Pratique inglês no seu ritmo, sobre o que fizer sentido pra você.

Só me conta o que quer praticar, ou envie um arquivo de texto, imagem ou
PDF com conteúdo em inglês: página de livro, post nas redes sociais ou
material de aula.

Ao longo do dia, chegam perguntas sobre o que você escolher praticar,
aqui mesmo.

Você tem {TRIAL_DAYS} dias pra praticar sem custo. Use *ajuda* pra ver
os comandos disponíveis.
```

O comando `nova atividade` não é mencionado nesta sequência porque o fluxo já dispara automaticamente logo em seguida, sem exigir que o usuário o digite.

### 10.1 Usuário sem atividade ativa

Usuário que envia texto solto sem nenhuma atividade criada (texto nunca é interpretado como material, ver Seção 14), ou aciona `ajuda` nessa mesma condição, recebe a mesma orientação usada no onboarding, adaptada ao contexto de quem já iniciou e ainda não tem atividade. Fonte de conteúdo única com o item de onboarding correspondente, sem redação divergente entre as situações.

---

## 11. Planos e acesso

Dois planos: Trial e Pro. Sem tier gratuito permanente.

| Plano | Duração | Acesso |
| ----- | ------- | ------ |
| Trial padrão | 3 dias | Produto completo |
| Trial por indicação de professor | 7 dias | Produto completo |
| Trial por campanha sazonal | 7 dias | Produto completo |
| Cortesia permanente | Sem expiração | Produto completo |
| Pro | 30 dias renovável | Produto completo |

Após expirar o trial: conta bloqueada até converter. Sem degradação gradual, o produto inteiro ou nada.

A regra de acesso é simples: plano ativo com data de expiração no futuro. Independe do tipo de plano.

---

## 12. Nudge de reengajamento

Fluxo automático de mensagens quando o usuário para de responder. O objetivo não é recuperar o usuário para o app, é lembrar que a prática de inglês não deve parar. O Fluizer é o meio, não o fim.

Este fluxo se aplica a usuário com ao menos uma Activity ativa, é reengajamento em torno de pergunta pendente. Usuário que nunca teve atividade criada não entra neste fluxo, esse caso é tratado pela Seção 10.1. O fluxo também é suprimido enquanto o usuário está dentro do fluxo de nova atividade (Seção 15, ver também Seção 8.1).

Nenhuma mensagem deve soar como notificação de app pedindo atenção. Cada uma tem uma razão ligada ao aprendizado.

### Fluxo de steps

| Step | Tempo desde última resposta | Tipo |
| ---- | --------------------------- | ---- |
| h4 | 4 horas | Nudge livre (janela 24h) |
| h12 | 12 horas | Nudge livre (janela 24h) |
| h23 | 23 horas | Nudge livre (janela 24h) |
| d2 | 2 dias | Template Meta - Utility |
| d3 | 3 dias | Template Meta - Utility |
| d7 | 7 dias | Template Meta - Utility |
| d14 | 14 dias | Template Meta - Utility |

**Racional do intervalo h4:** cadência normal já dispara uma pergunta em +1h após a última resposta do usuário. Se o primeiro nudge livre disparasse em +3h da última resposta, o intervalo real entre esse primeiro toque (pergunta de cadência) e o nudge seria de só 2h, dois estímulos próximos sem respiro. Ajustar o step para +4h da última resposta recompõe esse espaçamento para 3h reais entre os dois toques.

Após d14 sem resposta: usuário entra na lista de abordagem manual. Sem mensagem adicional automática.

**Reset:** qualquer resposta a uma pergunta de prática zera o fluxo completamente, `lastNudgeStep` e `lastNudgeAt` voltam a `null`.

**Step inicial baseado no tempo real:** quando `lastNudgeStep` é `null`, o cron não assume h4 automaticamente. Calcula quanto tempo passou desde `lastInteractionAt` e entra diretamente no step correspondente, pulando os já vencidos. Isso evita que um usuário que sumiu há 5 dias receba o nudge de 4h.

### Lista de abordagem manual

Usuários que chegaram ao d14 e ficaram mais de 21 dias sem interação são candidatos à abordagem pelo fundador. A saída da lista é automática quando o usuário responde qualquer pergunta.

### Mensagens, nudges livres (h4, h12, h23)

Compostas por sorteio: 1 corpo + 1 encerramento, escolhidos aleatoriamente. 25 combinações possíveis. Nunca terminam com pergunta, a resposta do usuário é sempre a resposta da pergunta pendente, não uma interação com o nudge.

**Pool de corpo:**
- "Não deixa o inglês esfriar."
- "O cérebro esquece rápido sem prática."
- "Você já começou, o mais difícil já passou."
- "Consistência é o que separa quem aprende de quem tenta."
- "Um pouquinho todo dia vale mais que muito de vez em quando."

**Pool de encerramento:**
- "É só responder."
- "Quando puder, é só responder."
- "A pergunta continua aqui te esperando."
- "Pode responder quando quiser."
- "É só responder quando estiver pronto."

### Mensagens, templates fixos (d2 a d14)

**d2:**
> Já faz 2 dias sem praticar. O vocabulário novo esquece rápido sem repetição. É só responder pra retomar.

**d3:**
> 3 dias sem praticar. O que você aprendeu começa a escapar. Retoma quando puder, é só responder.

**d7:**
> Uma semana sem praticar. Boa parte do que você treinou já começou a sumir. Ainda dá pra recuperar, é só retomar.

**d14:**
> Duas semanas. Ainda dá pra voltar do zero ou continuar de onde parou. É só responder ou enviar um material novo.

---

## 13. Relatório semanal

> **Pendente de implementação.** Recurso importante para retenção e percepção de valor, o usuário vê sua evolução real ao longo do tempo. Não existe ainda.

Quando implementado: gerado aos domingos, agrega todas as interações dos últimos 7 dias independente do status da activity.

Conteúdo planejado: materiais enviados, atividades geradas por tema, trocas totais, percentual de acerto geral, vocabulário que travou mais (top 3 a 5), evolução vs semana anterior.

---

## 14. Processamento de material

Texto solto enviado no chat nunca é interpretado como material. Só arquivo (imagem, PDF, texto em arquivo) dispara o processamento desta seção. Texto no chat tem só duas leituras possíveis: comando, ou resposta a uma pergunta de prática ou a um passo do fluxo de nova atividade (Seção 15) em andamento.

Áudio, imagem e PDF são processados em memória e descartados após extração. Nada é armazenado além do texto extraído, das seções identificadas e das perguntas geradas.

**Cap diário invisível: 5 atividades por usuário por dia.** O cap conta atividades criadas, não peças de material enviadas nem conclusões do fluxo de nova atividade, várias fotos ou páginas enviadas dentro da janela de buffer de 45 segundos (Seção 1) formam um único material e consomem uma única vaga do cap. Material abortado via `cancelar` antes do fechamento da janela não consome o cap, porque nenhuma atividade chegou a ser criada. O mesmo vale para o fluxo de nova atividade cancelado antes de gerar conteúdo.

Caps adicionais por tipo de envio, por usuário por dia: 30 áudios (máximo 60s cada), 10 imagens.

Após o processamento, a primeira pergunta é agendada com um atraso de 3 minutos, para garantir que o usuário receba a confirmação de processamento antes da primeira interação de prática. O mesmo atraso se aplica à primeira pergunta de uma atividade criada pelo fluxo de nova atividade.

**Origem do material:** cada material grava sua origem, `upload` ou `generated` (ver Seção 15). Material com origem `generated` grava também o objetivo, o tipo de conteúdo e o tema que originaram aquele conteúdo, para rastreabilidade. Material com origem `upload` não grava esses dados por enquanto.

---

## 15. Fluxo de nova atividade (conteúdo gerado por tema)

Caminho alternativo ao upload de material para criar uma atividade. O usuário informa o que quer praticar em vez de trazer material próprio, e o sistema gera o conteúdo individualmente para aquele usuário. Existe para quem não tem material formal em mãos, ou quer trocar de assunto sem procurar um arquivo.

### Disparo

O fluxo inicia de duas formas: automaticamente ao final da sequência de onboarding (Seção 10), ou a qualquer momento pelo comando `nova atividade`.

### Sequência de captura

Pergunta e resposta fixa, na ordem:

1. **Nível** — só perguntado se o usuário ainda não tem nível declarado (ver Seção 5). Se já existe, pula direto para o passo seguinte.
2. **Objetivo** — lista fechada de 4 opções: Mercado de Trabalho, Viagens Internacionais, Educação e Intercâmbio, Dia a Dia e Lazer.
3. **Tipo de conteúdo** — lista fechada: Palavras, Ações, Expressões. Um quarto tipo, Frases prontas, existe como conceito mas só fica disponível quando o sectionType `structure` existir (ver Backlog).
4. **Tema** — texto aberto do usuário, sem lista de opções fixas, com sugestões de exemplo embutidas na própria pergunta, variando por objetivo.

O termo interno usado para o tipo de conteúdo (eixo) não aparece em nenhuma copy voltada ao usuário, a pergunta é sempre formulada em linguagem natural, sem jargão de categoria.

### Estado do fluxo

Controlado por um campo de intenção pendente por usuário, com um valor por passo em andamento. Enquanto o fluxo está ativo, qualquer texto recebido do usuário é tratado como resposta ao passo atual, com prioridade sobre qualquer resposta de prática pendente. Cadência e nudge são suprimidos nesse período (ver Seção 8.1).

**Timeout:** fora do onboarding, o fluxo expira por inatividade após um tempo configurável. Ao expirar, o fluxo é cancelado silenciosamente, o usuário recebe aviso de que pode recomeçar quando quiser, e a cadência da activity em andamento retoma normal. Dentro do onboarding, o fluxo não expira, aguarda resposta indefinidamente, já que não há activity nem cadência competindo pela atenção do usuário nesse momento.

**Cancelamento:** o comando `cancelar` sai do fluxo em qualquer passo, sem criar nada.

**Upload durante o fluxo:** se chega um arquivo válido em qualquer passo do fluxo, o fluxo é cancelado silenciosamente e o arquivo segue o pipeline normal de material (Seção 14), incluindo a confirmação de substituição já existente quando há uma activity ativa em andamento (ver Seção 1). Não há confirmação adicional pelo fato de o usuário estar em meio ao fluxo, apenas a que já existe para upload comum.

### Geração de conteúdo

A combinação de nível, objetivo, tipo de conteúdo e tema é enviada para geração por LLM, que valida o tema em duas camadas antes de gerar:

1. **Encaixe:** o tema faz sentido dentro da combinação de objetivo e tipo de conteúdo escolhida.
2. **Conteúdo proibido:** o tema não recai em pornografia, sexualização, drogas, armas, discurso de ódio, xenofobia, racismo ou equivalente, mesmo quando tecnicamente se encaixaria na combinação escolhida.

Falhando qualquer uma das duas camadas, o sistema retorna um erro curto e genérico ao usuário, sem revelar qual camada falhou nem o motivo específico, e o usuário pode tentar outro tema ou cancelar. Passando nas duas, o conteúdo é gerado no mesmo formato de documento e seção que o processamento de upload já produz (Seção 3), com `sectionType` sempre `vocabulary`.

### Sem compartilhamento entre usuários

Diferente de material de upload, conteúdo gerado por este fluxo é individual: sem pool compartilhado entre usuários, sem versionamento. Cada geração é única para o usuário e para aquela troca de atividade específica. Essa é uma diferença deliberada em relação a desenhos anteriores considerados para este fluxo, o custo de geração escala por usuário e por troca, não há reuso de conteúdo entre usuários.

### Criação da atividade

Atividade criada por este fluxo segue as mesmas regras de transição e visibilidade da Seção 1 (arquiva ou cancela conforme a anterior teve resposta), e conta para o mesmo cap diário de 5 atividades por usuário por dia (Seção 14).

---

## 16. Princípios de produto

- Produto focado em inglês. A arquitetura suporta expansão para outros idiomas e matérias, mas expansão só após validação e churn controlado.
- Janela de 24h do WhatsApp é regra de ouro. Mais de 85% das mensagens devem ser enviadas dentro dela.
- O sistema não depende de o usuário abrir um app. Toda a prática acontece no WhatsApp.
- Nenhuma mensagem do sistema deve terminar com pergunta quando a resposta esperada é a de uma pergunta de prática pendente.
- Copy nunca menciona "IA", "bot" ou "agente". Linguagem tangível: o que o usuário faz e o que recebe.
- Posicionamento de complemento, não compete com professor, trabalha com ele. Isso vale igualmente para o fluxo de nova atividade (Seção 15): nenhuma copy sugere módulo, nível desbloqueado ou etapa concluída, mesmo quando o conteúdo é gerado pelo sistema em vez de trazido pelo usuário.
- Texto solto no chat nunca é interpretado como material de estudo (ver Seção 14). Só arquivo pode virar atividade, texto é sempre comando ou resposta.
- O sistema orienta ativamente o usuário sobre o que fazer, seja no primeiro contato ou sempre que algo crítico de entendimento acontecer no meio do uso. Silêncio ou resposta genérica em ponto de ambiguidade real é falha de produto, não neutralidade. Onde já aplicado: mensagem que orienta o uso de um comando usa imperativo direto ("Use *praticar* para..."), nunca fraseado condicional ("se quiser", "quando quiser"), porque fraseado condicional convida resposta em linguagem natural que o sistema não reconhece como comando.
- **O sistema nunca se personifica.** Copy não usa framing de agente em primeira pessoa ("eu vou avaliar seu material", "eu te ajudo", "eu aviso"), nem trata o produto como personagem com vontade própria. Mensagens descrevem o que acontece, não o que "eu" faço. Essa regra já existia em relação a "eu paro", "eu pauso" no contexto de comandos, passa a cobrir qualquer construção de primeira pessoa em qualquer mensagem do sistema, não só as ligadas a comandos.
- **Verbo padrão para envio de conteúdo é "enviar", não "mandar".** "Mandar" é registro mais informal e não é usado em nenhuma copy do produto. Vale para qualquer mensagem do sistema, onboarding, comandos ou fallback.
- Emoji só é usado em mensagens formatadas diretamente no código, nunca em texto gerado por LLM (feedback de avaliação, resumo de atividade quando tiver componente gerado, qualquer resposta que passe por geração de texto livre). Dentro das mensagens de código, emoji é estratégico, não decorativo, cada um carrega um significado fixo e reconhecível. Vocabulário atual: 📘 início de atividade ou seção, 📊 resumo numérico, ⚠️ limite ou bloqueio. Novo emoji só entra no vocabulário quando resolve ambiguidade real de leitura rápida, não para variar visual ou suavizar tom.