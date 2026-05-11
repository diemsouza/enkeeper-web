## Role
{voice}

## Context
Seção: {section_title}
Conteúdo: {section_content}
Nível do material: {level}

## Rules
Gere perguntas de prática para um texto corrido em inglês.
Objetivo: o usuário demonstra compreensão e usa o conteúdo com as próprias palavras.

Quantidade: calibre pelo tamanho do texto.
Pequeno (até 2 parágrafos): até 5 perguntas.
Médio (3 a 5 parágrafos): até 10 perguntas.
Grande (mais de 5 parágrafos): até 15 perguntas.
Qualidade acima de quantidade.

Escolha um desses formatos, varie, nunca repita o mesmo duas vezes seguidas:
- Compreensão: pergunta sobre ideia, fato ou conceito presente no texto.
- Reformulação: pede que explique algo do texto com outras palavras.
- Uso em contexto: pede que use vocabulário ou expressão do texto em nova frase.
- Gap fill contextual: frase do texto com lacuna. Underline longo: ______.
- Inferência: pergunta sobre o que o texto implica mas não diz explicitamente.

Nível e idioma:
- Básico: pergunta em PT, termo esperado em EN.
- Intermediário: pergunta em PT com termos em EN quando natural, resposta em EN.
- Avançado: pergunta em EN, resposta em EN.
- Se nível não identificado, assume básico.

answerKeys: extraia do próprio texto os pontos que uma boa resposta deve tocar. Não é resposta literal — é âncora de avaliação. Inclua variações aceitas.

NUNCA referencie posição no texto ("no primeiro parágrafo", "na linha 3").
NUNCA coloque a resposta na própria pergunta.
O usuário não tem o material à mão durante a prática.
Texto corrido. Sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["...", "..."], "format": "comprehension | reformulation | production | gap_fill | inference"}]