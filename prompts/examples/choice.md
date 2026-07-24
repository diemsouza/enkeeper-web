## BASIC

### question
fórmula: pergunta curta em PT (até 10 palavras), direta e mecânica, pedindo o item certo em EN. O item pode ser palavra solta, expressão ou frase curta.

nota: A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra na lista de opções. Os demais termos de answerKeys são variações aceitas do mesmo significado e nunca podem virar distratores, porque também estariam corretos. As opções vão em questionOptions e não aparecem no enunciado. Use exatamente 4 opções, 1 correta e 3 distratores. Cada opção é um termo distinto, nunca o mesmo termo em variações diferentes. As opções são do mesmo tipo e de comprimento comparável entre si, para que a correta não se destaque pela forma. Quando o termo ou significado estiver citado no enunciado ele deve vir sempre entre aspas.

exemplos:
- Qual palavra significa "jardim" em inglês?
- Como se diz "bom dia, pessoal" em inglês?
- Qual frase usaria pra se despedir no fim do dia?

validação:
- Nenhuma opção, correta ou distrator, aparece escrita no enunciado.
- A opção correta é o primeiro termo de answerKeys.
- Nenhum distrator é outro termo de answerKeys nem equivalente semântico do termo correto.
- As opções são termos distintos entre si, sem repetir a mesma palavra ou expressão em variações.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional.

nota: Grafia do termo idêntica à de right_answer. Vale mesmo quando a pergunta pede a opção errada ou identifica exceção. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, por letra ou por texto. Choice é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (early):
- We arrived early today.

exemplo (kitchen):
- The kitchen smells like fresh bread.

exemplo (friendly):
- Our new neighbor is very friendly.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: pergunta em EN A2-B1 (até 12 palavras) sobre expressão, phrasal verb, frase feita ou colocação. Escolha uma das três formas: pedir o item certo, identificar o que não cabe, ou escolher o que serve num contexto descrito.

nota: A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra na lista de opções. Os demais termos de answerKeys são variações aceitas do mesmo significado e nunca podem virar distratores, porque também estariam corretos. As opções vão em questionOptions e não aparecem no enunciado. Use exatamente 4 opções, 1 correta e 3 distratores. Cada opção é um termo distinto, nunca o mesmo termo em variações diferentes. As opções são do mesmo tipo e de comprimento comparável entre si, para que a correta não se destaque pela forma. O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta. Se não couber nessa banda sem perder naturalidade, use o nível mínimo necessário. Quando o termo ou significado estiver citado no enunciado ele deve vir sempre entre aspas.

exemplos:
- Which expression means "deixa pra lá"?
- Which of these options does NOT mean "desistir"?
- You want to apologize very formally. Which sentence would you use?

validação:
- Nenhuma opção, correta ou distrator, aparece escrita no enunciado.
- A opção correta é o primeiro termo de answerKeys.
- Nenhum distrator é outro termo de answerKeys nem equivalente semântico do termo correto.
- Os distratores são plausíveis no mesmo campo semântico. Teste cada um como se fosse a resposta escolhida: se também responder ao enunciado, descarte e gere outro.
- As opções são termos distintos entre si, sem repetir a mesma palavra ou expressão em variações.
- Em perguntas de "qual NÃO significa", a resposta certa não pode ser identificável só por eliminação lógica, sem saber o significado em inglês.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional.

nota: Grafia do termo idêntica à de right_answer. Vale mesmo quando a pergunta pede a opção errada ou identifica exceção. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, por letra ou por texto. Choice é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (nervous):
- She looked nervous before the interview.

exemplo (deadline):
- We need to meet the deadline.

exemplo (catch up):
- Let's catch up over coffee soon.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN B1-B2 (até 15 palavras) sobre idiom, expressão idiomática ou colocação, sempre nascendo de uma situação ou nuance descrita antes de pedir a opção, nunca um pedido cru.

nota: A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra na lista de opções. Os demais termos de answerKeys são variações aceitas do mesmo significado e nunca podem virar distratores, porque também estariam corretos. As opções vão em questionOptions e não aparecem no enunciado. Use exatamente 4 opções, 1 correta e 3 distratores. Cada opção é um termo distinto, nunca o mesmo termo em variações diferentes. As opções são do mesmo tipo e de comprimento comparável entre si, para que a correta não se destaque pela forma. O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a situação. Se não couber nessa banda sem perder naturalidade, use o nível mínimo necessário. Quando o termo ou significado estiver citado no enunciado ele deve vir sempre entre aspas.

exemplos:
- Your team can't decide between moving fast and getting it perfect. Which expression names that balance?
- A friend invites you somewhere you'd rather skip. Which sentence declines without sounding rude?
- You're stuck doing something unpleasant but unavoidable. Which idiom fits best here?

validação:
- Nenhuma opção, correta ou distrator, aparece escrita no enunciado.
- A opção correta é o primeiro termo de answerKeys.
- Nenhum distrator é outro termo de answerKeys nem equivalente semântico do termo correto.
- A situação aponta para o conceito certo, mas não é específica a ponto de eliminar os distratores por lógica de mundo sem saber a expressão em inglês.
- Os distratores são plausíveis no mesmo campo semântico. Teste cada um como se fosse a resposta escolhida: se também resolver a situação descrita, descarte e gere outro.
- As opções são termos distintos entre si, sem repetir a mesma palavra ou expressão em variações.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional.

nota: Grafia do termo idêntica à de right_answer. Vale mesmo quando a pergunta pede a opção errada ou identifica exceção. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, por letra ou por texto. Choice é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt.

exemplo (persistent):
- He remained persistent despite the setbacks.

exemplo (workload):
- Her workload doubled this quarter.

exemplo (bite the bullet):
- We had to bite the bullet and sign.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.