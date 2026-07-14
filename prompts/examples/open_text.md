## BASIC

### question
fórmula: pergunta em PT (até 15 palavras) sobre o texto do material, do tipo indicado na geração.

nota: O tipo da pergunta já vem definido, não escolha. Os exemplos abaixo estão rotulados por tipo, siga o que corresponde. A pergunta nasce do texto recebido e só pode ser respondida por quem leu esse texto, nunca por senso comum. Nunca referencie posição ou localização no texto. Nunca invente fato fora dele. Em compreensão, reformulação e inferência, a resposta é esperada em PT, com termos em EN quando naturais, e answerKeys guarda os pontos-âncora que uma boa resposta deve tocar, não a resposta literal. Em produção, a resposta é uma frase original do aluno em EN, e answerKeys guarda o termo alvo, não pontos-âncora.

exemplos:
- compreensão: O que o texto diz sobre o horário de trabalho dele?
- reformulação: Como você explicaria com suas palavras a rotina descrita?
- inferência: O que o texto deixa entender sobre como ele se sente?
- produção: Escreva uma frase em inglês usando "wake up early".

validação:
- A pergunta se apoia em conteúdo real do texto, sem inventar fato.
- A resposta não pode ser dada sem ter lido o texto.
- Não referencia posição no texto (primeiro parágrafo, linha X).
- A resposta esperada não aparece na própria pergunta. Quando um termo do texto é o ponto de discussão, ele pode aparecer, mas nunca a explicação ou o uso dele.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.

Em compreensão, reformulação e inferência:
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

Em produção, não existe resposta certa única. A resposta é correta quando usa o termo alvo no sentido certo, em frase gramaticalmente válida, independente de qualquer answerKey.
- right: confirmação do uso, em uma frase.
- wrong: o termo foi usado no sentido errado ou a frase não se sustenta. Mostre uma frase de uso correto.
- partial: o sentido está certo, mas a construção tem problema. Aponte o problema de forma direta.

nota: Resposta livre, então este formato não usa right_answer. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (compreensão):
- right: Ele trabalha das nove às seis, com uma pausa no meio.
- wrong: Ele trabalha das nove às seis, com uma pausa no meio.
- partial: Você citou o horário, faltou a pausa no meio.

exemplo (reformulação):
- right: A rotina começa cedo e termina só depois do jantar.
- wrong: A rotina começa cedo e termina só depois do jantar.
- partial: Certo no começo da rotina, faltou dizer quando ela termina.

exemplo (inferência):
- right: O texto deixa claro que ele está cansado da rotina.
- wrong: O texto indica cansaço, não entusiasmo, com a rotina.
- partial: Você captou o tom, faltou nomear o cansaço.

exemplo (produção com "wake up early"):
- right: O uso de "wake up early" está correto na sua frase.
- wrong: "Wake up early" descreve acordar cedo, como em "I wake up early to study".
- partial: O sentido está certo, faltou o verbo na frase.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.

## INTERMEDIATE

### question
fórmula: pergunta em EN A2-B1 (até 20 palavras) sobre o texto do material, do tipo indicado na geração.

nota: O tipo da pergunta já vem definido, não escolha. Os exemplos abaixo estão rotulados por tipo, siga o que corresponde. A pergunta nasce do texto recebido e só pode ser respondida por quem leu esse texto, nunca por senso comum. Nunca referencie posição ou localização no texto. Nunca invente fato fora dele. Em compreensão, reformulação e inferência, a resposta é esperada em EN, e answerKeys guarda os pontos-âncora que uma boa resposta deve tocar, não a resposta literal. Em produção, a resposta é uma frase original do aluno em EN, e answerKeys guarda o termo alvo, não pontos-âncora. O enunciado fica um passo abaixo do texto em foco, o esforço do aluno é entender o texto, não decodificar a pergunta.

exemplos:
- compreensão: What does the text say about her working hours?
- reformulação: How would you explain the main idea in your own words?
- inferência: What does the text suggest about how she feels?
- produção: Write a sentence using "sweet spot" about your own work.

validação:
- A pergunta se apoia em conteúdo real do texto, sem inventar fato.
- A resposta não pode ser dada sem ter lido o texto.
- Não referencia posição no texto (primeiro parágrafo, linha X).
- A resposta esperada não aparece na própria pergunta. Quando um termo do texto é o ponto de discussão, ele pode aparecer, mas nunca a explicação ou o uso dele.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.

Em compreensão, reformulação e inferência:
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

Em produção, não existe resposta certa única. A resposta é correta quando usa o termo alvo no sentido certo, em frase gramaticalmente válida, independente de qualquer answerKey.
- right: confirmação do uso, em uma frase.
- wrong: o termo foi usado no sentido errado ou a frase não se sustenta. Mostre uma frase de uso correto.
- partial: o sentido está certo, mas a construção tem problema. Aponte o problema de forma direta.

