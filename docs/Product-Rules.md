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

Activity nunca encerra por inatividade. Só muda de status por ação do usuário, envio de novo material, ou conclusão do fluxo de nova atividade. O fluxo de nudge (seção 12) cuida do reengajamento enquanto a activity permanece `active`.

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

---

## 3. Extração de vocabulário do material

O material enviado, qualquer que seja o formato de entrada — texto corrido, lista de palavras, lista PT/EN, lista de-para, frase solta, lista de exercícios — é normalizado numa lista única de vocabulário antes de gerar as perguntas, até um teto de aproximadamente 25 termos.

Não existe mais classificação do material em tipos de seção com regras próprias para cada um. Essa era uma fonte real de complexidade: cada tipo tinha sua própria segmentação, mínimo de itens e cálculo de tamanho de pool. Hoje há um único formato de conteúdo canônico, e o restante do pipeline (formatos de pergunta, geração, avaliação) opera sobre ele sem ramificação por tipo.

Conteúdo gerado pelo fluxo de nova atividade (Seção 15) segue o mesmo formato de lista de vocabulário.

---

## 4. Formatos de pergunta

Cinco formatos em uso ativo, todos de vocabulário — hoje todo material vira uma lista de vocabulário (Seção 3), então são os únicos que entram em jogo. O sorteio de formato acontece antes de gerar, o modelo executa, não decide.

| Formato | O que faz |
| ------- | --------- |
| gap fill | Frase com lacuna cobrindo o termo. Sempre em inglês, significado em PT entre parênteses |
| recall | Dado o significado, trazer o termo |
| recall invertido | Dado o termo, trazer o significado ou uso |
| cenário | Situação realista que leva ao uso do termo |
| múltipla escolha | 2 a 5 opções, embaralhadas antes de salvar |

O prefixo "Complete:" do gap fill e a pergunta de fechamento do cenário não vêm mais do modelo — são aplicados depois, de forma determinística. Isso elimina falha de formatação (prefixo esquecido, fechamento reformulado ou fora do padrão). O fechamento do cenário hoje sorteia entre 4 variações em português e 4 em inglês, em vez de repetir sempre a mesma frase.

`pergunta aberta` e `pergunta direta` (usadas antes para material de texto corrido e de exercício, respectivamente) ficaram sem uso desde que esses tipos de conteúdo deixaram de existir (Seção 3) — formatos legados, fora do fluxo ativo hoje.

---

## 5. Nível e idioma das perguntas

O nível pode vir de duas fontes: informado pelo usuário ou detectado automaticamente no material enviado.

O usuário informa seu nível uma vez (no início do uso, ou quando quiser trocar) e esse nível passa a valer para qualquer atividade futura, tendo prioridade sobre o nível do material. Se o usuário não informar nível, o sistema usa o nível detectado no material enviado. Para conteúdo gerado pelo fluxo de nova atividade (Seção 15), o nível declarado do usuário é sempre a referência, não há detecção automática nesse caminho.

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

Feedback pode ser acompanhado de uma versão em áudio, enviada como mensagem separada logo após o feedback em texto. Só o conteúdo de demonstração vai para o áudio, sem a abertura de resultado e sem emoji, informação redundante em áudio, já carregada pela entonação da fala.

Envio de áudio é parcial, não em toda resposta, controlado por uma fração configurável do total. Falha na geração ou envio do áudio nunca atrasa nem impede o feedback em texto, que segue as regras desta seção normalmente, sem nenhuma indicação de erro visível ao usuário.

O áudio é enviado como nota de voz reconhecida pelo canal, não como anexo de áudio comum. Essa forma de envio é o que habilita o rastreio de reprodução; um áudio enviado como anexo genérico, mesmo com o conteúdo idêntico, não gera esse rastreio. Reprodução do áudio pelo usuário é rastreada quando o canal informa esse evento (ver Seção 18).

### 6.2 Dica de erro (evalTip)

Feedback de erro ou parcial pode ser acompanhado de uma dica curta, enviada como mensagem separada logo após o feedback. Diferente do feedback em si, a dica pode apontar a causa específica do erro, mas nunca reformula a resposta certa como explicação nem funciona como definição de dicionário. É a única exceção deliberada às proibições desta seção, restrita ao próprio campo da dica, sem afetar o texto do feedback em si.

A causa do erro é classificada em uma de oito categorias: calque (tradução literal de estrutura), sinônimo próximo incorreto, estrutura (padrão gramatical confundido), colocação (combinação de palavras que não se usa junto em inglês), expressão interpretada ao pé da letra, registro (formal/informal fora de lugar), ortografia, ou sem classificação. Ortografia e sem classificação não geram dica — o campo fica vazio nesses casos, não só no caso de chute sem padrão identificável.

