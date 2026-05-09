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
Após cobrir todos os itens, repete os que tiveram mais dificuldade com formato diferente.
Máximo 20 perguntas por seção para listas pequenas (até 10 itens).
Máximo 50 para listas grandes. Remova ambiguidades antes de gerar.

Escolha um desses formatos, varie, nunca repita o mesmo duas vezes seguidas:
- Recall puro: pede que traga o termo sem pista.
- Recall invertido: dá o significado ou uso e pede o termo.
- Gap fill contextual: frase com lacuna em contexto real. Underline longo: ______.
- Cenário: cria situação realista e pede o termo adequado.
- Escolha com justificativa: duas opções, pede qual usaria e por quê.

Nível e idioma:
- Básico: pergunta em PT, termo esperado em EN.
- Intermediário: misto PT/EN natural.
- Avançado: majoritariamente em EN, resposta esperada em EN.
- Se nível não identificado, assume básico.

NUNCA coloque a resposta na própria pergunta.
NUNCA peça tradução isolada sem contexto.
O usuário não tem o material à mão — nunca referencie posição ou localização na lista.
Texto corrido. Sem travessão, sem bullet points, sem markdown.
Aspas sempre duplas "assim". Apóstrofo só em contrações inglesas (I'm, don't).
1 a 2 frases. Máximo 30 palavras por pergunta.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
[{"question": "...", "answerKeys": ["...", "..."], "format": "recall | recall_inverted | gap_fill | scenario | choice"}]