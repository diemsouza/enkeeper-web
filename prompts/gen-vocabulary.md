## Role
{voice}

## Rules
Gere perguntas a partir do conteúdo, seguindo exatamente o formato dos exemplos abaixo.
Objetivo: usuário absorver o conteúdo de forma estruturada e variada, sem decorar definição.

Quantidade: 1 pergunta por item de conteúdo. Mínimo total 10 perguntas e se faltar item pra bater o mínimo, reaproveite itens com formato ou contexto diferente. Máximo total 50 perguntas.

Enumere os itens do conteúdo na ordem em que aparecem e gere exatamente 1 pergunta por item, sem pular nenhum. Atribua formato por ciclo fixo na ordem gap_fill, recall, recall_inverted, scenario, choice, repetindo o ciclo se houver mais itens que formatos. Nenhum formato pode ser ignorado, incluindo choice.

Antes de gerar, enumere mentalmente os itens do conteúdo na ordem em que aparecem. Gere exatamente 1 pergunta por item enumerado, nunca menos. Atribua o formato a cada item seguindo um ciclo fixo dos 5 formatos na ordem (gap_fill, recall, recall_inverted, scenario, choice), repetindo o ciclo se houver mais itens que formatos. Confirme ao final que o total de perguntas geradas é igual ao total de itens (respeitando o mínimo de 10 quando o conteúdo tiver menos itens). Nenhum formato pode ser ignorado, incluindo choice.

Nível e idioma:
- basic: pergunta em PT. Quando pede o termo, espera em EN. Quando pede significado, espera em PT.
- intermediate: pergunta em PT com termos EN quando natural. Resposta em EN, PT ou mista conforme o formato.
- advanced: pergunta em EN. Resposta em EN.

Nunca coloque a resposta na própria pergunta.
Cada pergunta cobre um único item da lista. A pergunta deve levar ao termo desse item, e o answerKeys deve conter esse mesmo termo, sempre.
Nunca peça tradução isolada sem contexto.
Nunca referencie posição ou localização na lista.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras por pergunta.

Se um par parecer semanticamente inconsistente com alta confiança, adicione warning ao item.
Gírias, expressões idiomáticas e jargão técnico nunca recebem warning.

Se o item não tiver tradução ou significado explícito no conteúdo recebido, infira o mais natural e usual no idioma oposto antes de gerar a pergunta, e use essa inferência normalmente na pergunta e no answerKeys, como se fizesse parte do material original. Não marque como warning, não pule o item, não peça esclarecimento.

O bloco de exemplos abaixo cobre os formatos disponíveis. Siga a fórmula e o padrão de cada formato, respeitando a contagem definida na seção Quantidade.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "questions": [
    {
      "sourceItem": "termo exato do item da lista que esta pergunta cobre",
      "question": "enunciado da pergunta",
      "answerKeys": ["resposta principal", "variações aceitáveis"],
      "questionFormat": "gap_fill | recall | recall_inverted | scenario | choice",
      "questionOptions": [],
      "warning": "Termo inconsitente: tradução ou significado errado!"
    }
  ]
}

Regras do JSON:
- sourceItem: copie exatamente o termo (em inglês) do item da lista que esta pergunta cobre. A pergunta e o answerKeys devem apontar para esse mesmo termo.
- answerKeys: sempre array com pelo menos 1 item. Inclua variações aceitáveis. Pelo menos uma das chaves deve ser igual a sourceItem. Se sourceItem não tiver tradução no material original, inclua a tradução inferida como chave adicional.
- questionOptions: vazio em todos os formatos, exceto choice.
- Em choice: questionOptions tem 2 a 5 opções (preferência 4). A resposta correta deve estar entre as opções e também em answerKeys. Distratores plausíveis do mesmo campo semântico, sem absurdos.
- O enunciado da pergunta nunca inclui as opções do choice. As opções vivem só em questionOptions.- warning: string curta em português descrevendo a inconsistência. Omita o campo quando não houver inconsistência.