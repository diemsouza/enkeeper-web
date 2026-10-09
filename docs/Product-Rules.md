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

Cada mudança de status é registrada com a data em que ocorreu, permitindo saber precisamente há quanto tempo uma activity está em determinado status, sem depender de qualquer campo técnico genérico de atualização, que pode mudar por motivos não relacionados ao status (ex: uma edição pontual de título não deve ser confundida com uma transição de status).

Activity nunca encerra por inatividade. Só muda de status por ação do usuário, envio de novo material, ou conclusão do fluxo de nova atividade. O lembrete diário e o reengajamento (Seção 12) cuidam de trazer o usuário de volta enquanto a activity permanece `active`.

### Recebimento de material (buffer antes da atividade)

O material enviado pelo usuário não vira atividade imediatamente. Existe uma janela de buffer de 45 segundos a partir do primeiro envio, durante a qual o usuário pode enviar mais peças do mesmo material (por exemplo, várias fotos de páginas seguidas) sem que cada envio dispare uma atividade separada.

- Tudo que chega dentro da janela de 45 segundos é tratado como parte do mesmo material.
- Limite de 3 peças por material dentro dessa janela.
- O comando `cancelar` aborta o processamento em andamento antes da janela fechar, nesse caso, nenhuma atividade é criada e o material descartado não conta para o cap diário (seção 14).
- Ao fechar a janela, o material consolidado gera a atividade.

Essa janela de buffer não se aplica ao fluxo de nova atividade (Seção 15), que gera a atividade assim que o ponto é resolvido e o conteúdo é gerado, sem etapa de acúmulo de peças.

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

**Camada de imagem (pentágono de desempenho):** junto do texto do resumo vai uma imagem, um gráfico de radar de 5 eixos gerado por template (sem IA, sem custo de LLM por envio). Os eixos são os componentes que alimentam o cálculo de score (Seção 6.3), não o score em si; o score entra só como número na legenda. Eixos, todos normalizados 0 a 1 contra um teto natural:

| Eixo | Fração | Teto |
| --- | --- | --- |
| Respondidas | respondidas / total do pool | `questionLimit` da atividade |
| Acerto | acertos / respondidas | 100% das respondidas |
| Revisadas | revisadas / respondidas | 100% das respondidas |
| Escuta | áudios reproduzidos / áudios enviados | áudios enviados no ciclo |
| Consistência | dias ativos / dias do período | dias corridos do período (piso 1) |

O gráfico compara a atividade encerrada (linha cheia) com a atividade arquivada imediatamente anterior (linha tracejada), quando ela existir. Se a atividade encerrada é a primeira arquivada do usuário, o gráfico renderiza só a camada dela, com legenda única.

O score da atividade (média das notas das perguntas, escala 0 a 10, Seção 6.3) aparece também no texto do resumo, como número solto, não só na legenda da imagem, então some quando a imagem não é gerada.

Regras de dado insuficiente (imagem suprimida, resumo vai só como texto):
- Menos de 5 respostas na atividade encerrada (mesmo corte da linha de leitura acima): pouco dado, o gráfico não tem valor de leitura.
- Nenhum áudio enviado no ciclo (rollout de áudio parcial, Seção 6.1): a métrica de escuta não existe para esse usuário.

A geração da imagem nunca atrasa nem bloqueia o texto: qualquer falha degrada para texto puro (mesmo princípio do áudio de feedback, Seção 6.1).

### Visibilidade ao usuário

O comando `atividade` exibe apenas activities `active` e `archived`. Os demais status são histórico interno.

---

## 2. Perguntas

Geradas na criação da atividade (upload ou fluxo de nova atividade), uma por item de vocabulário extraído do material.

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

**Camada de imagem (gauge de score):** junto do texto vai uma imagem, um mostrador circular (anel que fecha conforme a nota, sem ponteiro) com o score da atividade nesse momento (escala 0 a 10, Seção 6.3) e uma marca no anel na nota de aprovação (`ACTIVITY_ELIGIBLE_SCORE`). Sem comparação: a revisão contínua não tem marco de encerramento, só a primeira rodada tem esse ponto. Gerado por template, sem IA.

O score aparece também no texto do resumo, como número solto, não só dentro da imagem. A imagem é suprimida (resumo vai só como texto) quando o pool da atividade tem menos de 5 perguntas geradas: pouco dado, o gauge não tem valor de leitura. Falha na geração também degrada para texto puro, nunca atrasa nem bloqueia o texto.

### Revisão em dia

Sinal de que a fila de revisão foi zerada numa sessão. A conclusão da primeira rodada é outro evento e não cobre isso.

- Depois de avaliar uma resposta (certa, errada ou parcial), se a contagem de perguntas elegíveis por SM-2 do usuário (mesma contagem do lembrete diário, `countSm2EligibleQuestionsByUser`) passou de maior que 0 para 0 nessa avaliação, o sistema envia uma mensagem extra.
- Dispara com qualquer quantidade de elegíveis no início, sem piso mínimo. Não depende de a primeira rodada estar completa nem de sobrar pergunta nova no pool.
- Texto fixo, sem IA: `✅ Revisão em dia. Continue praticando.`
- Entra na sequência normal: depois do bloco completo de feedback da resposta que zerou a fila (avaliação, áudio de feedback se houver, dica de erro se houver) e antes da próxima pergunta. Mesma pausa com indicador de digitando entre mensagens da sequência (Seção 19).
- Vale para a cadência e para a sessão intensiva, igualmente.
- Quem começa a sessão com zero elegível não recebe a mensagem (sem dívida de revisão).

### Reexibição de pergunta pendente

Quando o usuário retoma uma atividade, inicia sessão intensiva, ou cai em qualquer fallback estando com uma pergunta já pendente, o sistema reexibe a própria pergunta, não um aviso genérico de que há pergunta pendente. Reaproveita o mesmo mecanismo de envio já usado pela cadência e pela sessão intensiva, então o formato exibido é idêntico ao do primeiro envio.

Antes de reexibir, o estado da atividade é realinhado (pergunta pendente corrente, marcação de aguardando resposta, agendamento da próxima), para que a resposta seguinte seja avaliada como resposta àquela pergunta e não recaia em fallback.

Vale para qualquer canal, não só WhatsApp. A avaliação da resposta dispara sempre que existe pergunta pendente de fato, mesmo que a marcação interna de aguardando resposta tenha ficado dessincronizada do status da pergunta (straggler de conclusão de rodada, duas perguntas pendentes).

---

## 3. Extração de vocabulário do material

O material enviado, qualquer que seja o formato de entrada — texto corrido, lista de palavras, lista PT/EN, lista de-para, frase solta, lista de exercícios — é normalizado numa lista única de vocabulário antes de gerar as perguntas, até um teto de aproximadamente 25 termos.

Não existe mais classificação do material em tipos de seção com regras próprias para cada um. Essa era uma fonte real de complexidade: cada tipo tinha sua própria segmentação, mínimo de itens e cálculo de tamanho de pool. Hoje há um único formato de conteúdo canônico, e o restante do pipeline (formatos de pergunta, geração, avaliação) opera sobre ele sem ramificação por tipo.

Conteúdo gerado pelo fluxo de nova atividade (Seção 15) segue o mesmo formato de lista de vocabulário.

---

## 4. Formatos de pergunta

Oito formatos em uso ativo, todos de vocabulário: hoje todo material vira uma lista de vocabulário (Seção 3), então são os únicos que entram em jogo. O sorteio de formato acontece antes de gerar, o modelo executa, não decide. A única decisão que cabe ao modelo é se o item pode virar reconhecimento por imagem (ver abaixo); nos formatos de escuta, o modelo escreve a frase do áudio.

| Formato | O que faz |
| ------- | --------- |
| gap fill | Frase com lacuna cobrindo o termo. Sempre em inglês, significado em PT entre parênteses |
| recall | Dado o significado, trazer o termo |
| recall invertido | Dado o termo, trazer o significado ou uso |
| cenário | Situação realista que leva ao uso do termo |
| múltipla escolha | 2 a 5 opções, embaralhadas antes de salvar |
| reconhecimento por imagem | Uma imagem ilustra o termo e o usuário escolhe, entre 4 opções embaralhadas antes de salvar, qual termo ela representa |
| transcrição de áudio | O usuário ouve uma frase em inglês com o termo e escreve exatamente o que ouviu, em inglês |
| tradução de áudio | O usuário ouve uma frase em inglês com o termo e escreve em português o que ela quer dizer |

O prefixo "Complete:" do gap fill e a pergunta de fechamento do cenário não vêm mais do modelo — são aplicados depois, de forma determinística. Isso elimina falha de formatação (prefixo esquecido, fechamento reformulado ou fora do padrão). O fechamento do cenário hoje sorteia entre 4 variações em português e 4 em inglês, em vez de repetir sempre a mesma frase.

