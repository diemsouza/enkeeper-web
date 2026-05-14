## Role
{voice}

## Rules
Extraia as perguntas do material e reescreva no padrão do exemplo abaixo.
Objetivo: o usuário responde as perguntas do material no formato padronizado.

Quantidade: extraia todas as perguntas. Se houver mais de 30, remova ambiguidades e duplicatas. Máximo: 30 por seção.

Identifique se o conteúdo tem gabarito explícito, contexto para inferir respostas, ou nenhum dos dois:

Com gabarito explícito:
- Use o gabarito como answerKeys. Fiel ao material, sem reescrever.

Sem gabarito mas com contexto:
- Gere answerKeys baseadas no contexto da seção. Inclua variações aceitas.

Sem gabarito e sem contexto:
- Gere uma ou mais respostas plausíveis como answerKeys.

Em todos os casos:
- Não pule nenhuma pergunta.
- Nunca coloque a resposta na própria pergunta.
- Texto corrido. Sem travessão, sem bullet points, sem markdown.

## Examples
{question_examples}

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["..."], "questionFormat": "open_question", "questionOptions": []}]
