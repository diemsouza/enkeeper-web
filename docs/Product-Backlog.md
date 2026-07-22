# Fluizer - Product Backlog

> Ideias e features que impactam estrategicamente o produto. Não é lista de bugs nem ajustes pequenos.
> Cada item segue a estrutura abaixo. Exemplo dentro de cada bloco quando ajudar a tornar o abstrato concreto, principalmente em Como.
> Numeração é só referência rápida entre conversas, não indica prioridade.

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

Depende deste item o eixo `Frases prontas` do item 2 (conteúdo gerado), que fica fora de escopo até `structure` existir.

---

## 2) Conteúdo gerado por objetivo, eixo e tema aberto (Já foi implementado)

> Substitui as versões anteriores deste item ("Geração assistida de material para quem não tem o que enviar" e "Conteúdo gerado por objetivo e eixo, upload como caminho alternativo"). A leitura de "fallback para usuário travado" foi revista: geração passa a ser o caminho padrão de ativação, não a exceção. A complexidade de pool compartilhado, versionamento e área por objetivo foi removida deste desenho, substituída por geração individual por usuário com tema aberto validado por LLM.

**Contexto**

O produto depende de o usuário enviar material próprio. Quem não tem o que enviar trava antes de experimentar, e quem envia uma vez raramente sustenta o hábito de subir material novo. Piloto real confirmou o problema de outra forma: usuária verbalizou "quero aprender sobre coisas de cozinha" em vez de enviar material formal, e quando pediu pra enviar algo, mandou uma foto sem texto do próprio ambiente. O produto não tinha caminho pra capturar intenção livre, só sabia reagir a material trazido pronto.

**Problema**

Ativação: usuário sem material em mãos, ou sem entender o que "serve" como material, perde o trial inteiro sem ver o valor central.

Continuidade: sem material novo, a activity recicla as mesmas perguntas até o usuário perder interesse.

Mental model: parte dos usuários pensa em termos de interesse ("quero praticar cozinha"), não em termos de "material formal para extrair". O produto de hoje só reconhece a segunda entrada.

**Solução**

Usuário escolhe objetivo, eixo e um tema aberto (texto livre validado por LLM), o sistema gera o conteúdo individualmente para aquele usuário e a prática começa. Upload de material continua existindo como caminho alternativo, sem mudança no que já funciona hoje.

**Como**

**Pré-requisito**

Texto solto no chat deixa de ser interpretado como material (já em implementação, independente deste item). Anexo (imagem, PDF, texto em arquivo) é a única entrada de material. Texto no chat passa a ter só duas leituras: comando ou resposta.

**Fluxo fixo de captura**

Sequência de pergunta e resposta determinística, reutilizada tanto no onboarding quanto no comando de nova atividade:

1. Nível — só perguntado se o usuário ainda não tem nível declarado (mesmo campo do item de nível já implementado).
2. Objetivo (contentGroup) — lista fechada de 4: Mercado de Trabalho, Viagens Internacionais, Educação e Intercâmbio, Dia a Dia e Lazer.
3. Eixo (contentSubgroup) — lista fechada de 4: Palavras, Ações, Expressões, Frases prontas (este último depende do item 1 e fica fora enquanto `structure` não existir).
4. Tema (contentTopic) — texto aberto. Pergunta fixa por objetivo, com exemplos embutidos no próprio texto (sem lista numerada separada).
*Exemplo:* para Dia a Dia, a pergunta já sugere "tarefas domésticas, compras, lazer" dentro do próprio texto da pergunta, sem passo extra de escolha.

Estado do fluxo controlado por um único campo de intenção pendente por usuário (mesmo mecanismo já usado para outras esperas de resposta). Enquanto o fluxo está em andamento, qualquer texto recebido é resposta ao passo atual, com prioridade sobre resposta de prática pendente. Cadência e nudge são suprimidos enquanto o fluxo está ativo. Fora do onboarding, o fluxo expira por inatividade após um tempo configurável, cancela silenciosamente e devolve o controle pra cadência normal da activity em andamento. Dentro do onboarding, não expira.

