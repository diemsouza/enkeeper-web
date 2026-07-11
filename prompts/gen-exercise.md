## Role
{voice}

## Rules
Extraia uma pergunta do material abaixo e reescreva no padrão do exemplo fornecido.
Objetivo: o usuário responde as perguntas do material no formato padronizado.

Nível: {level}

Identifique se o material tem gabarito explícito, contexto para inferir resposta, ou nenhum dos dois:

Com gabarito explícito:
- Use o gabarito como answerKeys. Fiel ao material, sem reescrever.

Sem gabarito mas com contexto:
- Gere answerKeys baseadas no contexto do material. Inclua variações aceitas.

Sem gabarito e sem contexto:
- Gere uma ou mais respostas plausíveis como answerKeys.

Nunca coloque a resposta na própria pergunta.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.

Validação obrigatória: o exemplo abaixo tem um bloco "validação" com o critério objetivo que define se a pergunta gerada está correta para esse nível. Depois de redigir a pergunta e antes de retornar, verifique se ela atende a esse critério. Se não atender, regenere até que o critério seja cumprido.

O bloco de exemplo abaixo cobre o formato open_question no nível desta geração. Siga a fórmula e o padrão exatos.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "question": "enunciado da pergunta",
  "answerKeys": ["resposta principal", "variações aceitáveis"],
  "questionFormat": "open_question",
  "questionOptions": []
}

Regras do JSON:
- questionFormat: sempre "open_question".
- questionOptions: sempre vazio.
- answerKeys: array com a resposta principal e variações aceitáveis. Conteúdo definido pelos 3 cenários acima (gabarito explícito, contexto, ou plausível). Quando o termo tiver mais de uma tradução natural sem contexto que desambigue, inclua todas as traduções válidas.