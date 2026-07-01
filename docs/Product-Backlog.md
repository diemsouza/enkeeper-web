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

---

## 2) Nível do usuário sobrepondo nível do material (Já foi implementado)

**Contexto**

Análise de uso real (founder como usuário) mostrou perguntas calibradas como básico ("O que significa World em português?", "Como falar casa em inglês?") mesmo com o usuário em nível intermediário/avançado. O nível hoje é detectado por material (Seção 5 do Product-Rules), não pelo usuário.

**Problema**

Quem está acima do nível das perguntas geradas a partir do material sente o produto raso e sem retorno, porque a calibração depende do que foi enviado, não de quem está praticando. Isso é risco direto de abandono no trial: a pessoa nunca chega a sentir o valor central do produto porque a primeira impressão já vem desalinhada com sua capacidade real.
*Exemplo:* usuário avançado sobe lista de vocabulário básico de uma aula de reforço e passa a receber só perguntas em PT/EN traduzidas, quando o esperado seria avançar o nível de exigência da pergunta independente do material.

**Solução**

Nível de inglês passa a ser atributo do usuário, capturado uma vez e reutilizável em qualquer atividade, com prioridade sobre o nível detectado no material.

**Como**

Captura do nível direto no onboarding, como pergunta simples de escolha (básico, intermediário, avançado) antes do primeiro material chegar.
*Exemplo:* a sequência de onboarding (Seção 10 do Product-Rules) ganha uma mensagem extra perguntando o nível antes de "Envie agora pra começar."

Nível do usuário sobrepõe nível do material na geração de perguntas, mas nível do material continua sendo calculado e armazenado (pode servir de sinal auxiliar ou de alerta de descompasso).
*Exemplo:* material classificado como básico, usuário com nível avançado configurado, pergunta gerada deve seguir o padrão de idioma "majoritariamente em EN" da Seção 5, não o padrão do material.

Comando novo no menu de comandos (Seção 9) para o usuário trocar seu nível quando quiser, sem precisar reenviar material.

**Objeção**

Nível auto-declarado pode não bater com o nível real do usuário (sub ou sobrestimado). Vale considerar, numa fase futura, ajuste implícito via taxa de acerto sustentada (ex: usuário "básico" acertando quase tudo por semanas seguidas sinaliza possível recalibração), mas isso é incremento posterior, não bloqueia o lançamento da captura inicial.

---

## 3) Geração assistida de material para quem não tem o que enviar

**Contexto**

Piloto com usuário real: pessoa mandou "oi", viu o onboarding completo, e não enviou nenhum material até hoje. Hipótese é que a barreira é decidir o quê mandar, em qual formato, se serve.

**Problema**

O produto depende inteiramente de o usuário trazer material próprio para funcionar (Seção 4 do Product-Brief, passo 1). Para quem não tem aula corrente, não sabe o que mandar, ou trava na decisão, essa dependência é a própria porta de entrada falhando, antes de qualquer outra feature do produto entrar em jogo. Não é um ajuste de UX pequeno, é a barreira de ativação do trial inteiro para esse perfil de usuário.
*Exemplo:* autodidata sem aula corrente, sem material recente em mãos, que abre o WhatsApp, lê o onboarding e não sabe se uma captura de tela do Duolingo "serve" ou não, e simplesmente não manda nada.

**Solução**

Para usuário que não envia material após um tempo do onboarding, o sistema oferece um fluxo de elicitação curto (nível, tópico de interesse, assunto) e gera o material por IA, entregando como texto ou arquivo, e segue o fluxo normal de atividade a partir dali.

**Como**

Gatilho condicional: se o trial passar um tempo definido sem nenhum material enviado, dispara a sequência de perguntas (nível, o que estudar, assunto de interesse), não como parte do onboarding padrão de todo mundo.
*Exemplo:* "Qual nível você é? Intermediário ou B1" → "O que gostaria de estudar hoje? Verbo to be" → "Qual assunto te interessa? Tecnologia" → sistema gera o material e segue como se o usuário tivesse enviado.

Material gerado entra no mesmo pipeline de extração/seção/pergunta já existente, não cria caminho técnico paralelo.

Fluxo permanece como fallback, não substitui ou compete com o fluxo principal de "usuário manda material da própria aula", que continua sendo o caminho padrão e o foco do canal de aquisição por professor.

**Objeção**