**Geração**

Chamada de LLM recebe nível, objetivo, eixo e tema, valida em duas camadas antes de gerar: o tema faz sentido dentro da combinação escolhida, e o tema não recai em conteúdo proibido (pornografia, sexualização, drogas, armas, discurso de ódio, xenofobia, racismo e equivalentes), mesmo quando tecnicamente encaixaria na combinação. Falhando qualquer validação, retorna erro curto e genérico, sem expor o motivo específico, e o usuário pode tentar outro tema ou cancelar. Passando, gera a mesma estrutura de documento e seção que o doc-extraction já produz hoje, sectionType fixo `vocabulary`.
*Exemplo:* Mercado de Trabalho > Palavras > "flerte" não encaixa, retorna erro genérico. Dia a Dia > Ações > "armas de fogo" encaixaria estruturalmente mas é bloqueado pela camada de conteúdo proibido, mesmo erro genérico ao usuário.

**Sem compartilhamento entre usuários**

Diferente do desenho anterior deste item, aqui não existe pool compartilhado nem versionamento. Tema aberto por usuário torna reuso entre usuários pouco provável, então cada geração é individual. Simplifica o desenho, ao custo de não ter economia de cache. Revisitar só quando houver dado real de custo por geração que justifique voltar a uma taxonomia fechada com reuso.

**Metadado**

Documento gerado grava `origin: generated` e `metadata` (JSON) com o objetivo, eixo e tema que originaram aquele conteúdo, pra manter rastreabilidade de por que o material existe. Upload continua com `metadata` nulo por enquanto (ver item 4).

**Troca de conteúdo**

Comando `nova atividade` no menu dispara o fluxo a qualquer momento. Segue o mesmo ciclo de activity que já existe hoje (arquiva se teve resposta, cancela se não teve, resumo do ciclo anterior antes da nova pergunta).

Se chega upload de arquivo durante o fluxo em andamento, o fluxo é cancelado silenciosamente e o upload segue o pipeline normal, sem pergunta de confirmação.

**Sem artefato de estudo**

Nada de PDF ou imagem para estudar antes. O termo aparece em contexto na própria pergunta, o feedback de erro é onde o ensino acontece.

**Objeção**

Posicionamento. O risco não está na origem do conteúdo, está em apresentar progressão como percurso. Qualquer copy que sugira módulo, nível desbloqueado ou etapa concluída cruza a linha de ensino. Colocar esse fluxo como ação principal do onboarding aproxima o produto de currículo se a copy não deixar claro que é ponto de partida, não trilha.

Sem pool compartilhado, custo de geração escala por usuário e por troca de atividade, não só por combinação. Medir custo real antes de considerar reintroduzir cache.

Qualidade individual sem revisão prévia: diferente do pool compartilhado (que permitia revisar as primeiras versões manualmente antes de servir a muitos usuários), aqui cada geração vai direto ao usuário sem revisão humana. Validação de encaixe e conteúdo proibido no prompt reduz risco, mas não substitui auditoria amostral depois de rodando.

---

## 3) Perguntas por áudio (camada TTS sobre o texto existente)

**Contexto**

Análise de uso real identificou que o produto hoje pratica só leitura e escrita. Não há nenhuma camada de listening, apesar de o sistema já suportar transcrição de áudio na resposta do usuário (Whisper, conforme Seção 9 do Product-Brief).

**Problema**

Prática de inglês limitada a texto deixa de fora uma habilidade central do aprendizado (compreensão auditiva) e reduz a percepção de variedade do produto, que hoje soa como "flashcard mais inteligente e flexível" mesmo com os formatos gap_fill, choice e cenário já bem resolvidos.
*Exemplo:* usuário pratica semanas seguidas só lendo pergunta e digitando resposta, sem nunca treinar a compreensão de uma frase falada em inglês.

