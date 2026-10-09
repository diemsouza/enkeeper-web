## BASIC

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys como base; answerKeys contém traduções de referência em PT da frase inteira.

nota: Banda de nível A1-A2. questionAudioText é lida em voz alta e o usuário escreve em português o que ela quer dizer, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 5 e 8 palavras, presente simples, vocabulário elementar: o termo é a única palavra possivelmente difícil. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. answerKeys tem de 1 a 3 traduções naturais em PT da frase inteira, a mais natural primeiro, usando para o termo o significado do conteúdo; as demais só quando houver outra forma igualmente natural de dizer o mesmo. Nada em inglês dentro de answerKeys. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (blanket - cobertor):
- questionAudioText: I need a warm blanket tonight.
- answerKeys: ["Eu preciso de um cobertor quente hoje à noite.", "Preciso de um cobertor quentinho hoje à noite."]

exemplo (get up - levantar):
- questionAudioText: I get up early every day.
- answerKeys: ["Eu levanto cedo todo dia.", "Eu acordo cedo todos os dias."]

validação:
- question é "".
- questionAudioText tem entre 5 e 8 palavras, presente simples, e usa o termo intacto.
- Fora o termo, só palavras elementares.
- answerKeys tem de 1 a 3 traduções em PT da frase inteira, a primeira é a mais natural e usa o significado do conteúdo para o termo.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio em EN, exatamente como foi dita, sem marcação, sem tradução e sem explicação.

nota: Avaliação pelo sentido, não pela forma. Vale qualquer tradução em PT que diga o mesmo que a frase, sem precisar ser literal nem bater com answerKeys: ordem, sinônimos, registro coloquial, sujeito oculto e tempo verbal equivalente são aceitos. Erros de grafia ou acentuação em português não contam. right: o sentido da frase inteira está certo. partial: o sentido central está certo, mas a resposta perdeu ou trocou uma parte relevante (quem faz, quando, negação, quantidade, o sentido do termo quando ele não é o centro). wrong: o sentido central está errado, a resposta traduz outra frase ou fica em inglês. Termo traduzido ao pé da letra com sentido diferente do conteúdo é wrong quando o termo é o centro da frase. user_unknown segue a regra geral. right_answer é sempre o primeiro item de answerKeys. feedback_translation é sempre o primeiro item de answerKeys, idêntico, sem aspas, em qualquer status. Dica, quando houver, explica a parte do sentido que se perdeu, nunca a gramática do português.

exemplo (resposta "preciso de um cobertor quente essa noite", frase "I need a warm blanket tonight."):
- status: right
- feedback_text: I need a warm blanket tonight.

exemplo (resposta "eu levanto cedo", frase "I get up early every day."):
- status: partial
- feedback_text: I get up early every day.

exemplo (resposta "eu fico em pé cedo todo dia", frase "I get up early every day."):
- status: wrong
- feedback_text: I get up early every day.

validação:
- feedback_text é a frase do áudio, idêntica, sem marcação.
- O status segue o sentido, nunca a correspondência literal com answerKeys.
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys como base; answerKeys contém traduções de referência em PT da frase inteira.

nota: Banda de nível A2-B1. questionAudioText é lida em voz alta e o usuário escreve em português o que ela quer dizer, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 7 e 12 palavras, qualquer tempo verbal comum, vocabulário do dia a dia, com contrações naturais da fala quando couberem. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. answerKeys tem de 1 a 3 traduções naturais em PT da frase inteira, a mais natural primeiro, usando para o termo o significado do conteúdo. Nada em inglês dentro de answerKeys. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (run out of - ficar sem):
- questionAudioText: We're going to run out of milk by Friday.
- answerKeys: ["Vamos ficar sem leite até sexta.", "O leite vai acabar até sexta-feira."]

exemplo (suitcase - mala):
- questionAudioText: I left my suitcase at the hotel this morning.
- answerKeys: ["Eu deixei minha mala no hotel hoje de manhã.", "Esqueci minha mala no hotel hoje cedo."]

validação:
- question é "".
- questionAudioText tem entre 7 e 12 palavras e usa o termo intacto.
- answerKeys tem de 1 a 3 traduções em PT da frase inteira, a primeira é a mais natural e usa o significado do conteúdo para o termo.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio em EN, exatamente como foi dita, sem marcação, sem tradução e sem explicação.