O texto da dica segue uma marcação própria: negrito para a forma contrastada, itálico para um termo curto em inglês, aspas duplas para uma frase completa em inglês, riscado só para uma forma que não existe em inglês.

Vale tanto para cadência quanto para sessão intensiva. Em sessão intensiva, a dica não atrasa nem bloqueia o disparo da próxima pergunta, é enviada em sequência imediata.

### 6.3 Sugestão de troca de atividade

Quando a atividade ativa já atingiu uma nota alta o suficiente, o feedback de uma resposta correta pode vir acompanhado da sugestão de trocar de atividade (🔄, ver vocabulário de emoji), com botão (ou o comando por extenso, dependendo do canal) para iniciar o fluxo de nova atividade. Nunca acompanha feedback de erro ou parcial, para não soar como reação ao erro.

Cada pergunta tem uma nota de 0 a 10, calculada a partir de dois eixos independentes.

Qualidade (único eixo que move a elegibilidade de forma significativa):
- Acerto: 4 pontos
- Parcial: 2 pontos
- Erro: 0 pontos
- Acerto respondido por áudio: +1 ponto adicional sobre o acerto

Prática passiva (bônus limitado a 2 pontos por pergunta, independente do volume):
- Revisão espaçada real (dia distinto, mesmo gatilho da Seção 7): +1
- Áudio de feedback ouvido (evento de reprodução confirmado, ver Seção 18): +1

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
| `nova atividade` | Inicia o fluxo de captura de nível, objetivo, assunto e ponto, e gera uma atividade individual a partir da combinação escolhida (ver Seção 15) |
| `nivel` | Atualiza o nível de inglês declarado pelo usuário (básico, intermediário ou avançado), com atalho de botão para cada opção |
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

Após expirar o acesso, trial ou Pro: conta bloqueada até converter. Sem degradação gradual, o produto inteiro ou nada.

A regra de acesso é simples: plano ativo com data de expiração no futuro. Independe do tipo de plano.

### 11.1 Cobrança e liberação automática

Ao bloquear o acesso, o sistema gera um link de pagamento individual para aquele usuário e envia junto da mensagem de bloqueio. Enquanto esse link ainda estiver dentro do prazo de validade, novas tentativas de uso durante o bloqueio reaproveitam o mesmo link em vez de gerar um novo a cada mensagem.

Cobrança é avulsa: R$21,90 liberam 30 dias de acesso, sem assinatura nem renovação automática no cartão. Ao fim dos 30 dias o acesso expira normalmente, e a próxima interação bloqueada gera um novo link, repetindo o ciclo.

Pagamento confirmado libera o acesso automaticamente, sem intervenção manual: o plano passa a Pro, ativo, por mais 30 dias a partir da confirmação, e o usuário recebe uma mensagem de confirmação pelo WhatsApp. Pix continua disponível como alternativa, por atendimento manual via `suporte`.

---

## 12. Nudge de reengajamento

Fluxo automático de mensagens quando o usuário para de responder. O objetivo não é recuperar o usuário para o app, é lembrar que a prática de inglês não deve parar. O Fluizer é o meio, não o fim.

Este fluxo se aplica a usuário com ao menos uma Activity ativa, é reengajamento em torno de pergunta pendente. Usuário que nunca teve atividade criada não entra neste fluxo, esse caso é tratado pela Seção 10.1. O fluxo também é suprimido enquanto o usuário está dentro do fluxo de nova atividade (Seção 15, ver também Seção 8.1).

Nenhuma mensagem deve soar como notificação de app pedindo atenção. Cada uma tem uma razão ligada ao aprendizado.

### Fluxo de steps

| Step | Tempo desde última resposta | Tipo |
| ---- | ---------------------------- | ---- |
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

O fluxo inicia de duas formas: automaticamente ao final da sequência de onboarding (Seção 10), ou a qualquer momento pelo comando `nova atividade`.

### Sequência de captura

Pergunta e resposta fixa, na ordem:

1. **Nível** — só perguntado se o usuário ainda não tem nível declarado (ver Seção 5). Se já existe, pula direto para o passo seguinte.
2. **Objetivo** — lista fechada de 4 opções: Mercado de Trabalho, Viagens Internacionais, Educação e Intercâmbio, Dia a Dia e Lazer.
3. **Assunto** — lista de 5 sugestões específicas por objetivo, mais opção de informar outro assunto por texto livre. As 5 sugestões são fixas por objetivo, não geradas por LLM.
4. **Ponto** — o que praticar dentro do assunto escolhido: vocabulário geral, um tempo verbal, uma estrutura gramatical, entre outros (ver "Catálogo de foco linguístico" abaixo). Lista de 5 sugestões geradas com base no objetivo e no assunto informados, ordenadas da mais comum e didática pra mais específica, sempre incluindo a opção de vocabulário geral, mais opção de informar outro ponto por texto livre.

Nenhum termo técnico de categoria aparece em copy voltada ao usuário, tanto assunto quanto ponto são perguntados em linguagem natural.

Cada um dos três passos acima também aceita os atalhos de botão "Primeira opção" e "Escolha para mim" (ver Seção 19), além de número ou texto livre.

### Catálogo de foco linguístico

Ponto é escolhido de um catálogo fixo de aspectos da língua: vocabulário geral, classes de palavra (substantivos, adjetivos), tempos verbais, conectores, phrasal verbs, estruturas gramaticais, entre outros. O catálogo vale igualmente para os três níveis, sem restrição por nível, o que muda por nível é só o peso de prioridade nas 5 sugestões exibidas, não a disponibilidade do item.

Usuário pode combinar até 2 pontos numa mesma atividade, mas só informando por texto livre, nunca como opção da lista numerada. Se pedir mais de 2, o sistema não trata como erro, pede pra escolher no máximo 2 entre o que foi mencionado.

Novo item só entra no catálogo por decisão deliberada, mesmo princípio de mudança rara que já vale para outras regras de negócio deste documento.

### Estado do fluxo

Controlado por um campo de intenção pendente por usuário, com um valor por passo em andamento. Enquanto o fluxo está ativo, qualquer texto recebido do usuário é tratado como resposta ao passo atual, com prioridade sobre qualquer resposta de prática pendente. Cadência e nudge são suprimidos nesse período (ver Seção 8.1).

**Timeout:** fora do onboarding, o fluxo expira por inatividade após um tempo configurável. Ao expirar, o fluxo é cancelado silenciosamente, o usuário recebe aviso de que pode recomeçar quando quiser, e a cadência da activity em andamento retoma normal. Dentro do onboarding, o fluxo não expira, aguarda resposta indefinidamente, já que não há activity nem cadência competindo pela atenção do usuário nesse momento.

**Cancelamento:** o comando `cancelar` sai do fluxo em qualquer passo, sem criar nada. Não existe retorno a um passo anterior, cancelar sempre descarta o fluxo inteiro.

**Upload durante o fluxo:** se chega um arquivo válido em qualquer passo do fluxo, o fluxo é cancelado silenciosamente e o arquivo segue o pipeline normal de material (Seção 14), incluindo a confirmação de substituição já existente quando há uma activity ativa em andamento (ver Seção 1). Não há confirmação adicional pelo fato de o usuário estar em meio ao fluxo, apenas a que já existe para upload comum.

### Geração de conteúdo

A combinação de nível, objetivo, assunto e ponto passa por duas chamadas de LLM em sequência:

