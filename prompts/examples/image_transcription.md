## BASIC

### question
fórmula: encontre o núcleo visual do item, decida imageable e imageableReason, escreva answerKeys, a pergunta guia em PT (até 10 palavras) e, por último, questionImageDescription em inglês.

nota: Banda de nível A1-A2. O item costuma vir como palavra, combinação ou frase curta com sujeito e verbo. O alvo da imagem é o núcleo visual do item: a menor parte dele que uma cena mostra, mantendo o sentido do item ("I am tired" vira "tired"; "she's sharing a post" vira "sharing a post"; "an elephant" vira "elephant"; "quiet morning" fica inteiro). answerKeys começa pelo núcleo, seguido dos equivalentes que nomeiam o mesmo elemento da cena (quiet morning, calm morning, peaceful morning), todos em inglês; term continua sendo o item original. O núcleo não precisa ser a imagem inteira, basta ser o elemento central de uma cena com pessoas, objetos, cenário ou ação, sem diálogo. Teste de imageable: olhando a cena com a pergunta guia, a pessoa responde o núcleo ou um equivalente de answerKeys, e não um termo de sentido diferente? A pergunta guia já diz para onde olhar e os equivalentes já aceitam as variações próximas, então ter mais de uma forma de dizer a mesma coisa não reprova: só reprova quando a cena leva a um sentido diferente. Costumam servir objeto, lugar, pessoa, animal, comida, sentimento e estado visíveis, característica (adjetivo), momento do dia ou clima, preposição de lugar e ação em andamento. Costumam não servir negação, passado, futuro, preposição de tempo, expressão idiomática, conector, palavra abstrata sem cena típica, e termo que exija representar violência, sexo ou drogas. Se o item não tem núcleo que passe no teste, imageable é false, question é "", answerKeys mantém o item e questionImageDescription é null. A pergunta só aponta para onde olhar: nunca traz o núcleo, sua tradução, uma frase em português para traduzir, nem o verbo ou o tempo verbal que a resposta deve usar. Sujeito neutro ("a pessoa", "essas pessoas"), nunca gênero ("o homem", "a mulher"). No básico, a resposta pode ser só a palavra ou expressão, então a pergunta não pede frase. A instrução de responder em inglês é aplicada fora deste prompt, antes da pergunta: a pergunta não repete "em inglês". questionImageDescription é usada direto como prompt de geração da imagem: cena simples em inglês, 1 ou 2 frases, um sujeito principal, uma ação, poucos elementos, fundo limpo, com o núcleo em destaque e enquadramento (close-up, medium shot). Nada na cena pode levar a um termo de sentido diferente. Nenhum texto, letra, placa, legenda, tela com escrita ou número na cena. A cena é cotidiana e neutra, porque o gerador de imagem recusa cenas sensíveis: sem medo, grito, dor, ferimento, doença ou choro; sem corpo à mostra, cama, banho ou roupa íntima; sem criança ou bebê; sem bebida alcoólica, cigarro ou arma; sem multidão em pânico. Quando o núcleo toca um desses temas, mostre o contexto de forma neutra (horror movie vira pessoas num cinema escuro com pipoca e expressões tensas); se não houver cena neutra que leve ao núcleo, imageable é false. Estilo fotográfico é aplicado fora deste prompt.

exemplo (quiet morning):
- imageable: true. imageableReason: Núcleo "quiet morning"; a cena calma ao amanhecer leva a quiet, calm ou peaceful morning.
- answerKeys: quiet morning, calm morning, peaceful morning
- question: Como está essa manhã?
- questionImageDescription: A person sitting alone by a window at sunrise holding a mug of coffee, empty street outside, soft light, medium shot.

exemplo (happy):
- imageable: true. imageableReason: Núcleo "happy"; um rosto sorrindo leva ao sentimento.
- answerKeys: happy, glad, cheerful
- question: Como essa pessoa está se sentindo?
- questionImageDescription: Close-up of a person laughing with a wide smile, eyes bright, outdoors in a sunny park.

exemplo (I am tired):
- imageable: true. imageableReason: Núcleo "tired"; uma pessoa bocejando no sofá mostra o estado.
- answerKeys: tired, sleepy, exhausted
- question: Como essa pessoa parece estar?
- questionImageDescription: A person yawning with heavy eyes, slumped on a living room sofa in the evening, medium shot.

