# Fluizer - Technical Decisions

Registro de decisões técnicas que não são óbvias a partir do código ou do
Product-Rules, pra não se perder depois. Ordem cronológica, mais recente no
topo.

---

## Banner de revisão pendente (`/app`)

Data: 2026-09-17

Contexto: aviso fixo no chat de prática avisando o usuário que existem
perguntas elegíveis por revisão espaçada aguardando resposta, com botão que
inicia a sessão intensiva (ver Product-Rules Seção 8.3).

Decisões:

- **Banner fixo, sem opção de dispensar manualmente.** Não existe um "x" pra
  fechar o banner sem praticar. Ele só some quando a sessão intensiva começa.
- **Contagem calculada de forma síncrona no carregamento do server component**,
  junto do mesmo `Promise.all` que já busca as mensagens da página. Decisão
  deliberada de não introduzir um fetch client separado por ora, pra manter o
  carregamento da página em um único caminho. Revisar para async/streaming só
  se algum dado real de performance justificar depois, não antecipar.
- **Número exibido cru, sem truncamento tipo "9+".** O volume real do produto
  (pool de até 25 perguntas por atividade, revisão espaçada limitando
  concorrência) não passa de duas casas, então não há necessidade de lógica de
  abreviação.
- **Reaproveita `countSm2EligibleQuestions`** (`src/repo/questions.repo.ts`),
  a mesma função já usada no lembrete diário via WhatsApp
  (`daily-reminder-cron.service.ts`), sem somar perguntas com `status: "pending"`
  — essa contagem na prática nunca passa de 0 ou 1 por Activity e não faz parte
  da definição de "dívida de revisão" já documentada no produto.