1. **Validação do assunto.** Valida o assunto em duas camadas: encaixe (o assunto faz sentido dentro do objetivo escolhido) e conteúdo proibido (pornografia, sexualização, drogas, armas, discurso de ódio, xenofobia, racismo ou equivalente, mesmo quando tecnicamente se encaixaria no objetivo). Falhando qualquer uma, retorna erro curto e genérico, sem revelar qual camada falhou, e o usuário pode tentar outro assunto ou cancelar. Passando, retorna as 5 sugestões de ponto usadas no passo seguinte, além de 5 subtópicos, recortes específicos dentro do assunto.
2. **Resolução do ponto e geração.** Se o ponto veio da lista, gera direto, sem reclassificar. Se veio como texto livre, classifica contra o catálogo de foco antes de gerar, podendo identificar até 2 pontos válidos numa mesma resposta. Antes de gerar, o sistema sorteia um dos 5 subtópicos retornados na validação, excluindo o último subtópico usado por aquele usuário na geração mais recente com o mesmo objetivo e assunto (se houver), e ancora o conteúdo nesse subtópico sorteado, não no assunto amplo. O sorteio é interno, o usuário não escolhe nem vê o subtópico diretamente. Na prática, permite repetir o mesmo assunto várias vezes sem receber o mesmo vocabulário. Gera 25 itens de vocabulário (quantidade de config, sujeita a revisão) no mesmo formato de lista de vocabulário que o processamento de upload já produz (ver Seção 3).

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
- O sistema não depende de o usuário abrir um app. Toda a prática acontece no WhatsApp.
- Nenhuma mensagem do sistema deve terminar com pergunta quando a resposta esperada é a de uma pergunta de prática pendente.
- Copy pode mencionar "IA" como qualificador funcional (o que o produto faz), nunca como identidade declarada em primeira pessoa ("eu sou uma IA", "sou um bot"). "Bot" e "agente" seguem fora de uso em qualquer copy. Personificação em primeira pessoa continua proibida independente de menção à IA, essa é regra separada e já coberta acima. Uso hoje: mensagem 2 do onboarding, bio Instagram, bio WhatsApp Business, texto do hero e SEO da home.
- Posicionamento de complemento, não compete com professor, trabalha com ele. Isso vale igualmente para o fluxo de nova atividade (Seção 15): nenhuma copy sugere módulo, nível desbloqueado ou etapa concluída, mesmo quando o conteúdo é gerado pelo sistema em vez de trazido pelo usuário.
- Texto solto no chat nunca é interpretado como material de estudo (ver Seção 14). Só arquivo pode virar atividade, texto é sempre comando ou resposta.
- O sistema orienta ativamente o usuário sobre o que fazer, seja no primeiro contato ou sempre que algo crítico de entendimento acontecer no meio do uso. Silêncio ou resposta genérica em ponto de ambiguidade real é falha de produto, não neutralidade. Onde já aplicado: mensagem que orienta o uso de um comando usa imperativo direto ("Use *praticar* para..."), nunca fraseado condicional ("se quiser", "quando quiser"), porque fraseado condicional convida resposta em linguagem natural que o sistema não reconhece como comando.
- **O sistema nunca se personifica.** Copy não usa framing de agente em primeira pessoa ("eu vou avaliar seu material", "eu te ajudo", "eu aviso"), nem trata o produto como personagem com vontade própria. Mensagens descrevem o que acontece, não o que "eu" faço. Essa regra já existia em relação a "eu paro", "eu pauso" no contexto de comandos, passa a cobrir qualquer construção de primeira pessoa em qualquer mensagem do sistema, não só as ligadas a comandos.
- **Verbo padrão para envio de conteúdo é "enviar", não "mandar".** "Mandar" é registro mais informal e não é usado em nenhuma copy do produto. Vale para qualquer mensagem do sistema, onboarding, comandos ou fallback.
- Emoji só é usado em mensagens formatadas diretamente no código, nunca em texto gerado por LLM (feedback de avaliação, resumo de atividade quando tiver componente gerado, qualquer resposta que passe por geração de texto livre). Dentro das mensagens de código, emoji é estratégico, não decorativo, cada um carrega um significado fixo e reconhecível. Vocabulário atual: 📘 início de atividade ou seção, 📊 resumo numérico, ⚠️ limite ou bloqueio, 🔄 sugestão de troca de atividade. Novo emoji só entra no vocabulário quando resolve ambiguidade real de leitura rápida, não para variar visual ou suavizar tom. Isso não quer dizer que é rigorosamente proibido, só não pode ser usado como identidade de comunicação principal do produto. Marcações como acima são bem vindos quando realmente agregarem uma melhor leitura, também pra evitar só um monte de texto corrido.
- **Convenção de exibição de comando.** Comando mencionado em qualquer mensagem do sistema aparece em monoespaçado, para garantir contraste visual independente de tema claro ou escuro do canal, o que negrito isolado não garante. Comando de ação espontânea do usuário (`ajuda`, `praticar`, `nova atividade`, `cancelar` fora de fluxo de confirmação) é exibido com prefixo `/`. Comando de confirmação dentro de um estado que o sistema abriu (`sim`, `não`, `cancelar` dentro do fluxo de nova atividade) é exibido sem prefixo. Entrada do usuário aceita o comando com ou sem prefixo, independente de como foi exibido, o prefixo não é sintaxe obrigatória.

---

## 17. Mídia armazenada

Nem toda mídia é descartada após uso. PDF e texto em arquivo continuam sendo processados em memória e descartados após extração (Seção 14). Três exceções são armazenadas:

- **Áudio de feedback**, gerado pelo sistema (Seção 6.1).
- **Áudio de resposta**: quando o usuário responde uma pergunta pendente por nota de voz, o áudio é armazenado e usado no cálculo da nota da pergunta (Seção 6.3), diferente de uma resposta por texto, que não é retida.
- **Imagem original de OCR**: a imagem enviada como material é armazenada junto com o texto (ou descrição) extraído dela (Seção 14.1), independente do desfecho ser texto, descrição, bloqueio ou imagem ilegível.

