# Dropuz — Product Brief

> Documento vivo — base de decisão para produto e negócio.
> Versão 8 — Maio 2026
> Regras de sistema e comportamento técnico em Rules.md.

---

## 1. O que é

**Um agente de prática contínua que ajuda você a estudar qualquer conteúdo.**

Você envia o material que está estudando — texto, áudio, imagem ou PDF — e ele conversa com você sobre aquilo ao longo do dia, no WhatsApp.

Aula tem 30 minutos. Sua prática tem o dia inteiro.

### Para quem é

Para quem estuda algo e perde o conteúdo no resto da rotina. Estudante de inglês, vestibulando, concurseiro, leitor, autodidata. Qualquer pessoa que aprende em sessão e esquece no espaço entre uma sessão e outra.

### O que resolve

O conteúdo novo não fixa porque não tem repetição contextual. Você estuda 30 minutos, depois sua rotina volta pro automático. Flashcard exige disciplina, app de estudo exige abrir aplicativo, tutor de IA conversa sobre cenários genéricos.

Dropuz mantém seu estudo ativo no canal onde você já vive. Você manda o conteúdo, recebe a prática.

---

## 2. Pitch

**Tagline principal:**
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

A maioria de quem estuda aprende em sessão e perde no resto do dia. Aluno tem aula de 30 minutos e volta pra rotina em português. Vestibulando estuda 2 horas e esquece metade até o dia seguinte. Leitor termina capítulo e não consegue articular o que leu uma semana depois.

O gargalo não é falta de conteúdo. É falta de prática contextual contínua. As ferramentas existentes resolvem isso de forma errada:

- **Flashcard (Anki, Quizlet)** — exige montar deck, abrir app, manter disciplina. Maioria desiste.
- **Tutor de IA (Parlai, Zaplingo, ChatClass)** — conversa sobre cenários pré-definidos, não sobre o material do aluno.
- **Lembrete (Memorae)** — agenda tarefa, não pratica conteúdo.
- **Curso/professor** — ótimo na sessão, ausente no resto do dia.

A interseção "prática contextual contínua, ancorada no material do aluno, dentro do canal onde ele já vive" não existe. Esse é o produto.

---

## 4. Como funciona

1. Usuário manda material pelo WhatsApp (texto, áudio, imagem ou PDF).
2. Sistema processa o material, extrai 8–12 tópicos centrais e detecta tipo de conteúdo.
3. Durante o dia, as mensagens chegam com perguntas e estímulos de diálogo sobre aqueles tópicos.
4. Conversa flui dentro da janela de 24h do WhatsApp.
5. Domingo, o usuário recebe a evolução da semana.

### Detecção automática de tipo de material

| Material recebido | Comportamento da prática |
| ----------------- | ------------------------ |
| Texto / aula / PDF em inglês | Conversa em inglês usando vocabulário do material |
| Lista de questões de vestibular | Drill de questões e variações |
| Capítulo de livro / artigo | Discussão sobre o conteúdo, perguntas de fixação |
| Resumo de matéria / fichamento | Quiz no idioma do material |
| Devocional / reflexão pessoal | Conversa de interioridade, sem certo/errado |
| Material misto (PT + EN) | Tratado como inglês (oportunidade de prática) |

### Evolução semanal

Domingo, o usuário recebe:
- Quantos materiais enviados
- Quantas trocas no total
- Tópicos mais praticados
- Conceitos que rolaram bem
- Pontos onde travou (sinalizado, não corrigido)

Esse é o gancho de retenção. É a prova de evolução que nenhum curso entrega.

### Onboarding

Primeira mensagem do usuário dispara:

> Olá! Você acabou de chegar no Dropuz. Aqui é onde seu estudo continua durante o dia.
> Manda o conteúdo que está estudando — texto, áudio, foto ou PDF. Pode ser aula de inglês, lista de questões, capítulo de livro, resumo de matéria.
> No seu ritmo, durante o dia, as perguntas chegam pra você praticar.
> Manda agora pra começar.

