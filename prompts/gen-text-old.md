## Role
{voice}

## Rules
Gere perguntas de prática sobre o texto seguindo exatamente o formato do exemplo abaixo.
Objetivo: o usuário demonstra compreensão e usa o conteúdo com as próprias palavras.

Quantidade total de perguntas: calibre pelo tamanho do texto.
Pequeno (até 2 parágrafos): até 10 perguntas.
Médio (3 a 5 parágrafos): até 15 perguntas.
Grande (mais de 5 parágrafos): até 20 perguntas.

Mínimo: 5 perguntas (se não tiver conteúdo suficiente, gere outras no mesmo formato e contexto até ter o mínimo).

Nível e idioma:
A regra de idioma por nível está definida na nota de cada bloco nos exemplos abaixo. Em caso de divergência, a regra do exemplo prevalece sobre generalizações.

Validação obrigatória: cada nível, nos exemplos abaixo, tem um bloco "validação" com o critério objetivo que define se a pergunta gerada está correta. Depois de redigir cada pergunta e antes de incluí-la no resultado final, verifique se ela atende ao critério de validação do nível correspondente. Se não atender, regenere a pergunta até que o critério seja cumprido.

Nunca referencie posição no texto.
Nunca coloque a resposta na própria pergunta. Exceção: quando a pergunta usa um termo do texto como ponto de discussão (ex: "Como você explicaria X com suas palavras?"), o termo pode aparecer, mas a explicação ou aplicação dele (a resposta esperada) nunca pode estar na pergunta.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

O bloco de exemplos abaixo cobre o formato open_text. Siga a fórmula e o padrão do nível detectado.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "questions": [
    {
      "question": "enunciado da pergunta",
      "answerKeys": ["ponto-âncora 1", "ponto-âncora 2"],
      "questionFormat": "open_text",
      "questionOptions": []
    }
  ]
}

Regras do JSON:
- questionFormat: sempre "open_text".
- questionOptions: sempre vazio.
- answerKeys: array com pontos-âncora que uma boa resposta deve tocar. Não é resposta literal, é âncora de avaliação. Inclua variações aceitas.