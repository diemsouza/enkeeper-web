# Dropuz — Product Brief

> Documento vivo — base de decisão para produto e negócio.
> Versão 9 — Maio 2026
> Regras de sistema e comportamento técnico em Rules.md.

---

## 1. O que é

**Um agente de prática de inglês que mantém seu estudo ativo o dia inteiro no WhatsApp.**

Você envia o material da sua aula — texto, áudio, imagem ou PDF — e recebe perguntas sobre aquilo ao longo do dia. Responde de cabeça, sem consultar. O sistema avalia, dá feedback e registra o que você acertou e errou.

Aula tem 30 minutos. Sua prática tem o dia inteiro.

### Para quem é

Para quem estuda inglês e perde o conteúdo no resto da rotina. Aluno de escola de idiomas, professor particular, autodidata — qualquer pessoa que aprende em sessão e esquece no espaço entre uma aula e outra.

### O que resolve

Vocabulário novo não fixa sem repetição contextual. Você estuda 30 minutos, depois é português o dia inteiro. Flashcard exige disciplina e sessão dedicada. Tutor de IA conversa sobre cenários genéricos, não sobre o material da sua aula.

Dropuz mantém sua prática ativa no canal onde você já vive, com o conteúdo que você já está estudando.

---

## 2. Pitch

**Tagline:**

> Sua aula de inglês tem 30 minutos. Sua prática tem o dia inteiro.

**Subtítulo:**

> Mande o material da sua aula. Pratique o vocabulário o dia todo no WhatsApp.

**Diferencial em uma frase:**

> Seu estudo não termina quando você fecha o caderno.

**Para o professor:**

> Seu aluno estuda 1h por semana com você. Os outros 6 dias e 23 horas, ele esquece. Com o Dropuz, ele pratica todo dia em cima do material que você passou.

---

## 3. O problema

Aluno tem aula de inglês, aprende vocabulário novo, volta pra rotina em português. Na aula seguinte, esqueceu metade. O gargalo não é falta de conteúdo — é falta de prática entre as aulas.

As ferramentas existentes não resolvem isso:

- **Flashcard (Anki, Quizlet)** — exige montar deck, abrir app, manter disciplina. Maioria desiste.
- **Tutor de IA (Parlai, Zaplingo, ChatClass)** — conversa sobre cenários pré-definidos, não sobre o material do aluno.
- **Curso online** — mais conteúdo, não mais prática do que já foi visto.

A interseção "prática contextual contínua, ancorada no material do aluno, dentro do canal onde ele já vive" não existe. Esse é o produto.

---

## 4. Como funciona

1. Usuário manda material da aula — texto, áudio, imagem ou PDF.
2. Sistema extrai vocabulário e tópicos, gera perguntas em cima daquele conteúdo.
3. Durante o dia, perguntas chegam no WhatsApp. Usuário responde de cabeça.
4. Sistema avalia a resposta, dá feedback natural e registra acerto/erro.
5. Perguntas erradas ou parciais voltam com prioridade nas próximas rodadas.
6. Domingo, o usuário recebe a evolução da semana — % de acerto, vocabulário que travou, evolução vs semana anterior.

### Nível e idioma das perguntas

O sistema calibra pelo nível do material:

- Básico: pergunta em português, termo em inglês
- Intermediário: misto PT/EN natural
- Avançado: majoritariamente em inglês

### Modo sessão (/praticar)

Usuário pode iniciar sessão ativa — perguntas chegam em sequência, uma após a outra, sem esperar a cadência. Sessão dura 15 minutos de inatividade.

### Onboarding

> Olá! Você acabou de chegar no Dropuz. Aqui é onde sua prática de inglês continua durante o dia.
> Manda o material da sua aula — texto, áudio, foto ou PDF.
> No seu ritmo, durante o dia, as perguntas chegam pra você praticar.
> Manda agora pra começar.

---

## 5. Posicionamento

**Não substituímos aula. Complementamos.**

Concorrentes (Parlai, Zaplingo, ChatClass) competem com o professor — o aluno escolhe entre fazer aula ou usar tutor de IA. Eles brigam por tempo e orçamento.

Nós somos a prática entre as aulas. Aluno de Wizard, Cultura Inglesa, professor particular, autodidata — todos cabem. Professor não nos vê como ameaça; nos vê como ferramenta que melhora o resultado do aluno dele.

O founder é usuário ativo do próprio produto — estuda inglês com o Dropuz todo dia. Esse é o case real.

---

## 6. Mercado

WhatsApp no Brasil: 147 milhões de usuários ativos, 97% acessam diariamente.

