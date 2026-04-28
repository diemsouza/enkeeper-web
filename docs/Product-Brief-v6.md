# Dropuz — Product Brief

> Documento vivo — base de decisão para produto, tech e negócio.
> Versão 6 — Abril 2026

---

## 1. O que é

**Um agente de prática contínua que ajuda você a estudar qualquer conteúdo.**

Você envia o material que está estudando — texto, áudio, imagem ou PDF — e ele conversa com você sobre aquilo ao longo do dia, no WhatsApp.

Aula tem 30 minutos. Sua prática tem o dia inteiro.

### Para quem é

Para quem estuda algo todo dia e perde o conteúdo no resto da rotina. Estudante de inglês, vestibulando, concurseiro, leitor, autodidata. Qualquer pessoa que aprende em sessão e esquece no espaço entre uma sessão e outra.

### O que resolve

O conteúdo novo não fixa porque não tem repetição contextual. Você estuda 30 minutos, depois sua rotina volta pro automático. Flashcard exige disciplina, app de estudo exige abrir aplicativo, tutor de IA conversa sobre cenários genéricos.

Dropuz mantém seu estudo ativo no canal onde você já vive. Você manda o conteúdo, recebe a prática.

---

## 2. Pitch

**Tagline principal (site):**

> Seu conteúdo de estudo, ativo o dia inteiro no WhatsApp.

**Subtítulo:**

> Mande o material que está estudando. Pratique o dia todo.

**Para estudante de inglês:**

> Sua aula tem 30 minutos. Sua prática tem o dia inteiro.

**Para vestibulando / concurseiro:**

> Mande sua lista de questões e seu resumo. Pratique no seu ritmo, durante o dia.

**Diferencial em uma frase:**

> Seu estudo não termina quando você fecha o caderno.

---

## 3. O problema

A maioria de quem estuda algo aprende em sessão e perde no resto do dia. Aluno tem aula de 30 minutos e volta pra rotina em português. Vestibulando estuda 2 horas e esquece metade até o dia seguinte. Leitor termina capítulo e não consegue articular o que leu uma semana depois.

O gargalo não é falta de conteúdo. É falta de prática contextual contínua. As ferramentas existentes resolvem isso de forma errada:

- **Flashcard (Anki, Quizlet)** — exige montar deck, abrir app, manter disciplina. Maioria desiste.
- **Tutor de IA (Parlai, Zaplingo, ChatClass)** — conversa sobre cenários pré-definidos, não sobre o material do aluno.
- **Lembrete (Memorae)** — agenda tarefa, não pratica conteúdo.
- **Curso/professor** — ótimo na sessão, ausente no resto do dia.

A interseção "prática contextual contínua, ancorada no material do aluno, dentro do canal onde ele já vive" não existe. Esse é o produto.

---

## 4. Como funciona

### Fluxo básico

1. Usuário manda material pelo WhatsApp (texto, áudio, imagem ou PDF).
2. Sistema processa o material em memória, extrai 8-12 tópicos centrais e detecta tipo de conteúdo (idioma, matéria, contexto).
3. Durante o dia, em horários definidos pelo usuário, as mensagens chegam com perguntas e estímulos de diálogo em cima daqueles tópicos.
4. Conversa flui dentro da janela de 24h do WhatsApp (zero custo de template).
5. Final de semana, o usuário recebe a evolução da semana: quantas trocas, conceitos cobertos, pontos onde travou.

### Detecção automática de tipo de material

A IA classifica o material no upload e ajusta o comportamento:

| Material recebido               | Comportamento da prática                          |
| ------------------------------- | ------------------------------------------------- |
| Texto / aula / PDF em inglês    | Conversa em inglês usando vocabulário do material |
| Lista de questões de vestibular | Drill de questões e variações                     |
| Capítulo de livro / artigo      | Discussão sobre o conteúdo, perguntas de fixação  |
| Resumo de matéria / fichamento  | Quiz no idioma do material                        |
| Material misto (PT + EN)        | Tratado como inglês (oportunidade de prática)     |

Detecção é feita por modelo pequeno (Haiku ou GPT-4o-mini) com prompt fechado. Custo: 1 chamada por upload, depois irrelevante.

### Geração de perguntas

No upload, a IA gera **8-12 tópicos** do material (não perguntas prontas). Cada interação durante o dia é uma chamada pequena que pega "próximo tópico + última resposta do usuário" e gera a próxima fala — assim a conversa flui em vez de virar interrogatório.

