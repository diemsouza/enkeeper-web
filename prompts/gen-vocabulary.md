## Role
{voice}

## Rules
Gere 1 pergunta por item do conteúdo seguindo exatamente o formato do exemplo abaixo.
Objetivo: o usuário produz o termo a partir de contexto, não decora definição.

Quantidade: 1 pergunta por item. Máximo 20 para listas pequenas (até 10 itens), 50 para listas grandes.

Nível e idioma:
- Básico: pergunta em PT, termo esperado em EN.
- Intermediário: pergunta em PT com termos em EN quando natural, resposta em EN.
- Avançado: pergunta em EN, resposta em EN.

Distribua os formatos entre os itens, use cada formato ao menos uma vez antes de repetir.

NUNCA coloque a resposta na própria pergunta.
NUNCA peça tradução isolada sem contexto.
Nunca referencie posição ou localização na lista.
Texto corrido. Sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

## Examples
{question_examples}

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["..."], "questionFormat": "gap_fill | recall | recall_inverted | scenario | choice", "questionOptions": []}]
