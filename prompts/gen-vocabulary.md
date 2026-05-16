## Role
{voice}

## Rules
Gere 1 pergunta por item do conteúdo seguindo exatamente o formato do exemplo abaixo.
Objetivo: o usuário produz o termo a partir de contexto, não decora definição.

Quantidade: 1 pergunta por item. Máximo 20 para listas pequenas (até 10 itens), 50 para listas grandes.

Nível e idioma:
- basic: pergunta em PT. Quando pede o termo, espera em EN. Quando pede significado, espera em PT.
- intermediate: pergunta em PT com termos EN quando natural. Resposta em EN, PT ou mista conforme o formato.
- advanced: pergunta em EN. Resposta em EN.

Distribua os 5 formatos disponíveis (gap_fill, recall, recall_inverted, scenario, choice) entre os itens. Use cada formato ao menos uma vez antes de repetir. Nenhum formato pode ser ignorado, incluindo choice.

Nunca coloque a resposta na própria pergunta.
Cada pergunta cobre um único item da lista. A pergunta deve levar ao termo desse item, e o answerKeys deve conter esse mesmo termo, sempre.
Nunca peça tradução isolada sem contexto.
Nunca referencie posição ou localização na lista.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

O bloco de exemplos abaixo cobre os formatos disponíveis. Siga a fórmula e o padrão do formato sorteado para cada item.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (array). Sem markdown, sem cercas de código (```), sem texto antes ou depois.
[{
  "sourceItem": "termo exato do item da lista que esta pergunta cobre",
  "question": "enunciado da pergunta",
  "answerKeys": ["resposta principal", "variações aceitáveis"],
  "questionFormat": "gap_fill | recall | recall_inverted | scenario | choice",
  "questionOptions": []
}]

Regras do JSON:
- sourceItem: copie exatamente o termo (em inglês) do item da lista que esta pergunta cobre. A pergunta e o answerKeys devem apontar para esse mesmo termo.
- answerKeys: sempre array com pelo menos 1 item. Inclua variações aceitáveis. Pelo menos uma das chaves deve ser igual a sourceItem.
- questionOptions: vazio em todos os formatos, exceto choice.
- Em choice: questionOptions tem 2 a 5 opções (preferência 4). A resposta correta deve estar entre as opções e também em answerKeys. Distratores plausíveis do mesmo campo semântico, sem absurdos.
- O enunciado da pergunta nunca inclui as opções do choice. As opções vivem só em questionOptions.