**Voz das mensagens:** primeira pessoa do plural, tom de WhatsApp casual ("vamos praticar greeting?"), nunca didática ("qual a ideia principal do texto?"). O sujeito ativo é a prática, não o emissor da mensagem.

### Cadência

- Primeira mensagem chega 1h após o upload.
- Mensagens espaçadas em janelas configuráveis (default: 9h-18h, intervalos de ~1-2h).
- Insiste 1x se usuário não responde, depois acumula e espera.
- 2 dias sem material novo, manda template leve: "vamos praticar hoje? me manda o conteúdo."
- Usuário pode pausar com `/pausar` ou pedir intervalo com "chega por hoje".

### Evolução semanal

Domingo, o usuário recebe a evolução da semana:

- Quantos materiais enviados
- Quantas trocas no total
- Tópicos mais praticados
- Conceitos que rolaram bem
- Pontos onde travou (sem corrigir explicitamente — só sinalizar)

Esse é o gancho de retenção. É a prova de evolução que nenhum curso entrega.

### Comandos

| Ação                 | Comando                              |
| -------------------- | ------------------------------------ |
| Pausar prática       | `/pausar`                            |
| Retomar              | `/retomar`                           |
| Ver materiais ativos | `/materiais`                         |
| Encerrar dia         | "chega por hoje" (linguagem natural) |
| Suporte              | `/suporte`                           |

Sem comando de busca, sem tags. O produto não é caderno — é prática.

### Onboarding

Primeira mensagem do usuário dispara:

> Olá! Você acabou de chegar no Dropuz. Aqui é onde seu estudo continua durante o dia.
> Manda o conteúdo que está estudando — texto, áudio, foto ou PDF. Pode ser aula de inglês, lista de questões, capítulo de livro, resumo de matéria.
> No seu ritmo, durante o dia, as perguntas chegam pra você praticar.
> Manda agora pra começar.

Sem pedir nível, sem pedir idioma, sem cadastro. O sistema descobre tudo do primeiro material.

---

## 5. Mercado e posicionamento

### Posicionamento estratégico

**Não substituímos curso. Complementamos.**

Concorrentes (Parlai, Zaplingo, ChatClass) competem com aula. O usuário escolhe entre fazer curso de inglês ou usar tutor de IA. Eles brigam por tempo e orçamento da pessoa.

Nós somos camada **em cima** de qualquer fonte de estudo. Aluno de Wizard, Cultura Inglesa, professor particular, curso online, autodidata — todos cabem. Professor não nos vê como ameaça; nos vê como ferramenta que melhora o resultado dele.

Isso muda canal de aquisição: parceria com professor não é programa de afiliado, é "sua aula fica melhor com isso." É sustentável.

### Mercado endereçável

WhatsApp no Brasil: 147 milhões de usuários ativos, 99% online, 97% acessam diariamente.

Universos de estudo no Brasil:

- Estudantes de inglês: ~30 milhões ativos em algum nível
- Vestibulandos / pré-ENEM: 4-5 milhões/ano
- Concurseiros: 12+ milhões
- Estudantes de medicina e residência: ~500k
- Leitores ativos / autodidatas: ~10 milhões

A interseção "estuda algo + usa WhatsApp + paga R$20/mês por produtividade" é grande o suficiente para 10k-50k pagantes em 24 meses sem competir com Duolingo nem Memorae.

### Nicho de entrada: inglês

O produto entra com **marketing de inglês**. Tudo na copy fala com estudante de inglês intermediário travado. A arquitetura por baixo é agnóstica — permite expandir verticais sem reescrever.

Por que inglês primeiro:

- É o caso de uso do fundador (validação direta)
- Público enorme, identificável, ativo no Instagram e TikTok
- Dor clara: "estudo 30min, depois é português o dia inteiro"
- Canais de aquisição prontos (professores de inglês com audiência)
- Willingness to pay alta no segmento

Expansão futura (arquitetura, não roadmap):

- Fase 1 (0-6 meses): inglês exclusivo no marketing
- Fase 2 (6-12 meses): vestibular, ENEM, concurso — mesma máquina, novas campanhas
- Fase 3 (12+ meses): leitores, autodidatas, profissionais em desenvolvimento

Mesma stack, mesma máquina, embalagens diferentes.

---

