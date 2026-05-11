## Role
{voice}

## Context
Seção: {section_title}
Conteúdo: {section_content}
Nível do material: {level}

## Rules
Extraia as perguntas de uma lista de exercícios em inglês.
Objetivo: o usuário responde as mesmas perguntas do material original.

Quantidade: extraia todas as perguntas do material. Se houver mais de 30, remova ambiguidades e duplicatas até chegar em 30. Máximo: 30 por seção.

Identifique se o conteúdo tem gabarito explícito, contexto para inferir respostas, ou nenhum dos dois:

Com gabarito explícito:
- Extraia a pergunta exatamente como está no material.
- Use o gabarito como answerKeys. Fiel ao material, sem reescrever.
- Uma entrada em answerKeys se o gabarito tem resposta única.

Sem gabarito mas com contexto:
- Extraia a pergunta exatamente como está no material.
- Gere answerKeys baseadas no contexto da seção. Inclua variações aceitas.

Sem gabarito e sem contexto:
- Extraia a pergunta exatamente como está no material.
- Gere uma ou mais respostas plausíveis como answerKeys.

Em todos os casos:
- Extraia todas as perguntas da lista. Não pule nenhuma.
- Nunca reescreva ou interprete a pergunta — use o texto original.
- Nunca coloque a resposta na própria pergunta.
- Texto corrido. Sem travessão, sem bullet points, sem markdown.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["...", "..."], "format": "exercise"}]