nota: Resposta livre, então este formato não usa right_answer. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase em EN, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (compreensão):
- right: She works from nine to six, with a break in between.
- wrong: She works from nine to six, with a break in between.
- partial: You got the hours, but missed the break.

exemplo (reformulação):
- right: The routine starts early and ends after dinner.
- wrong: The routine starts early and ends after dinner.
- partial: Right about the early start, missing when it ends.

exemplo (inferência):
- right: The text shows she's tired of the routine.
- wrong: The text points to tiredness, not excitement.
- partial: You caught the tone, but didn't name the tiredness.

exemplo (produção com "sweet spot"):
- right: Your sentence uses "sweet spot" correctly.
- wrong: "Sweet spot" means the ideal balance, as in "that's the sweet spot for my team".
- partial: The meaning is right, the sentence needs a verb.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.

## ADVANCED

### question
fórmula: pergunta em EN B1-B2 (até 25 palavras) sobre o texto do material, do tipo indicado na geração.

nota: O tipo da pergunta já vem definido, não escolha. Os exemplos abaixo estão rotulados por tipo, siga o que corresponde. A pergunta nasce do texto recebido e só pode ser respondida por quem leu esse texto, nunca por senso comum. Nunca referencie posição ou localização no texto. Nunca invente fato fora dele. Em compreensão, reformulação e inferência, a resposta é esperada em EN, e answerKeys guarda os pontos-âncora que uma boa resposta deve tocar, não a resposta literal. Em produção, a resposta é uma frase original do aluno em EN, e answerKeys guarda o termo alvo, não pontos-âncora. O enunciado fica um passo abaixo do texto em foco, o esforço do aluno é entender o texto, não decodificar a pergunta.

exemplos:
- compreensão: What does the text say about the trade-off she had to accept?
- reformulação: How would you rephrase the author's main argument in your own words?
- inferência: What can you infer about the outcome, even though the text never states it?
- produção: Write a sentence using "bite the bullet" about a decision you've faced.

validação:
- A pergunta se apoia em conteúdo real do texto, sem inventar fato.
- A resposta não pode ser dada sem ter lido o texto.
- Não referencia posição no texto (primeiro parágrafo, linha X).
- A resposta esperada não aparece na própria pergunta, nem parafraseada. Quando um termo do texto é o ponto de discussão, ele pode aparecer, mas nunca a explicação ou o uso dele.
- A pergunta é única, sem duas perguntas na mesma frase.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: neste formato o corpo do feedback varia por status, diferente dos formatos de termo isolado.

Em compreensão, reformulação e inferência:
- right: confirmação enxuta da resposta correta, em uma frase.
- wrong: a resposta correta, dita de forma direta, sem repetir a pergunta.
- partial: o que faltou na resposta do usuário, apontado de forma direta.

Em produção, não existe resposta certa única. A resposta é correta quando usa o termo alvo no sentido certo, em frase gramaticalmente válida, independente de qualquer answerKey.
- right: confirmação do uso, em uma frase.
- wrong: o termo foi usado no sentido errado ou a frase não se sustenta. Mostre uma frase de uso correto.
- partial: o sentido está certo, mas a construção tem problema. Aponte o problema de forma direta.

nota: Resposta livre, então este formato não usa right_answer. Em partial, apontar a lacuna é a função do feedback e não conta como meta-comentário. Uma frase em EN, sem repetir a pergunta, sem explicação didática. A abertura de resultado é resolvida fora deste prompt.

exemplo (compreensão):
- right: She gave up speed to protect the quality of the work.
- wrong: She traded speed for quality, and accepted the slower pace.
- partial: You caught the trade-off, missing what she gave up.

exemplo (reformulação):
- right: The author argues that habit outlasts motivation.
- wrong: The author's argument is that habit outlasts motivation.
- partial: Right about habit, missing the contrast with motivation.

exemplo (inferência):
- right: The outcome is implied to be a quiet failure.
- wrong: The text implies the outcome was a quiet failure.
- partial: Close, but the text points to failure, not doubt.

exemplo (produção com "bite the bullet"):
- right: Your sentence uses "bite the bullet" correctly.
- wrong: "Bite the bullet" means facing something unpleasant, as in "I had to bite the bullet and tell him".
- partial: The meaning is right, the tense doesn't hold up.

validação:
- O feedback entrega a resposta ou aponta a lacuna, nunca explica o raciocínio por trás dela.
- Não pode ser reescrito como "isso acontece porque..." ou "a ideia é que...".
- Se qualquer critério falhar, regenere o feedback com a correção.