## 6. Voo baixo

Princípio operacional pros primeiros 12-18 meses: **não aparecer no radar dos grandes.**

- Sem Product Hunt cedo
- Sem comunidades de tech brasileiro (Twitter/X, Reddit, HN)
- Aquisição só via canais do nicho (Instagram de professor, grupos de estudo)
- Copy nunca menciona "IA no WhatsApp" ou "agente conversacional"
- Linguagem é tangível: "pratique o que estudou", "seu estudo o dia inteiro", "prática contínua"
- Quando perguntarem o que faz: "complemento de estudo via WhatsApp"

Duolingo, ChatClass, Meta, qualquer um pode entrar nessa categoria se vir a tese. Voo baixo compra os 12-18 meses para consolidar base, dados e hábito.

---

## 7. Concorrência

### Concorrentes diretos (AI tutor no WhatsApp)

| Concorrente        | Preço          | Modelo                                        | Diferença pra nós                                    |
| ------------------ | -------------- | --------------------------------------------- | ---------------------------------------------------- |
| **Parlai**         | ~US$14/mês     | Cenários pré-definidos, role-play sob demanda | Eles inventam o tema; nós usamos o material do aluno |
| **Zaplingo**       | Free + Premium | Conversa de inglês, áudio                     | Substitutos de aula; nós complementamos              |
| **ChatClass** (BR) | Variável       | Aulas estruturadas no WhatsApp/Instagram      | Curso completo; nós somos prática contextual         |
| **AudioLingo**     | Trial + paid   | Chatbot de inglês geral                       | Sem ancoragem em material                            |

Todos competem com curso. Nós complementamos curso. Eixo diferente.

### Concorrentes adjacentes (assistentes no WhatsApp)

Memorae (US$3-9/mês), Voicenotes, Notis. Fazem lembrete agendado, transcrição, integração com Notion. **Nenhum faz prática conversacional baseada em material de estudo.** Concorrem por atenção, não pelo mesmo problema.

### Risco competitivo

**Maior risco:** ChatClass ou similar incorporar o ângulo "manda seu material" como feature. Mitigação: velocidade de execução e profundidade da evolução semanal, que exige acumulação de dados (vantagem do incumbente).

**Risco Meta:** mudança de política/preço de Cloud API. Mitigação: arquitetura multicanal desde o início (Telegram já planejado como segundo adaptador).

**Risco Duolingo / grandes:** lançar feature similar. Mitigação: voo baixo. Eles operam em escala global; nicho brasileiro fica na zona cega por 12-18 meses.

---

## 8. Planos e preço

### Free

- 1 material para sempre (não renova)
- 1 dia de prática
- Evolução do dia inicial
- Após esgotar: conta trancada até converter

Filosofia: free é demo, não produto. Pessoa testa com material real, vê valor, paga. Custo do free é fixo e baixo (1 dia de geração de perguntas).

### Pro — R$19,90/mês recorrente

- Materiais ilimitados (com caps técnicos invisíveis)
- Prática diária
- Evolução semanal
- Texto, áudio, imagem, PDF
- Histórico permanente da prática

### Por que não tem trial cronometrado

Trial gera ansiedade de uso e churn forçado no fim. "1 material grátis pra sempre" é mais leve e converte melhor — pessoa decide quando, não quando o relógio acabou.

### Por que não tem plano anual ainda

Anual exige confiança no produto que só vem com 6+ meses de operação e churn medido. Vender anual cedo demais é prometer estabilidade que ainda não existe. Reavaliar quando produto tiver 500+ pagantes ativos e churn mensal abaixo de 8%.

---

## 9. Stack técnica

| Camada                                 | Tecnologia                                       |
| -------------------------------------- | ------------------------------------------------ |
| Backend + API                          | Next.js (App Router, API Routes)                 |
| Banco de dados                         | Supabase (PostgreSQL)                            |
| Autenticação                           | Número de telefone (via WhatsApp, sem login)     |
| Deploy                                 | Vercel                                           |
| Mensageria                             | Meta Cloud API (WhatsApp Business)               |
| Transcrição de áudio                   | OpenAI Whisper                                   |
| OCR / Vision                           | GPT-4o-mini Vision                               |
| Processamento de PDF                   | Extração de texto + Vision para PDFs com imagem  |
| Detecção de tipo + extração de tópicos | Claude Haiku ou GPT-4o-mini                      |
| Geração de perguntas conversacionais   | Claude Haiku ou GPT-4o-mini com prompt fino      |
| Evolução semanal                       | Modelo médio em batch (50% off OpenAI batch API) |
| Jobs agendados                         | Vercel Cron                                      |
| Pagamento (MVP)                        | Pix manual via /suporte ou link Mercado Pago     |
| Pagamento (futuro)                     | Stripe + recorrência automática                  |
| Número virtual                         | BRDID — (11) 5306-9000 (já aprovado e ativo)     |

