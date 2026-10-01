## BASIC

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Decida imageable, monte questionOptions com o termo em EN e 3 distratores em EN e, por último, escreva questionImageDescription em inglês.

nota: Banda de nível A1-A2. imageable é true só quando o termo pode ser mostrado por uma cena sem texto em que o sentido literal da imagem é o sentido real do termo: objeto, ação, estado, sentimento ou lugar. imageable é false para: expressão idiomática, phrasal verb, termo abstrato ou gramatical, quantidade, grau, comparação, qualquer termo cuja diferença para os distratores seja gramatical, termo com mais de um sentido comum cujo sentido do item não esteja claro, e termo que exija representar violência, sexo ou drogas. Se o significado em português do item estiver no contexto, a cena representa exatamente esse sentido. Com imageable false, questionOptions e questionImageDescription são null. A ordem de geração dos campos é imageable, questionOptions, questionImageDescription, para a descrição já nascer conhecendo os distratores. questionImageDescription é usada diretamente como prompt de geração da imagem e traz só a cena, em inglês, em 1 ou 2 frases com o sujeito, o ambiente real e o enquadramento (close-up, medium shot). O termo aparece no ambiente real onde normalmente é visto e, quando fizer sentido, em uso: objeto no lugar onde fica ou na mão de alguém, ação sendo feita por uma pessoa, lugar visto por quem está nele. O termo é o sujeito principal, em primeiro plano e em foco. O ambiente é simples e só confirma o sentido. Nada na cena pode representar ou lembrar algum dos distratores, nem ser outro candidato forte a resposta. Estilo fotográfico e ausência de texto são aplicados fora deste prompt; o ambiente é decidido aqui. A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra em questionOptions. Os demais termos de answerKeys são variações aceitas e nunca podem virar distratores. Use exatamente 4 opções, 1 correta e 3 distratores, todas em inglês. Cada opção é um termo distinto, da mesma classe (todos objetos, todos ações, todos estados), da mesma forma gramatical (todos no singular, todos no infinitivo, todos adjetivos) e de comprimento comparável, para que a correta não se destaque pela forma. Todo distrator precisa ser descartável só de olhar a cena: nunca é sinônimo, hiperônimo ou hipônimo do termo correto, nem algo que apareceria na cena. A dificuldade do nível vem do vocabulário das opções, não da proximidade entre elas: palavras muito frequentes do dia a dia.

exemplo (apple):
- imageable: true. Objeto concreto, mostrado na mão de alguém num ambiente real.
- questionOptions: apple, chair, shoe, key
- questionImageDescription: Close-up of a hand holding a single red apple in a bright kitchen.

exemplo (tired):
- imageable: true. Uma pessoa bocejando no sofá mostra o estado.
- questionOptions: tired, angry, hungry, scared
- questionImageDescription: A person yawning with heavy eyes, slumped on a living room sofa in the evening, medium shot.

exemplo (break the ice):
- imageable: false. A imagem literal de gelo quebrando mostra um sentido diferente do real.
- questionOptions: null
- questionImageDescription: null

validação:
- question é "".
- imageable é false nos casos listados na nota. Nesse caso, questionOptions e questionImageDescription são null.
- Com imageable true, questionImageDescription está em inglês, é só a cena (sem estilo ou instruções de formato), e o termo é o sujeito principal, num ambiente real coerente com o sentido.
- Nada na descrição representa ou lembra algum distrator.
- questionOptions tem 4 termos em EN, o primeiro termo de answerKeys entre eles, todos distintos, da mesma classe e da mesma forma gramatical.
- Nenhum distrator é outro termo de answerKeys, sinônimo, hiperônimo ou hipônimo do termo correto.
- Cada distrator é descartável só de olhar a cena.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional, sem descrever a imagem.

nota: Grafia do termo idêntica à de right_answer. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, pelo número do rótulo ou pelo texto da opção. image_recognition é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto. Se o termo já for longo, não force expansão.

exemplo (run):
- I run in the park every morning.

exemplo (tired):
- I'm too tired to go out tonight.

exemplo (kitchen):
- The kitchen smells like fresh bread.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica.
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Decida imageable, monte questionOptions com o termo em EN e 3 distratores em EN e, por último, escreva questionImageDescription em inglês.

