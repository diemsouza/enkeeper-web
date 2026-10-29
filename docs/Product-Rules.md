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

### Recebimento de material

Material entra só pela modal de nova atividade (Seção 15, "Material"). O usuário escolhe até 3 arquivos (imagem, PDF, TXT ou MD) e o nível. Cada arquivo é lido e validado na própria modal assim que é adicionado. Ao continuar, os arquivos formam um único material, a modal fecha e o processamento segue no chat, sem janela de espera. Fechar a modal antes de continuar não cria nada e não deixa rastro no chat.

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

### Resposta por voz

Na web, o usuário pode responder por áudio gravado no próprio composer. Com o campo de texto vazio, o botão de enviar dá lugar ao microfone; com texto digitado, volta o enviar. O botão só aparece quando o navegador grava num formato que o player do produto toca.

- **Dois modos no mesmo botão:** tocar e soltar rápido (menos de 300ms) grava no modo travado, com lixeira e enviar. Segurar 300ms ou mais grava no modo segurar: a barra mostra "Solte para enviar" no lugar da lixeira e do enviar, e soltar em qualquer lugar da tela envia. Não há gesto de cancelar no modo segurar. Enquanto o microfone ainda não foi liberado, o pedido do navegador interrompe o gesto e a gravação segue no modo travado. O gesto não rola a conversa nem abre menu ou seleção de texto.
- **Gravação:** limite de 30 segundos. Aos 20 segundos o cronômetro muda de cor e aparece o aviso "Restam apenas 10s"; aos 30 a gravação para e é enviada sozinha. Gravação com menos de 1 segundo é descartada sem mensagem. A lixeira cancela e descarta. Não há tela de pré-ouvir: enviar é parar e enviar.
- **Interrupção:** se a gravação é interrompida (aba em segundo plano, tela bloqueada, erro do gravador), o que já foi gravado é enviado quando passa de 1 segundo e descartado abaixo disso. A tela nunca fica presa no estado gravando.
- **Envio:** otimista. A bolha do usuário aparece na hora com o player, e "Enviando" fica embaixo até o arquivo ser recebido. Se falhar, a bolha fica apagada com "Não foi enviado." e "Tentar de novo", pelo mesmo mecanismo de reenvio das demais mensagens.
- **Permissão:** o primeiro pedido é sempre o do próprio navegador. A tela do produto ("Libere o microfone", com o passo a passo da plataforma) só aparece quando o acesso é negado; "Entendi" fecha e leva ao campo de texto. Sem microfone ou microfone em uso por outro app geram um aviso curto, sem tela.
- **Avaliação:** o áudio é transcrito e a transcrição segue exatamente o caminho de uma resposta digitada: mesma avaliação, mesmo feedback, mesmo SM-2 e mesma nota, com o bônus de resposta por áudio (Seção 6.3).
- **Áudio sem fala:** transcrição sem nenhuma letra (silêncio, ruído) não chega à avaliação. A mensagem fica salva com o áudio, volta "Não deu para ouvir o áudio. Grave de novo ou responda digitando." e a pergunta continua pendente.
- **Pergunta de escuta:** continua exigindo resposta digitada (Seção 4); voz nela não é avaliada.
- Fora de uma pergunta pendente, a transcrição é tratada como texto digitado.
- **Comandos por voz:** a transcrição passa pela mesma detecção de comandos do texto digitado, depois de tirar a pontuação das pontas, deixar minúsculo e cortar os espaços ("Menu." vale como "menu"). Com pergunta pendente vale a mesma regra do digitado: os comandos de navegação (ajuda/menu, atividades, suporte, pausar, retomar, cancelar, praticar, nível, nova atividade) são executados e a pergunta continua pendente; "sim" e "não" são avaliados como resposta.
- **Ver transcrição:** abaixo do áudio do usuário, no mesmo formato do "Ver tradução" (abre e fecha), mostra o texto transcrito. Só aparece quando a transcrição fica pronta, sem recarregar a página, e nunca em áudio sem fala.

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

O nível do perfil é o declarado pelo usuário e vale para qualquer atividade futura, com prioridade sobre o nível do material. Não existe pergunta de nível no onboarding: a modal de nova atividade (Seção 15) abre com o nível do perfil, ou Básico quando ainda não há nenhum, e a escolha feita nela atualiza o perfil. Nível escrito explicitamente no texto do pedido ("nível avançado", "sou iniciante") vale só para aquela atividade, sem alterar o perfil.

O nível do perfil também é trocado na modal de nível, aberta pelo comando `nivel` (como qualquer comando, a resposta é uma mensagem de comando, Seção 19, sem balão no chat) ou direto pelo item "Nível" do menu da conta. A modal mostra as três opções já marcadas com o nível atual e avisa que a troca vale para as próximas atividades criadas; a atividade atual continua no nível dela. Salvar fecha a modal com um toast de confirmação. A modal de nível e o combo de nível da modal de nova atividade leem e gravam o mesmo valor do perfil: o que muda num lugar já aparece no outro. Fechar ou cancelar não gera mensagem.

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

**Aceitação por origem do conteúdo** (formatos de resposta livre):
- Atividade gerada pelo sistema a partir de um tema (Seção 15): as respostas esperadas são a preferida, não a única. Vale como certo qualquer termo que um falante nativo usaria naturalmente na frase, com o mesmo sentido pedido (ex: "get results" quando o esperado era "achieve results"). O termo precisa carregar a ideia pedida, não basta caber na frase sem erro. Motivo: o conteúdo foi escrito pela IA, o usuário não tem como saber qual dos sinônimos naturais ela escolheu, e marcar erro numa resposta correta em inglês ensina errado.
- Material enviado pelo usuário: só as respostas esperadas e suas variações de grafia, flexão, artigo e contração. Outro termo, mesmo correto em inglês, é erro. Motivo: o usuário está estudando aquele material, e o termo do material é o que ele precisa fixar.
- Formatos de escolha entre opções (múltipla escolha, reconhecimento por imagem) seguem exatos em qualquer origem: só a opção correta vale.

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

