## BASIC

### question
fórmula: pergunta curta em PT (até 10 palavras) pedindo o significado do termo em EN, terminando em "em português?".

nota: Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, sem deixar parte dele fora das aspas. A resposta esperada é em PT. Escolha um dos padrões demonstrados nos exemplos, nunca use "explicar" ou equivalente.

exemplos:
- O que significa "garden" em português?
- O que quer dizer "breakfast" em português?
- O que significa "friend" em português?

validação:
- A pergunta termina exatamente com "em português?".
- O termo em EN aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado.
- Se o termo admite mais de uma tradução comum em PT sem contexto que desambigue, todas as traduções válidas estão em answerKeys.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo em EN, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (quiet):
- The library was quiet all afternoon.

exemplo (borrow):
- Can I borrow your pen for a second?

exemplo (neighbor):
- Our neighbor waters the plants every morning.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: pergunta direta em EN A2-B1 (até 12 palavras), estrutura simples e mecânica, tipo pedido cru de significado, terminando em "in Portuguese?".

nota: Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, sem deixar parte dele fora das aspas. A resposta esperada é em PT. O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta.

exemplos:
- What does "never mind" mean in Portuguese?
- What's the meaning of "give up" in Portuguese?
- What does "get ready" mean in Portuguese?

validação:
- A pergunta termina exatamente com "in Portuguese?".
- O enunciado está todo em EN e o termo aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado.
- Se o termo admite mais de uma tradução comum em PT sem contexto que desambigue (ex: "get ready" pode ser "se preparar" ou "se arrumar"), todas as traduções válidas estão em answerKeys.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo em EN, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (crowded):
- The subway was crowded during rush hour.

exemplo (postpone):
- We had to postpone the trip until next week.

exemplo (give up):
- He refused to give up after the first setback.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN B1-B2 (até 15 palavras) sobre idiom, expressão idiomática ou colocação, formulada como alguém buscaria entender o sentido numa conversa real, terminando em "in Portuguese?".

nota: Neste formato answerKeys contém o significado em PT, não o termo em EN, e todos os itens da lista são traduções válidas aceitas na avaliação. Isso é específico do recall invertido. O termo em EN aparece entre aspas no enunciado, sempre por inteiro, incluindo verbo e artigos que fazem parte do termo, sem deixar parte dele fora das aspas. A resposta esperada é em PT. O contexto em volta situa o uso do termo, nunca revela o significado dele. O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta.

exemplos:
- Your manager says the team finally "hit the sweet spot". What does that mean in Portuguese?
- A colleague tells you she had to "bite the bullet" last week. What does that mean in Portuguese?
- Someone ends the meeting saying they'll "play it by ear". What does that mean in Portuguese?

validação:
- A pergunta termina exatamente com "in Portuguese?".
- O enunciado está todo em EN e o termo aparece entre aspas, por inteiro.
- O significado em PT não aparece em nenhum ponto do enunciado, nem parafraseado no contexto que antecede o termo.
- O contexto situa o uso, mas não permite deduzir o significado sem conhecer o termo.
- Termos idiomáticos costumam ter mais de uma tradução natural em PT, todas as variações válidas estão em answerKeys.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o termo, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. O feedback permanece inteiramente em EN, e o significado em PT que está em right_answer não entra nele. Este é o único formato sem correspondência de grafia entre right_answer e o texto do feedback. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (reluctant):
- He was reluctant to sign the new contract.

exemplo (turnover):
- The company's turnover doubled after the merger.

exemplo (bite the bullet):
- She finally bit the bullet and told him the truth.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.