Em todos os casos, o conteúdo de origem (texto do feedback falado, transcrição da resposta em áudio, transcrição ou descrição da imagem) é guardado junto ao arquivo, servindo de auditoria do que foi de fato produzido ou extraído, e permitindo reenvio em texto sem necessidade de gerar áudio novo, caso necessário no futuro.

O áudio de feedback armazenado é reaproveitado sempre que a mesma pergunta volta, seja por revisão espaçada (Seção 7) ou por reenvio dentro da sessão intensiva, sem gerar de novo. Regeneração só ocorre se o áudio original não existir mais no armazenamento.

Mídia associada a uma pergunta (áudio de feedback, áudio de resposta) é removida do armazenamento (não o registro em si, que permanece como histórico) quando a atividade correspondente está `archived` ou `cancelled` há mais de 30 dias. Atividade `active` nunca tem mídia removida, independente de quanto tempo estiver parada. Imagem original de OCR segue o mesmo critério de 30 dias, mas contado a partir do próprio registro de mídia, sem depender de status de activity. A remoção roda automaticamente, uma vez por dia, em lotes, sem necessidade de intervenção manual.

---

## 18. Rastreio de entrega e reprodução

Mensagens enviadas pelo sistema guardam o identificador que o canal de envio atribui a cada mensagem, permitindo cruzar com eventos de status enviados por esse canal depois (entregue, lido, reproduzido).

Cada canal (hoje: WhatsApp) traduz seu próprio formato de evento de status para um conjunto de valores canônico antes de persistir, para que a lógica de negócio nunca dependa do formato específico de um canal. Isso vale igualmente para qualquer canal adicionado no futuro (ver Seção 7 do Product-Brief, arquitetura multicanal).

Reprodução de mídia (ex: áudio de feedback) é um evento à parte, diferente do status de entrega geral da mensagem. Uma mensagem pode estar entregue ou lida sem nunca ter sido reproduzida, são duas informações independentes.

---

## 19. Mensagens formatadas e suporte a canal interativo

Toda mensagem enviada pelo sistema é representada por um `FormattedMessage`: um texto (`text`) sempre presente, e três camadas opcionais de apresentação — `audioPath`, `templateName` e `interactive` (corpo com botões). O `text` é a representação canônica: é o que fica salvo no histórico (`Message.content`) e o que qualquer canal sem suporte às camadas opcionais usa para enviar.

Cada canal decide sozinho, ao enviar, o que fazer com as camadas opcionais. Hoje:

- **WhatsApp**: usa `audioPath` se presente (envia o áudio); senão `templateName` se presente (envia via template aprovado da Meta, necessário fora da janela de 24h); senão `interactive` se presente (envia com botões); senão `text` puro.
- **Simulador**: usa `audioPath` se presente; senão `interactive` se presente (renderiza os botões de verdade, clicáveis); senão `text` puro, ignorando `templateName` (que só faz sentido para o template aprovado da Meta). Um canal novo pode nascer só com suporte a `text` e ganhar as camadas opcionais depois, sem quebrar nada que já existe (ver Seção 7 do Product-Brief, arquitetura multicanal).

Dentro de `interactive`, um botão pode ser de dois tipos: ação (resposta rápida nativa do canal, ex: "Nova atividade") ou link (abre uma URL externa, ex: link de pagamento do bloqueio de acesso, Seção 11.1). Mensagem com botão de link sempre inclui a mesma URL também no `text` puro, como fallback para quem recebe só a camada canônica (ex: simulador).

`Message.templateName` e `Message.interactive` são persistidos junto do envio (colunas nullable, preenchidas só quando aplicável), como registro de auditoria do que foi de fato enviado ao usuário — não só o texto equivalente. O `interactive` em produção cobre hoje quatro casos: a sugestão de troca de atividade (Seção 6.3), botão de ação "Nova atividade"; o link de pagamento do bloqueio de acesso (Seção 11.1), botão de link que abre o checkout no WhatsApp e aparece como link clicável dentro do próprio texto em qualquer canal sem suporte a botão; os passos de objetivo/assunto/ponto do fluxo de nova atividade (Seção 15), com botões de ação "Primeira opção" e "Escolha para mim"; e a seleção de nível (Seção 5, comando `nivel`), com um botão por nível. Todos os botões de ação são renderizados de verdade tanto no WhatsApp quanto no simulador.