Estudantes de inglês no Brasil: ~30 milhões ativos em algum nível. Disposição a pagar R$20/mês por produtividade no aprendizado é alta — o BeConfident cobra R$59,90/mês com 100k+ usuários.

Meta conservadora: 10k–50k pagantes em 24 meses focado exclusivamente em inglês.

### Expansão futura

A arquitetura suporta outros idiomas e matérias sem reescrever. Expansão só após validação e churn controlado — mesma máquina, nova campanha.

---

## 7. Concorrência

### Diretos (AI tutor no WhatsApp)

| Concorrente     | Modelo                             | Diferença                                              |
| --------------- | ---------------------------------- | ------------------------------------------------------ |
| **Parlai**      | Cenários pré-definidos, role-play  | Inventam o tema; nós usamos o material do aluno        |
| **Zaplingo**    | Conversa de inglês, áudio          | Substituto de aula; nós complementamos                 |
| **ChatClass**   | Aulas estruturadas no WhatsApp     | Curso completo; nós somos prática contextual           |
| **BeConfident** | Curso completo com IA, R$59,90/mês | Substitui professor; nós complementamos qualquer fonte |

Todos competem com aula. Nós complementamos aula. Eixo diferente — e o aluno do BeConfident é exatamente nosso cliente.

### Riscos competitivos

- **Concorrente incorporar "manda seu material"** — mitigação: velocidade e profundidade da evolução semanal com histórico de acerto/erro.
- **Meta mudar política/preço de API** — mitigação: arquitetura multicanal, Telegram como segundo adaptador.
- **Grandes players** — mitigação: voo baixo. Nicho brasileiro fica na zona cega por 12–18 meses.

---

## 8. Planos e preço

Dois planos: **Trial** e **Pro**. Sem tier gratuito permanente.

### Trial — 1 dia, experiência completa

Experiência idêntica ao Pro por 1 dia. Após expirar: conta trancada até converter.

Não é teaser — é o produto inteiro por tempo limitado. Quem sente o valor no dia 1 paga. Quem não sente, não pagaria em nenhum preço.

**Trial estendido como ferramenta de campanha:**

- Padrão: 1 dia
- Indicação de professor parceiro: 3 dias
- Campanha sazonal: 7 dias
- Beta testers / cortesia permanente: sem expiração (planExpiresAt = 2099-12-31)

### Pro — R$19,90/mês recorrente

- Materiais ilimitados
- Prática diária com loop de acerto/erro
- Evolução semanal
- Texto, áudio, imagem, PDF
- Histórico permanente

### Pro — R$19,90/30 dias avulso (Pix)

Mesmo preço. Sem fricção para quem quer um mês pontual.

### Plano anual

Adiado. Reavaliar com 500+ pagantes ativos e churn mensal abaixo de 8%.

---

## 9. Stack técnica

| Camada                                     | Tecnologia                         |
| ------------------------------------------ | ---------------------------------- |
| Backend + API                              | Next.js (App Router, API Routes)   |
| Banco de dados                             | Supabase (PostgreSQL)              |
| Deploy                                     | Vercel                             |
| Mensageria                                 | Meta Cloud API (WhatsApp Business) |
| Transcrição de áudio                       | OpenAI Whisper                     |
| OCR / Vision                               | GPT-4o-mini Vision                 |
| Extração de tópicos + geração de perguntas | Claude Haiku ou GPT-4o-mini        |
| Avaliação de respostas + feedback          | Claude Haiku ou GPT-4o-mini        |
| Evolução semanal                           | Modelo médio em batch              |
| Jobs agendados                             | Vercel Cron                        |
| Pagamento (MVP)                            | Pix manual via /suporte            |
| Pagamento (futuro)                         | Stripe + recorrência automática    |
| Número virtual                             | BRDID — (11) 5306-9000             |

---

## 10. Custos operacionais

Custo variável por usuário Pro ativo:

| Item                                       | Custo/mês       |
| ------------------------------------------ | --------------- |
| WhatsApp API                               | R$0,80–1,20     |
| Whisper (áudios)                           | R$0,80–1,20     |
| Vision (imagens e PDFs)                    | R$0,30–0,60     |
| Extração de tópicos + geração de perguntas | R$0,40–0,70     |
| Avaliação + feedback                       | R$1,20–1,80     |
| Evolução semanal (batch)                   | R$0,30          |
| Infra (diluído)                            | R$0,50          |
| **Total médio**                            | **R$4,30–6,30** |

**Margem bruta:** 68–78%.

---

## 11. Projeção financeira

**Meta de independência:** R$25.000 líquido/mês.