Sem pedir nível, sem pedir idioma, sem cadastro. O sistema descobre tudo do primeiro material.

---

## 5. Posicionamento

**Não substituímos curso. Complementamos.**

Concorrentes (Parlai, Zaplingo, ChatClass) competem com aula — o usuário escolhe entre fazer curso ou usar tutor de IA. Eles brigam por tempo e orçamento.

Nós somos camada em cima de qualquer fonte de estudo. Aluno de Wizard, Cultura Inglesa, professor particular, autodidata — todos cabem. Professor não nos vê como ameaça; nos vê como ferramenta que melhora o resultado dele.

Isso muda o canal de aquisição: parceria com professor não é afiliado, é "sua aula fica melhor com isso."

---

## 6. Mercado

WhatsApp no Brasil: 147 milhões de usuários ativos, 97% acessam diariamente.

Universos de estudo:
- Estudantes de inglês: ~30 milhões ativos em algum nível
- Vestibulandos / pré-ENEM: 4–5 milhões/ano
- Concurseiros: 12+ milhões
- Estudantes de medicina e residência: ~500k
- Leitores ativos / autodidatas: ~10 milhões

A interseção "estuda algo + usa WhatsApp + paga R$20/mês por produtividade" suporta 10k–50k pagantes em 24 meses sem competir com Duolingo nem Memorae.

### Nicho de entrada: inglês

O produto entra com marketing de inglês. A arquitetura por baixo é agnóstica — permite expandir verticais sem reescrever.

- Fase 1 (0–6 meses): inglês exclusivo no marketing
- Fase 2 (6–12 meses): vestibular, ENEM, concurso
- Fase 3 (12+ meses): leitores, autodidatas, profissionais

Mesma stack, mesma máquina, embalagens diferentes.

---

## 7. Concorrência

### Diretos (AI tutor no WhatsApp)

| Concorrente | Modelo | Diferença |
| ----------- | ------ | --------- |
| **Parlai** | Cenários pré-definidos, role-play | Eles inventam o tema; nós usamos o material do aluno |
| **Zaplingo** | Conversa de inglês, áudio | Substitutos de aula; nós complementamos |
| **ChatClass** | Aulas estruturadas no WhatsApp | Curso completo; nós somos prática contextual |
| **AudioLingo** | Chatbot de inglês geral | Sem ancoragem em material |

Todos competem com curso. Nós complementamos curso. Eixo diferente.

### Adjacentes

Memorae, Voicenotes, Notis — fazem lembrete, transcrição, integração com Notion. Nenhum faz prática conversacional baseada em material de estudo. Concorrem por atenção, não pelo mesmo problema.

### Riscos competitivos

- **ChatClass incorporar o ângulo "manda seu material"** — mitigação: velocidade e profundidade da evolução semanal (vantagem do incumbente por dados acumulados).
- **Meta mudar política/preço de API** — mitigação: arquitetura multicanal, Telegram como segundo adaptador.
- **Grandes players** — mitigação: voo baixo. Nicho brasileiro fica na zona cega por 12–18 meses.

---

## 8. Planos e preço

Dois planos: **Trial** e **Pro**. Sem tier gratuito permanente.

### Trial — 1 dia, experiência completa

- Experiência idêntica ao Pro por 1 dia
- Após expirar: conta trancada até converter

Não é teaser nem versão capada — é o produto inteiro, por tempo limitado. Quem vai pagar, sente o valor no dia 1. Quem não vai, não paga nunca. Free permanente vira freemium trap — 90% ficam satisfeitos com o limite e nunca pagam.

**Trial estendido como ferramenta de campanha:**
- Padrão: 1 dia
- Indicação de professor parceiro: 3 dias
- Campanha sazonal: 7 dias
- Beta testers / cortesia permanente: sem expiração

