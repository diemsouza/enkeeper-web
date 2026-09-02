## BASIC

### question
fórmula: pergunta em PT, citando o termo em EN entre aspas, pedindo o significado em PT. Curta (até 10 palavras), terminando em "em português?".

nota: Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, sem deixar parte dele fora das aspas. A resposta esperada é em PT. Escolha um dos padrões demonstrados nos exemplos, nunca use "explicar" ou equivalente. Se o complemento capturado disser a mesma coisa que meaning, ele não é termHint, é uma tradução alternativa: termHint fica vazio e o complemento entra como item adicional em answerKeys.

exemplo (garden):
- O que significa "garden" em português?

exemplo (breakfast):
- O que quer dizer "breakfast" em português?

exemplo (friend):
- O que significa "friend" em português?

validação:
- A pergunta termina exatamente com "em português?".
- O termo em EN aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado.
- Se o termo admite mais de uma tradução comum em PT sem contexto que desambigue, todas as traduções válidas estão em answerKeys.
- Se termHint seria sinônimo ou reformulação de meaning, termHint fica vazio e esse conteúdo é adicionado a answerKeys em vez de descartado.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo em EN, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto (ex: "It's early to decide about marriage." em vez de "It's early."). Se o termo já for longo (idiom, expressão maior), não force expansão, mantém o tamanho natural. Em ambos os casos, nunca negar, inverter ou contradizer o sentido do termo.

exemplo (quiet):
- The library was quiet all afternoon.

exemplo (borrow):
- Can I borrow your pen for a second?

exemplo (neighbor):
- Our neighbor waters the plants every morning.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica. Sentido do termo nunca negado ou invertido.
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: pergunta em EN, citando o termo em EN entre aspas, pedindo o significado em PT. Direta (até 10 palavras), estrutura simples e mecânica, tipo pedido cru de significado, terminando em "in Portuguese?".

nota: Banda de nível A2-B1. Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, sem deixar parte dele fora das aspas. A resposta esperada é em PT. O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta. Se o complemento capturado disser a mesma coisa que meaning, ele não é termHint, é uma tradução alternativa: termHint fica vazio e o complemento entra como item adicional em answerKeys.

exemplo (never mind):
- What does "never mind" mean in Portuguese?

exemplo (give up):
- What's the meaning of "give up" in Portuguese?

exemplo (get ready):
- What does "get ready" mean in Portuguese?

validação:
- A pergunta termina exatamente com "in Portuguese?".
- A pergunta tem até 10 palavras.
- O enunciado está todo em EN e o termo aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado.
- Se o termo admite mais de uma tradução comum em PT sem contexto que desambigue (ex: "get ready" pode ser "se preparar" ou "se arrumar"), todas as traduções válidas estão em answerKeys.
- Se termHint seria sinônimo ou reformulação de meaning, termHint fica vazio e esse conteúdo é adicionado a answerKeys em vez de descartado.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo em EN, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto (ex: "It's early to decide about marriage." em vez de "It's early."). Se o termo já for longo (idiom, expressão maior), não force expansão, mantém o tamanho natural. Em ambos os casos, nunca negar, inverter ou contradizer o sentido do termo. Se o complemento capturado disser a mesma coisa que meaning, ele não é termHint, é uma tradução alternativa: termHint fica vazio e o complemento entra como item adicional em answerKeys.

exemplo (crowded):
- The subway was crowded during rush hour.

exemplo (postpone):
- We had to postpone the trip until next week.

exemplo (give up):
- He refused to give up after the first setback.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica. Sentido do termo nunca negado ou invertido.
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN, citando o termo ou idiom em EN entre aspas, pedindo o significado em PT. Direta (até 10 palavras), terminando em "in Portuguese?".

nota: Banda de nível B1-B2. Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, incluindo verbo e artigos que fazem parte do termo, sem deixar parte dele fora das aspas. A resposta esperada é em PT. Termos idiomáticos costumam ter mais de uma tradução natural em PT, todas as variações válidas estão em answerKeys.

exemplo (hit the sweet spot):
- What does "hit the sweet spot" mean in Portuguese?

exemplo (bite the bullet):
- What's the meaning of "bite the bullet" in Portuguese?

exemplo (play it by ear):
- What does "play it by ear" mean in Portuguese?

validação:
- A pergunta termina exatamente com "in Portuguese?".
- A pergunta tem até 10 palavras.
- O enunciado está todo em EN e o termo aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado.
- Termos idiomáticos costumam ter mais de uma tradução natural em PT, todas as variações válidas estão em answerKeys.
- Se termHint seria sinônimo ou reformulação de meaning, termHint fica vazio e esse conteúdo é adicionado a answerKeys em vez de descartado.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto (ex: "It's early to decide about marriage." em vez de "It's early."). Se o termo já for longo (idiom, expressão maior), não force expansão, mantém o tamanho natural. Em ambos os casos, nunca negar, inverter ou contradizer o sentido do termo.

exemplo (reluctant):
- He was reluctant to sign the new contract.

exemplo (turnover):
- The company's turnover doubled after the merger.

exemplo (bite the bullet):
- She finally bit the bullet and told him the truth.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica. Sentido do termo nunca negado ou invertido.
- Se qualquer critério falhar, gere outro feedback com a correção.