O prompt de avaliação não conhece o formato nem decide sozinho o envio: o filtro final fica no código. Em acerto, a dica só é enviada se a classe retornada for alternativa, o formato for um dos quatro de resposta digitada e o texto da dica citar uma resposta esperada diferente da que o usuário escreveu. Fora disso a dica é descartada, inclusive o texto. A dica em acerto não altera status nem nota da pergunta, e a ordem de envio é a mesma: feedback, áudio (se houver) e dica. O acerto com termo fora das respostas esperadas tem efeito próprio no agendamento de revisão, descrito na Seção 7, independente de a dica ser enviada.

O texto da dica segue uma marcação própria: negrito para a forma contrastada, itálico para um termo curto em inglês, aspas duplas para uma frase completa em inglês, riscado só para uma forma que não existe em inglês. Cada dica usa só a marcação que fizer sentido para o caso.

Vale tanto para cadência quanto para sessão intensiva. Em sessão intensiva, a dica não atrasa nem bloqueia o disparo da próxima pergunta, é enviada em sequência imediata.

### 6.3 Sugestão de troca de atividade

Quando a atividade ativa já atingiu uma nota alta o suficiente, o feedback de uma resposta correta pode vir acompanhado da sugestão de trocar de atividade (🔄, ver vocabulário de emoji), com botão (ou o comando por extenso, dependendo do canal) para iniciar o fluxo de nova atividade. O fecho da mensagem depende do modo: no modo intensivo, sugere apenas aguardar a próxima pergunta; fora dele, como não há mais pergunta por cadência, sugere continuar praticando e traz também o botão Praticar, abaixo de Nova atividade. Se algo impedir a prática (limite do dia, conta expirada etc.), o Praticar segue o fluxo normal e recebe a resposta de bloqueio de sempre. Nunca acompanha feedback de erro ou parcial, para não soar como reação ao erro. A dica de alternativa em acerto (Seção 6.2) pode ser enviada na mesma resposta, como mensagem separada após o feedback, sem influenciar a nota.

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

**Acerto com alternativa:** quando a resposta foi aceita como certa por equivalência, com um termo fora das respostas esperadas (Seção 6), o fator de facilidade não muda (+0) e o intervalo avança normalmente. Motivo: a pergunta existe para fixar o termo esperado. Se a alternativa valesse como acerto pleno, o fator subiria e a pergunta se afastaria sem o usuário ter usado o termo-alvo. Assim ela continua avançando, só não acelera. Quem responde uma das respostas esperadas, mesmo havendo outra, conta como acerto pleno.

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

Ações do usuário em `/app` que dependem de uma chamada ao backend (hoje: salvar preferência de lembrete diário no modal de calendário, salvar o nível na modal de nível e enviar o pedido na modal de suporte) mostram um toast de confirmação de sucesso ou erro após a resposta.

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
| `nova atividade` | Abre a modal de nova atividade (ver Seção 15). Nada aparece no chat até a atividade ser validada |
| `nivel` | Abre a modal de nível (ver Seção 5). Nada aparece no chat |
| `cancelar` | Sai do fluxo ou ação em andamento |
| `suporte` | Abre a modal de suporte (ver Seção 9.1). Nada aparece no chat |

Comandos não atualizam o histórico de prática nem contam como interação.

### 9.1 Suporte

O pedido de suporte acontece só na modal de suporte, aberta pelo comando `suporte` (e aliases, texto ou voz, inclusive com plano vencido) ou direto pelo item "Suporte" do menu da conta. A modal tem um campo de texto e o botão Enviar, que só habilita com texto. O pedido vai para a equipe pelo mesmo canal de sempre (e-mail de suporte com os dados da conta) e nunca entra no histórico do chat nem passa pela avaliação de exercício. Ao enviar, a modal fecha e um toast diz por onde a resposta chega: WhatsApp para conta com número, e-mail para conta só com e-mail. Falha no envio aparece dentro da modal, com o texto mantido para tentar de novo. Fechar ou cancelar não gera mensagem.

Usuário sem nenhuma atividade criada recebe, junto da resposta ao comando `ajuda`, orientação sobre como começar a praticar (ver Seção 10). É a mesma orientação usada no onboarding e no fallback de usuário sem atividade (ver Seção 10.1), com uma única fonte de conteúdo para as três situações, evitando que a mesma regra fique escrita de formas diferentes em pontos distintos do produto.

### Superfícies de descoberta

A lista de comandos tem duas superfícies de descoberta, ambas alimentadas pela mesma fonte única de comandos e aliases, sem lista duplicada:

- O comando `ajuda`, que devolve a lista formatada.
- O autocomplete do composer na superfície web: ao digitar `/`, o campo sugere comandos de forma incremental, filtrando por prefixo ou alias conforme o usuário digita, e envia o comando escolhido direto.

O comando `ajuda` não aparece na própria lista que gera nem no autocomplete. Comandos de confirmação dentro de um fluxo em andamento (`sim`, `não`, `cancelar`) e o comando interno de staff também ficam fora das duas superfícies. Alterar a fonte de comandos atualiza as duas ao mesmo tempo.

---

## 10. Onboarding

Sequência fixa de mensagens no primeiro contato. A estrutura, sequência com ordem fixa e prazo de trial declarado antes de qualquer ação, é regra de negócio. A quantidade de mensagens não é regra fixa, pode variar conforme necessidade de copy, desde que a ordem lógica seja preservada: saudação, proposta de valor, instrução da ação (escolher um tema ou enviar material), o que acontece depois, prazo de trial e comandos disponíveis.