Com R$19,90/mês e custo médio R$5,30, margem bruta de R$14,60/usuário.

| Marco             | Pagantes  | MRR bruto    | Líquido estimado | O que habilita              |
| ----------------- | --------- | ------------ | ---------------- | --------------------------- |
| Validação         | 300       | R$5.970      | ~R$3.700         | Prova produto, mantém CLT   |
| Transição         | 1.000     | R$19.900     | ~R$12.500        | Reduz CLT                   |
| **Independência** | **1.800** | **R$35.820** | **~R$22.500**    | **Sai do emprego**          |
| Conforto          | 3.000     | R$59.700     | ~R$37.500        | Reinveste em time/marketing |

Conversão estimada: 8–12% trial → Pro.
Base necessária: 15.000–22.000 trials.

### Timeline conservadora

- Meses 1–3: 30–50 usuários (validação técnica e qualidade conversacional)
- Meses 3–6: 200–400 pagantes (parcerias com 5–10 professores)
- Meses 6–12: 800–1.500 pagantes (orgânico + tráfego pago leve)
- Meses 12–18: 1.800–3.000 pagantes (independência)

---

## 12. Distribuição

### Canal #1: parceria com professor de inglês

O professor passa o material, o Dropuz entrega a prática. O resultado do aluno melhora na aula seguinte — o professor fica mais valorizado.

- Trial estendido de 3 dias para alunos indicados pelo professor
- Material institucional pronto (1 página)
- Link de indicação com rastreio

Meta: 20 professores com 5k+ seguidores nos primeiros 3 meses.

### Canal #2: founder como usuário real

Founder estuda inglês com o Dropuz todo dia. Reels mostrando o fluxo real — material enviado, perguntas recebidas, evolução semanal. Storytelling de quem construiu para si mesmo.

Demonstração visual = produto. Não precisa explicar.

### Canal #3: comunidades de estudo de inglês

Grupos de WhatsApp e Facebook de inglês. Como fundador respondendo dúvidas, não como spam.

### Voo baixo

- Sem Product Hunt
- Sem Twitter/X tech brasileiro, HackerNews, Reddit
- Copy nunca menciona "IA" ou "agente conversacional"
- Linguagem tangível: "pratique o vocabulário da sua aula", "seu inglês o dia inteiro"

---

## 13. Checklist de lançamento

**Já em produção:**

- Stack completa (Next.js + Supabase + Vercel)
- Integração WhatsApp Business API ativa
- Número virtual aprovado e funcionando
- Transcrição de áudio (Whisper)
- OCR e descrição de imagem (Vision)
- Schema atualizado com `Question`
- Motor de prática com loop acerto/erro
- Cadência e sessão ativa (/praticar)

**Falta:**

- [ ] Evolução semanal com % acerto e vocabulário que travou
- [ ] Gatilhos de upgrade contextuais
- [ ] Pix manual via /suporte
- [ ] Site refeito com nova copy (foco inglês)
- [ ] Onboarding atualizado
- [ ] Material institucional para professor (1 página)

**Testes antes do beta:**

- [ ] Fundador usando 7 dias sem bug crítico com material real de inglês
- [ ] 2–3 pessoas próximas testando
- [ ] Custo médio por usuário validado em janela real

**Beta:**

- [ ] 30–50 testers via Instagram e indicação
- [ ] Trial estendido de 30 dias
- [ ] Feedback estruturado a cada 7 dias
- [ ] Métricas D7, D14, D30

---

## 14. Riscos principais

1. **Qualidade conversacional.** Pergunta tem que soar como pessoa, feedback como amigo. É o trabalho central.
2. **Custo de WhatsApp.** Se janela 24h cair abaixo de 80%, custos disparam. Monitorar semanalmente.
3. **Dependência da Meta.** Mitigado por arquitetura multicanal.
4. **Concorrente no mesmo eixo.** Histórico de acerto/erro acumulado é a defesa — vantagem do incumbente.
5. **Conversão abaixo do projetado.** Se cair para 5%, meta sobe para ~3.000 pagantes.

---

## 15. Resumo executivo

Um agente de prática de inglês que mantém seu vocabulário ativo o dia inteiro no WhatsApp. Você manda o material da aula, recebe perguntas durante o dia, o sistema avalia e registra o que travou. Toda semana você vê sua evolução real.

Entra focado em inglês. Posicionamento de complemento — não compete com professor, trabalha com ele. Canal principal de aquisição é o próprio professor como parceiro.

Founder é usuário ativo do produto. Esse é o case e o conteúdo.

Meta de 1.800 pagantes em 12–18 meses para R$22.500 líquido/mês.