exemplo (doesn't like coffee):
- imageable: false. imageableReason: O sentido está na negação, que nenhuma cena mostra sem texto.
- answerKeys: doesn't like coffee
- question: ""
- questionImageDescription: null

validação:
- answerKeys começa pelo núcleo visual do item, só em inglês, seguido de equivalentes que nomeiam o mesmo elemento.
- imageable segue o teste com a pergunta guia e os equivalentes. Com false, question é "" e questionImageDescription é null.
- imageableReason preenchido em true e em false, em PT, citando o núcleo.
- Com imageable true, a pergunta está em PT, tem até 10 palavras, sujeito neutro, não traz o núcleo, a tradução, frase para traduzir, nem o verbo ou tempo da resposta.
- questionImageDescription em inglês, só a cena, um sujeito principal, uma ação, poucos elementos, fundo limpo, sem texto ou número, com o núcleo em destaque.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase em EN que descreve a cena da imagem usando o termo de right_answer.

nota: Grafia do termo idêntica à de right_answer. Em right, é a frase do usuário corrigida, mantendo o que ele trouxe de certo; se ele respondeu só a palavra, uma frase curta com ela descrevendo a cena. Em wrong ou partial, frase modelo com o primeiro item de answerKeys. No básico, frase curta, presente, vocabulário elementar. Correção de outros erros e elogio a extras vão em feedback_note, nunca no feedback_text.

exemplo (quiet morning):
- It's a quiet morning by the window.

exemplo (happy):
- The person looks really happy.

exemplo (tired):
- The person is tired after a long day.

validação:
- Uma única frase em EN com o termo, descrevendo a cena.
- Não define nem explica o termo.
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: encontre o núcleo visual do item, decida imageable e imageableReason, escreva answerKeys, a pergunta guia em EN (até 10 palavras) e, por último, questionImageDescription em inglês.

nota: Banda de nível A2-B1. O item costuma vir como combinação, expressão ou frase curta com sujeito e verbo. O alvo da imagem é o núcleo visual do item: a menor parte dele que uma cena mostra, mantendo o sentido do item ("she's sharing a post" vira "sharing a post"; "I'm running late" vira "running late"; "a crowded bus" vira "crowded bus"). answerKeys começa pelo núcleo, seguido dos equivalentes que nomeiam o mesmo elemento da cena, todos em inglês; term continua sendo o item original. O núcleo não precisa ser a imagem inteira, basta ser o elemento central de uma cena com pessoas, objetos, cenário ou ação, sem diálogo. Teste de imageable: olhando a cena com a pergunta guia, a pessoa responde o núcleo ou um equivalente de answerKeys, e não um termo de sentido diferente? A pergunta guia já diz para onde olhar e os equivalentes já aceitam as variações próximas, então ter mais de uma forma de dizer a mesma coisa não reprova: só reprova quando a cena leva a um sentido diferente. Costumam servir objeto, lugar, pessoa, sentimento e estado visíveis, característica, momento do dia ou clima, preposição de lugar, ação em andamento e phrasal verb de ação física com sentido literal (pick up, take off). Costumam não servir negação, passado, futuro, preposição de tempo, expressão idiomática, phrasal verb de sentido figurado, conector, palavra abstrata sem cena típica, e termo que exija representar violência, sexo ou drogas. Se o item não tem núcleo que passe no teste, imageable é false, question é "", answerKeys mantém o item e questionImageDescription é null. A pergunta só aponta para onde olhar: nunca traz o núcleo, um sinônimo direto dele, nem o verbo ou o tempo verbal que a resposta deve usar. A instrução de responder em frase completa é aplicada fora deste prompt, antes da pergunta: a pergunta não pede frase completa. Sujeito neutro ("the person", "these people"), nunca gênero. questionImageDescription é usada direto como prompt de geração da imagem: cena simples em inglês, 1 ou 2 frases, um sujeito principal, uma ação, poucos elementos, fundo limpo, com o núcleo em destaque e enquadramento (close-up, medium shot). Nada na cena pode levar a um termo de sentido diferente. Nenhum texto, letra, placa, legenda, tela com escrita ou número na cena. A cena é cotidiana e neutra, porque o gerador de imagem recusa cenas sensíveis: sem medo, grito, dor, ferimento, doença ou choro; sem corpo à mostra, cama, banho ou roupa íntima; sem criança ou bebê; sem bebida alcoólica, cigarro ou arma; sem multidão em pânico. Quando o núcleo toca um desses temas, mostre o contexto de forma neutra (horror movie vira pessoas num cinema escuro com pipoca e expressões tensas); se não houver cena neutra que leve ao núcleo, imageable é false. Estilo fotográfico é aplicado fora deste prompt.

exemplo (she's sharing a post):
- imageable: true. imageableReason: Núcleo "sharing a post"; a pessoa publicando no celular mostra a ação.
- answerKeys: sharing a post, posting, posting on social media
- question: What is the person doing on the phone?
- questionImageDescription: A person sitting on a park bench smiling at a phone screen, thumb tapping to publish a photo, medium shot, plain background.

exemplo (quiet morning):
- imageable: true. imageableReason: Núcleo "quiet morning"; a cena calma ao amanhecer leva a quiet, calm ou peaceful morning.
- answerKeys: quiet morning, calm morning, peaceful morning
- question: What is this morning like?
- questionImageDescription: A person sitting alone by a window at sunrise holding a mug of coffee, empty street outside, soft light, medium shot.

exemplo (I'm running late):
- imageable: true. imageableReason: Núcleo "running late"; a pessoa correndo olhando o relógio mostra o atraso.
- answerKeys: running late, late, in a hurry
- question: What is the person's situation?
- questionImageDescription: A person hurrying down a sidewalk with a bag, anxiously checking a wristwatch, medium shot.

exemplo (look forward to):
- imageable: false. imageableReason: Expressão de sentido figurado; a cena literal não leva a ela.
- answerKeys: look forward to
- question: ""
- questionImageDescription: null

validação:
- answerKeys começa pelo núcleo visual do item, só em inglês, seguido de equivalentes que nomeiam o mesmo elemento.
- imageable segue o teste com a pergunta guia e os equivalentes. Com false, question é "" e questionImageDescription é null.
- imageableReason preenchido em true e em false, em PT, citando o núcleo.
- Com imageable true, a pergunta está em EN, tem até 10 palavras, não pede frase completa, sujeito neutro, não traz o núcleo, sinônimo direto, nem o verbo ou tempo da resposta.
- questionImageDescription em inglês, só a cena, um sujeito principal, uma ação, poucos elementos, fundo limpo, sem texto ou número, com o núcleo em destaque.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase completa em EN que descreve a cena da imagem usando o termo de right_answer.

nota: Grafia do termo idêntica à de right_answer. Em right, é a frase do usuário corrigida, mantendo o que ele trouxe de certo. Em wrong ou partial, frase modelo com o primeiro item de answerKeys. Correção de outros erros e elogio a extras vão em feedback_note, nunca no feedback_text.

exemplo (sharing a post):
- The person is sharing a post from the park.

exemplo (quiet morning):
- It's a quiet morning, perfect for a slow coffee.

exemplo (running late):
- The person is running late and checking the time.

validação:
- Uma única frase completa em EN com o termo, descrevendo a cena.
- Não define nem explica o termo.
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: encontre o núcleo visual do item, decida imageable e imageableReason, escreva answerKeys, a pergunta guia em EN (até 10 palavras) e, por último, questionImageDescription em inglês.

nota: Banda de nível B1-B2. O item costuma vir como combinação, expressão ou frase curta com sujeito e verbo. O alvo da imagem é o núcleo visual do item: a menor parte dele que uma cena mostra, mantendo o sentido do item ("he's leaning against the wall" vira "leaning against"; "a cluttered desk" fica inteiro). answerKeys começa pelo núcleo, seguido dos equivalentes que nomeiam o mesmo elemento da cena, todos em inglês; term continua sendo o item original. O núcleo não precisa ser a imagem inteira, basta ser o elemento central de uma cena com pessoas, objetos, cenário ou ação, sem diálogo. Teste de imageable: olhando a cena com a pergunta guia, a pessoa responde o núcleo ou um equivalente de answerKeys, e não um termo de sentido diferente? A pergunta guia já diz para onde olhar e os equivalentes já aceitam as variações próximas, então ter mais de uma forma de dizer a mesma coisa não reprova: só reprova quando a cena leva a um sentido diferente. Costumam servir objeto, lugar, sentimento e estado visíveis, característica, momento do dia ou clima, preposição de lugar, ação em andamento e phrasal verb de ação física com sentido literal. Costumam não servir negação, passado, futuro, preposição de tempo, expressão idiomática, phrasal verb de sentido figurado, conector, palavra abstrata sem cena típica, e termo que exija representar violência, sexo ou drogas. Se o item não tem núcleo que passe no teste, imageable é false, question é "", answerKeys mantém o item e questionImageDescription é null. A pergunta só aponta para onde olhar: nunca traz o núcleo, um sinônimo direto dele, nem o verbo ou o tempo verbal que a resposta deve usar. A instrução de responder em frase completa é aplicada fora deste prompt, antes da pergunta: a pergunta não pede frase completa. Sujeito neutro ("the person", "these people"), nunca gênero. questionImageDescription é usada direto como prompt de geração da imagem: cena simples em inglês, 1 ou 2 frases, um sujeito principal, uma ação, poucos elementos, fundo limpo, com o núcleo em destaque e enquadramento (close-up, medium shot). Nada na cena pode levar a um termo de sentido diferente. Nenhum texto, letra, placa, legenda, tela com escrita ou número na cena. A cena é cotidiana e neutra, porque o gerador de imagem recusa cenas sensíveis: sem medo, grito, dor, ferimento, doença ou choro; sem corpo à mostra, cama, banho ou roupa íntima; sem criança ou bebê; sem bebida alcoólica, cigarro ou arma; sem multidão em pânico. Quando o núcleo toca um desses temas, mostre o contexto de forma neutra (horror movie vira pessoas num cinema escuro com pipoca e expressões tensas); se não houver cena neutra que leve ao núcleo, imageable é false. Estilo fotográfico é aplicado fora deste prompt.

exemplo (he's leaning against the wall):
- imageable: true. imageableReason: Núcleo "leaning against"; a postura encostada na parede mostra a ação.
- answerKeys: leaning against, leaning on
- question: Where is the person in relation to the wall?
- questionImageDescription: A person leaning against a plain brick wall with arms crossed, waiting on an empty street, medium shot.

exemplo (a cluttered desk):
- imageable: true. imageableReason: Núcleo "cluttered desk"; a mesa cheia de papéis leva a cluttered ou messy desk.
- answerKeys: cluttered desk, messy desk
- question: What does the workspace look like?
- questionImageDescription: A small office desk piled with loose papers, coffee cups and tangled cables, a person's hands searching through it, close-up.

exemplo (nevertheless):
- imageable: false. imageableReason: Conector, sem elemento visual.
- answerKeys: nevertheless
- question: ""
- questionImageDescription: null

validação:
- answerKeys começa pelo núcleo visual do item, só em inglês, seguido de equivalentes que nomeiam o mesmo elemento.
- imageable segue o teste com a pergunta guia e os equivalentes. Com false, question é "" e questionImageDescription é null.
- imageableReason preenchido em true e em false, em PT, citando o núcleo.
- Com imageable true, a pergunta está em EN, tem até 10 palavras, não pede frase completa, sujeito neutro, não traz o núcleo, sinônimo direto, nem o verbo ou tempo da resposta.
- questionImageDescription em inglês, só a cena, um sujeito principal, uma ação, poucos elementos, fundo limpo, sem texto ou número, com o núcleo em destaque.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase completa em EN que descreve a cena da imagem usando o termo de right_answer.

nota: Grafia do termo idêntica à de right_answer. Em right, é a frase do usuário corrigida, mantendo o que ele trouxe de certo. Em wrong ou partial, frase modelo natural com o primeiro item de answerKeys. Correção de outros erros e elogio a extras vão em feedback_note, nunca no feedback_text.

exemplo (leaning against):
- The person is leaning against the wall, waiting for someone.

exemplo (cluttered desk):
- It's a cluttered desk that clearly hasn't been tidied in days.

exemplo (crowded):
- The train platform is crowded with commuters.

validação:
- Uma única frase completa em EN com o termo, descrevendo a cena.
- Não define nem explica o termo.
- Se qualquer critério falhar, gere outro feedback com a correção.