A sequência termina com uma mensagem com o botão "Criar atividade", que abre a modal de nova atividade (Seção 15). Nada começa sozinho: não há pergunta de nível nem passo de criação no chat, e a modal não abre sem o toque do usuário. Quem já passou pelo onboarding e abre o app sem nenhuma atividade recebe a mesma mensagem com o botão.

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

Última mensagem da sequência (exemplo do texto atual, com o botão "Criar atividade"):

```
Crie sua primeira atividade para começar a praticar sobre o que você quiser.
```

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
| Pro Mensal | 1 mês, renova automaticamente | Produto completo |
| Pro Anual | 1 ano, renova automaticamente | Produto completo |

Após expirar o acesso, trial ou Pro: conta bloqueada até converter. Sem degradação gradual, o produto inteiro ou nada.

A regra de acesso é simples: plano ativo com data de expiração no futuro. Independe do tipo de plano e de como o período foi pago. Acesso cortesia ou manual é concedido direto no usuário (plano e data de expiração), sem precisar de assinatura.

### 11.1 Cobrança e liberação automática

Cobrança é assinatura recorrente no cartão, em dois planos:

- **Mensal:** R$29,90 por mês.
- **Anual:** R$262,80 por ano, exibido como R$21,90/mês (economia de R$96 no ano). É o plano selecionado por padrão.

O trial de 7 dias continua sem cartão. Ao assinar, a primeira cobrança acontece na hora, sem período de teste adicional.

**E-mail no checkout:** se a conta tem e-mail cadastrado, o checkout da Stripe já abre com ele preenchido. Quem já foi cliente na Stripe abre com o e-mail que está no cadastro de lá. Conta sem e-mail preenche no próprio checkout, como antes.

**Acesso fora da assinatura:** cortesia e pagamento recebido por fora (Pix pelo `suporte`, por exemplo) são registrados direto no usuário (plano e data de expiração), sem depender de assinatura no cartão. O pagamento por fora também fica registrado no histórico de pagamentos do usuário.

**Confirmação e renovação:** cada cobrança confirmada (a primeira e cada renovação) deixa o acesso Pro, ativo, até o fim do período pago mais 1 dia de folga, que cobre a cobrança da renovação (feita pela Stripe pouco depois do fim do período) e falhas de rede. A data de renovação mostrada ao usuário é a do período, sem a folga. A mensagem de confirmação sai só na primeira cobrança da assinatura: "Assinatura confirmada", com o plano (mensal ou anual) e a data da próxima renovação. Renovações atualizam o acesso em silêncio. Evento repetido do mesmo pagamento não gera nova confirmação.

**Falha de pagamento:** nenhum bloqueio imediato. A Stripe faz novas tentativas de cobrança e avisa o usuário por e-mail. O acesso segue até o fim do período pago mais a folga de 1 dia; depois disso a conta fica bloqueada e é liberada na hora em que uma nova tentativa for paga. A folga é curta de propósito, para não manter prática (e custo de IA) para quem não pagou. Cancelamento imediato não tem folga.

**Cancelamento:**
- Pelo usuário: em "Assinatura" (menu da conta no app), que abre a página de planos; com assinatura no cartão ativa, o botão "Gerenciar ou alterar plano" leva ao portal de pagamento, onde também troca o cartão e muda de plano. Acesso pago por fora é cancelado pelo `suporte`.
- Cancelamento programado (pelo portal, no fim do período), contratado durante ou depois do trial: a assinatura fica marcada como cancelada no fim do período, e a marcação é desfeita se o usuário reativar pelo portal. O acesso segue até o fim do período pago, sem mudar a data de expiração.
- Cancelamento imediato (forçado pelo painel da Stripe, em geral junto com reembolso):
  - Ainda no trial (menos dias desde o cadastro do que os dias de trial configurados): o acesso passa a valer até a data de cadastro mais os dias de trial.
  - Trial já encerrado: o acesso passa a valer até o momento exato do cancelamento e expira na hora.

**Mensagem de bloqueio:** o texto depende da situação, com o mesmo botão "Continuar" e a mesma orientação de `suporte`:
- Fim do trial: "Escolha um plano para continuar praticando."
- Plano pago expirado ou com pagamento falho: "Atualize seu pagamento ou escolha um plano para continuar praticando."

**Link do bloqueio:** depende da assinatura mais recente:
- Assinatura no cartão, ainda não cancelada: portal de pagamento, para trocar o cartão e quitar a fatura pendente.
- Qualquer outro caso (sem assinatura, cancelada ou paga por fora): página de planos; o botão abre o pagamento do plano escolhido. O link de pagamento de cada plano é reaproveitado enquanto estiver válido.

**Página de planos (app):** acessível a qualquer usuário logado pelo item "Assinatura" do menu, em qualquer situação. O título "Escolha seu plano" abre a página, sem linha de topo no card. Conforme a situação:
- Trial ou sem plano: os planos para assinar, com o alternador Anual / Mensal.
- Assinatura no cartão ativa: alternador travado no plano atual, botão principal desativado como "Plano atual" e o botão "Gerenciar ou alterar plano", que abre o portal. Um novo pagamento nunca é aberto nesse caso, mesmo se a tela for contornada: o pedido devolve o portal.
- Assinatura no cartão com cancelamento programado: mesmo estado de assinante, trocando "Renova automaticamente. Cancele quando quiser." por "Assinatura cancelada. Acesso até {data}.", com data relativa: "hoje", "amanhã" ou dd/mm/aaaa.
- Acesso ativo por pagamento fora da Stripe ou cortesia (sem assinatura no cartão): aviso "Seu acesso está ativo até {data}. Para renovar ou cancelar, envie /suporte no chat." acima dos planos, que continuam disponíveis para assinar no cartão.