### Princípios de arquitetura

1. **Schema agnóstico:** tabela `materials` e `practice_sessions`, não `english_lessons`. Tipo de material é coluna, não tabela.
2. **Channel-agnostic:** webhook traduz para formato interno. Lógica não conhece canal de origem. Telegram, Slack são novos adaptadores.
3. **Identidade:** `wa_id` (phone) com upsert. Schema preparado para `bsuid` (transição Meta).
4. **Mídia descartada:** áudio, imagem e PDF processados em memória e descartados. Apenas texto extraído e tópicos derivados são salvos.
5. **Geração híbrida:** 1 chamada grande no upload (extrai tópicos), N chamadas pequenas durante o dia (gera perguntas com contexto da última resposta). Custo controlado, conversa fluida.
6. **Janela de 24h é ouro:** todo desenho otimizado para manter conversa dentro da janela do WhatsApp e evitar custo de template.
7. **Estado via lookup:** sem colunas de estado dedicadas. Última mensagem do usuário define contexto.
8. **Cache de prompts:** prompts de geração são versionados e cacheados. Iteração de qualidade é parte do produto.

---

## 10. Checklist de lançamento

Já pronto e em produção:

- Stack completa (Next.js + Supabase + Vercel)
- Integração WhatsApp Business API ativa
- Número virtual aprovado e funcionando
- Site no ar (a ser revisto no rebranding)
- CRUD completo de notas (precisa adaptar para `materials` + `practice_sessions`)
- Onboarding na primeira mensagem (precisa atualizar copy)
- Menus mapeados por ID real
- Transcrição de áudio (Whisper)
- OCR e descrição de imagem (Vision)
- Estrutura RAG completa (não usada no MVP, disponível para fase 2)

Falta antes do lançamento:

**Produto (motor de prática)**

- [ ] Adaptar schema: `notes` → `materials` + `practice_sessions` + `messages`
- [ ] Pipeline de upload com detecção de tipo de material (1 chamada Haiku/4o-mini)
- [ ] Extração de 8-12 tópicos no upload (1 chamada modelo médio)
- [ ] Geração de perguntas contextuais (chamada por interação)
- [ ] Iteração de prompts até qualidade conversacional aceitável (você é o beta tester nº 1)
- [ ] Job de envio: Vercel Cron a cada 30 min, decide quem deve receber mensagem agora
- [ ] Lógica de cadência: respeita silêncio, insiste 1x, espera
- [ ] Comando "chega por hoje" em linguagem natural
- [ ] `/pausar` e `/retomar`

**Retenção e cobrança**

- [ ] Evolução do dia (final de cada dia ativo)
- [ ] Evolução semanal (domingo, modelo médio em batch)
- [ ] Limites do free: 1 material, 1 dia, conta trancada após uso
- [ ] Gatilhos de upgrade contextuais
- [ ] Aceitação de Pix manual via /suporte
- [ ] /suporte com notificação no WhatsApp pessoal do admin

**Marca e comunicação**

- [ ] Nome novo definido (em paralelo, outro chat)
- [ ] Domínio comprado e configurado
- [ ] Site refeito com nova tagline e copy
- [ ] Onboarding refeito com nova voz
- [ ] Foto de perfil do WhatsApp Business atualizada
- [ ] Material institucional pra parceria com professor (1 página)

**Testes antes do beta**

- [ ] Fundador usando 7 dias seguidos sem encontrar bug crítico
- [ ] Verificar custo médio por usuário em janela real
- [ ] Verificar % de mensagens dentro da janela de 24h (alvo: 85%+)

**Beta**

- [ ] Recrutar 30-50 beta testers via Instagram pessoal e indicação
- [ ] 30 dias de uso gratuito pra eles
- [ ] Feedback estruturado a cada 7 dias
- [ ] Métricas de retenção D7, D14, D30

---

## 11. Custos operacionais