### Reconhecimento por imagem

Existe para quebrar o ritmo textual de pergunta, resposta e feedback. A mecânica é de escolha, como a múltipla escolha, mas é um formato próprio.

- **Sorteio:** entra no sorteio com o mesmo peso dos demais, mas nunca sai imediatamente antes nem imediatamente depois da múltipla escolha, porque os dois são de escolha e não devem sair em sequência. Fica atrás de uma fração configurável de rollout, no mesmo princípio do áudio de feedback (Seção 6.1): fora da fração, o formato simplesmente não entra no sorteio daquela geração.
- **Critério de imagem (`imageable`):** decidido na própria geração da pergunta. Vale para termos que uma cena sem texto mostra de forma que o sentido literal da imagem é o sentido real do termo: objeto, ação, estado, sentimento ou lugar. Expressões idiomáticas, phrasal verbs e termos abstratos ou gramaticais ficam de fora, porque a imagem literal de uma expressão reforça o erro de interpretar ao pé da letra (ex: "break the ice" mostraria gelo quebrando).
- **Imagem:** gerada no momento em que a pergunta é gerada, a partir de uma descrição da cena em inglês produzida na mesma chamada: cena simples, um sujeito em destaque, fundo neutro, sem texto dentro da imagem e sem nada que represente os distratores, para servir a uma única opção.
- **Fallback:** se o item não pode virar imagem, ou qualquer etapa falha (geração da pergunta, da imagem ou armazenamento), a pergunta é gerada em outro formato elegível para o mesmo item, sem nenhuma indicação ao usuário. O motivo fica registrado em log.
- **Enunciado:** aplicado depois, de forma determinística, no mesmo princípio do prefixo do gap fill e do fechamento do cenário. Sorteia entre 3 variações em português no nível básico e 3 em inglês nos níveis intermediário e avançado. Opções numeradas.
- **Avaliação:** igual à múltipla escolha, binária, aceitando o toque no botão, o número ou o texto da opção. Feedback, áudio de feedback, dica de erro, SM-2 e nota seguem as regras atuais, sem tratamento especial.

### Escuta: transcrição e tradução de áudio

Prática de escuta ativa, para tirar a prática do ritmo só de leitura e escrita. São dois formatos próprios, não um formato com duas saídas: na transcrição o usuário escreve em inglês exatamente o que ouviu; na tradução, escreve em português o que a frase quer dizer. As regras abaixo valem para os dois, salvo indicação.

