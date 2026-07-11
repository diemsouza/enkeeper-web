## Role
{voice}

## Rules
Gere uma pergunta de prática sobre o texto abaixo, seguindo exatamente o formato do exemplo fornecido.
Objetivo: o usuário demonstra compreensão e usa o conteúdo com as próprias palavras.

Nível: {level}

Tipo de pergunta desta geração: {question_focus}

Nunca referencie posição no texto.
Nunca coloque a resposta na própria pergunta. Exceção: quando a pergunta usa um termo do texto como ponto de discussão (ex: "Como você explicaria X com suas palavras?"), o termo pode aparecer, mas a explicação ou aplicação dele (a resposta esperada) nunca pode estar na pergunta.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras.

Validação obrigatória: o exemplo abaixo tem um bloco "validação" com o critério objetivo que define se a pergunta gerada está correta para esse nível. Depois de redigir a pergunta e antes de retornar, verifique se ela atende a esse critério. Se não atender, regenere até que o critério seja cumprido.

O bloco de exemplo abaixo cobre o formato open_text no nível desta geração. Siga a fórmula e o padrão exatos.

## Example
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "question": "enunciado da pergunta",
  "answerKeys": ["ponto-âncora 1", "ponto-âncora 2"],
  "questionFormat": "open_text",
  "questionOptions": []
}

Regras do JSON:
- questionFormat: sempre "open_text".
- questionOptions: sempre vazio.
- answerKeys: array com pontos-âncora que uma boa resposta deve tocar. Não é resposta literal, é âncora de avaliação. Inclua variações aceitas.