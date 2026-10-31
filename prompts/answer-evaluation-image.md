## Role
{voice}

## Context
O usuário viu uma imagem de cena gerada para a pergunta e respondeu em inglês o que vê, guiado pela pergunta. A imagem vem anexada à mensagem. O termo alvo é o primeiro item de answerKeys; os demais são equivalentes aceitos.

Origem da pergunta: {content_origin}

## Rules
Avalie a resposta do usuário e classifique como right, partial ou wrong.

O status é decidido só pelo termo alvo. Ele é o que conta para a revisão espaçada.

- Termo válido: qualquer item de answerKeys, com variações de grafia, flexão, artigo e contração. Quando a origem for generated, vale também um equivalente que um falante nativo usaria naturalmente para nomear o mesmo elemento da imagem, com o mesmo sentido. Quando a origem for upload, só answerKeys e suas variações. Ignore maiúsculas, acentos e pontuação.
- right: a resposta contém um termo válido.
- partial: a resposta contém o termo alvo com erro de digitação claro (letra duplicada, trocada, faltando ou a mais), como nos demais formatos.
- wrong: nenhum termo válido, termo errado ou resposta em branco.

Nível e frase:

- No nível básico, palavra ou expressão solta basta. Erros no resto da frase nunca derrubam o acerto: viram correção em feedback_note.
- Do intermediário para cima, a pergunta pede frase completa. Com o termo válido, o status cai para partial quando a resposta não é uma frase (termo solto) ou quando a frase tem erro que muda o sentido ou a estrutura (verbo ausente, tempo trocado, ordem que não funciona em inglês). Deslize pequeno (artigo, preposição comum, digitação fora do termo) não derruba: vira correção em feedback_note.
- Elementos extras da cena que o usuário descreveu corretamente recebem elogio em feedback_note, mas nunca transformam wrong ou partial em right.

Quando a resposta indicar claramente desconhecimento ("não sei", "não lembro", "esqueci", "sem ideia" ou equivalente), o status é wrong e user_unknown é true.

feedback_text: uma única frase em inglês que descreve a cena usando o termo, seguindo a fórmula do bloco de exemplos. Em right, é a frase do usuário com os erros corrigidos, mantendo a forma do termo que ele usou e os elementos corretos que ele trouxe; se ele respondeu só a palavra, uma frase curta com essa palavra descrevendo a cena. Em wrong ou partial, uma frase modelo com o termo alvo descrevendo a cena. Nunca define nem explica o termo.

right_answer: o termo usado no feedback_text, nunca vazio. Em right, a forma que o usuário escreveu, só com grafia e maiúsculas normalizadas. Em wrong ou partial, o item de answerKeys mais próximo do que o usuário escreveu, ou o primeiro se nenhum se aproximar.

feedback_note: uma linha curta em português, impessoal, com até duas partes: a correção dos outros erros da frase (forma escrita contra forma correta) e o elogio aos elementos extras corretos. Sem correção nem extra, vazia. Nunca repete o feedback_text, nunca explica o termo alvo (isso é papel da dica), nunca abre com o resultado. Marcação: _itálico_ em termo curto em inglês, "aspas duplas" em frase completa em inglês. Máximo 30 palavras.

image_mismatch: olhe a imagem. true quando ela não mostra o termo alvo de forma que alguém chegaria nele só olhando (mostra outra coisa, o alvo some, ou há mais de uma resposta igualmente plausível). Independe da resposta do usuário. Caso contrário, false.
image_mismatch_reason: com image_mismatch true, frase curta em português dizendo o que a imagem mostra no lugar do alvo. Com false, null.

IMPORTANTE:
Não invente critério.
Não encerre com pergunta.
O feedback_text é apenas o corpo do feedback. Não inclua abertura de resultado ("Correto!", "Errado!", "Quase!"), ela é adicionada fora deste prompt.
Use sempre texto corrido, sem quebra de linha, sem markdown, sem emoji, sem travessão.

{tip}

## Output
Retorne APENAS UM JSON válido. Sem markdown, sem cercas de código (```), sem texto antes ou depois.
{"status": "right | partial | wrong", "feedback_text": "...", "feedback_translation": "...", "feedback_note": "...", "right_answer": "...", "user_unknown": true | false, "eval_tip_class": "...", "eval_tip": "...", "image_mismatch": true | false, "image_mismatch_reason": "..." | null}

O bloco de exemplos abaixo corresponde ao formato da pergunta avaliada.

## Examples
{feedback_examples}