**Navegação:** links do próprio app (página de planos e portal) abrem na mesma aba, inclusive o botão da mensagem de bloqueio. Ao concluir o pagamento, o usuário volta ao app com um aviso de pagamento confirmado; ao sair do portal, volta para a página de planos.

**Reembolso:** integral em até 7 dias após cada pagamento, pelo `suporte`.

### 11.2 Login automático via link do WhatsApp

Link enviado pelo WhatsApp que aponta pro app pode carregar um token assinado que
autentica automaticamente quem abre o link no navegador, sem passar pelo formulário
de telefone e código. Sessão já ativa no navegador é sempre respeitada, o token nunca
sobrescreve um login existente. Token expira em 24 horas; expirado, ausente ou sem
conta correspondente, cai no fluxo normal de login, sem nenhum aviso de erro. Só
existe para conta com número: o link sai pelo WhatsApp e o token é resolvido pelo
número.

O link efetivamente entregue ao usuário não carrega o token direto na URL: é um
link curto (shortlink) que resolve por redirecionamento pro destino real, com a
mesma validade de 24 horas do token. Link expirado ou inexistente cai na home,
silenciosamente. O mecanismo de shortlink é genérico, reutilizável por qualquer
outro caso que precise de link curto com expiração (ex: link de pagamento,
indicação), não é exclusivo do login por WhatsApp.

### 11.3 Login

O acesso ao app começa em `/login`. A tela inicial tem só o título, o subtítulo e dois botões do mesmo tamanho, um embaixo do outro: "Continuar com Google", no padrão oficial do Google (estilo escuro no tema claro, estilo claro com o "G" colorido no tema escuro), e "Entrar com telefone", só com contorno. O botão de telefone não cita WhatsApp para não parecer login pela Meta. O campo de número só aparece depois do toque em "Entrar com telefone". No rodapé da tela, em todas as etapas do login (opções, telefone e código), em texto pequeno: "Ao continuar, você concorda com os Termos de uso e a Política de privacidade.", com links para `/terms` e `/privacy`. O título e o subtítulo mudam entre visitante novo e quem já entrou antes neste navegador ("Comece agora" / "Entrar").

**Conta:** toda conta tem número, e-mail ou os dois. Um número, uma conta; um e-mail, uma conta. Quem entra por telefone não precisa de e-mail. Conta sem número não recebe nada pelo WhatsApp (lembrete, reengajamento, link de login automático); todo o resto do produto funciona igual. O número é pedido depois, em etapa própria (Seção 11.3.3).

**Destino:** os dois logins voltam para a página que o usuário tentou abrir (`redirect_to`), ou para `/app`.

**Sair:** o menu da conta mostra, acima de "Sair", com o que a pessoa entrou ("Conectado com Google" e o e-mail, ou "Conectado com WhatsApp" e o número), e a confirmação pergunta "Deseja realmente sair da conta {conta}?". Sair encerra só a sessão do Fluizer; no próximo login com Google a pessoa escolhe a conta Google de novo.

**Origem e medição:** o cadastro por qualquer um dos dois grava a mesma origem (campanha, clique de anúncio, referência) e dispara o mesmo evento de cadastro para conta nova e de login para conta existente, com o método usado (`google`, `phone` ou `whatsapp`).

#### 11.3.1 Login com Google

- Pede só a identificação básica da conta Google (e-mail, nome e foto).
- A conta é achada pelo e-mail. Só vale e-mail que o Google confirma como verificado, gravado sempre em minúsculas. Sem conta com esse e-mail, cria uma nova (trial padrão, com nome e foto do Google); com conta, entra nela sem alterar nada.
- Nenhum identificador do usuário no Google é guardado.
- Quem entrou antes por telefone e toca no Google com um e-mail que não está em nenhuma conta ganha uma conta nova, separada.
- Erros, acima dos dois botões da tela inicial:
  - Cancelou na tela do Google: "Login com Google cancelado. Tente de novo."
  - E-mail não verificado: "Seu e-mail do Google não está verificado. Use outra conta ou entre com WhatsApp."
  - Qualquer outra falha: "Não foi possível entrar com o Google. Tente de novo."

#### 11.3.2 Login por telefone

Aberto pelo botão "Entrar com telefone". O número do WhatsApp recebe o código de acesso. A tela tem o campo "Número do WhatsApp", o botão "Enviar código de acesso", um único texto de apoio e, abaixo, o link discreto "Voltar", que retorna aos dois botões. Código pedido há pouco (ainda válido) reabre direto a etapa do código; "Trocar número" volta para o campo.

- **País:** qualquer país, com o Brasil já selecionado. Sem detecção automática. O seletor fica à esquerda, dentro do campo (bandeira e código do país).
- **Formatos aceitos:** digitado, colado ou por preenchimento automático, com ou sem código do país (`+55`, `55`, `0055`), com ou sem o `0` de tronco (`011`), com espaços, traços, pontos, parênteses e os caracteres invisíveis que vêm ao copiar de um contato. Número colado com o código de outro país troca o seletor para esse país.
- **Brasil:** aceita 10 ou 11 dígitos com DDD (fixo, celular com ou sem o nono dígito), sem alterar o nono dígito. Sem o `+`, um `55` no início só é lido como código do país quando o número não fecha como nacional, já que DDD 55 existe.
- **Outros países:** aceita o número válido pelo plano de numeração do país.
- **Botão "Continuar":** sempre clicável. Número incompleto ou inválido mostra "Digite o número com DDD." abaixo do campo.
- **Mesma conta:** o número é gravado num único formato (código do país e número, só dígitos). O mesmo número digitado de qualquer forma cai sempre na mesma conta.
- **Campo:** com foco automático ao abrir o formulário (a escolha pelo telefone já foi feita).
- **Texto de apoio:** abaixo do botão, "Seu número é usado para o acesso e os lembretes da sua prática diária."

#### 11.3.3 Cadastro de número em conta sem telefone

