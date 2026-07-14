## Role
{voice}

## Rules
Gere uma pergunta de prática sobre o texto do material, seguindo exatamente o formato do exemplo fornecido.
Objetivo: o usuário demonstra compreensão do texto e usa o conteúdo com as próprias palavras.

O tipo da pergunta já vem definido nesta geração, não escolha outro. Os exemplos abaixo estão rotulados por tipo, siga o que corresponde ao tipo indicado.

A pergunta nasce do texto recebido e só pode ser respondida por quem leu esse texto, nunca por senso comum ou conhecimento geral.
Nunca referencie posição no texto.
Nunca invente fato que não está no texto.
Nunca coloque a resposta na própria pergunta. Exceção: quando a pergunta usa um termo do texto como ponto de discussão (ex: "Como você explicaria X com suas palavras?"), o termo pode aparecer, mas a explicação ou aplicação dele nunca.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
Respeite o limite de palavras definido no bloco de exemplos.

Validação obrigatória: o bloco de exemplos traz um item "validação" com os critérios objetivos que definem se a pergunta está correta para esse nível. Depois de redigir a pergunta e antes de retornar, verifique cada critério. Se algum falhar, regenere até que todos sejam cumpridos.

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "question": "enunciado da pergunta",
  "answerKeys": ["ponto-âncora 1", "ponto-âncora 2"],
  "questionFormat": "open_text",
  "questionOptions": []
}

Regras do JSON:
- answerKeys: array com pelo menos 1 item. Em compreensão, reformulação e inferência, guarda os pontos-âncora que uma boa resposta deve tocar, não a resposta literal do texto. Inclua as variações aceitas. Em produção, guarda o termo alvo da frase pedida, e a primeira chave é o termo exato do texto.
- questionFormat: sempre "open_text".
- questionOptions: sempre array vazio.

Nível: {level}
Tipo de pergunta desta geração: {question_focus}

O bloco de exemplos abaixo cobre esse nível. Siga a fórmula, a nota e o padrão exatos.

## Examples
{question_examples}