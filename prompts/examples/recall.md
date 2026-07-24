## BASIC

### question
fórmula: pergunta curta em PT (até 10 palavras), pedindo o termo em EN a partir do significado, terminando em "em inglês?".

nota: A resposta é sempre o primeiro termo de answerKeys, os demais são variações aceitas na avaliação e não influenciam a pergunta. O significado usado no enunciado é a tradução literal desse primeiro termo. Escolha um dos padrões demonstrados nos exemplos, mantendo a intenção de pedir o termo. Se o significado admitir mais de um termo possível em EN, acrescente detalhe de contexto ou uso até sobrar só um. Se o termo em EN admitir mais de uma tradução comum em PT, use apenas uma no enunciado, nunca liste duas ou mais unidas por "ou". Quando o significado no conteúdo vier acompanhado de um complemento curto que já resolve essa ambiguidade, independente de como esse complemento estiver marcado no texto recebido, parênteses, colchetes, hífen ou qualquer outra forma, use exatamente esse complemento em vez de criar contexto do zero, sempre normalizado em parênteses logo depois do significado entre aspas, antes de "em inglês?".

exemplos:
- Como se diz "jardim" em inglês?
- Qual é a palavra para "café da manhã" em inglês?
- Como falar "amigo" em inglês?

exemplos que evitam ambiguidade:
- Como se diz "caixa" (onde você paga na loja) em inglês?

validação:
- A pergunta termina exatamente com "em inglês?".
- O significado citado é a tradução literal do primeiro termo de answerKeys.
- O significado citado é uma única tradução, nunca duas ou mais unidas por "ou".
- O termo em EN não aparece em nenhum ponto do enunciado.
- O enunciado aponta para um único termo possível.
- Se o conteúdo trouxer complemento de desambiguação junto do significado, ele aparece na pergunta em parênteses, logo após o significado entre aspas, preservado exatamente como veio e normalizado em parênteses independente da marcação original.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. Grafia idêntica à de right_answer. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se a pergunta trouxer um complemento entre parênteses junto do significado em PT, esse complemento define o sentido correto a validar na resposta do usuário e a usar na frase de uso do feedback. Uma resposta que seria válida pra outro sentido do mesmo significado, mas não bate com o sentido indicado pelo complemento, é wrong.

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
fórmula: pergunta direta em EN A2-B1 (até 12 palavras), estrutura simples e mecânica, tipo pedido cru de tradução, pedindo o termo em EN a partir do significado em PT entre aspas, terminando em "in English?".

nota: A resposta é sempre o primeiro termo de answerKeys, os demais são variações aceitas na avaliação e não influenciam a pergunta. O significado entre aspas é a tradução literal desse primeiro termo. Se o significado admitir mais de um termo possível em EN, acrescente detalhe de contexto ou uso até sobrar só um. Se o termo em EN admitir mais de uma tradução comum em PT, use apenas uma entre aspas, nunca liste duas ou mais unidas por "or". O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta. Quando o significado no conteúdo vier acompanhado de um complemento curto que já resolve essa ambiguidade, independente de como esse complemento estiver marcado no texto recebido, parênteses, colchetes, hífen ou qualquer outra forma, use exatamente esse complemento em vez de criar contexto do zero, sempre normalizado em parênteses logo depois do significado entre aspas. O complemento permanece em PT mesmo com o resto do enunciado em EN, ele descreve o significado, não se traduz.

exemplos:
- How do you say "deixa pra lá" in English?
- What's the phrasal verb for "desistir" in English?
- How would you say "estou exausto" in English?

exemplos que evitam ambiguidade:
- How do you say "caixa" (onde você paga na loja) in English?

