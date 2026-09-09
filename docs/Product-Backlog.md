# Fluizer - Product Backlog

> Ideias e features que impactam estrategicamente o produto. Não é lista de bugs nem ajustes pequenos.
> Cada item segue a estrutura abaixo. Exemplo dentro de cada bloco quando ajudar a tornar o abstrato concreto, principalmente em Como.
> Numeração é só referência rápida entre conversas, não indica prioridade.
> Backlog é intenção não implementada. Assim que um item vira produto real, o conteúdo migra para Product-Brief.md (o que existe, por que existe) e Product-Rules.md (regra de negócio que passa a valer), e o item sai daqui. Nenhum item deve viver duplicado entre backlog e os dois documentos de referência.

---

## [Nome da feature em linguagem de produto, não técnico]
 
**Contexto**
 
Onde isso apareceu, o que estava sendo feito quando a necessidade surgiu.
 
**Problema**
 
O que não funciona hoje e por que isso importa pro produto, não só tecnicamente.
*Exemplo:* caso real que ilustra a falha, se houver.
 
**Solução**
 
O que vai existir quando isso estiver pronto, em uma frase, sem detalhe de implementação.
 
**Como**
 
Os blocos de decisão necessários, sem aprofundar em cada um. Nível de plano macro, não de execução.
*Exemplo:* cada bloco de decisão acompanhado de um caso concreto que mostra como funciona na prática.
 
**Objeção** *(opcional)*
 
Risco e observações importantes que podem inviabilizar ou causar dano colateral em outra parte do produto.

---

## 1) Suporte ao aprendizado por estrutura fixa com slot variável

**Contexto**

Durante debug do pipeline de classificação de seção (doc-extraction), ao analisar material de Instagram com padrão repetido tipo "I'm ___" (10 frases: I'm happy, I'm tired, I'm late, I'm hungry), identificamos que o sistema só reconhece 3 tipos de conteúdo hoje: vocabulary, text, exercise. Nenhum cobre estrutura gramatical com slot variável.

**Problema**

vocabulary trata cada frase como par termo-significado isolado, gerando recall solto por instância e perdendo o ponto pedagógico real: o aluno aprende o padrão, não decora frases separadas que compartilham a mesma raiz estrutural. text não serve porque os exemplos são paralelos, não narrativa contínua. Quase todo curso estruturado (Wizard, Cultura Inglesa, livros didáticos) ensina dessa forma em algum estágio, principalmente em níveis básico e intermediário. Sem reconhecer isso, o Fluizer descarta ou maltrata uma fração grande do material real que professor e aluno vão subir.
*Exemplo:* "I'm ___" com I'm happy, I'm tired, I'm late, I'm hungry classificado hoje teria que cair em vocabulary, gerando 4 perguntas de recall desconectadas, sem testar se o aluno consegue aplicar o padrão a um contexto novo.

**Solução**

Novo sectionType `structure`, que reconhece padrão fixo com slot variável e gera pergunta de aplicação a contexto novo, testando generalização em vez de memorização.

**Como**

Critério de classificação no doc-extraction: 2+ itens compartilham trecho fixo idêntico, e esse trecho isolado não se sustenta como frase completa (teste: remover o slot quebra a frase ou não).
*Exemplo:* "I'm ___" quebra sem o slot, então é structure. "happy" sozinho não quebra, então é vocabulary, mesmo estando ao lado de tired, late, hungry numa lista temática.

Schema: sem tabela nova. Section ganha `fixedPattern` (o molde, ex: "I'm ___") e `slotHint` (classe gramatical do slot, ex: "adjetivo de sentimento ou estado"). `answerKey` da Question muda de string fixa para regra (padrão + restrição do slot + contexto da pergunta).

Formato de pergunta: um só, nome `structure` (sem necessidade de nome separado do sectionType, mesma lógica de text e exercise que têm formato único). Dá situação nova em PT, pede a frase em EN aplicando o padrão.
*Exemplo:* fixedPattern "I'm ___", slotHint "adjetivo de estado". Pergunta gerada: "Você está com muito sono agora, como diz isso em inglês?". Resposta esperada: qualquer frase que respeite "I'm" + adjetivo de estado compatível com a situação, ex: "I'm sleepy" ou "I'm tired".

Avaliação em dois estágios via LLM, não dá pra fazer por regra fixa: primeiro estrutural (usou o padrão certo?), depois semântico (o slot preenchido responde à situação pedida?).
*Exemplo:* resposta "I'm happy" pro contexto de sono: estrutura certa, semântica errada, wrong. Resposta "I sleepy" pro mesmo contexto: estrutura errada (faltou o "am"), wrong direto, sem avaliar semântica. Resposta "I'm tired": estrutura e semântica certas, right.

**Objeção**