Conta criada pelo Google cadastra o número depois do login, num modal de número e código com as mesmas regras, campo e código do login por telefone (Seção 11.3.2), sem o link "Voltar". Quem abre o modal define o título e o subtítulo.

- **Gravação:** confirmado o código, o número entra na conta logada. Não cria nem abre outra conta, e a sessão continua a mesma. A partir daí o número é identidade da conta: entra por telefone e recebe pelo WhatsApp.
- **Número de outra conta:** confirmado o código, se o número já pertence a outra conta, nada é gravado e aparece "Esse número já está sendo usado por outra conta." A checagem só acontece depois do código, para não revelar a qualquer conta logada se um número tem cadastro.
- **Lembrete sem número:** o item "Lembrete de prática" do menu da conta, em conta sem número, abre primeiro o modal de número com título "Lembrete de prática" e subtítulo "Para receber o lembrete pelo WhatsApp, cadastre seu número." Confirmado o número, abre em seguida o modal de lembrete com o lembrete ativado e o horário da conta (o padrão do cadastro), com "Salvar" liberado para a pessoa só ajustar e salvar. Fechou sem confirmar, nada muda. Conta com número abre o modal de lembrete direto.
- **Abertura automática:** em conta sem número, o mesmo fluxo abre sozinho alguns segundos (3 s) depois da mensagem "Você respondeu sua primeira pergunta dessa atividade...", a pausa natural depois do primeiro feedback de uma atividade nova. Se houver áudio tocando nesse momento, espera ele terminar. Se a pessoa tocar em Praticar antes, não abre e fica para a próxima atividade nova.
- **Só uma vez:** a abertura automática fica registrada na conta no momento em que abre. Fechada, não reabre sozinha em nenhuma sessão ou navegador; o número continua disponível pelo item do lembrete.

### 11.4 Navegador dentro de apps

O Google bloqueia login dentro do navegador de apps como Instagram, Facebook, Messenger e TikTok. A checagem acontece só no toque em "Continuar com Google", nunca ao abrir a tela: quem entra por WhatsApp segue no próprio app.

- **Android:** a mesma tela de login abre no navegador padrão do celular.
- **iPhone:** tenta abrir no Safari. Se o app não deixar, mostra uma tela curta:
  - Título: "Abra no Safari para entrar com o Google"
  - Texto: "O Google não permite entrar por este navegador. Toque em ••• e escolha Abrir no navegador, ou copie o link e cole no Safari."
  - O link visível e o botão "Copiar link" (vira "Link copiado").
  - "ou entre com WhatsApp", que abre direto o formulário de telefone.
- **Origem preservada:** o link aberto fora do app leva a página de destino e todos os parâmetros de campanha (UTM, `fbclid`, `gclid`), da URL atual ou, sem eles, da origem já registrada no navegador do app. Sem isso, o cadastro feito no outro navegador perderia a atribuição.

---

## 12. Lembrete diário e reengajamento

Um único fluxo automático de notificação pelo WhatsApp leva o usuário de volta à prática na superfície web (`/app`). Lembrete diário e reengajamento por inatividade não são fluxos separados: a decisão sai só de quantos dias se passaram desde a última resposta de prática do usuário, calculada no momento do disparo, sem estado próprio guardado entre um dia e outro.

Aplica-se só a usuário com ao menos uma Activity ativa e com número cadastrado. Usuário sem atividade não recebe nada deste fluxo, esse caso é tratado pela Seção 10.1. Conta sem número (login com Google, Seção 11.3) também não recebe, até cadastrar o número (Seção 11.3.3).

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

Texto solto enviado no chat nunca é interpretado como material. Só arquivo (imagem, PDF, texto em arquivo) dispara o processamento desta seção. Texto no chat tem só duas leituras possíveis: comando, ou resposta a uma pergunta de prática (ou a um passo em andamento, como a troca de nível). Arquivo de material entra só pela modal de nova atividade (Seção 15); o clipe do chat abre a modal na tela de material.

Áudio não faz mais parte do processamento de material: só imagem, PDF e texto em arquivo geram Doc. Nota de voz (áudio) serve exclusivamente para responder a uma pergunta de prática pendente (ver Seção 17). PDF e texto em arquivo são processados em memória e descartados após extração — a imagem é a exceção, ver Seção 14.1 e Seção 17.

**Cap diário: 5 atividades por usuário por dia.** O cap conta atividades criadas, não arquivos enviados: até 3 arquivos enviados juntos pela modal formam um único material e consomem uma única vaga. A modal checa o cap antes de fechar e avisa ali mesmo quando ele já foi atingido. Modal fechada antes de continuar, ou pedido barrado na validação, não consome o cap.

Após o processamento, a primeira pergunta é agendada com um atraso de 3 minutos, para garantir que o usuário receba a confirmação de processamento antes da primeira interação de prática. O mesmo atraso se aplica à primeira pergunta de uma atividade criada pelo fluxo de nova atividade.

**Origem do material:** cada material grava sua origem, `upload` ou `generated` (ver Seção 15). Material com origem `generated` grava também o objetivo, o assunto, o(s) foco(s) e o subtópico que originaram aquele conteúdo, para rastreabilidade. Material com origem `upload` não grava esses dados por enquanto.

O webhook classifica a mensagem recebida pelo type informado pelo canal antes de decidir o processamento. text, image, audio, document, button e interactive seguem o processamento normal. reaction e sticker são ignorados silenciosamente, sem gerar resposta nem entrar no pipeline de avaliação. video recebe mensagem própria informando que ainda não é suportado. Os demais tipos (location, contacts, order, system, unknown, e qualquer tipo não mapeado) recebem mensagem de comando inválido, orientando o uso de /ajuda.

### 14.1 Processamento de imagem (OCR)

Uma imagem enviada como material passa por três desfechos possíveis:

