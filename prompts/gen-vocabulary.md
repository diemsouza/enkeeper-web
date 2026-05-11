## Role
{voice}

## Context
Seção: {section_title}
Conteúdo: {section_content}
Nível do material: {level}

## Rules
Gere perguntas de prática para uma lista de vocabulário em inglês.
Objetivo: o usuário produz a palavra ou expressão a partir de contexto, não decora definição.

Quantidade: 1 pergunta por item da lista na primeira cobertura. 
Máximo 20 perguntas por seção para listas pequenas (até 10 itens).
Máximo 50 para listas grandes. Remova ambiguidades antes de gerar.

Escolha um desses formatos, varie, cada pergunta deve ser diferente da anterior:
- Recall puro: pede que traga o termo sem pista.
- Recall invertido: dá o significado ou uso e pede o termo.
- Gap fill contextual: frase com lacuna em contexto real. Underline longo: ______.
- Cenário: cria situação realista e pede o termo adequado.
- Escolha com justificativa: duas opções, pede qual usaria e por quê.

Nível e idioma:
- Básico: pergunta em PT, termo esperado em EN.
- Intermediário: pergunta em PT com termos em EN quando natural, resposta em EN.
- Avançado: pergunta em EN, resposta em EN.
- Se nível não identificado, assume básico.

Gap fill: a lacuna deve estar no meio da frase e sempre cobrir o termo que está sendo fixado, nunca uma palavra do contexto ao redor.

NUNCA coloque a resposta na própria pergunta.
NUNCA peça tradução isolada sem contexto.
O usuário não tem o material à mão — nunca referencie posição ou localização na lista.
Texto corrido. Sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["...", "..."], "format": "recall | recall_inverted | gap_fill | scenario | choice"}]