Avaliação em dois estágios é mais cara que a avaliação atual de vocabulary, porque exige LLM julgando duas dimensões ao mesmo tempo (estrutura e semântica) em vez de match simples. Risco de classificação ambígua em seções com poucos exemplos (2-3 itens) permanece mesmo com o critério definido, exige teste com material real antes de confiar no doc-extraction sem revisão.

Depende deste item a possibilidade de o catálogo de foco linguístico do fluxo de nova atividade (Product-Rules Seção 15) oferecer um ponto do tipo padrão fixo com slot variável como opção de geração, hoje fora de escopo até `structure` existir.

---

## 2) TTS como benefício de tier superior (pool diário separado)

**Contexto**

Áudio no feedback já está em produção como rollout parcial e uniforme, controlado por fração configurável (Product-Rules Seção 6.1, Product-Brief Seção 4 e 9). Fora do que já foi entregue, restava a ideia de usar frequência de áudio como alavanca comercial.

**Problema**

Hoje a fração de áudio é a mesma para qualquer usuário, sem diferenciação entre trial/Pro nem gatilho de upgrade vinculado ao formato. O produto tem um recurso de listening validado sem monetização própria associada a ele.

**Solução**

Usuário em tier superior recebe áudio com frequência maior que o padrão, funcionando como benefício percebido de upgrade, com um pool diário de áudio próprio, separado do rollout padrão.

**Como**

Pool diário de áudio segregado por tier: usuário padrão mantém a fração já validada, tier superior recebe fração maior.
*Exemplo:* padrão gera áudio em 1 a cada X respostas, tier superior em 1 a cada Y respostas, com Y menor que X.

Escopo aberto só depois que o pipeline atual de geração e envio de áudio estiver estabilizado, não é prioridade imediata.

**Objeção**

Só faz sentido investir nisso depois de confirmar, com taxa de reprodução real (não só de entrega), que o rollout atual já gera percepção de valor. Segmentar por tier antes dessa validação é otimizar sobre um sinal ainda não comprovado (ver nota de revisão em Product-Brief Seção 10).

---

## 3) Classificação de objetivo, eixo e tema para material de upload

**Contexto**

O fluxo de nova atividade (Product-Rules Seção 15) grava objetivo, assunto e ponto no material com origem `generated`, porque esses dados já chegam como parâmetro de entrada da geração. Material de upload (`origin: upload`) não tem esse metadado hoje, o doc-extraction só extrai título.

**Problema**

Sem esse dado para upload, não é possível ter visão agregada de que tipo de conteúdo os usuários trazem por conta própria (quantos % de material de trabalho, viagem, etc.), nem comparar esse padrão com o que é escolhido no fluxo de geração. A informação existe implicitamente no conteúdo do material, mas não é capturada em lugar nenhum.

**Solução**

Doc-extraction passa a inferir objetivo e eixo aproximados (e, quando fizer sentido, um tema) a partir do conteúdo do material enviado, gravando no mesmo campo `metadata` já usado pelo material `generated`.

**Como**

Diferente da geração (onde o LLM recebe objetivo e eixo como restrição e valida o tema contra eles), aqui o LLM precisa classificar livremente a partir do conteúdo, sem restrição prévia. É inferência, não validação, prompt e critério de acerto diferentes do fluxo de nova atividade.

Tema aberto pode não fazer sentido no caso de upload da mesma forma que faz no caso gerado, já que não existe uma intenção verbalizada antes do envio, só o conteúdo do material em si. Objetivo e eixo aproximados são o valor mais claro aqui, tema fica em aberto até haver um uso concreto que justifique a inferência.

**Objeção**

Nenhuma feature hoje consome essa informação para material de upload, é dado puramente analítico neste momento. Baixa prioridade até que uma decisão de produto concreta dependa dele.

---

## 4) Migração da prática para canal próprio (web) — (Em andamento)

**Contexto**

A partir de outubro/2026 a Meta passa a cobrar por mensagem enviada
(service e utility) sem faixa gratuita de volume, o que inviabiliza o
uso do WhatsApp como canal de prática de alta frequência (cadência de
1h). Decisão tomada em conversa de produto: WhatsApp deixa de ser canal
de prática e passa a ser canal de aquisição (72h grátis via CTWA),
transporte de código de autenticação, e fallback pago de notificação.
A prática em si migra para uma superfície própria (web/PWA).

**Problema**

Todo o desenho atual de produto (Rules Seções 1, 8, 10, 12, 15, 19)
descreve comportamento assumindo que a prática acontece dentro do chat
do WhatsApp: cadência por mensagem, nudge por mensagem, onboarding por
mensagem, fluxo de nova atividade por mensagem. Sem esse canal como
prática, a arquitetura de entrega inteira, não só a UI, precisa de novo
desenho: como o usuário autentica, onde a fila de perguntas vive, como
o lembrete diário funciona sem custo por mensagem.

