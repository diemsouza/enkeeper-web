## BASIC

### question
fórmula: pergunta em PT (até 15 palavras), extraída do exercício do material e reescrita no padrão direto, com resposta objetiva esperada em PT.

nota: A pergunta vem de um exercício real do material, nunca de um assunto inventado fora dele. Reescreva no padrão direto quando o enunciado original for truncado, numerado ou dependente de instrução de bloco ("responda as questões abaixo", "item 3"). A primeira chave de answerKeys é a resposta modelo, as demais são formulações aceitas da mesma resposta. Termos em EN aparecem na resposta quando forem naturais.

exemplos:
- Qual é o plural de "child" em inglês?
- Quando se usa "much" em vez de "many"?
- O que muda no verbo com he, she e it?

validação:
- A pergunta corresponde a um exercício real do material, sem inventar conteúdo.
- A pergunta se sustenta sozinha, sem depender de numeração ou de outro item do material.
- A resposta esperada não aparece na própria pergunta.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

nota: Resposta livre, sem termo isolado, então este formato não usa right_answer, a resposta correta vive no corpo do feedback. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (plural irregular):
- right: O plural é "children", irregular.
- wrong: O plural de "child" é "children", forma irregular.
- partial: Certo que é irregular, faltou a forma "children".

exemplo (much vs many):
- right: "Much" vai com incontáveis, "many" com contáveis.
- wrong: "Much" acompanha incontáveis, "many" acompanha contáveis.
- partial: Você acertou "much", faltou dizer que "many" é contável.

exemplo (terceira pessoa do singular):
- right: Ganha "s" no final na terceira pessoa.
- wrong: O verbo ganha "s" no final com he, she e it.
- partial: Faltou dizer que isso vale só na terceira pessoa.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.

## INTERMEDIATE

### question
fórmula: pergunta em EN A2-B1 (até 18 palavras), extraída do exercício do material e reescrita no padrão direto, com resposta objetiva esperada em EN.

nota: A pergunta vem de um exercício real do material, nunca de um assunto inventado fora dele. Reescreva no padrão direto quando o enunciado original for truncado, numerado ou dependente de instrução de bloco ("answer the questions below", "item 3"). A primeira chave de answerKeys é a resposta modelo, as demais são formulações aceitas da mesma resposta. O enunciado fica um passo abaixo do conteúdo em foco, o esforço do aluno é o exercício, não decodificar a pergunta.

exemplos:
- When do you use the present perfect instead of the simple past?
- What's the difference between "used to" and "would" for past habits?
- Why does this sentence need "have been" and not "am"?

validação:
- A pergunta corresponde a um exercício real do material, sem inventar conteúdo.
- A pergunta se sustenta sozinha, sem depender de numeração ou de outro item do material.
- A resposta esperada não aparece na própria pergunta.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

nota: Resposta livre, sem termo isolado, então este formato não usa right_answer, a resposta correta vive no corpo do feedback. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase em EN, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (present perfect vs simple past):
- right: Present perfect connects the past to now, with no finished time.
- wrong: Present perfect links the past to now, when the time is not finished.
- partial: Right about the past link, missing the unfinished time.

exemplo (used to vs would):
- right: "Used to" works for states, "would" only for repeated actions.
- wrong: "Used to" covers past states, "would" only repeated past actions.
- partial: You got "used to", but not the limit on "would".

exemplo (have been vs am):
- right: The action started in the past and still continues.
- wrong: It needs "have been" because the action is still going on.
- partial: Close, but the point is that it still continues now.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN B1-B2 (até 21 palavras), extraída do exercício do material e reescrita no padrão direto, com resposta objetiva esperada em EN.

nota: A pergunta vem de um exercício real do material, nunca de um assunto inventado fora dele. Reescreva no padrão direto quando o enunciado original for truncado, numerado ou dependente de instrução de bloco ("answer the questions below", "item 3"). A primeira chave de answerKeys é a resposta modelo, as demais são formulações aceitas da mesma resposta. O enunciado fica um passo abaixo do conteúdo em foco, o esforço do aluno é o exercício, não decodificar a pergunta.

exemplos:
- Why does the third conditional change the meaning of this sentence entirely?
- What effect does the passive voice have on who takes responsibility here?
- How would the meaning shift if you replaced "must have" with "might have"?

validação:
- A pergunta corresponde a um exercício real do material, sem inventar conteúdo.
- A pergunta se sustenta sozinha, sem depender de numeração ou de outro item do material.
- A resposta esperada não aparece na própria pergunta, nem parafraseada.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

nota: Resposta livre, sem termo isolado, então este formato não usa right_answer, a resposta correta vive no corpo do feedback. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase em EN, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (third conditional):
- right: It describes something that never happened, so the result is hypothetical.
- wrong: The third conditional describes an unreal past, making the result hypothetical.
- partial: Right that it is unreal, missing that the result is hypothetical.

exemplo (passive voice):
- right: The passive removes the agent, so no one is held responsible.
- wrong: The passive hides the agent, so responsibility disappears from the sentence.
- partial: You caught the passive, missing that it hides the agent.

exemplo (must have vs might have):
- right: "Must have" means near certainty, "might have" only a possibility.
- wrong: "Must have" is near certainty, "might have" is only possible.
- partial: Close, but the gap is certainty versus possibility.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.