Risco de posicionamento: o produto se define hoje como complemento de aula, não gerador de conteúdo de estudo (Seção 5 e 12 do Product-Brief, "voo baixo", "copy nunca menciona IA"). Gerar material do zero aproxima o produto do território de concorrentes diretos (Parlai, ChatClass) que o Fluizer evita deliberadamente. Por isso esse fluxo deve ficar restrito a quem trava sem material, e não se tornar a porta de entrada padrão do produto.

---

## 4) Perguntas por áudio (camada TTS sobre o texto existente)

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

## 5) Pool diário de práticas com controle de custo

**Contexto**

Modo prática intensiva (Seção 8, Product-Rules) hoje só limita por inatividade (15 minutos sem resposta). Ao testar, identificamos que um usuário respondendo rápido pode esgotar dezenas de perguntas em poucos minutos, sem nenhum teto de volume. Cadência normal também não tem limite diário. Avaliação de resposta é a fatia mais cara do custo variável por usuário (Seção 10, Product-Brief, R$1,20-1,80/mês na média), e esse custo é por resposta processada, não por tempo de sessão.

**Problema**

Sem limite de volume, o custo real por usuário pode escalar bem acima da média projetada na Seção 10 e 11 do Brief, que assume uso moderado ao longo do mês. Usuário hiperfocado, testando os limites, ou simplesmente muito engajado, pode consumir volume de avaliações desproporcional ao que a mensalidade de R$19,90 sustenta, furando a margem individual mesmo pagando o mesmo preço de todo mundo.
*Exemplo:* usuário responde em modo intensivo a cada 5 segundos por 1 hora seguida, 4 vezes no dia, trocando de material 5 vezes, cada resposta avaliada via LLM. Custo desse usuário no dia pode superar o custo médio mensal projetado pra ele inteiro.

**Solução**

Pool único e diário de práticas (perguntas avaliadas) por usuário, consumido tanto pela cadência normal quanto pelo modo intensivo, sem distinção de origem. Modo intensivo passa a ter também um teto estrutural de sessão (15 minutos, hard stop, reinício manual via comando), como camada adicional de dosagem dentro do mesmo pool.

**Como**

Pool conta respostas avaliadas (`right`, `wrong`, `partial`), independente de terem vindo de cadência normal, modo intensivo ou fallback de revisão. Um único contador, resetado diariamente.
*Exemplo:* usuário com pool de 60 práticas/dia pode gastar tudo em 20 minutos de intensivo, ou espalhar ao longo do dia normal, ou misturar os dois, o número final consumido é o mesmo em qualquer combinação.

Modo intensivo ganha teto de sessão de 15 minutos contados da ativação (hard stop, não mais só por inatividade). Ao encerrar por esse motivo, mensagem avisa e orienta reativação via `praticar`, diferente do encerramento por inatividade, que permanece silencioso.
*Exemplo:* usuário ativo, respondendo rápido, sessão bate 15 minutos, sistema envia "Sessão intensiva encerrada. Use *praticar* de novo quando quiser continuar." e para de enviar novas perguntas até nova ativação.

Nomenclatura de produto: unidade do pool é "prática", não "pergunta". "Pergunta" é termo técnico que não carrega valor e aproxima o produto de commodities (flashcard, GPT genérico). "Prática" já é a palavra usada na tagline, no resumo executivo e no nome do produto (Fluizer, fluência via prática), e comunica melhor tanto o valor quanto o limite.
*Exemplo:* mensagem de teto atingido usa "Você usou sua prática de hoje. Amanhã tem mais.", sem tom de escassez artificial tipo jogo (sem "parabéns", sem gatilho de recompensa variável), alinhado à Seção 12 do Brief de nunca soar como notificação de app pedindo atenção.

Caps de atividade e material por atividade (Seção 14, Product-Rules, hoje 5 atividades/dia e até 3 materiais por troca) protegem o custo de processamento (doc-extraction, Vision, Whisper), que é camada de custo diferente da avaliação. Revisar se os números atuais ainda fazem sentido depois que o pool de prática estiver calibrado, são proteções complementares, não redundantes.

**Objeção**

Número do pool (quantidade de práticas/dia) não pode ser definido sem dado real de custo por resposta em produção, precisa calibrar com uso real antes de travar o valor final. Risco de calibrar baixo demais e o usuário engajado (perfil que mais queremos reter) sentir o produto curto logo na fase em que mais precisa provar valor.