### Pro — R$19,90/mês

- Materiais ilimitados
- Prática diária
- Evolução semanal
- Texto, áudio, imagem, PDF
- Histórico permanente

### Pro — R$19,90/30 dias avulso (Pix)

Mesmo preço. Sem fricção para quem quer um mês pontual (prova específica, período de estudo intenso).

### Plano anual

Adiado. Exige confiança no produto que só vem com 6+ meses de operação e churn medido. Reavaliar com 500+ pagantes ativos e churn mensal abaixo de 8%.

---

## 9. Stack técnica

| Camada | Tecnologia |
| ------ | ---------- |
| Backend + API | Next.js (App Router, API Routes) |
| Banco de dados | Supabase (PostgreSQL) |
| Deploy | Vercel |
| Mensageria | Meta Cloud API (WhatsApp Business) |
| Transcrição de áudio | OpenAI Whisper |
| OCR / Vision | GPT-4o-mini Vision |
| Detecção de tipo + extração de tópicos | Claude Haiku ou GPT-4o-mini |
| Geração de mensagens | Claude Haiku ou GPT-4o-mini |
| Evolução semanal | Modelo médio em batch |
| Jobs agendados | Vercel Cron |
| Pagamento (MVP) | Pix manual via /suporte |
| Pagamento (futuro) | Stripe + recorrência automática |
| Número virtual | BRDID — (11) 5306-9000 |

---

## 10. Custos operacionais

Custo variável por usuário Pro ativo:

| Item | Custo/mês |
| ---- | --------- |
| WhatsApp API | R$0,80–1,20 |
| Whisper (áudios) | R$0,80–1,20 |
| Vision (imagens e PDFs) | R$0,30–0,60 |
| Detecção + extração de tópicos | R$0,40–0,70 |
| Geração de mensagens | R$1,20–1,80 |
| Evolução semanal (batch) | R$0,30 |
| Infra (diluído) | R$0,50 |
| **Total médio** | **R$4,30–6,30** |

**Margem bruta:** 68–78%.

---

## 11. Projeção financeira

**Meta de independência:** R$25.000 líquido/mês.

Com R$19,90/mês e custo médio R$5,30, margem bruta de R$14,60/usuário.

| Marco | Pagantes | MRR bruto | Líquido estimado | O que habilita |
| ----- | -------- | --------- | ---------------- | -------------- |
| Validação | 300 | R$5.970 | ~R$3.700 | Prova produto, mantém CLT |
| Transição | 1.000 | R$19.900 | ~R$12.500 | Reduz CLT |
| **Independência** | **1.800** | **R$35.820** | **~R$22.500** | **Sai do emprego** |
| Conforto | 3.000 | R$59.700 | ~R$37.500 | Reinveste em time/marketing |

Conversão estimada: 8–12% trial → Pro. Cenário pessimista (5–7%): meta sobe para ~3.000 pagantes.
Base necessária: 15.000–22.000 trials.

### Timeline conservadora

- Meses 1–3: 30–50 usuários (validação técnica e qualidade conversacional)
- Meses 3–6: 200–400 pagantes (parcerias com 5–10 professores)
- Meses 6–12: 800–1.500 pagantes (orgânico + tráfego pago leve)
- Meses 12–18: 1.800–3.000 pagantes (independência)

---

## 12. Distribuição

### Canal #1: parceria com professor de inglês

Proposta de valor pro professor:
> Seu aluno estuda 1h por semana com você. Os outros 6 dias e 23 horas, ele esquece o que aprendeu. Indica o Dropuz e ele pratica todo dia em cima do material que VOCÊ passou. Resultado dele melhora, você fica mais valorizado.

- Plano professor: 5 contas trial estendido para primeiros alunos
- Material institucional pronto (1 página)
- Link de indicação com rastreio

Meta: 20 professores com 5k+ seguidores nos primeiros 3 meses.