**Solução**

Prática passa a acontecer numa superfície web própria, construída a
partir da lógica que o simulador já prova (não do formato dele), com
autenticação por telefone + código via WhatsApp, notificação diária
primária por web push (PWA instalado, grátis), e WhatsApp como
fallback pago só para quem não ativa push.

**Como**

Cada bloco abaixo é uma frente de trabalho independente, na ordem de
dependência abaixo. Bloco 1 é pré-requisito de todos os outros.

1. **Superfície de prática web (produção).** Não é reaproveitar o
   simulador como está, é reconstruí-lo como produto real a partir da
   lógica que ele já prova. O simulador hoje serve só para teste de
   backend (Rules Seção 19: "usa `imagePath`... senão `text` puro",
   pensado para reproduzir o comportamento do canal WhatsApp, não para
   ser usado por usuário final) e segue formato de bolha de chat porque
   sua função é simular o canal, não ser o canal. Sem WhatsApp como
   referência de formato, a UI de prática deixa de ter motivo para ser
   chat: pode virar sessão de cartão único, painel de progresso, fila
   visível, o que servir melhor à leitura de SM-2 e ao gauge/pentágono
   já existentes (Rules Seções 1 e 2), sem herança de layout de
   mensagem.

   Dois eixos dentro deste item, resolvidos juntos porque a tela de
   entrada depende da UI de destino:
   - **Auth por telefone.** Código via WhatsApp (bloco 2 abaixo),
     tela própria, sem login social (quebra em webview do Instagram).
   - **UI de prática de produção.** Redesenho a partir do zero visual;
     lógica de backend (avaliação, formatos de pergunta, feedback,
     áudio) permanece intacta, só muda como é apresentada.

   **Entregue até setembro/2026 (parcial):** superfície web de prática
   (`/app`) no ar em produção parcial, com composer com autocomplete
   incremental de comandos (Rules Seção 9), reexibição da pergunta
   pendente reaproveitando o mecanismo de envio existente (Rules Seção
   2), player de áudio próprio que decodifica Ogg/Opus no client sem
   depender de codec nativo do navegador, e charts de resumo abrindo em
   tela cheia com zoom (Rules Seção 19). O rastreio de reprodução de
   áudio foi desacoplado de canal: a web reporta o play pelo próprio
   player via endpoint autenticado, o WhatsApp pelo webhook de status,
   ambos no mesmo registro idempotente por pergunta (Rules Seções 6.1
   e 18). O bloco 2 (auth por telefone) avançou junto.

2. **Auth por telefone.** Sem senha, sem email. Código enviado via
   template WhatsApp authentication (categoria mais barata, funciona
   mesmo com janela de 24h fechada). Sessão web autentica pelo token
   retornado. Em produção parcial junto do bloco 1 (ver nota de
   progresso acima).

3. **Gancho de dívida de revisão.** Contagem de perguntas elegíveis
   (`nextRevisionAt <= hoje`) exposta como número visível no app e como
   conteúdo do lembrete. Nativo da Seção 7, não é métrica nova.
   *(depende de task própria já aprovada separadamente para a
   definição exata do gancho)*

4. **PWA instalável + push.** Ícone de tela inicial, badge com a
   contagem do item 3, push carregando o mesmo gancho. Grátis, motor de
   retenção primário.

5. **Fallback pago de notificação.** Só para quem não ativa push.
   Testar se lembrete ancorado em horário configurado pelo usuário
   qualifica como utility (categoria barata) em vez de marketing,
   antes de assumir custo alto na base inteira.

6. **Plano de migração da base atual.** Usuários hoje em trial ou Pro
   com cadência de 1h ativa precisam de transição definida antes de
   outubro: aviso, prazo, ou compensação. Não é técnico, é decisão de
   produto que trava data.

7. **Analytics de coorte no funil novo.** D1/D3/D7 cruzado com
   "completou primeira rodada" e "ativou push", desde o primeiro
   usuário do MVP. Sem isso, decisões futuras de trial e gatilho de
   retenção continuam no chute.

**Objeção**

Item bloqueia parte do Product-Brief e do Product-Rules de ficarem
desatualizados enquanto não migra: Seções 1, 8, 10, 12, 15 e 19 das
Rules descrevem hoje um comportamento (cadência por mensagem) que já
não é mais o plano. Esses documentos precisam de nota temporária de
"em transição" até esse item concluir e migrar o conteúdo real pra lá,
senão viram fonte de verdade errada para prompts futuros de Claude Code.

Item 1 é o maior do conjunto e pode crescer o suficiente para merecer
entrada própria no backlog (contexto, problema e solução dedicados,
com fluxo de telas detalhado), em vez de viver como bloco dentro deste
item. Decisão pendente.