nota: Banda de nível A2-B1. imageable é true só quando o termo pode ser mostrado por uma cena sem texto em que o sentido literal da imagem é o sentido real do termo: objeto, ação, estado, sentimento ou lugar. imageable é false para: expressão idiomática, phrasal verb, termo abstrato ou gramatical, quantidade, grau, comparação, qualquer termo cuja diferença para os distratores seja gramatical, termo com mais de um sentido comum cujo sentido do item não esteja claro, e termo que exija representar violência, sexo ou drogas. Se o significado em português do item estiver no contexto, a cena representa exatamente esse sentido. Com imageable false, questionOptions e questionImageDescription são null. A ordem de geração dos campos é imageable, questionOptions, questionImageDescription, para a descrição já nascer conhecendo os distratores. questionImageDescription é usada diretamente como prompt de geração da imagem e traz só a cena, em inglês, em 1 ou 2 frases com o sujeito, o ambiente real e o enquadramento (close-up, medium shot). O termo aparece no ambiente real onde normalmente é visto e, quando fizer sentido, em uso: objeto no lugar onde fica ou na mão de alguém, ação sendo feita por uma pessoa, lugar visto por quem está nele. O termo é o sujeito principal, em primeiro plano e em foco. O ambiente é simples e só confirma o sentido. Nada na cena pode representar ou lembrar algum dos distratores, nem ser outro candidato forte a resposta. Estilo fotográfico e ausência de texto são aplicados fora deste prompt; o ambiente é decidido aqui. A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra em questionOptions. Os demais termos de answerKeys são variações aceitas e nunca podem virar distratores. Use exatamente 4 opções, 1 correta e 3 distratores, todas em inglês. Cada opção é um termo distinto, da mesma classe (todos objetos, todos ações, todos estados), da mesma forma gramatical (todos no singular, todos no infinitivo, todos adjetivos) e de comprimento comparável, para que a correta não se destaque pela forma. Todo distrator precisa ser descartável só de olhar a cena: nunca é sinônimo, hiperônimo ou hipônimo do termo correto, nem algo que apareceria na cena. A dificuldade do nível vem do vocabulário das opções, não da proximidade entre elas: palavras de frequência média, de dificuldade próxima à do termo.

exemplo (suitcase):
- imageable: true. Objeto concreto, mostrado no lugar onde normalmente fica.
- questionOptions: suitcase, kettle, bicycle, lamp
- questionImageDescription: A closed suitcase standing upright on the floor of a hotel room next to the bed, medium shot, no lamp in view.

exemplo (tired):
- imageable: true. Uma pessoa bocejando no sofá mostra o estado.
- questionOptions: tired, angry, scared, excited
- questionImageDescription: A person yawning with heavy eyes, slumped on a living room sofa in the evening, medium shot.

exemplo (break the ice):
- imageable: false. A imagem literal de gelo quebrando mostra um sentido diferente do real.
- questionOptions: null
- questionImageDescription: null

validação:
- question é "".
- imageable é false nos casos listados na nota. Nesse caso, questionOptions e questionImageDescription são null.
- Com imageable true, questionImageDescription está em inglês, é só a cena (sem estilo ou instruções de formato), e o termo é o sujeito principal, num ambiente real coerente com o sentido.
- Nada na descrição representa ou lembra algum distrator.
- questionOptions tem 4 termos em EN, o primeiro termo de answerKeys entre eles, todos distintos, da mesma classe e da mesma forma gramatical.
- Nenhum distrator é outro termo de answerKeys, sinônimo, hiperônimo ou hipônimo do termo correto.
- Cada distrator é descartável só de olhar a cena.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional, sem descrever a imagem.

nota: Grafia do termo idêntica à de right_answer. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, pelo número do rótulo ou pelo texto da opção. image_recognition é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto. Se o termo já for longo, não force expansão.

exemplo (nervous):
- She looked nervous before the interview.

exemplo (suitcase):
- My suitcase was too heavy for the flight.

exemplo (climb):
- We climbed the hill before sunrise.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica.
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Decida imageable, monte questionOptions com o termo em EN e 3 distratores em EN e, por último, escreva questionImageDescription em inglês.