- **Texto extraído.** A imagem tem um foco textual claro (post, página de caderno, slide, documento) — o texto legível é extraído e vira o material, como antes.
- **Descrição da cena.** A imagem não tem texto predominante, mas mostra uma cena, ambiente ou objeto reconhecível — o sistema gera uma descrição rica em inglês do que aparece, detalhada o suficiente para servir de material de prática. Essa descrição alimenta o pipeline normalmente, como se fosse um texto enviado. Antes, esse caso era descartado com mensagem genérica de que não foi possível identificar texto; hoje vira conteúdo de prática.
- **Bloqueada ou ilegível.** Conteúdo impróprio (nudez, abuso, violência explícita, drogas, armas) é bloqueado com mensagem dedicada, sem gerar atividade. Imagem tecnicamente inutilizável (resolução baixa demais, sem foco identificável) recebe mensagem pedindo reenvio com melhor qualidade, também sem gerar atividade.

---

## 15. Nova atividade (modal)

Toda atividade nasce numa modal única, por tema escrito ou escolhido, ou pelo material do usuário. A modal substitui o antigo fluxo de captura em etapas no chat: com as opções todas visíveis de uma vez, o usuário percebe que pode escrever o que quiser, e o início da prática deixa de ser uma sequência de mensagens.

### Abertura

A modal abre pela resposta ao comando `nova atividade`, como qualquer comando do chat: digitado, pelo menu `/`, por voz, por qualquer alias, pelo botão "+ Nova atividade" do menu lateral, pelo botão "Criar atividade" do convite (Seção 10) ou pelo botão "Nova atividade" da sugestão de troca (Seção 6.3). O pedido fica no histórico como mensagem do usuário, e a resposta é uma mensagem de comando (Seção 19), que não aparece no chat e abre a modal direto. Assim o histórico sempre mostra quem pediu a atividade e como, sem balão repetido de resposta. A detecção é só pelo comando e seus aliases; texto livre ("quero praticar...") não abre a modal.

A modal só abre quando a resposta chega em retorno a uma mensagem enviada nesta aba. Recarregar a página, outra aba ou outro dispositivo nunca abrem a modal. O clipe do composer abre a modal direto na tela de material, sem mensagem.

O card "Crie sua primeira atividade..." / "Crie uma atividade..." com o botão "Criar atividade" existe só nas mensagens que o sistema inicia: o fim do onboarding e a conversa aberta sem nenhuma atividade. O toque no botão envia "Criar atividade" como mensagem do usuário, que segue o caminho acima.

Fechar ou cancelar a modal não gera nenhuma mensagem. A resposta visível ao pedido passa a ser o fluxo de criação ("Pronto", primeira pergunta), quando a atividade é criada. Não existe estado pendente de criação no chat.

### Tela principal

- **Texto livre**, até 200 caracteres: o que o usuário quer praticar.
- **Sugestões**, em abas pelos 4 objetivos (Dia a Dia e Lazer, Viagens Internacionais, Educação e Intercâmbio, Mercado de Trabalho), 20 por objetivo, ordenadas das que mais engajam para as mais específicas. Tocar numa sugestão preenche o campo, que continua editável, e marca o item como referência. A lista nunca é filtrada nem destacada pelo que se digita.
- **Nível** (Básico, Intermediário, Avançado), vindo do perfil (Seção 5).
- **Foco**, até 3, escolhido do catálogo de foco linguístico, agrupado por seção. Sem escolha, a prática usa o vocabulário e as estruturas naturais da situação (vocabulário geral).
- Rodapé com "Usar meu material" e "Continuar", que só habilita com texto.

### Validação dentro da modal

Ao continuar, a validação acontece na própria modal, antes de fechar. Erro de validação nunca vai para o chat.

1. **Acesso e cap**: plano ativo, cap diário (Seção 14) e nenhuma outra criação em andamento.
2. **Pedido** (uma chamada de LLM): conteúdo proibido (pornografia, sexualização, qualquer conteúdo sexual envolvendo criança ou adolescente, drogas, armas, violência, discurso de ódio, xenofobia, racismo ou equivalente), informação suficiente para gerar uma atividade e extração de objetivo, assunto, nível e foco do texto. Conteúdo proibido recebe aviso curto e genérico, sem revelar o motivo. Falta de informação mostra o que falta e 2 ou 3 exemplos clicáveis que completam o texto.
3. **Sugestão pronta escolhida e não editada** pula a chamada do passo 2, porque já carrega objetivo e assunto.

### Coerência entre texto e controles

Sem bloquear nem perguntar ao usuário:

- Foco escrito no texto e nada selecionado: usa o do texto.
- Focos selecionados mais os escritos passando de 3: os selecionados primeiro, completando com os do texto até 3.
- Nível explícito no texto diferente do selecionado: o do texto vale para esta atividade; o perfil fica com o selecionado.
- Objetivo: o que o texto indica; sem indicação, o da aba aberta.

A mensagem "Pronto" no chat mostra objetivo, assunto, nível e foco aplicados.

### Depois de validar

A modal fecha e o chat segue com o fluxo de sempre: indicador de digitando durante a geração, "Pronto" com o que foi aplicado, resumo da atividade anterior (Seção 1) e primeira pergunta. Falha na geração aparece no chat com o botão "Tentar de novo". O toque vai pelo chat como mensagem do usuário e repete a geração com o mesmo pedido, sem reabrir a modal; sem pedido guardado, a resposta é a mesma do comando `nova atividade` (abre a modal). Com o cap diário atingido ou outra criação em andamento, a resposta avisa no chat.

### Material