Custo variável por usuário Pro ativo:

| Item                                               | Custo/mês       |
| -------------------------------------------------- | --------------- |
| WhatsApp API (1 template/2 dias + janelas de 24h)  | R$0,80-1,20     |
| Whisper (áudios eventuais, capped)                 | R$0,80-1,20     |
| Vision (imagens e PDFs com imagem, capped)         | R$0,30-0,60     |
| Detecção de tipo + extração de tópicos (1x/upload) | R$0,40-0,70     |
| Geração de perguntas (8-12/dia em modelo pequeno)  | R$1,20-1,80     |
| Evolução semanal (batch)                           | R$0,30          |
| Infra (Supabase, Vercel, diluído)                  | R$0,50          |
| **Total médio**                                    | **R$4,30-6,30** |

**Margem bruta:** 68-78% (SaaS saudável).

### Caps técnicos invisíveis

- 5 materiais/dia por usuário (cobre 99% do uso real)
- 30 áudios/dia, 60s cada (transcritos)
- 10 imagens/dia
- 12 mensagens geradas/dia

Power user mandando 30 áudios e 50 imagens/dia é outlier. Caps individuais resolvem sem comunicar limites pro usuário comum.

### Métrica crítica de margem

% de mensagens enviadas dentro da janela de 24h vs templates. Quanto maior a janela, menor o custo. Alvo: >85% das mensagens em janela.

---

## 12. Projeção financeira

**Meta de independência:** R$25.000 líquido/mês para dedicação full do founder.

Com R$19,90/mês, custo médio R$5,30, margem bruta R$14,60/usuário.

| Marco             | Pagantes  | MRR bruto    | Líquido estimado | O que habilita              |
| ----------------- | --------- | ------------ | ---------------- | --------------------------- |
| Validação         | 300       | R$5.970      | ~R$3.700         | Prova produto, mantém CLT   |
| Transição         | 1.000     | R$19.900     | ~R$12.500        | Reduz CLT                   |
| **Independência** | **1.800** | **R$35.820** | **~R$22.500**    | **Sai do emprego**          |
| Conforto          | 3.000     | R$59.700     | ~R$37.500        | Reinveste em time/marketing |

### Funil para 1.800 pagantes

Conversão free → pago no novo modelo deve ser maior que no antigo, porque:

- Free é 1 dia, não tier permanente — pressão natural de upgrade
- Posicionamento de "complementar", não substituir, reduz objeção
- Indicação de professor traz lead pré-qualificado

Estimativa realista: 8-12% conversão. Se cair pra 5-7% (cenário pessimista), meta sobe pra ~3.000 pagantes.

Base free necessária: **15.000-22.000 usuários** que testam o produto. Bem mais factível que os 100k do brief anterior.

### Timeline conservadora

12-18 meses até independência, com:

- Meses 1-3: 30-50 usuários (validação técnica e qualidade conversacional)
- Meses 3-6: 200-400 pagantes (parcerias com 5-10 professores influencers)
- Meses 6-12: 800-1.500 pagantes (escala orgânica + tráfego pago leve)
- Meses 12-18: 1.800-3.000 pagantes (independência)

---

## 13. Distribuição

### Canal #1: parceria com professor de inglês

Não é programa de afiliado. É proposta de valor pro professor:

> Seu aluno estuda 1h por semana com você. Os outros 6 dias e 23 horas, ele esquece o que aprendeu. Indica o Dropuz e ele pratica todo dia em cima do material que VOCÊ passou. Resultado dele melhora, você fica mais valorizado.

Ferramentas:

- Plano "professor": 5 contas grátis pra primeiros alunos do professor
- Material institucional pronto (1 página explicando)
- Link de indicação (rastreio orgânico, não comissão)

Meta: 20 professores com 5k+ seguidores no Instagram/TikTok nos primeiros 3 meses.

### Canal #2: conteúdo orgânico próprio

Reels demonstrando o fluxo:

- "Aluno manda PDF da aula de greeting → recebe prática em inglês durante o dia"
- "Vestibulando manda lista de questões → pratica no horário do almoço"
- "Pessoa manda capítulo do livro → discute durante a tarde"

Demonstração visual = produto. Ninguém precisa explicar.

### Canal #3: comunidades de estudo

Grupos de Facebook e WhatsApp de inglês, vestibular, concurso. Não como spam — como fundador real respondendo dúvidas e mostrando o produto quando relevante.

