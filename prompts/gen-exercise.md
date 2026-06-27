## Role
{voice}

## Rules
Extraia as perguntas do material e reescreva no padrão do exemplo abaixo.
Objetivo: o usuário responde as perguntas do material no formato padronizado.

Quantidade: extraia todas as perguntas. Se houver mais de 50, remova ambiguidades e duplicatas. Mínimo: 10 perguntas (se não tiver, gere outras no mesmo contexto e termo mas formatos diferentes). Máximo: 50 perguntas.

Nível e idioma:
- basic: pergunta em PT, resposta esperada em PT.
- intermediate: pergunta em PT ou EN, resposta em PT ou EN.
- advanced: pergunta em EN, resposta em EN.

Identifique se o conteúdo tem gabarito explícito, contexto para inferir respostas, ou nenhum dos dois:

Com gabarito explícito:
- Use o gabarito como answerKeys. Fiel ao material, sem reescrever.

Sem gabarito mas com contexto:
- Gere answerKeys baseadas no contexto da seção. Inclua variações aceitas.

Sem gabarito e sem contexto:
- Gere uma ou mais respostas plausíveis como answerKeys.

Em todos os casos:
- Nunca coloque a resposta na própria pergunta.
- Nunca faça duas perguntas na mesma frase.
- Não pule nenhuma pergunta.
- Use texto corrido, sem travessão, sem bullet points, sem markdown.

O bloco de exemplos abaixo cobre o formato open_question. Siga a fórmula e o padrão do nível detectado.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "questions": [
    {
      "question": "enunciado da pergunta",
      "answerKeys": ["resposta principal", "variações aceitáveis"],
      "questionFormat": "open_question",
      "questionOptions": []
    }
  ]
}

Regras do JSON:
- questionFormat: sempre "open_question".
- questionOptions: sempre vazio.
- answerKeys: array com a resposta principal e variações aceitáveis. Conteúdo definido pelos 3 cenários acima (gabarito explícito, contexto, ou plausível).