validação:
- A pergunta termina exatamente com "in English?".
- O enunciado está todo em EN, com o significado em PT entre aspas.
- O significado entre aspas é a tradução literal do primeiro termo de answerKeys.
- O significado entre aspas é uma única tradução, nunca duas ou mais unidas por "or".
- O termo em EN não aparece em nenhum ponto do enunciado.
- O enunciado aponta para um único termo possível.
- Se o conteúdo trouxer complemento de desambiguação junto do significado, ele aparece na pergunta em parênteses, logo após o significado entre aspas, em PT, preservado exatamente como veio e normalizado em parênteses independente da marcação original.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. Grafia idêntica à de right_answer. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se a pergunta trouxer um complemento entre parênteses junto do significado em PT, esse complemento define o sentido correto a validar na resposta do usuário e a usar na frase de uso do feedback. Uma resposta que seria válida pra outro sentido do mesmo significado, mas não bate com o sentido indicado pelo complemento, é wrong.

exemplo (nervous):
- She got nervous right before the presentation.

exemplo (workload):
- His workload increased a lot this month.

exemplo (give up):
- He refused to give up on the project.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN B1-B2 (até 15 palavras), formulada como alguém buscaria a palavra certa numa conversa real, pedindo o termo em EN a partir do significado em PT entre aspas.

nota: A resposta é sempre o primeiro termo de answerKeys, os demais são variações aceitas na avaliação e não influenciam a pergunta. O significado entre aspas é a tradução literal desse primeiro termo. A pergunta pede a forma de dizer aquilo em inglês, nunca um substituto ou sinônimo da expressão. "In English" entra na posição natural da frase, não precisa fechar o enunciado, mas a pergunta sempre termina em interrogação. Se o significado admitir mais de um termo possível em EN, acrescente detalhe de contexto ou uso até sobrar só um. Se o termo em EN admitir mais de uma tradução comum em PT, use apenas uma entre aspas, nunca liste duas ou mais unidas por "or". O enunciado fica um passo abaixo do termo em foco, o esforço do aluno é o termo, não decodificar a pergunta. Quando o significado no conteúdo vier acompanhado de um complemento curto que já resolve essa ambiguidade, independente de como esse complemento estiver marcado no texto recebido, parênteses, colchetes, hífen ou qualquer outra forma, use exatamente esse complemento em vez de criar contexto do zero, sempre normalizado em parênteses logo depois do significado entre aspas. O complemento permanece em PT mesmo com o resto do enunciado em EN, ele descreve o significado, não se traduz.

exemplos:
- How would you say "deixa pra lá" in English when you're brushing something off casually?
- What's the natural way to say "desistir" in English after trying hard and failing?
- If you wanted to say "estou exausto" in English after a long day, what would you use?

exemplos que evitam ambiguidade:
- How would you say "caixa" (onde você paga na loja) in English if a customer asked where to go?

validação:
- O enunciado está todo em EN, com o significado em PT entre aspas, e termina em interrogação.
- O significado entre aspas é a tradução literal do primeiro termo de answerKeys.
- O significado entre aspas é uma única tradução, nunca duas ou mais unidas por "or".
- A pergunta pede a tradução do significado, não um substituto ou sinônimo dele.
- O termo em EN não aparece em nenhum ponto do enunciado.
- O enunciado aponta para um único termo possível.
- Se o conteúdo trouxer complemento de desambiguação junto do significado, ele aparece na pergunta em parênteses, logo após o significado entre aspas, em PT, preservado exatamente como veio e normalizado em parênteses independente da marcação original.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys, empregado no sentido que a pergunta pediu.

nota: A frase nunca nega, inverte ou contradiz o sentido do termo. Grafia idêntica à de right_answer. Sem explicação, sem tradução, sem exemplo adicional. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se a pergunta trouxer um complemento entre parênteses junto do significado em PT, esse complemento define o sentido correto a validar na resposta do usuário e a usar na frase de uso do feedback. Uma resposta que seria válida pra outro sentido do mesmo significado, mas não bate com o sentido indicado pelo complemento, é wrong.

exemplo (reluctant):
- He was reluctant to accept the new terms.

exemplo (turnover):
- The company's turnover doubled after the merger.

exemplo (bite the bullet):
- She decided to bite the bullet and change careers.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se qualquer critério falhar, gere outro feedback com a correção.