- **Frase:** uma frase natural em inglês que usa o termo do item, no estilo da frase de demonstração do feedback, nunca uma situação de cenário. No básico, curta (5 a 8 palavras), presente simples, vocabulário elementar, com o termo como única palavra possivelmente difícil. Intermediário e avançado podem ser mais longos e naturais, com contrações e formas fracas da fala. Na transcrição, a resposta esperada é a própria frase. Na tradução, a geração devolve também de 1 a 3 traduções de referência em português da frase inteira, a mais natural primeiro.
- **Áudio:** gerado no momento em que a pergunta é gerada, uma única vez por pergunta, reaproveitado em toda reexibição e revisão (como a imagem). A frase nunca aparece no texto da mensagem; fica guardada junto do áudio como auditoria (Seção 17).
- **Sorteio:** entra na rotação balanceada com os demais, atrás de uma fração configurável de rollout própria, separada da fração do áudio de feedback. Os dois formatos de áudio dividem essa fração e nunca saem em sequência, nem um seguido do outro.
- **Fallback:** qualquer falha (geração da frase, voz, armazenamento) gera a pergunta em outro formato sem mídia para o mesmo item, sem indicação ao usuário. O motivo fica em log.
- **Enunciado:** aplicado depois, de forma determinística, com 3 variações em português no básico e 3 em inglês nos demais níveis. Na web, a instrução e o player ficam num card só, instrução em cima, sem texto abaixo do player e nunca com "Ver tradução".
- **Resposta:** sempre digitada. Nota de voz numa pergunta de áudio não é avaliada: volta um aviso curto pedindo a resposta digitada e a pergunta continua pendente.
- **Avaliação da transcrição:** pelo mesmo fluxo de avaliação dos demais formatos, com regra estrita definida no bloco de exemplos do formato. A comparação ignora só maiúsculas, pontuação, espaços, apóstrofo, contração contra forma expandida (I'm = I am) e número por extenso contra dígito. Qualquer palavra diferente, faltando ou sobrando conta como erro, inclusive erro de digitação e palavra de mesmo som. Certo: nenhuma diferença. Parcial: 1 palavra errada numa frase de 6 ou mais palavras. Errado: o resto. Nota, SM-2 e score seguem as regras atuais.
- **Avaliação da tradução:** semântica, pelo mesmo fluxo. Vale qualquer tradução em português que dê o mesmo sentido, não literal, sem precisar bater com as traduções de referência; grafia e acentuação em português não contam. Parcial: sentido central certo, mas perdeu ou trocou uma parte relevante (quem, quando, negação, quantidade). Errado: sentido central errado, outra frase ou resposta em inglês. Nota, SM-2 e score seguem as regras atuais.
- **Feedback:** mesmo padrão nos dois, numa linha só: abertura de sempre, a resposta correta entre aspas e a outra língua em itálico entre parênteses. Na transcrição, a frase em inglês entre aspas, limpa, sem marcação do erro em nenhum status, e a tradução em português entre parênteses. O erro só aparece na dica, quando houver classe de escuta aplicável (Seção 6.2), explicado de forma pontual, nunca como a frase corrigida. Na tradução, a tradução de referência em português entre aspas (a primeira resposta esperada) e a frase em inglês entre parênteses. A montagem é feita em código, a partir da frase de demonstração e da sua tradução, sem depender da formatação do modelo.
- Nenhum dos dois gera áudio de feedback (seria a mesma frase).

`pergunta aberta` e `pergunta direta` (usadas antes para material de texto corrido e de exercício, respectivamente) ficaram sem uso desde que esses tipos de conteúdo deixaram de existir (Seção 3) — formatos legados, fora do fluxo ativo hoje.

---

## 5. Nível e idioma das perguntas

O nível pode vir de duas fontes: informado pelo usuário ou detectado automaticamente no material enviado.

O usuário informa seu nível uma vez (no início do uso, ou quando quiser trocar) e esse nível passa a valer para qualquer atividade futura, tendo prioridade sobre o nível do material. Se o usuário não informar nível, o sistema usa o nível detectado no material enviado. Para conteúdo gerado pelo fluxo de nova atividade (Seção 15), o nível declarado do usuário é sempre a referência, não há detecção automática nesse caminho.

A pergunta de nível, tanto no fluxo de nova atividade quanto pelo comando `nivel`, usa a mesma lista de opções dos passos da Seção 15: seleção por toque na web, botões nativos no WhatsApp (ver Seção 19).

Cada atividade guarda o nível que foi usado para gerar suas perguntas, então o histórico permanece consistente mesmo se o usuário trocar de nível depois.

| Nível | Idioma da pergunta |
| ----- | ------------------- |
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

### 6.1 Áudio no feedback

Feedback pode ser acompanhado de uma versão em áudio (Ogg/Opus, ver Seção 17), enviada como mensagem separada logo após o feedback em texto. Só o conteúdo de demonstração vai para o áudio, sem a abertura de resultado e sem emoji, informação redundante em áudio, já carregada pela entonação da fala.

Envio de áudio é parcial, não em toda resposta, controlado por uma fração configurável do total. Falha na geração ou envio do áudio nunca atrasa nem impede o feedback em texto, que segue as regras desta seção normalmente, sem nenhuma indicação de erro visível ao usuário.

A frase de demonstração usada no feedback e no áudio (`feedback_text`) e sua tradução em português (`feedback_translation`) são persistidas por pergunta, junto com o resultado de cada avaliação. A tradução não é enviada como mensagem separada em nenhum canal: na superfície web, quando disponível, fica atrás de um toggle oculto por padrão ("Ver tradução") logo abaixo do player de áudio, revelado só depois do áudio terminar de carregar e nunca junto de um erro de carregamento. No WhatsApp não há equivalente.

Legado (o WhatsApp não entrega mais áudio de prática): no WhatsApp, o áudio era enviado como nota de voz reconhecida pelo canal, não como anexo de áudio comum: é essa forma de envio que habilita o webhook de status de reprodução, um áudio enviado como anexo genérico não gera esse evento.

Reprodução do áudio pelo usuário é rastreada, mas a origem do evento depende do canal: no WhatsApp vem do webhook de status da mensagem, na superfície web vem de um evento do próprio player no client. Qualquer que seja a origem, o evento converge para o mesmo registro por pergunta, que alimenta o bônus de prática passiva (Seção 6.3), e é idempotente por pergunta: uma segunda notificação de reprodução da mesma pergunta não duplica o efeito (ver Seção 18).

### 6.2 Dica (evalTip)

O feedback pode ser acompanhado de uma dica curta, enviada como mensagem separada logo após o feedback (e depois do áudio, quando houver). A dica nunca reformula a resposta certa como explicação nem funciona como definição de dicionário. É a única exceção deliberada às proibições desta seção, restrita ao próprio campo da dica, sem afetar o texto do feedback em si.

**Em erro ou parcial**, a dica pode apontar a causa específica do erro. A causa é classificada em uma de oito categorias: calque (tradução literal de estrutura), sinônimo próximo incorreto, estrutura (padrão gramatical confundido), colocação (combinação de palavras que não se usa junto em inglês), expressão interpretada ao pé da letra, registro (formal/informal fora de lugar), ortografia, ou sem classificação. Ortografia e sem classificação não geram dica, o campo fica vazio nesses casos, não só no caso de chute sem padrão identificável.

**Em acerto**, a frase de uso do feedback usa a forma que o usuário escreveu, nunca a troca pela forma esperada. Quando existe uma resposta esperada diferente dessa forma, a dica a apresenta, com um uso em inglês. Isso cobre dois casos: o usuário respondeu uma das respostas esperadas e a pergunta tem outra, ou a resposta foi aceita por equivalência e a esperada é outra forma. É complemento, nunca ressalva sobre a resposta dada. Só vale quando:

- o formato é de resposta digitada (recall, recall invertido, gap fill e cenário), nunca em múltipla escolha ou reconhecimento por imagem, que já têm opções fechadas, nem nos formatos de escuta (transcrição e tradução de áudio);
- a alternativa vem das respostas esperadas da própria pergunta, citada literalmente, nunca inventada na avaliação;
- a alternativa é um termo realmente diferente do que o usuário escreveu, não só variação de flexão, artigo ou contração.

Sem alternativa assim, o acerto segue sem dica.

**Na transcrição de áudio**, a dica de erro usa só duas classes próprias de escuta: palavra de mesmo som (trocou por outra com o mesmo som, como "their" por "there") e fala ligada (omitiu uma forma fraca como "to", "of", "a", "have", ou não separou palavras que se ligam na fala). As demais classes não se aplicam e ortografia continua sem dica. Sem classe aplicável, sem dica. As classes de escuta não valem para os outros formatos.

**Na tradução de áudio**, valem só as classes que fazem sentido de inglês para português: calque, sinônimo próximo, expressão ao pé da letra, registro e estrutura. Colocação fica de fora, junto com as classes de escuta; ortografia e sem classificação seguem sem dica. O filtro por formato fica no código, como o da dica em acerto. O objetivo é que a dica em acerto seja pontual, não presença em toda resposta certa.

O prompt de avaliação não conhece o formato nem decide sozinho o envio: o filtro final fica no código. Em acerto, a dica só é enviada se a classe retornada for alternativa, o formato for um dos quatro de resposta digitada e o texto da dica citar uma resposta esperada diferente da que o usuário escreveu. Fora disso a dica é descartada, inclusive o texto. A dica em acerto não altera status, nota da pergunta nem agendamento de revisão (SM-2), e a ordem de envio é a mesma: feedback, áudio (se houver) e dica.

O texto da dica segue uma marcação própria: negrito para a forma contrastada, itálico para um termo curto em inglês, aspas duplas para uma frase completa em inglês, riscado só para uma forma que não existe em inglês. Cada dica usa só a marcação que fizer sentido para o caso.

Vale tanto para cadência quanto para sessão intensiva. Em sessão intensiva, a dica não atrasa nem bloqueia o disparo da próxima pergunta, é enviada em sequência imediata.

### 6.3 Sugestão de troca de atividade

Quando a atividade ativa já atingiu uma nota alta o suficiente, o feedback de uma resposta correta pode vir acompanhado da sugestão de trocar de atividade (🔄, ver vocabulário de emoji), com botão (ou o comando por extenso, dependendo do canal) para iniciar o fluxo de nova atividade. Nunca acompanha feedback de erro ou parcial, para não soar como reação ao erro. A dica de alternativa em acerto (Seção 6.2) pode ser enviada na mesma resposta, como mensagem separada após o feedback, sem influenciar a nota.

Cada pergunta tem uma nota de 0 a 10, calculada a partir de dois eixos independentes.

Qualidade (único eixo que move a elegibilidade de forma significativa):
- Acerto: 4 pontos
- Parcial: 2 pontos
- Erro: 0 pontos
- Acerto respondido por áudio: +1 ponto adicional sobre o acerto

Prática passiva (bônus limitado a 2 pontos por pergunta, independente do volume):
- Revisão espaçada real (dia distinto, mesmo gatilho da Seção 7): +1
- Áudio de feedback ouvido (evento de reprodução confirmado, ver Seção 18): +1. O áudio da pergunta de escuta (Seção 4) não conta: ouvir é parte de responder. Ele também fica fora do eixo Escuta do pentágono.

A nota de cada pergunta é a soma dos dois eixos, com teto de 10.
A nota da atividade é a média das notas de todas as perguntas, com aprovação em 7.

Propriedades importantes do modelo:
- Erro nunca contribui para elegibilidade. Volume de tentativas erradas não empurra a sugestão.
- Passada única, mesmo gabaritada, não elege (nota máxima sem revisão é 4 de 10).
- Prática passiva sozinha nunca elege. O bônus máximo de 2 não alcança 7 sem acertos.

Exemplos:
- Acertou tudo numa passada: média 4. Não elegível.
- Acertou tudo, revisão espaçada, ouviu áudio: média 7+. Elegível.
- Errou tudo várias vezes, nunca acertou: média 0. Nunca elegível por volume.
- Acertou maioria + revisão espaçada + respondeu por áudio em algumas: elegível.
- Acertou tudo + respondeu tudo por áudio: média 5 (sem revisão ainda). Não elegível.

Comportamento esperado: a contagem de áudio ouvido da última pergunta antes do check pode não refletir a reprodução daquele turno, pois o evento de reprodução é assíncrono. Sem impacto relevante, o check seguinte já terá o dado atualizado.

Parâmetros atuais (sujeitos a calibração com dado real de produção):
- Acerto 4 | Parcial 2 | Erro 0 | Bônus áudio respondido 1
- Teto bônus passivo por pergunta: 2
- Teto de nota por pergunta: 10
- Nota de aprovação da atividade (média): 7

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

**Cadência automática pausada.** O envio automático de uma pergunta a cada intervalo fixo, pensado para quando a prática acontecia dentro do chat do WhatsApp, está pausado desde que a prática migrou para a superfície web. Não foi removido, pode voltar quando existir disparo equivalente do lado web. Enquanto isso, a sessão intensiva é o único canal ativo de entrega de pergunta, e o retorno do usuário é estimulado pelo lembrete diário e pelo reengajamento da Seção 12.

**Sessão intensiva** (`praticar`): perguntas chegam em sequência imediata, uma após a outra. Não interfere no SM-2.

### 8.1 Supressão de mensagens concorrentes

Enquanto o sistema está processando uma mensagem do usuário e ainda não enviou resposta, qualquer nova mensagem recebida nesse intervalo é ignorada, silenciosamente, sem retorno ao usuário. Isso vale para qualquer tipo de mensagem, resposta de prática ou comando, não só para o par pergunta-resposta.

Objetivo: evitar avaliação duplicada quando o usuário corrige uma resposta digitada errado em sequência rápida, e evitar que um comando enviado durante o processamento de uma resposta anterior gere resposta fora de ordem.

Janela de segurança: intervalo curto, medido em segundos, que também serve como proteção contra falha silenciosa. Se o processamento de uma mensagem travar ou não retornar, o bloqueio expira sozinho após esse intervalo, liberando o usuário para nova tentativa sem necessidade de intervenção manual.

### 8.2 Limite diário de prática

Controle de volume por custo.

**Limite total:** 60 práticas avaliadas (`right`, `wrong`, `partial`) por usuário por dia.

**Reserva de cadência sem efeito hoje:** existe uma divisão histórica da cota, com 24 práticas reservadas para a cadência e teto de 36 para o intensivo dentro do total de 60. Com a cadência pausada (Seção 8), o intensivo é o único canal de entrega, e essa divisão não tem efeito prático. Fica registrada para revisão caso a cadência volte.

**Verificação:** antes de avaliar qualquer resposta, o sistema checa o contador do dia. Se o total já atingiu 60, bloqueia qualquer prática.

**Reset:** automático, pela mesma lógica de chave por usuário e data já usada nos demais contadores diários (atividades, imagens, áudios). Sem cron dedicado.

**Sessão intensiva sem teto de tempo:** o limite de 15 minutos de inatividade deixa de ser o único controle da sessão intensiva. Controle passa a ser por volume, não por duração.

Os 15 minutos de inatividade são medidos a partir do envio de cada pergunta pelo sistema, não da última resposta do usuário. A cada pergunta enviada durante a sessão, o timer se reinicia. Enquanto o usuário responde ativamente, a sessão nunca expira por tempo. Na prática, o único controle efetivo é o volume diário.

**Conclusão de rodada não encerra a sessão intensiva.** Quando todas as perguntas da primeira rodada são respondidas durante uma sessão intensiva, o usuário recebe a mensagem de conclusão de rodada seguida imediatamente pela primeira pergunta da próxima rodada, sem pausa na sessão.

**Geração de perguntas sob demanda:** quando o pool de perguntas não está completo, o sistema gera novas perguntas durante a sessão intensiva. Se a geração ainda estiver em processamento no momento em que o usuário responde, o sistema informa que a próxima pergunta está sendo preparada, em vez de aguardar a cadência normal.

**Mensagens:**

Limite atingido:
> Você usou toda sua prática disponível de hoje, mas amanhã tem mais.

**Números sujeitos a revisão:** calibrados por estimativa de custo por resposta avaliada, sem dado real de produção ainda. Revisar após medição real de custo por resposta, e novamente quando a geração de perguntas migrar de lote para sob demanda, o que muda a estrutura de custo por interação.

### 8.3 Banner de revisão pendente

Na página de prática (`/app`), um banner fixo aparece entre a lista de mensagens e o composer quando há pelo menos uma pergunta elegível por SM-2 (mesma contagem usada no lembrete diário da Seção 12) numa Activity ativa do usuário, e ele não está em sessão intensiva no momento do carregamento da página.

A contagem e a checagem de sessão ativa são feitas uma única vez, no carregamento inicial da página, sem verificação reativa contínua.

O botão "Praticar" do banner dispara exatamente o comando `praticar` (Seção 9), o mesmo gatilho usado ao digitar o comando. O banner desaparece assim que a sessão intensiva começa, seja pelo botão ou pelo comando digitado, e só reaparece num novo carregamento da página.

### 8.3.1 Pill "Praticar"

Atalho fixo para o comando `praticar` (Seção 9), independente do banner da Seção 8.3, que segue com a lógica própria.

- **Posição:** no mobile, à direita do header; na sidebar, logo abaixo da atividade ativa (inclusive com a sidebar aberta no mobile). Com a sidebar colapsada no desktop, vira um botão só com ícone de play e tooltip "Praticar". Texto fixo, sem variação de copy.
- **Visibilidade:** só existe com atividade ativa. Sem atividade, não aparece em nenhum lugar.
- **Estados:** inativa (desabilitada, visual neutro) enquanto a sessão intensiva está dentro da janela de 15 minutos desde a última pergunta enviada (Seção 8.2) ou quando o limite diário foi atingido, até o reset. Ativa em qualquer outro caso, incluindo pergunta pendente expirada e ausência de revisão elegível.
- **Clique:** dispara exatamente o comando `praticar`, que reexibe a pergunta pendente se houver (Seção 2), senão segue a ordem normal de envio. Fora de `/app`, envia o comando e leva o usuário a `/app`.
- **Estado inicial:** calculado no servidor, no layout de `/app`, antes de renderizar (sem flash).
- **Tempo real:** mensagem nova do sistema reconsulta o estado pelo mesmo canal realtime do indicador de digitando (Seção 19); um timer local reativa a pill na expiração da janela, sem depender de evento. O estado também é reconsultado ao voltar para a aba.

### 8.4 Toast de confirmação em ações do app

Ações do usuário em `/app` que dependem de uma chamada ao backend (hoje: salvar preferência de lembrete diário no modal de calendário) mostram um toast de confirmação de sucesso ou erro após a resposta.

O toast é renderizado acima de qualquer modal aberto no momento (z-index maior que o de Dialog/Sheet/Popover), para não ficar escondido atrás de fluxos que abrem modal.

---

## 9. Comandos disponíveis

| Comando | O que faz |
| ------- | --------- |
| `ajuda` | Lista os comandos disponíveis |
| `praticar` | Inicia sessão intensiva, perguntas chegam em sequência até o limite diário (ver Seção 8.2) |
| `pausar` | Para o envio de perguntas |
| `retomar` | Retoma após pausa |
| `atividade` | Lista a atividade ativa e as anteriores |
| `nova atividade` | Inicia o fluxo de captura de nível, objetivo, assunto e ponto, e gera uma atividade individual a partir da combinação escolhida (ver Seção 15) |
| `nivel` | Atualiza o nível de inglês declarado pelo usuário (básico, intermediário ou avançado), com atalho de botão para cada opção |
| `cancelar` | Sai do fluxo ou ação em andamento: processamento de material dentro da janela de buffer (ver Seção 1), ou qualquer passo do fluxo de nova atividade (ver Seção 15) |
| `suporte` | Aciona suporte via WhatsApp do admin |

Comandos não atualizam o histórico de prática nem contam como interação.

Usuário sem nenhuma atividade criada recebe, junto da resposta ao comando `ajuda`, orientação sobre como começar a praticar (ver Seção 10). É a mesma orientação usada no onboarding e no fallback de usuário sem atividade (ver Seção 10.1), com uma única fonte de conteúdo para as três situações, evitando que a mesma regra fique escrita de formas diferentes em pontos distintos do produto.

### Superfícies de descoberta

A lista de comandos tem duas superfícies de descoberta, ambas alimentadas pela mesma fonte única de comandos e aliases, sem lista duplicada:

- O comando `ajuda`, que devolve a lista formatada.
- O autocomplete do composer na superfície web: ao digitar `/`, o campo sugere comandos de forma incremental, filtrando por prefixo ou alias conforme o usuário digita, e envia o comando escolhido direto.

O comando `ajuda` não aparece na própria lista que gera nem no autocomplete. Comandos de confirmação dentro de um fluxo (`sim`, `não`, `cancelar` dentro do fluxo de nova atividade) e o comando interno de staff também ficam fora das duas superfícies. Alterar a fonte de comandos atualiza as duas ao mesmo tempo.

---

## 10. Onboarding

Sequência fixa de mensagens no primeiro contato. A estrutura, sequência com ordem fixa e prazo de trial declarado antes de qualquer ação, é regra de negócio. A quantidade de mensagens não é regra fixa, pode variar conforme necessidade de copy, desde que a ordem lógica seja preservada: saudação, proposta de valor, instrução da ação (contar o tema que quer praticar ou enviar material), o que acontece depois, prazo de trial e comandos disponíveis.

Ao final da sequência fixa, o sistema já inicia automaticamente a captura de nível (se ainda não informado) seguida do fluxo de nova atividade (Seção 15), sem que o usuário precise usar nenhum comando. Upload de material continua disponível a qualquer momento, inclusive durante esse fluxo, e cancela o fluxo automaticamente quando chega (ver Seção 15).

Mensagens da sequência não são enviadas simultaneamente. Existe intervalo deliberado entre uma e outra, simulando envio natural e evitando que o usuário receba um bloco único de texto. O valor exato do intervalo é parâmetro de configuração, não regra de negócio, e pode ser ajustado sem necessidade de atualizar este documento. O indicador de "digitando" entre as mensagens segue a regra da Seção 19: com o intervalo curto atual, a sequência sai sem indicador.

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

Isso vale para a superfície web, onde a prática acontece. No WhatsApp, qualquer mensagem recebida, de usuário com ou sem atividade, recebe a resposta universal com o link de acesso ao app (ver Seção 12, "Resposta universal no WhatsApp").

---

## 11. Planos e acesso

Dois planos: Trial e Pro. Sem tier gratuito permanente.

| Plano | Duração | Acesso |
| ----- | ------- | ------ |
| Trial padrão | 7 dias | Produto completo |
| Trial por campanha sazonal | 30 dias | Produto completo |
| Cortesia permanente | Sem expiração | Produto completo |
| Pro | 30 dias renovável | Produto completo |

Após expirar o acesso, trial ou Pro: conta bloqueada até converter. Sem degradação gradual, o produto inteiro ou nada.

A regra de acesso é simples: plano ativo com data de expiração no futuro. Independe do tipo de plano.

### 11.1 Cobrança e liberação automática

Ao bloquear o acesso, o sistema gera um link de pagamento individual para aquele usuário e envia junto da mensagem de bloqueio. Enquanto esse link ainda estiver dentro do prazo de validade, novas tentativas de uso durante o bloqueio reaproveitam o mesmo link em vez de gerar um novo a cada mensagem.

Cobrança é avulsa: R$21,90 liberam 30 dias de acesso, sem assinatura nem renovação automática no cartão. Ao fim dos 30 dias o acesso expira normalmente, e a próxima interação bloqueada gera um novo link, repetindo o ciclo.

Pagamento confirmado libera o acesso automaticamente, sem intervenção manual: o plano passa a Pro, ativo, por mais 30 dias a partir da confirmação, e o usuário recebe uma mensagem de confirmação pelo WhatsApp. Pix continua disponível como alternativa, por atendimento manual via `suporte`.

### 11.2 Login automático via link do WhatsApp

Link enviado pelo WhatsApp que aponta pro app pode carregar um token assinado que
autentica automaticamente quem abre o link no navegador, sem passar pelo formulário
de telefone e código. Sessão já ativa no navegador é sempre respeitada, o token nunca
sobrescreve um login existente. Token expira em 24 horas; expirado, ausente ou sem
conta correspondente, cai no fluxo normal de login por telefone e código, sem nenhum
aviso de erro.

O link efetivamente entregue ao usuário não carrega o token direto na URL: é um
link curto (shortlink) que resolve por redirecionamento pro destino real, com a
mesma validade de 24 horas do token. Link expirado ou inexistente cai na home,
silenciosamente. O mecanismo de shortlink é genérico, reutilizável por qualquer
outro caso que precise de link curto com expiração (ex: link de pagamento,
indicação), não é exclusivo do login por WhatsApp.

---

## 12. Lembrete diário e reengajamento

Um único fluxo automático de notificação pelo WhatsApp leva o usuário de volta à prática na superfície web (`/app`). Lembrete diário e reengajamento por inatividade não são fluxos separados: a decisão sai só de quantos dias se passaram desde a última resposta de prática do usuário, calculada no momento do disparo, sem estado próprio guardado entre um dia e outro.

Aplica-se só a usuário com ao menos uma Activity ativa. Usuário sem atividade não recebe nada deste fluxo, esse caso é tratado pela Seção 10.1.

### Disparo

Uma vez por dia, no horário configurado pelo usuário nas preferências (padrão: horário do cadastro). No máximo uma mensagem por usuário por dia.

| Dias desde a última resposta de prática | Ação |
| --- | --- |
| 0 a 6 | Lembrete diário, só se o usuário tiver o lembrete ativado nas preferências. Desativado, nada. |
| 7 | Reengajamento de 7 dias, sempre, independente do lembrete estar ativado. |
| 8 a 13 | Nada. |
| 14 | Reengajamento de 14 dias, sempre, independente do lembrete estar ativado. Última mensagem automática. |
| 15 ou mais | Nada, até o usuário responder uma pergunta de prática. |

**Reset:** qualquer resposta de prática (`right`, `wrong`, `partial`) zera a contagem e reabre o ciclo de lembrete diário, se estiver ativado. Comandos e mensagens soltas não contam. Atividade que ainda não teve nenhuma resposta conta a partir da sua criação.

Dentro da janela de 0 a 6 dias, o lembrete diário sempre é enviado quando ativado, variando só o conteúdo: com pelo menos uma pergunta elegível para revisão (SM-2, Seção 7) numa Activity ativa, o lembrete informa quantas estão pendentes; sem revisão elegível, o lembrete só avisa que a prática está disponível.

### Mensagens

Todas são templates Meta da categoria Utility, com um único botão de resposta rápida (Quick Reply). Nenhuma carrega link, nem no corpo nem no botão: link dentro de template, seja em botão de CTA ou como texto no corpo, abre no navegador embutido da Meta, que quebra o login automático (Seção 11.2). O link chega só na resposta ao toque no botão, que é mensagem de sessão e abre no navegador nativo do dispositivo.

**Lembrete com revisão pendente:**
> Lembrete: você tem perguntas para revisar.
>
> Pendentes: {quantidade}
>
> Toque abaixo para acessar sua prática.

Botão: "Quero acessar"

**Lembrete sem revisão pendente:**
> Lembrete: sua atividade de prática em inglês está disponível.
>
> Toque abaixo para acessar.

Botão: "Quero acessar"

**Reengajamento (7 e 14 dias):**
> Sua prática de inglês está parada há {dias} dias.

Botão: "Quero retomar"

O toque em qualquer um dos botões não tem tratamento próprio por origem: chega como uma mensagem comum e recebe a resposta universal abaixo.

### Resposta universal no WhatsApp

O WhatsApp não é superfície de prática nem de comandos. Qualquer mensagem recebida, de qualquer tipo, incluindo o toque nos botões acima, um "Oi" solto ou um comando, recebe a mesma resposta:

> Pratique inglês todo dia, no seu ritmo. Acesse por aqui:
>
> {link}

O texto é o mesmo em todos os casos, só o link muda:

- **Número de um usuário com conta:** link de login automático (Seção 11.2), que leva direto ao app sem passar pelo formulário de telefone e código. O mesmo link é reaproveitado enquanto estiver válido, em vez de gerar um novo a cada mensagem do mesmo usuário dentro da janela de 24 horas.
- **Número sem conta, ou que não pôde ser identificado:** link fixo do app, que cai no fluxo normal de login por telefone e código, ou entra direto se o navegador já tiver sessão válida.

## 13. Relatório semanal

> **Pendente de implementação.** Recurso importante para retenção e percepção de valor, o usuário vê sua evolução real ao longo do tempo. Não existe ainda.

Quando implementado: gerado aos domingos, agrega todas as interações dos últimos 7 dias independente do status da activity.

Conteúdo planejado: materiais enviados, atividades geradas por tema, trocas totais, percentual de acerto geral, vocabulário que travou mais (top 3 a 5), evolução vs semana anterior.

---

## 14. Processamento de material

Texto solto enviado no chat nunca é interpretado como material. Só arquivo (imagem, PDF, texto em arquivo) dispara o processamento desta seção. Texto no chat tem só duas leituras possíveis: comando, ou resposta a uma pergunta de prática ou a um passo do fluxo de nova atividade (Seção 15) em andamento.

Áudio não faz mais parte do processamento de material: só imagem, PDF e texto em arquivo geram Doc. Nota de voz (áudio) serve exclusivamente para responder a uma pergunta de prática pendente (ver Seção 17). PDF e texto em arquivo são processados em memória e descartados após extração — a imagem é a exceção, ver Seção 14.1 e Seção 17.

**Cap diário invisível: 5 atividades por usuário por dia.** O cap conta atividades criadas, não peças de material enviadas nem conclusões do fluxo de nova atividade, várias fotos ou páginas enviadas dentro da janela de buffer de 45 segundos (Seção 1) formam um único material e consomem uma única vaga do cap. Material abortado via `cancelar` antes do fechamento da janela não consome o cap, porque nenhuma atividade chegou a ser criada. O mesmo vale para o fluxo de nova atividade cancelado antes de gerar conteúdo.

Após o processamento, a primeira pergunta é agendada com um atraso de 3 minutos, para garantir que o usuário receba a confirmação de processamento antes da primeira interação de prática. O mesmo atraso se aplica à primeira pergunta de uma atividade criada pelo fluxo de nova atividade.

**Origem do material:** cada material grava sua origem, `upload` ou `generated` (ver Seção 15). Material com origem `generated` grava também o objetivo, o assunto e o(s) ponto(s) que originaram aquele conteúdo, para rastreabilidade. Material com origem `upload` não grava esses dados por enquanto.

O webhook classifica a mensagem recebida pelo type informado pelo canal antes de decidir o processamento. text, image, audio, document, button e interactive seguem o processamento normal. reaction e sticker são ignorados silenciosamente, sem gerar resposta nem entrar no pipeline de avaliação. video recebe mensagem própria informando que ainda não é suportado. Os demais tipos (location, contacts, order, system, unknown, e qualquer tipo não mapeado) recebem mensagem de comando inválido, orientando o uso de /ajuda.

### 14.1 Processamento de imagem (OCR)

Uma imagem enviada como material passa por três desfechos possíveis:

- **Texto extraído.** A imagem tem um foco textual claro (post, página de caderno, slide, documento) — o texto legível é extraído e vira o material, como antes.
- **Descrição da cena.** A imagem não tem texto predominante, mas mostra uma cena, ambiente ou objeto reconhecível — o sistema gera uma descrição rica em inglês do que aparece, detalhada o suficiente para servir de material de prática. Essa descrição alimenta o pipeline normalmente, como se fosse um texto enviado. Antes, esse caso era descartado com mensagem genérica de que não foi possível identificar texto; hoje vira conteúdo de prática.
- **Bloqueada ou ilegível.** Conteúdo impróprio (nudez, abuso, violência explícita, drogas, armas) é bloqueado com mensagem dedicada, sem gerar atividade. Imagem tecnicamente inutilizável (resolução baixa demais, sem foco identificável) recebe mensagem pedindo reenvio com melhor qualidade, também sem gerar atividade.

---

## 15. Fluxo de nova atividade (conteúdo gerado por tema)

Caminho alternativo ao upload de material para criar uma atividade. O usuário informa o que quer praticar em vez de trazer material próprio, e o sistema gera o conteúdo individualmente para aquele usuário. Existe para quem não tem material formal em mãos, ou quer trocar de assunto sem procurar um arquivo.

### Disparo

O fluxo inicia de duas formas, sempre pelo app: automaticamente ao final da sequência de onboarding (Seção 10), ou a qualquer momento pelo comando `nova atividade`. O fluxo não é iniciável pelo WhatsApp, que só responde com o link de acesso ao app (Seção 12).

### Sequência de captura

Pergunta e resposta fixa, na ordem:

1. **Nível** — só perguntado se o usuário ainda não tem nível declarado (ver Seção 5). Se já existe, pula direto para o passo seguinte.
2. **Objetivo** — lista fechada de 4 opções: Mercado de Trabalho, Viagens Internacionais, Educação e Intercâmbio, Dia a Dia e Lazer.
3. **Assunto** — lista de 5 sugestões específicas por objetivo, mais opção de informar outro assunto por texto livre. As 5 sugestões são fixas por objetivo, não geradas por LLM.
4. **Ponto** — o que praticar dentro do assunto escolhido: vocabulário geral, um tempo verbal, uma estrutura gramatical, entre outros (ver "Catálogo de foco linguístico" abaixo). Lista de 5 sugestões geradas com base no objetivo e no assunto informados, ordenadas da mais comum e didática pra mais específica, sempre incluindo a opção de vocabulário geral, mais opção de informar outro ponto por texto livre.

Nenhum termo técnico de categoria aparece em copy voltada ao usuário, tanto assunto quanto ponto são perguntados em linguagem natural.

Os quatro passos (nível, objetivo, assunto e ponto) mostram as opções como lista. Na superfície web, a lista é de escolha única por toque: o usuário toca na opção, ela fica destacada e a lista trava (ver Seção 19). Assunto e ponto continuam aceitando texto livre digitado, e o enunciado deixa isso claro. Ponto é escolha única na lista; a combinação de até 2 pontos (ver "Catálogo de foco linguístico") é feita por texto livre, e o enunciado do ponto indica isso.

No WhatsApp, até 3 opções (nível) viram botões de resposta rápida nativos. Com mais de 3 opções (objetivo, assunto e ponto), as opções vão numeradas no texto, com instrução de responder pelo número e os atalhos de botão "Primeira opção" e "Escolha para mim". Os atalhos existem só no WhatsApp, a web não mostra atalho porque a seleção já é direta.

Em qualquer canal, o passo aceita também número ou texto livre digitado. A resposta por número é tolerante a variações de digitação: aceita separadores equivalentes à vírgula (`1 e 2`, `1, 2`, `1-2`, `1/2`) quando o passo permite mais de uma seleção. Número fora da lista, misturar número com texto na mesma resposta, ou informar mais números do que o passo aceita, cada caso retorna um aviso específico pedindo pra corrigir, não um "resposta inválida" genérico.

### Catálogo de foco linguístico

Ponto é escolhido de um catálogo fixo de aspectos da língua: vocabulário geral, classes de palavra (substantivos, adjetivos), tempos verbais, conectores, phrasal verbs, estruturas gramaticais, entre outros. O catálogo vale igualmente para os três níveis, sem restrição por nível, o que muda por nível é só o peso de prioridade nas 5 sugestões exibidas, não a disponibilidade do item.

Usuário pode combinar até 2 pontos numa mesma atividade, por texto livre ou, no WhatsApp, digitando até 2 números da lista numerada. A lista por toque da web é de escolha única. Quando vêm 2 números, o texto das duas opções é classificado contra o catálogo antes de gerar, mesmo caminho do texto livre. Se pedir mais de 2, o sistema não trata como erro, pede pra escolher no máximo 2 entre o que foi mencionado. Objetivo e assunto continuam aceitando uma seleção só, em qualquer formato.

Novo item só entra no catálogo por decisão deliberada, mesmo princípio de mudança rara que já vale para outras regras de negócio deste documento.

### Estado do fluxo

Controlado por um campo de intenção pendente por usuário, com um valor por passo em andamento. Enquanto o fluxo está ativo, qualquer texto recebido do usuário é tratado como resposta ao passo atual, com prioridade sobre qualquer resposta de prática pendente.

**Timeout:** fora do onboarding, o fluxo expira por inatividade após um tempo configurável. Ao expirar, o fluxo é cancelado silenciosamente, o usuário recebe aviso de que pode recomeçar quando quiser. Dentro do onboarding, o fluxo não expira, aguarda resposta indefinidamente, já que não há activity competindo pela atenção do usuário nesse momento.

**Cancelamento:** o comando `cancelar` sai do fluxo em qualquer passo, sem criar nada. Não existe retorno a um passo anterior, cancelar sempre descarta o fluxo inteiro.

**Upload durante o fluxo:** se chega um arquivo válido em qualquer passo do fluxo, o fluxo é cancelado silenciosamente e o arquivo segue o pipeline normal de material (Seção 14), incluindo a confirmação de substituição já existente quando há uma activity ativa em andamento (ver Seção 1). Não há confirmação adicional pelo fato de o usuário estar em meio ao fluxo, apenas a que já existe para upload comum.

### Geração de conteúdo

A combinação de nível, objetivo, assunto e ponto passa por duas chamadas de LLM em sequência:

1. **Validação do assunto.** Valida o assunto em duas camadas: encaixe (o assunto faz sentido dentro do objetivo escolhido) e conteúdo proibido (pornografia, sexualização, drogas, armas, discurso de ódio, xenofobia, racismo ou equivalente, mesmo quando tecnicamente se encaixaria no objetivo). Falhando qualquer uma, retorna erro curto e genérico, sem revelar qual camada falhou, e o usuário pode tentar outro assunto ou cancelar. Passando, retorna as 5 sugestões de ponto usadas no passo seguinte, além de 5 subtópicos, recortes específicos dentro do assunto.
2. **Resolução do ponto e geração.** Se o ponto veio como um único número da lista, gera direto, sem reclassificar. Se veio como texto livre ou como 2 números da lista, classifica contra o catálogo de foco antes de gerar, podendo identificar até 2 pontos válidos numa mesma resposta. Antes de gerar, o sistema sorteia um dos 5 subtópicos retornados na validação, excluindo o último subtópico usado por aquele usuário na geração mais recente com o mesmo objetivo e assunto (se houver), e ancora o conteúdo nesse subtópico sorteado, não no assunto amplo. O sorteio é interno, o usuário não escolhe nem vê o subtópico diretamente. Na prática, permite repetir o mesmo assunto várias vezes sem receber o mesmo vocabulário. Gera 25 itens de vocabulário (quantidade de config, sujeita a revisão) no mesmo formato de lista de vocabulário que o processamento de upload já produz (ver Seção 3).

### Sem compartilhamento entre usuários

Diferente de material de upload, conteúdo gerado por este fluxo é individual: sem pool compartilhado entre usuários, sem versionamento. Cada geração é única para o usuário e para aquela troca de atividade específica. Essa é uma diferença deliberada em relação a desenhos anteriores considerados para este fluxo, o custo de geração escala por usuário e por troca, não há reuso de conteúdo entre usuários.

Sem revisão humana prévia antes da entrega ao usuário, diferente do que um pool compartilhado permitiria. A validação de encaixe e conteúdo proibido no passo de geração reduz risco, mas não substitui auditoria amostral do conteúdo já entregue.

### Criação da atividade

Atividade criada por este fluxo segue as mesmas regras de transição e visibilidade da Seção 1 (arquiva ou cancela conforme a anterior teve resposta), e conta para o mesmo cap diário de 5 atividades por usuário por dia (Seção 14).

Comportamento pós-cancelamento depende do contexto. Sem Activity ativa (onboarding): a mensagem "Ok, cancelado." é emendada imediatamente pelo reinício automático do fluxo, mostrando a primeira pergunta aplicável (pula nível se já declarado, ver Seção 5). Sem mensagem de orientação separada. Com Activity ativa (troca de atividade): comportamento inalterado, avisa que a atividade anterior continua normal, sem reiniciar automaticamente.

---

## 16. Princípios de produto

- Produto focado em inglês. A arquitetura suporta expansão para outros idiomas e matérias, mas expansão só após validação e churn controlado.
- Janela de 24h do WhatsApp é regra de ouro. Mais de 85% das mensagens devem ser enviadas dentro dela.
- A prática acontece na superfície web própria (`/app`), não dentro do chat do WhatsApp (Seção 19). WhatsApp segue como canal de aquisição, autenticação (código e login automático, Seções 10 e 11.2) e notificação — onboarding, lembrete diário e reengajamento (Seção 12) e confirmação de pagamento (Seção 11.1) — levando o usuário de volta ao app, não como superfície de prática em si.
- Nenhuma mensagem do sistema deve terminar com pergunta quando a resposta esperada é a de uma pergunta de prática pendente.
- Copy pode mencionar "IA" como qualificador funcional (o que o produto faz), nunca como identidade declarada em primeira pessoa ("eu sou uma IA", "sou um bot"). "Bot" e "agente" seguem fora de uso em qualquer copy. Personificação em primeira pessoa continua proibida independente de menção à IA, essa é regra separada e já coberta acima. Uso hoje: mensagem 2 do onboarding, bio Instagram, bio WhatsApp Business, texto do hero e SEO da home.
- Posicionamento de complemento, não compete com professor, trabalha com ele. Isso vale igualmente para o fluxo de nova atividade (Seção 15): nenhuma copy sugere módulo, nível desbloqueado ou etapa concluída, mesmo quando o conteúdo é gerado pelo sistema em vez de trazido pelo usuário.
- Texto solto no chat nunca é interpretado como material de estudo (ver Seção 14). Só arquivo pode virar atividade, texto é sempre comando ou resposta.
- O sistema orienta ativamente o usuário sobre o que fazer, seja no primeiro contato ou sempre que algo crítico de entendimento acontecer no meio do uso. Silêncio ou resposta genérica em ponto de ambiguidade real é falha de produto, não neutralidade. Onde já aplicado: mensagem que orienta o uso de um comando usa imperativo direto ("Use *praticar* para..."), nunca fraseado condicional ("se quiser", "quando quiser"), porque fraseado condicional convida resposta em linguagem natural que o sistema não reconhece como comando.
- **O sistema nunca se personifica.** Copy não usa framing de agente em primeira pessoa ("eu vou avaliar seu material", "eu te ajudo", "eu aviso"), nem trata o produto como personagem com vontade própria. Mensagens descrevem o que acontece, não o que "eu" faço. Essa regra já existia em relação a "eu paro", "eu pauso" no contexto de comandos, passa a cobrir qualquer construção de primeira pessoa em qualquer mensagem do sistema, não só as ligadas a comandos.
- **Verbo padrão para envio de conteúdo é "enviar", não "mandar".** "Mandar" é registro mais informal e não é usado em nenhuma copy do produto. Vale para qualquer mensagem do sistema, onboarding, comandos ou fallback.
- Emoji só é usado em mensagens formatadas diretamente no código, nunca em texto gerado por LLM (feedback de avaliação, resumo de atividade quando tiver componente gerado, qualquer resposta que passe por geração de texto livre). Dentro das mensagens de código, emoji é estratégico, não decorativo, cada um carrega um significado fixo e reconhecível. Vocabulário atual: 📘 início de atividade ou seção, 📊 resumo numérico, ⚠️ limite ou bloqueio, 🔄 sugestão de troca de atividade, ✅ fechamento positivo de ciclo de revisão. Novo emoji só entra no vocabulário quando resolve ambiguidade real de leitura rápida, não para variar visual ou suavizar tom. Isso não quer dizer que é rigorosamente proibido, só não pode ser usado como identidade de comunicação principal do produto. Marcações como acima são bem vindos quando realmente agregarem uma melhor leitura, também pra evitar só um monte de texto corrido.
- **Convenção de exibição de comando.** Comando mencionado em qualquer mensagem do sistema aparece em monoespaçado, para garantir contraste visual independente de tema claro ou escuro do canal, o que negrito isolado não garante. Comando de ação espontânea do usuário (`ajuda`, `praticar`, `nova atividade`, `cancelar` fora de fluxo de confirmação) é exibido com prefixo `/`. Comando de confirmação dentro de um estado que o sistema abriu (`sim`, `não`, `cancelar` dentro do fluxo de nova atividade) é exibido sem prefixo. Entrada do usuário aceita o comando com ou sem prefixo, independente de como foi exibido, o prefixo não é sintaxe obrigatória.

---

## 17. Mídia armazenada

Nem toda mídia é descartada após uso. PDF e texto em arquivo continuam sendo processados em memória e descartados após extração (Seção 14). As exceções armazenadas:

- **Áudio de feedback**, gerado pelo sistema (Seção 6.1). Ogg/Opus é o formato de geração; o MP3 gravado entre 2026-10-07 e 2026-10-09 continua tocando, sem migração.
- **Áudio de resposta**: quando o usuário responde uma pergunta pendente por nota de voz, o áudio é armazenado e usado no cálculo da nota da pergunta (Seção 6.3), diferente de uma resposta por texto, que não é retida.
- **Imagem original de OCR**: a imagem enviada como material é armazenada junto com o texto (ou descrição) extraído dela (Seção 14.1), independente do desfecho ser texto, descrição, bloqueio ou imagem ilegível.
- **Charts de resumo**: as imagens de pentágono (Seção 1) e gauge (Seção 2) geradas junto dos resumos. Cada atividade referencia os seus: um chart de conclusão (pentágono) e um de rodada (gauge).
- **Imagem de pergunta**: a imagem gerada para o reconhecimento por imagem (Seção 4), guardada com a descrição da cena que a originou.
- **Áudio de pergunta**: o áudio da frase das perguntas de escuta (Seção 4), Ogg/Opus como o áudio de feedback, guardado com a frase que o originou. Gerado uma única vez por pergunta e reaproveitado sempre que ela volta.

**Organização do armazenamento:** toda mídia nova é salva em `<pasta>/<id da mídia>`, com uma pasta por tipo e o nome do arquivo igual ao identificador do próprio registro de mídia: `feedback-audio` (áudio de feedback), `question-audio` (áudio de pergunta), `answer-audio` (áudio de resposta), `ocr-image` (imagem original de OCR), `question-image` (imagem de pergunta) e `chart` (pentágono e gauge). Mídia ligada a uma entidade (pergunta, atividade) é referenciada por ela diretamente, nunca localizada pelo caminho do arquivo. Mídias gravadas antes dessa convenção permanecem nas pastas antigas (`feedback/`, `answer/`, `ocr/`, `charts/...`), sem migração.

Em todos os casos, o conteúdo de origem (texto do feedback falado, transcrição da resposta em áudio, transcrição ou descrição da imagem, descrição da cena da imagem de pergunta) é guardado junto ao arquivo, servindo de auditoria do que foi de fato produzido ou extraído, e permitindo reenvio em texto sem necessidade de gerar áudio novo, caso necessário no futuro.

O áudio de feedback armazenado é reaproveitado quando a mesma pergunta volta, seja por revisão espaçada (Seção 7) ou por reenvio dentro da sessão intensiva, e a nova avaliação gera a mesma frase de demonstração (`feedback_text`) já persistida para aquela pergunta (Seção 6.1) — nesse caso não gera áudio de novo. Regeneração ocorre quando a frase de demonstração muda entre uma resposta e outra, mesmo pra mesma pergunta, ou quando o áudio original não existe mais no armazenamento.

**Remoção suspensa.** Hoje nenhuma mídia é removida: áudio e imagem passaram a compor as próprias perguntas (imagem do reconhecimento por imagem, áudio das perguntas de escuta, Seção 4) e são reaproveitados na revisão, então apagá-los quebraria perguntas ainda em uso. O processo de remoção continua existindo, mas está inativo por decisão estratégica (ver Technical-Decisions, "Limpeza de mídia pausada"). As regras abaixo ficam como referência para quando for reativado.

Áudio associado a uma pergunta (áudio de feedback, áudio de resposta) é removido do armazenamento (não o registro em si, que permanece como histórico) quando a atividade correspondente está `archived` ou `cancelled` há mais de 30 dias. Atividade `active` nunca tem mídia removida, independente de quanto tempo estiver parada. Imagens (original de OCR, charts de resumo e imagem de pergunta) são removidas após 90 dias, contados a partir do próprio registro de mídia, sem depender de status de activity (o pentágono referencia duas atividades e o gauge é gerado no meio de uma atividade ainda `active`, então amarrar a status de activity seria ambíguo). A remoção roda automaticamente, uma vez por dia, em lotes, sem necessidade de intervenção manual.

A imagem de pergunta é reaproveitada sempre que a mesma pergunta volta (revisão espaçada, reexibição de pergunta pendente, sessão intensiva), e uma pergunta que já tem imagem nunca gera outra.

---

## 18. Rastreio de entrega e reprodução

Mensagens enviadas pelo sistema guardam o identificador que o canal de envio atribui a cada mensagem, permitindo cruzar com eventos de status enviados por esse canal depois (entregue, lido, reproduzido).

Cada canal (hoje: WhatsApp e a superfície web) traduz seu próprio formato de evento de status para um conjunto de valores canônico antes de persistir, para que a lógica de negócio nunca dependa do formato específico de um canal. Isso vale igualmente para qualquer canal adicionado no futuro (ver Seção 7 do Product-Brief, arquitetura multicanal).

Reprodução de mídia (ex: áudio de feedback) é um evento à parte, diferente do status de entrega geral da mensagem. A reprodução é registrada para qualquer áudio, mas só a do áudio de feedback alimenta o bônus e o eixo Escuta; a do áudio da pergunta de escuta não. Uma mensagem pode estar entregue ou lida sem nunca ter sido reproduzida, são duas informações independentes.

A origem do evento de reprodução é responsabilidade de cada canal, pelo meio que ele tiver: o WhatsApp reporta pelo webhook de status da mensagem, a superfície web reporta por um evento do player no client enviado a um endpoint próprio autenticado. Todos convergem para o mesmo registro de reproduzido por mensagem e pergunta, que é o que a Seção 6.3 consome. O registro é idempotente: a primeira notificação de reprodução marca o evento e dispara o efeito no bônus de prática passiva, notificações seguintes para a mesma pergunta são ignoradas.

---

## 19. Mensagens formatadas e suporte a canal interativo

Toda mensagem enviada pelo sistema é representada por um `FormattedMessage`: um texto (`text`) sempre presente, e quatro camadas opcionais de apresentação: `audioMediaId`, `imageMediaId`, `templateName` e `interactive` (corpo com botões). O `text` é a representação canônica: é o que fica salvo no histórico (`Message.content`) e o que qualquer canal sem suporte às camadas opcionais usa para enviar.

`imageMediaId` difere do `audioMediaId`: a imagem e o texto vão juntos, na mesma mensagem, com o `text` como legenda (caption) da imagem, não como mensagem separada. Se a geração da imagem falhar, cai para o `text` puro sem `imageMediaId` (mesmo princípio do áudio, Seção 6.1).

Cada canal decide sozinho, ao enviar, o que fazer com as camadas opcionais. Hoje:

- **WhatsApp**: usa `imageMediaId` se presente (envia a imagem com o `text` como caption); senão `audioMediaId` se presente (envia o áudio); senão `templateName` se presente (envia via template aprovado da Meta, necessário fora da janela de 24h); senão `interactive` se presente (envia com botões); senão `text` puro.
- **Superfície web** (`/app`): usa `imageMediaId` se presente, renderizando a imagem com o `text` como legenda e permitindo abrir a imagem em tela cheia com zoom ao clicar (pentágono e gauge, Seções 1 e 2); usa `audioMediaId` com `<audio>` nativo do navegador (Ogg/Opus, ver Seção 17), com decoder próprio no client só quando o navegador não reproduz Ogg nativamente. Sem geração de mídia duplicada por canal.

Na pergunta de escuta (Seção 4), o `text` é só a instrução e o `audioMediaId` é o áudio da pergunta. A web mostra os dois num card só, instrução em cima, um divisor (o mesmo do bloco "Ver tradução" do áudio de feedback) e o player embaixo, sem "Ver tradução" e sem texto abaixo do player. O WhatsApp envia só o áudio (o canal não entrega prática hoje).

`imageMediaId` e `interactive` podem vir juntos na mesma mensagem (hoje: pergunta de reconhecimento por imagem, Seção 4, com um botão por opção). A superfície web mostra a imagem, o texto como legenda e as opções como botões. O WhatsApp segue a prioridade acima: envia a imagem com o `text` como legenda e acrescenta as opções numeradas à legenda no envio, sem botões.

**Listas de opções.** Toda mensagem com lista de opções (`choice`, `image_recognition` e os passos de nível, objetivo, assunto e ponto) segue o mesmo padrão: o `text` leva só o enunciado, neutro de canal, sem opções numeradas nem instrução de responder por número; as opções vivem no `interactive`, que é persistido com a lista completa; cada canal monta a apresentação a partir dele. A web renderiza a lista a partir do `interactive`, inclusive ao recarregar. O WhatsApp pode acrescentar as opções numeradas ao texto no envio, e nos passos de captura decide entre botões nativos (até 3 opções) ou lista numerada com instrução e atalhos (mais de 3, ver Seção 15). O que é salvo no histórico é o `text` canônico, não o texto montado pelo canal.

Um canal novo pode nascer só com suporte a `text` e ganhar as camadas opcionais depois, sem quebrar nada que já existe (ver Seção 7 do Product-Brief, arquitetura multicanal).

Dentro de `interactive`, um botão pode ser de dois tipos: ação (resposta rápida nativa do canal, ex: "Nova atividade") ou link (abre uma URL externa, ex: link de pagamento do bloqueio de acesso, Seção 11.1). Mensagem com botão de link sempre inclui a mesma URL também no `text` puro, como fallback para quem recebe só a camada canônica.

`Message.templateName` e `Message.interactive` são persistidos junto do envio (colunas nullable, preenchidas só quando aplicável), como registro de auditoria do que foi de fato enviado ao usuário, não só o texto equivalente. O `interactive` em produção cobre hoje cinco casos: a sugestão de troca de atividade (Seção 6.3), botão de ação "Nova atividade"; o link de pagamento do bloqueio de acesso (Seção 11.1), botão de link que abre o checkout no WhatsApp e aparece como link clicável dentro do próprio texto em qualquer canal sem suporte a botão; os passos de nível (Seção 5, também pelo comando `nivel`), objetivo, assunto e ponto do fluxo de nova atividade (Seção 15), com um botão por opção; e as perguntas `choice` e de reconhecimento por imagem (Seção 4), com um botão por opção.

Nas listas de opções, o `interactive` guarda também o estado da seleção: `disabled` (todas as opções travadas) e `selectedId` (id da opção escolhida, destacada). Ausentes, a lista está pendente. Dois caminhos gravam:

- **Avaliação da resposta** (`choice` e `image_recognition`): na mensagem mais recente e ainda livre daquela pergunta; a opção vem do botão clicado, senão do número ou do texto digitado, e sem correspondência grava só `disabled`.
- **Clique num passo de captura** (nível, objetivo, assunto, ponto): só quando a web envia o id da mensagem e o id do botão, a mensagem é do usuário, é do sistema com lista, o botão existe nela, a opção bate com a lista atual do passo e a lista ainda não está travada. O clique segue o mesmo caminho da escolha daquela opção da lista. Texto digitado nesses passos não grava estado.

Comandos e respostas barradas (limite, supressão) não alteram a mensagem; a gravação só acontece depois que a mensagem é aceita para processamento. A superfície web antecipa localmente a seleção no clique e volta ao pendente se o envio falhar ou se o servidor não avaliar a mensagem como resposta. Mensagens anteriores a essa regra ficam sem estado (sem backfill).

**Indicador de digitando.** O servidor é a única fonte de quando o "digitando" aparece; o cliente não deduz nada a partir do histórico. Assim como as camadas opcionais acima, cada canal decide como mostrar o aviso:

- **Superfície web**: o indicador acende ao receber o aviso de início do servidor pelo canal em tempo real da conversa.
- **WhatsApp**: indicador nativo, que só existe ligado a uma mensagem recebida do usuário (e marca essa mensagem como lida). Envios iniciados pelo sistema, sem mensagem do usuário por trás (lembrete, processamento de material em fila, cadência), não mostram indicador nesse canal.

Quando aparece:

- Logo antes de qualquer preparo de duração incerta: avaliação da resposta (incluindo o áudio de feedback que vem junto), geração da próxima pergunta (incluindo a imagem), validação do assunto e geração do conteúdo no fluxo de nova atividade (Seção 15), processamento de material (Seção 14), resumo de conclusão da rodada (Seção 2) e resumo ao retomar uma atividade (Seção 1). Quando o preparo tem várias etapas lentas (pergunta com imagem, e o novo formato quando a imagem falha), o aviso é renovado antes de cada etapa, para o indicador não sumir no meio.
- Nos segundos finais de uma pausa deliberada entre duas mensagens da mesma sequência (ex: entre o feedback e o áudio, entre a dica e a próxima pergunta, depois de `praticar`, entre um cancelamento e a orientação que vem em seguida). Mensagens de uma mesma sequência nunca saem coladas, sempre com pausa entre elas. Pausas curtas saem em silêncio, como as do onboarding, sem indicador, para ele não piscar na tela. A antecedência e o limiar mínimo da pausa são parâmetros de configuração, como os próprios intervalos, e podem ser ajustados sem atualizar este documento.

Quando some, o que vier primeiro:

- chega a próxima mensagem do sistema;
- o servidor avisa o fim, o que só acontece quando o processamento de uma mensagem do usuário termina sem enviar nada (erro no meio ou caminho que não responde);
- 25 segundos sem nenhum sinal, como rede de segurança contra aviso perdido ou canal caído (mesmo limite do indicador nativo do WhatsApp).

Não existe aviso periódico para manter o indicador aceso em preparos longos: passado o limite, ele some e a mensagem aparece quando chegar. Mensagem perdida no canal em tempo real continua coberta pela reconexão com recuperação de mensagens, sem consulta periódica extra.