**Solução**

Pergunta de texto já existente passa por uma camada de texto-para-voz e é enviada como áudio, sem alterar a geração ou a avaliação da pergunta. Usuário responde por texto ou áudio, como já é suportado hoje.

**Como**

TTS atua só como camada de saída: o texto da pergunta continua sendo a fonte de verdade, gerado e avaliado exatamente como hoje, o áudio é uma conversão automática em cima do texto já pronto.
*Exemplo:* pergunta "Complete: The book is ___ on the shelf" é gerada normalmente pelo pipeline atual, e o que muda é que o usuário recebe ela como nota de voz em vez de (ou além de) texto.

Rollout inicial limitado: 1 em cada X perguntas chega em áudio no plano atual (Trial/Pro padrão), em vez de todas. Isso dá ao usuário uma amostra real da dinâmica de listening sem assumir o custo total de TTS em toda interação, e serve como teste de aceitação antes de qualquer decisão de expandir.
*Exemplo:* usuário recebe 9 perguntas em texto e a 10ª chega como nota de voz, mesma pergunta, mesma avaliação por trás.

Caso o usuário não entenda o áudio, oferecer opção de reenviar a mesma pergunta em áudio mais lento (custo adicional de TTS) ou reenviar apenas o texto original já existente (sem custo adicional).

Fluxo de avaliação de resposta não muda: texto digitado ou áudio transcrito (Whisper) seguem o caminho já existente de avaliação.

Gatilho de upgrade: a cadência reduzida de áudio no plano padrão pode se tornar peça de campanha futura, oferecendo mais frequência de áudio (ou áudio em toda pergunta) como benefício de um tier superior, uma vez validado que o formato gera percepção de valor.

**Objeção**

Custo de TTS é recorrente e escala linearmente com volume de mensagens e usuários, diferente de uma feature que se paga uma vez no desenvolvimento. Mesmo com rollout limitado a 1 em X perguntas, vale medir a taxa de resposta e o feedback qualitativo nesse primeiro grupo antes de expandir a frequência ou pensar em segmentar por plano, dado que a margem bruta hoje já é o número central da viabilidade financeira (Seção 10 e 11 do Product-Brief).

---

## 4) Classificação de objetivo, eixo e tema para material de upload

**Contexto**

O item 2 (conteúdo gerado) grava `metadata` com objetivo, eixo e tema para material com `origin: generated`, porque esses dados já chegam como parâmetro de entrada da geração. Material de upload (`origin: upload`) não tem esse metadado hoje, o doc-extraction só extrai título.

**Problema**

Sem esse dado para upload, não é possível ter visão agregada de que tipo de conteúdo os usuários trazem por conta própria (quantos % de material de trabalho, viagem, etc.), nem comparar esse padrão com o que é escolhido no fluxo de geração. A informação existe implicitamente no conteúdo do material, mas não é capturada em lugar nenhum.

**Solução**

Doc-extraction passa a inferir objetivo e eixo aproximados (e, quando fizer sentido, um tema) a partir do conteúdo do material enviado, gravando no mesmo campo `metadata` já usado pelo item 2.

**Como**

Diferente da geração (onde o LLM recebe objetivo e eixo como restrição e valida o tema contra eles), aqui o LLM precisa classificar livremente a partir do conteúdo, sem restrição prévia. É inferência, não validação, prompt e critério de acerto diferentes do item 2.

Tema aberto pode não fazer sentido no caso de upload da mesma forma que faz no caso gerado, já que não existe uma intenção verbalizada antes do envio, só o conteúdo do material em si. Objetivo e eixo aproximados são o valor mais claro aqui, tema fica em aberto até haver um uso concreto que justifique a inferência.

**Objeção**

Nenhuma feature hoje consome essa informação para material de upload, é dado puramente analítico neste momento. Baixa prioridade até que uma decisão de produto concreta dependa dele.