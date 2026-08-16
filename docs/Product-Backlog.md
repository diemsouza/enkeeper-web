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