nota: Avaliação pelo sentido, não pela forma. Vale qualquer tradução em PT que diga o mesmo que a frase, sem precisar ser literal nem bater com answerKeys. Erros de grafia ou acentuação em português não contam. right: o sentido da frase inteira está certo. partial: o sentido central está certo, mas a resposta perdeu ou trocou uma parte relevante (quem faz, quando, negação, quantidade, o sentido do termo quando ele não é o centro). wrong: o sentido central está errado, a resposta traduz outra frase ou fica em inglês. Expressão traduzida palavra por palavra com sentido diferente do conteúdo é wrong quando ela é o centro da frase. user_unknown segue a regra geral. right_answer é sempre o primeiro item de answerKeys. feedback_translation é sempre o primeiro item de answerKeys, idêntico, sem aspas, em qualquer status.

exemplo (resposta "o leite vai acabar até sexta", frase "We're going to run out of milk by Friday."):
- status: right
- feedback_text: We're going to run out of milk by Friday.

exemplo (resposta "vamos ficar sem leite", frase "We're going to run out of milk by Friday."):
- status: partial
- feedback_text: We're going to run out of milk by Friday.

exemplo (resposta "vamos correr do leite na sexta", frase "We're going to run out of milk by Friday."):
- status: wrong
- feedback_text: We're going to run out of milk by Friday.

validação:
- feedback_text é a frase do áudio, idêntica, sem marcação.
- O status segue o sentido, nunca a correspondência literal com answerKeys.
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys como base; answerKeys contém traduções de referência em PT da frase inteira.

nota: Banda de nível B1-B2. questionAudioText é lida em voz alta e o usuário escreve em português o que ela quer dizer, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 9 e 16 palavras, estrutura natural de fala nativa, com contrações e expressões idiomáticas quando couberem. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. answerKeys tem de 1 a 3 traduções naturais em PT da frase inteira, a mais natural primeiro, usando para o termo o significado do conteúdo. Nada em inglês dentro de answerKeys. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (call it a day - encerrar por hoje):
- questionAudioText: We've done enough for now, so let's call it a day and rest.
- answerKeys: ["Já fizemos o bastante por agora, então vamos encerrar por hoje e descansar.", "Já deu por hoje, vamos parar e descansar."]

exemplo (workbench - bancada):
- questionAudioText: He should have cleaned the workbench before the inspection this afternoon.
- answerKeys: ["Ele devia ter limpado a bancada antes da inspeção hoje à tarde."]

validação:
- question é "".
- questionAudioText tem entre 9 e 16 palavras e usa o termo intacto.
- answerKeys tem de 1 a 3 traduções em PT da frase inteira, a primeira é a mais natural e usa o significado do conteúdo para o termo.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio em EN, exatamente como foi dita, sem marcação, sem tradução e sem explicação.

nota: Avaliação pelo sentido, não pela forma. Vale qualquer tradução em PT que diga o mesmo que a frase, sem precisar ser literal nem bater com answerKeys. Erros de grafia ou acentuação em português não contam. right: o sentido da frase inteira está certo. partial: o sentido central está certo, mas a resposta perdeu ou trocou uma parte relevante (quem faz, quando, negação, obrigação ou possibilidade, o sentido do termo quando ele não é o centro). wrong: o sentido central está errado, a resposta traduz outra frase ou fica em inglês. Expressão idiomática traduzida ao pé da letra é wrong quando ela é o centro da frase. user_unknown segue a regra geral. right_answer é sempre o primeiro item de answerKeys. feedback_translation é sempre o primeiro item de answerKeys, idêntico, sem aspas, em qualquer status.

exemplo (resposta "chega por hoje, bora descansar", frase "We've done enough for now, so let's call it a day and rest."):
- status: right
- feedback_text: We've done enough for now, so let's call it a day and rest.

exemplo (resposta "ele limpou a bancada antes da inspeção", frase "He should have cleaned the workbench before the inspection this afternoon."):
- status: partial
- feedback_text: He should have cleaned the workbench before the inspection this afternoon.

exemplo (resposta "vamos chamar isso de um dia e descansar", frase "We've done enough for now, so let's call it a day and rest."):
- status: wrong
- feedback_text: We've done enough for now, so let's call it a day and rest.

validação:
- feedback_text é a frase do áudio, idêntica, sem marcação.
- O status segue o sentido, nunca a correspondência literal com answerKeys.
- Se qualquer critério falhar, gere outro feedback com a correção.
