## BASIC

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys; answerKeys contém só essa frase, exatamente igual a questionAudioText.

nota: Banda de nível A1-A2. questionAudioText é lida em voz alta e o usuário escreve o que ouviu, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 5 e 8 palavras, presente simples, vocabulário elementar: o termo é a única palavra possivelmente difícil. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. Sem termHint na frase. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (blanket):
- questionAudioText: I need a warm blanket tonight.
- answerKeys: ["I need a warm blanket tonight."]

exemplo (get up):
- questionAudioText: I get up early every day.
- answerKeys: ["I get up early every day."]

exemplo (kitchen):
- questionAudioText: My mom cooks in the kitchen.
- answerKeys: ["My mom cooks in the kitchen."]

validação:
- question é "".
- questionAudioText tem entre 5 e 8 palavras, presente simples, e usa o termo intacto.
- Fora o termo, só palavras elementares.
- answerKeys tem um único item, idêntico a questionAudioText.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio, exatamente como em answerKeys, limpa e fluida em qualquer status: sem marcação, sem aspas, sem apontar o que o usuário errou.

nota: O status segue a regra estrita deste formato, que prevalece sobre os critérios gerais. Antes de comparar, ignore só: maiúsculas, pontuação, espaços, apóstrofo reto ou curvo, contração contra forma expandida (I'm = I am, don't = do not, it's = it is) e número por extenso contra dígito (two = 2). Depois disso, compare palavra por palavra: qualquer palavra diferente, faltando ou sobrando conta como erro, inclusive erro de digitação de uma letra (recieve por receive) e palavra de mesmo som (their por there, week por weak). right: nenhuma diferença. partial: exatamente 1 palavra errada, faltando ou sobrando, numa frase de 6 ou mais palavras. wrong: todo o resto, incluindo 1 erro em frase de até 5 palavras. user_unknown segue a regra geral. right_answer é sempre a frase de answerKeys. feedback_translation é a tradução natural em português da frase de answerKeys, sem marcação, sem aspas, mesmo em partial ou wrong. eval_tip_class: homophone quando o erro for uma palavra trocada por outra de mesmo som, connected_speech quando faltou uma forma fraca ou palavras ligadas na fala não foram separadas, spelling quando for só erro de digitação, none no resto. eval_tip, quando houver, explica só esse erro específico em frase curta, nunca reproduz a frase com correções nem lista as divergências.

exemplo (resposta "i need a warm blanket tonight", esperado "I need a warm blanket tonight."):
- status: right
- feedback_text: I need a warm blanket tonight.

exemplo (resposta "Im cold today", esperado "I am cold today."):
- status: right
- feedback_text: I am cold today.

exemplo (resposta "I have 2 dogs at home", esperado "I have two dogs at home."):
- status: right
- feedback_text: I have two dogs at home.

exemplo (resposta "I get up erly every day", esperado "I get up early every day."):
- status: partial
- feedback_text: I get up early every day.
- eval_tip_class: spelling
- eval_tip: (vazia)

exemplo (resposta "My mom cooks in kitchen", esperado "My mom cooks in the kitchen."):
- status: partial
- feedback_text: My mom cooks in the kitchen.
- eval_tip_class: connected_speech
- eval_tip: Na fala, o _the_ antes de _kitchen_ sai rápido e fraco, quase some, mas continua na frase: *in the kitchen*.

exemplo (resposta "I need warm blanket", esperado "I need a warm blanket tonight."):
- status: wrong
- feedback_text: I need a warm blanket tonight.
- eval_tip_class: none
- eval_tip: (vazia)

exemplo (resposta "Put it over their", esperado "Put it over there."):
- status: wrong
- feedback_text: Put it over there.
- eval_tip_class: homophone
- eval_tip: *Their* e *there* soam igual; _their_ indica posse ("their car"), _there_ indica lugar, como em "over there".

validação:
- feedback_text reproduz a frase de answerKeys, palavra por palavra.
- feedback_text é a frase limpa, sem marcação, em qualquer status.
- eval_tip, quando houver, trata de um erro específico e não reproduz a frase corrigida.
- O status bate com a contagem de erros e o tamanho da frase.
- Se qualquer critério falhar, gere outro feedback com a correção.

## INTERMEDIATE

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys; answerKeys contém só essa frase, exatamente igual a questionAudioText.

nota: Banda de nível A2-B1. questionAudioText é lida em voz alta e o usuário escreve o que ouviu, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 7 e 12 palavras, qualquer tempo verbal comum, vocabulário do dia a dia, com contrações e formas fracas naturais da fala quando couberem. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. Sem termHint na frase. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (suitcase):
- questionAudioText: I left my suitcase at the hotel this morning.
- answerKeys: ["I left my suitcase at the hotel this morning."]

exemplo (run out of):
- questionAudioText: We're going to run out of milk by Friday.
- answerKeys: ["We're going to run out of milk by Friday."]

validação:
- question é "".
- questionAudioText tem entre 7 e 12 palavras e usa o termo intacto.
- answerKeys tem um único item, idêntico a questionAudioText.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio, exatamente como em answerKeys, limpa e fluida em qualquer status: sem marcação, sem aspas, sem apontar o que o usuário errou.

nota: O status segue a regra estrita deste formato, que prevalece sobre os critérios gerais. Antes de comparar, ignore só: maiúsculas, pontuação, espaços, apóstrofo reto ou curvo, contração contra forma expandida (we're = we are, don't = do not) e número por extenso contra dígito. Depois disso, compare palavra por palavra: qualquer palavra diferente, faltando ou sobrando conta como erro, inclusive erro de digitação de uma letra e palavra de mesmo som. right: nenhuma diferença. partial: exatamente 1 palavra errada, faltando ou sobrando, numa frase de 6 ou mais palavras. wrong: todo o resto. user_unknown segue a regra geral. right_answer é sempre a frase de answerKeys. feedback_translation é a tradução natural em português da frase de answerKeys, sem marcação, sem aspas, mesmo em partial ou wrong. eval_tip_class: homophone quando o erro for uma palavra trocada por outra de mesmo som, connected_speech quando faltou uma forma fraca ou palavras ligadas na fala não foram separadas, spelling quando for só erro de digitação, none no resto. eval_tip, quando houver, explica só esse erro específico em frase curta, nunca reproduz a frase com correções nem lista as divergências.

exemplo (resposta "We are going to run out of milk by friday", esperado "We're going to run out of milk by Friday."):
- status: right
- feedback_text: We're going to run out of milk by Friday.

exemplo (resposta "We're going run out of milk by Friday", esperado "We're going to run out of milk by Friday."):
- status: partial
- feedback_text: We're going to run out of milk by Friday.
- eval_tip_class: connected_speech
- eval_tip: Em _going to_, o _to_ sai fraco e colado no _going_, mas está lá: *going to run*.

exemplo (resposta "I left my suitcase at the hotel this mourning", esperado "I left my suitcase at the hotel this morning."):
- status: partial
- feedback_text: I left my suitcase at the hotel this morning.
- eval_tip_class: homophone
- eval_tip: *Mourning* e *morning* soam igual; _mourning_ é luto, _morning_ é manhã, como em "this morning".

exemplo (resposta "I let my suit case at hotel this morning", esperado "I left my suitcase at the hotel this morning."):
- status: wrong
- feedback_text: I left my suitcase at the hotel this morning.
- eval_tip_class: none
- eval_tip: (vazia)

validação:
- feedback_text reproduz a frase de answerKeys, palavra por palavra.
- feedback_text é a frase limpa, sem marcação, em qualquer status.
- eval_tip, quando houver, trata de um erro específico e não reproduz a frase corrigida.
- O status bate com a contagem de erros e o tamanho da frase.
- Se qualquer critério falhar, gere outro feedback com a correção.

## ADVANCED

### question
fórmula: question sempre vazio (""), o enunciado é aplicado fora deste prompt. Escreva em questionAudioText uma frase natural em EN que usa o primeiro termo de answerKeys; answerKeys contém só essa frase, exatamente igual a questionAudioText.

nota: Banda de nível B1-B2. questionAudioText é lida em voz alta e o usuário escreve o que ouviu, então a frase é de fala real, no estilo da frase de uso do feedback, nunca uma situação de cenário, pergunta ao usuário ou definição. Entre 9 e 16 palavras, estrutura natural de fala nativa, com contrações, formas fracas e ligações entre palavras quando couberem. Uma única frase, com pontuação final, sem aspas, sem nomes próprios raros, sem números com mais de dois dígitos, sem abreviações nem siglas. O termo aparece intacto, na grafia do conteúdo. Sem termHint na frase. questionOptions é vazio, imageable e questionImageDescription são null.

exemplo (call it a day):
- questionAudioText: We've done enough for now, so let's call it a day and rest.
- answerKeys: ["We've done enough for now, so let's call it a day and rest."]

exemplo (workbench):
- questionAudioText: He should have cleaned the workbench before the inspection this afternoon.
- answerKeys: ["He should have cleaned the workbench before the inspection this afternoon."]

validação:
- question é "".
- questionAudioText tem entre 9 e 16 palavras e usa o termo intacto.
- answerKeys tem um único item, idêntico a questionAudioText.
- A frase é de uso real, não define nem explica o termo.
- Se qualquer critério falhar, gere outra pergunta com a correção.

### feedback
fórmula: feedback_text é a frase do áudio, exatamente como em answerKeys, limpa e fluida em qualquer status: sem marcação, sem aspas, sem apontar o que o usuário errou.

nota: O status segue a regra estrita deste formato, que prevalece sobre os critérios gerais. Antes de comparar, ignore só: maiúsculas, pontuação, espaços, apóstrofo reto ou curvo, contração contra forma expandida (we've = we have, let's = let us) e número por extenso contra dígito. Depois disso, compare palavra por palavra: qualquer palavra diferente, faltando ou sobrando conta como erro, inclusive erro de digitação de uma letra e palavra de mesmo som. right: nenhuma diferença. partial: exatamente 1 palavra errada, faltando ou sobrando, numa frase de 6 ou mais palavras. wrong: todo o resto. user_unknown segue a regra geral. right_answer é sempre a frase de answerKeys. feedback_translation é a tradução natural em português da frase de answerKeys, sem marcação, sem aspas, mesmo em partial ou wrong. eval_tip_class: homophone quando o erro for uma palavra trocada por outra de mesmo som, connected_speech quando faltou uma forma fraca ou palavras ligadas na fala não foram separadas, spelling quando for só erro de digitação, none no resto. eval_tip, quando houver, explica só esse erro específico em frase curta, nunca reproduz a frase com correções nem lista as divergências.

exemplo (resposta "We have done enough for now so lets call it a day and rest", esperado "We've done enough for now, so let's call it a day and rest."):
- status: right
- feedback_text: We've done enough for now, so let's call it a day and rest.

exemplo (resposta "He should of cleaned the workbench before the inspection this afternoon", esperado "He should have cleaned the workbench before the inspection this afternoon."):
- status: partial
- feedback_text: He should have cleaned the workbench before the inspection this afternoon.
- eval_tip_class: connected_speech
- eval_tip: Em _should have_, o _have_ sai reduzido e parece _of_ na fala, mas a forma escrita é sempre *should have*.

exemplo (resposta "He should cleaned the work bench before inspection this afternoon", esperado "He should have cleaned the workbench before the inspection this afternoon."):
- status: wrong
- feedback_text: He should have cleaned the workbench before the inspection this afternoon.
- eval_tip_class: none
- eval_tip: (vazia)

validação:
- feedback_text reproduz a frase de answerKeys, palavra por palavra.
- feedback_text é a frase limpa, sem marcação, em qualquer status.
- eval_tip, quando houver, trata de um erro específico e não reproduz a frase corrigida.
- O status bate com a contagem de erros e o tamanho da frase.
- Se qualquer critério falhar, gere outro feedback com a correção.