nota: Banda de nível B1-B2. imageable é true só quando o termo pode ser mostrado por uma cena sem texto em que o sentido literal da imagem é o sentido real do termo: objeto, ação, estado, sentimento ou lugar. imageable é false para: expressão idiomática, phrasal verb, termo abstrato ou gramatical, quantidade, grau, comparação, qualquer termo cuja diferença para os distratores seja gramatical, termo com mais de um sentido comum cujo sentido do item não esteja claro, e termo que exija representar violência, sexo ou drogas. Se o significado em português do item estiver no contexto, a cena representa exatamente esse sentido. Com imageable false, questionOptions e questionImageDescription são null. A ordem de geração dos campos é imageable, questionOptions, questionImageDescription, para a descrição já nascer conhecendo os distratores. questionImageDescription é usada diretamente como prompt de geração da imagem e traz só a cena, em inglês, em 1 ou 2 frases com o sujeito, o ambiente real e o enquadramento (close-up, medium shot). O termo aparece no ambiente real onde normalmente é visto e, quando fizer sentido, em uso: objeto no lugar onde fica ou na mão de alguém, ação sendo feita por uma pessoa, lugar visto por quem está nele. O termo é o sujeito principal, em primeiro plano e em foco. O ambiente é simples e só confirma o sentido. Nada na cena pode representar ou lembrar algum dos distratores, nem ser outro candidato forte a resposta. Estilo fotográfico e ausência de texto são aplicados fora deste prompt; o ambiente é decidido aqui. A resposta correta é sempre o primeiro termo de answerKeys, e é ele que entra em questionOptions. Os demais termos de answerKeys são variações aceitas e nunca podem virar distratores. Use exatamente 4 opções, 1 correta e 3 distratores, todas em inglês. Cada opção é um termo distinto, da mesma classe (todos objetos, todos ações, todos estados), da mesma forma gramatical (todos no singular, todos no infinitivo, todos adjetivos) e de comprimento comparável, para que a correta não se destaque pela forma. Todo distrator precisa ser descartável só de olhar a cena: nunca é sinônimo, hiperônimo ou hipônimo do termo correto, nem algo que apareceria na cena. A dificuldade do nível vem do vocabulário das opções, não da proximidade entre elas: palavras menos frequentes, de dificuldade próxima à do termo.

exemplo (lantern):
- imageable: true. Objeto concreto, mostrado no lugar onde normalmente fica.
- questionOptions: lantern, anchor, ladder, saddle
- questionImageDescription: An old lit lantern hanging from a hook on a wooden cabin porch at dusk, close-up.

exemplo (tired):
- imageable: true. Uma pessoa bocejando no sofá mostra o estado.
- questionOptions: tired, furious, thrilled, terrified
- questionImageDescription: A person yawning with heavy eyes, slumped on a living room sofa in the evening, medium shot.

exemplo (break the ice):
- imageable: false. A imagem literal de gelo quebrando mostra um sentido diferente do real.
- questionOptions: null
- questionImageDescription: null

validação:
- question é "".
- imageable é false nos casos listados na nota. Nesse caso, questionOptions e questionImageDescription são null.
- Com imageable true, questionImageDescription está em inglês, é só a cena (sem estilo ou instruções de formato), e o termo é o sujeito principal, num ambiente real coerente com o sentido.
- Nada na descrição representa ou lembra algum distrator.
- questionOptions tem 4 termos em EN, o primeiro termo de answerKeys entre eles, todos distintos, da mesma classe e da mesma forma gramatical.
- Nenhum distrator é outro termo de answerKeys, sinônimo, hiperônimo ou hipônimo do termo correto.
- Cada distrator é descartável só de olhar a cena.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: uma única frase de uso real em EN contendo o primeiro termo de answerKeys. Sem explicação, sem tradução, sem exemplo adicional, sem descrever a imagem.

nota: Grafia do termo idêntica à de right_answer. Na avaliação, aceita a opção que bate com o primeiro termo de answerKeys, pelo número do rótulo ou pelo texto da opção. image_recognition é binário, nunca usar partial. O corpo do feedback não varia por status, apenas a abertura, resolvida fora deste prompt. Se o termo for curto, expanda contexto ao redor, mantendo o termo intacto. Se o termo já for longo, não force expansão.

exemplo (exhausted):
- After the double shift, she was completely exhausted.

exemplo (sprint):
- He had to sprint to catch the last train.

exemplo (workbench):
- The tools are laid out on the workbench.

validação:
- A frase de uso emprega o termo, nunca o define ou o explica.
- Não pode ser reescrita como "X significa Y" ou "X refere-se a Y".
- Se o termo for curto, a frase tem contexto real ao redor, não só o termo encaixado. Se for longo, regra não se aplica.
- Se qualquer critério falhar, gere outro feedback com a correção.