### Canais que NÃO usamos

- Product Hunt
- Twitter/X tech brasileiro
- HackerNews
- Reddit r/brasil

Voo baixo.

---

## 14. Riscos principais

1. **Qualidade conversacional.** Pergunta gerada por IA tem que parecer pessoa, não exercício de prova. Esse é o trabalho central do MVP. Se sair robótico, produto morre rápido.

2. **Custo de WhatsApp escapando.** Se margem de janela 24h cair abaixo de 80%, custos disparam. Monitorar semanalmente.

3. **Dependência da Meta.** Existencial. Mitigado por arquitetura multicanal e por relacionamento direto com base (não dependemos da Meta pra avisar usuário).

4. **Concorrente brasileiro (ChatClass) entrar no mesmo eixo.** Velocidade e profundidade da evolução semanal são defesa.

5. **Conversão real abaixo do projetado.** 8-12% é estimativa. Se cair pra 5%, meta sobe pra ~3.000 pagantes, timeline alonga.

---

## 15. Decisões tomadas no pivô

- **Categoria:** agente de prática contínua, não caderno nem flashcard
- **Posicionamento:** complemento de estudo, não substituto de curso
- **Vertical de entrada:** inglês (marketing), agnóstico (produto)
- **Mecânica central:** material do usuário define a prática, não cenário pré-definido
- **Cadência:** ancorada no upload do dia, não em horário fixo
- **Free:** 1 material pra sempre, conta trancada após uso
- **Preço:** R$19,90/mês recorrente = R$19,90/30 dias avulso (mesmo preço, sem fricção)
- **Anual:** adiado até 6+ meses de operação e churn medido
- **MVP em 2 semanas:** 99% do código já existe; trabalho é adaptar schema, motor de prática e prompt
- **Mídia nunca armazenada:** áudio, imagem, PDF processados em memória e descartados
- **Geração híbrida de perguntas:** tópicos no upload, perguntas contextuais por interação
- **Janela de 24h é regra de ouro:** todo design otimizado pra ficar dentro dela
- **Voo baixo:** sem Product Hunt, sem comunidades de tech, sem hype de IA
- **Canal #1 de aquisição:** professor como parceiro, não como afiliado
- **Sem trial cronometrado:** "1 material pra sempre" no lugar
- **Voz da copy:** tecnologia não aparece. Sujeito é o usuário e o estudo
- **Voz das mensagens:** primeira pessoa do plural ("vamos praticar"), tom de WhatsApp casual
- **Domínio e nome:** Enkeeper a ser revisto antes do lançamento (decisão em paralelo)

---

## 16. Roadmap pós-MVP (não priorizado)

- Prática em outros idiomas (espanhol, francês — mesmo motor)
- Vertical ENEM com campanha própria
- Vertical concurso com campanha própria
- Vertical leitura (livros, artigos) com campanha própria
- Telegram (segundo canal)
- Dashboard web (somente se demanda crescer)
- Recorrência automática de pagamento
- Plano anual com desconto (após 6+ meses de operação)
- RAG de materiais antigos (cruzar matéria nova com erros recorrentes)
- Programa estruturado de parceria com professores
- Versão B2B (escolas, cursinhos, escolas de idioma)
- Geração de cronograma personalizado

---

## 17. Resumo executivo

Um agente de prática contínua que ajuda você a estudar qualquer conteúdo. Você manda o material — texto, áudio, imagem ou PDF — e recebe perguntas e diálogos sobre aquilo durante o dia, no WhatsApp.

Entra pelo nicho de inglês com arquitetura agnóstica. Mesma máquina serve estudante de inglês, vestibulando, concurseiro, leitor — muda só a campanha. Voa baixo para evitar grandes players.

99% do código já está em produção. Trabalho remanescente é adaptação de schema, motor de prática e iteração de prompt. MVP em 2 semanas. Meta de 1.800 pagantes em 12-18 meses para R$22.500 líquido/mês — independência financeira.

Espaço competitivo definido: tutores de IA no WhatsApp (Parlai, ChatClass) competem com curso e usam cenários genéricos. Nós complementamos curso e usamos o material do aluno. Eixo diferente.

A pergunta que resta é se a qualidade conversacional gerada sobre o material do usuário entrega valor real. Isso se responde com 30-50 beta testers em 3 semanas — começando pelo fundador como caso de uso.