"Usar meu material" troca o conteúdo da modal: envio de até 3 arquivos (imagem, PDF, TXT ou MD), nível e rodapé com Voltar e Continuar. Não há campo de colar texto. Cada arquivo é lido ao ser adicionado e erros aparecem no próprio arquivo: imagem bloqueada ou ilegível (Seção 14.1), arquivo sem conteúdo, formato não aceito ou acima do tamanho máximo. Ao continuar, a modal checa o cap e o mínimo de conteúdo; validou, fecha, os arquivos aparecem no chat e o processamento é acompanhado ali (Seção 14), incluindo a recusa de conteúdo proibido pela extração, que roda depois.

### Geração de conteúdo

Depois que a modal fecha, duas chamadas de LLM em sequência:

1. **Subtópicos.** Revalida o assunto contra conteúdo proibido e gera 5 subtópicos, recortes específicos dentro do assunto.
2. **Geração.** O sistema sorteia um dos 5 subtópicos, excluindo o último usado por aquele usuário na geração mais recente com o mesmo objetivo e assunto, e gera 25 itens de vocabulário ancorados nesse subtópico e filtrados pelos focos resolvidos (quantidade de config, sujeita a revisão), no mesmo formato de lista do processamento de material (Seção 3). O sorteio é interno; na prática, repetir o mesmo assunto não repete o vocabulário.

Objetivo, assunto, foco e subtópico ficam gravados separados no material gerado, para rastreabilidade (Seção 14).

### Catálogo de foco linguístico

Foco é escolhido de um catálogo fixo de aspectos da língua: vocabulário geral, classes de palavra (substantivos, adjetivos), tempos verbais, conectores, phrasal verbs, estruturas gramaticais, entre outros. O catálogo vale para os três níveis, sem restrição por nível. Uma atividade combina até 3 focos. Novo item só entra no catálogo por decisão deliberada.

### Sem compartilhamento entre usuários

Conteúdo gerado é individual: sem pool compartilhado entre usuários, sem versionamento. O custo de geração escala por usuário e por troca de atividade. Sem revisão humana prévia; a moderação na modal e na geração reduz risco, mas não substitui auditoria amostral do conteúdo já entregue.

### Criação da atividade

Atividade criada pela modal segue as mesmas regras de transição e visibilidade da Seção 1 (arquiva ou cancela conforme a anterior teve resposta) e conta para o mesmo cap diário de 5 atividades (Seção 14). A atividade anterior só é arquivada depois que o novo conteúdo existe: falha na geração mantém a atividade atual.

---

## 16. Princípios de produto

- Produto focado em inglês. A arquitetura suporta expansão para outros idiomas e matérias, mas expansão só após validação e churn controlado.
- Janela de 24h do WhatsApp é regra de ouro. Mais de 85% das mensagens devem ser enviadas dentro dela.
- A prática acontece na superfície web própria (`/app`), não dentro do chat do WhatsApp (Seção 19). WhatsApp segue como canal de aquisição, autenticação (código e login automático, Seções 10 e 11.2) e notificação — onboarding, lembrete diário e reengajamento (Seção 12) e confirmação da assinatura na primeira cobrança (Seção 11.1) — levando o usuário de volta ao app, não como superfície de prática em si.
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
- **Áudio de resposta**: o áudio gravado pelo usuário (Seção 2, Resposta por voz) é armazenado como mídia da própria mensagem, com a transcrição e a duração, e aparece na conversa no mesmo player dos demais áudios. Quando responde uma pergunta pendente, a pergunta referencia o mesmo registro e ele entra no cálculo da nota (Seção 6.3). Ogg/Opus é o formato preferido; o navegador que só grava AAC (Safari antes do 18.4) gera m4a, sem conversão.
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

**Composer da web.** Tocar no play, no pause ou na barra de progresso de um áudio não tira o foco do campo de resposta: com o teclado aberto, ele continua aberto, para o usuário ouvir a pergunta quantas vezes quiser enquanto escreve. Tocar em qualquer outro lugar fecha o teclado. O campo cresce com o texto até 4 linhas e, passando disso, rola por dentro; depois do envio volta a uma linha. Nada da conversa fica escondido atrás dele ou do botão "ir para o final".

**Rolagem do chat (web).** Uma única chave de auto scroll, ligada por padrão, decide se mensagem nova rola a conversa até o fim:

- Mensagens de estudo são pergunta, feedback (texto e áudio) e dica: mensagem do sistema com `intent` `practice_question`, `practice_feedback` ou `eval_tip` e com `questionId`. Avisos, respostas a comandos e mensagens do usuário não são de estudo.
- Chave ligada: toda mensagem nova rola até o fim.
- Mensagem de estudo que chega quando a última mensagem do chat não era de estudo rola até o fim (a mensagem inteira visível, com o espaço do digitando abaixo) e desliga a chave.
- Chave desligada: mensagem nova do sistema não rola. Se ficar fora da tela, aparece o botão "ir para o final" com a bolinha azul.
- O usuário enviar qualquer mensagem (resposta, comando, opção) religa a chave e rola até o fim.
- Se o usuário rolou para cima, nada rola sozinho, nem com a chave ligada; só aparece o botão.
- O botão aparece só quando há mensagem fora da tela abaixo e some quando o usuário chega ao fim.
- O "digitando" nunca rola a conversa. Ele vive num espaço fixo no fim da lista, que continua lá vazio quando ninguém está digitando, para a altura da conversa não mudar.
- Mensagem já nasce com a altura final: imagem com a proporção conhecida antes de aparecer e player de áudio com altura fixa enquanto carrega.

`imageMediaId` e `interactive` podem vir juntos na mesma mensagem (hoje: pergunta de reconhecimento por imagem, Seção 4, com um botão por opção). A superfície web mostra a imagem, o texto como legenda e as opções como botões. O WhatsApp segue a prioridade acima: envia a imagem com o `text` como legenda e acrescenta as opções numeradas à legenda no envio, sem botões.