### Canal #2: conteúdo orgânico

Reels demonstrando o fluxo real:
- Aluno manda PDF da aula → recebe prática em inglês durante o dia
- Vestibulando manda lista de questões → pratica no horário do almoço

Demonstração visual = produto. Não precisa explicar.

### Canal #3: comunidades de estudo

Grupos de WhatsApp e Facebook de inglês, vestibular, concurso. Como fundador respondendo dúvidas, não como spam.

### Voo baixo

- Sem Product Hunt
- Sem Twitter/X tech brasileiro, HackerNews, Reddit
- Copy nunca menciona "IA" ou "agente conversacional"
- Linguagem tangível: "pratique o que estudou", "seu estudo o dia inteiro"

Objetivo: 12–18 meses fora do radar dos grandes para consolidar base e hábito.

---

## 13. Checklist de lançamento

**Já em produção:**
- Stack completa (Next.js + Supabase + Vercel)
- Integração WhatsApp Business API ativa
- Número virtual aprovado e funcionando
- Transcrição de áudio (Whisper)
- OCR e descrição de imagem (Vision)

**Falta — motor de prática:**
- [ ] Adaptar schema para activities + messages
- [ ] Pipeline de upload com detecção de tipo e extração de tópicos
- [ ] Geração de mensagens contextuais por interação
- [ ] Iteração de prompts até qualidade conversacional aceitável
- [ ] Job de cadência (Cron a cada 30min)
- [ ] Lógica de estados de activity (Rules.md)

**Falta — retenção e cobrança:**
- [ ] Evolução do dia
- [ ] Evolução semanal (batch)
- [ ] Gatilhos de upgrade contextuais
- [ ] Pix manual via /suporte

**Falta — marca:**
- [ ] Site refeito com nova copy
- [ ] Onboarding atualizado
- [ ] Material institucional para professor (1 página)

**Testes antes do beta:**
- [ ] Fundador usando 7 dias sem bug crítico
- [ ] 2–3 pessoas próximas testando com material real
- [ ] Custo médio por usuário validado em janela real

**Beta:**
- [ ] 30–50 testers via Instagram e indicação
- [ ] Trial estendido de 30 dias para eles
- [ ] Feedback estruturado a cada 7 dias
- [ ] Métricas D7, D14, D30

---

## 14. Riscos principais

1. **Qualidade conversacional.** Mensagem gerada por IA tem que soar como pessoa, não como exercício. É o trabalho central do MVP.
2. **Custo de WhatsApp.** Se a margem de janela 24h cair abaixo de 80%, custos disparam. Monitorar semanalmente.
3. **Dependência da Meta.** Mitigado por arquitetura multicanal e relacionamento direto com a base.
4. **Concorrente entrando no mesmo eixo.** Velocidade e profundidade da evolução semanal são a defesa.
5. **Conversão abaixo do projetado.** Se cair para 5%, meta sobe para ~3.000 pagantes e timeline alonga.

---

## 15. Resumo executivo

Um agente de prática contínua que ajuda você a estudar qualquer conteúdo. Você manda o material — texto, áudio, imagem ou PDF — e recebe perguntas e diálogos sobre aquilo durante o dia, no WhatsApp.

Entra pelo nicho de inglês com arquitetura agnóstica. Mesma máquina serve estudante de inglês, vestibulando, concurseiro, leitor — muda só a campanha. Voa baixo para evitar grandes players.

99% do código já está em produção. Trabalho remanescente é adaptação de schema, motor de prática e iteração de prompt. Meta de 1.800 pagantes em 12–18 meses para R$22.500 líquido/mês.

Espaço competitivo definido: tutores de IA no WhatsApp competem com curso e usam cenários genéricos. Nós complementamos curso e usamos o material do aluno. Eixo diferente.

A pergunta que resta é se a qualidade conversacional entrega valor real. Isso se responde com 30–50 beta testers em 3 semanas.