**Listas de opções.** Toda mensagem com lista de opções (`choice` e `image_recognition`) segue o mesmo padrão: o `text` leva só o enunciado, neutro de canal, sem opções numeradas nem instrução de responder por número; as opções vivem no `interactive`, que é persistido com a lista completa; cada canal monta a apresentação a partir dele. A web renderiza a lista a partir do `interactive`, inclusive ao recarregar. O WhatsApp pode acrescentar as opções numeradas ao texto no envio. O que é salvo no histórico é o `text` canônico, não o texto montado pelo canal.

**Mensagem de comando.** Além das mensagens com texto, o sistema envia mensagens de comando: instruções para a interface que nunca aparecem como balão. Cada uma tem uma ação e dados opcionais (hoje: "abrir a modal de nova atividade", Seção 15, com um texto pré-preenchido opcional ainda não usado; "abrir a modal de suporte", Seção 9.1; "abrir a modal de nível", Seção 5). Ficam salvas no histórico como as demais, para manter o registro de pergunta e resposta, mas a interface só executa a que chega ao vivo em resposta a uma mensagem enviada naquela aba, uma única vez. Histórico carregado, outra aba, outro dispositivo e recarregar a página nunca executam um comando. Canal sem interface para executar o comando o ignora. Uma ação nova entra sem mudar o formato.

Um canal novo pode nascer só com suporte a `text` e ganhar as camadas opcionais depois, sem quebrar nada que já existe (ver Seção 7 do Product-Brief, arquitetura multicanal).

Dentro de `interactive`, um botão pode ser de dois tipos: ação (resposta rápida nativa do canal, ex: "Nova atividade") ou link (abre uma URL, ex: link do bloqueio de acesso para a página de planos ou o portal de pagamento, Seção 11.1). Link do próprio app navega na mesma aba; link externo abre em nova aba. Mensagem com botão de link sempre inclui a mesma URL também no `text` puro, como fallback para quem recebe só a camada canônica.

`Message.templateName` e `Message.interactive` são persistidos junto do envio (colunas nullable, preenchidas só quando aplicável), como registro de auditoria do que foi de fato enviado ao usuário, não só o texto equivalente. O `interactive` em produção cobre hoje quatro casos: a sugestão de troca de atividade (Seção 6.3), botão de ação "Nova atividade" e, fora do modo intensivo, "Praticar"; o link de pagamento do bloqueio de acesso (Seção 11.1), botão de link que abre a página de planos ou o portal de pagamento e aparece como link clicável dentro do próprio texto em qualquer canal sem suporte a botão; os botões "Criar atividade" (convite do sistema) e "Tentar de novo" da criação de atividade (Seção 15); e as perguntas `choice` e de reconhecimento por imagem (Seção 4), com um botão por opção.

Nas listas de opções, o `interactive` guarda também o estado da seleção: `disabled` (todas as opções travadas) e `selectedId` (id da opção escolhida, destacada). Ausentes, a lista está pendente. Quem grava é a avaliação da resposta (`choice` e `image_recognition`), na mensagem mais recente e ainda livre daquela pergunta; a opção vem do botão clicado, senão do número ou do texto digitado, e sem correspondência grava só `disabled`. Cards de nível do antigo fluxo no chat continuam no histórico, sempre travados.

Comandos e respostas barradas (limite, supressão) não alteram a mensagem; a gravação só acontece depois que a mensagem é aceita para processamento. A superfície web antecipa localmente a seleção no clique e volta ao pendente se o envio falhar ou se o servidor não avaliar a mensagem como resposta. Mensagens anteriores a essa regra ficam sem estado (sem backfill).

**Indicador de digitando.** O servidor é a única fonte de quando o "digitando" aparece; o cliente não deduz nada a partir do histórico. Assim como as camadas opcionais acima, cada canal decide como mostrar o aviso:

- **Superfície web**: o indicador acende ao receber o aviso de início do servidor pelo canal em tempo real da conversa.
- **WhatsApp**: indicador nativo, que só existe ligado a uma mensagem recebida do usuário (e marca essa mensagem como lida). Envios iniciados pelo sistema, sem mensagem do usuário por trás (lembrete, processamento de material em fila, cadência), não mostram indicador nesse canal.

Quando aparece:

- Logo antes de qualquer preparo de duração incerta: avaliação da resposta (incluindo o áudio de feedback que vem junto), geração da próxima pergunta (incluindo a imagem), subtópicos e geração do conteúdo depois da modal de nova atividade (Seção 15), processamento de material (Seção 14), resumo de conclusão da rodada (Seção 2) e resumo ao retomar uma atividade (Seção 1). Quando o preparo tem várias etapas lentas (pergunta com imagem, e o novo formato quando a imagem falha), o aviso é renovado antes de cada etapa, para o indicador não sumir no meio.
- Nos segundos finais de uma pausa deliberada entre duas mensagens da mesma sequência (ex: entre o feedback e o áudio, entre a dica e a próxima pergunta, depois de `praticar`, entre um cancelamento e a orientação que vem em seguida). Mensagens de uma mesma sequência nunca saem coladas, sempre com pausa entre elas. Pausas curtas saem em silêncio, como as do onboarding, sem indicador, para ele não piscar na tela. A antecedência e o limiar mínimo da pausa são parâmetros de configuração, como os próprios intervalos, e podem ser ajustados sem atualizar este documento.

Quando some, o que vier primeiro:

- chega a próxima mensagem do sistema;
- o servidor avisa o fim, o que só acontece quando o processamento de uma mensagem do usuário termina sem enviar nada (erro no meio ou caminho que não responde);
- 25 segundos sem nenhum sinal, como rede de segurança contra aviso perdido ou canal caído (mesmo limite do indicador nativo do WhatsApp).

Não existe aviso periódico para manter o indicador aceso em preparos longos: passado o limite, ele some e a mensagem aparece quando chegar. Mensagem perdida no canal em tempo real continua coberta pela reconexão com recuperação de mensagens, sem consulta periódica extra.
