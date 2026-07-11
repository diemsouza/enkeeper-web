## Role
{voice}

## Rules
Gere uma pergunta de prática a partir do conteúdo fornecido, seguindo exatamente o formato dos exemplos abaixo.
Objetivo: usuário absorver o conteúdo de forma estruturada e variada, sem decorar definição.

Formato desta pergunta: {format}
Nível: {level}

Nunca coloque a resposta na própria pergunta.
O termo ou significado usado na pergunta deve ser extraído exatamente do conteúdo recebido, usando os mesmos termos documentados. Nunca use tradução inferida, sinônimo ou variação que não aparece no conteúdo. Se o conteúdo diz "Blanket - cobertor", use "blanket" ou "cobertor" na pergunta, nunca "bed cover" ou "manta" mesmo que sejam traduções válidas.
A pergunta deve levar a um único item do conteúdo, e o answerKeys deve conter o termo desse item, sempre.
Nunca peça tradução isolada sem contexto.
Nunca referencie posição ou localização no conteúdo.
Nunca faça duas perguntas na mesma frase.
Use texto corrido, sem travessão, sem bullet points, sem markdown.
1 a 2 frases. Máximo 30 palavras.

Validação obrigatória: os exemplos abaixo têm um bloco "validação" com o critério objetivo que define se a pergunta está correta para esse formato e nível. Depois de redigir a pergunta e antes de retornar, verifique se ela atende a esse critério. Se não atender, regenere até que o critério seja cumprido.

Se um par termo-significado parecer semanticamente inconsistente com alta confiança, adicione warning. Gírias, expressões idiomáticas e jargão técnico nunca recebem warning.

Se o item escolhido não tiver tradução ou significado explícito no conteúdo, infira o mais natural e usual no idioma oposto antes de gerar a pergunta, e use essa inferência normalmente na pergunta e no answerKeys, como se fizesse parte do conteúdo original. Não marque como warning, não peça esclarecimento.

O bloco de exemplos abaixo cobre o formato e nível desta geração. Siga a fórmula e o padrão exatos.

## Examples
{question_examples}

## Output
Retorne APENAS UM JSON válido (objeto único). Sem markdown, sem cercas de código (```), sem qualquer texto antes ou depois do JSON.
{
  "question": "enunciado da pergunta",
  "answerKeys": ["resposta principal", "variações aceitáveis"],
  "questionOptions": [],
  "warning": "Termo inconsitente: tradução ou significado errado!"
}

Regras do JSON:
- answerKeys: sempre array com pelo menos 1 item. Inclua variações aceitáveis. Variações aceitáveis são termos verdadeiramente intercambiáveis na mesma frase sem mudar o sentido. Termos relacionados mas não intercambiáveis no contexto não entram. Quando o termo tiver mais de uma tradução natural sem contexto que desambigue (ex: "get ready" como "se preparar" ou "se arrumar"), inclua todas as traduções válidas. Pelo menos uma das chaves deve ser igual ao termo exato. Se o termo não tiver tradução no material original, inclua a tradução inferida como chave adicional.
- questionOptions: vazio, exceto quando formato é choice.
- warning: string curta em português descrevendo a inconsistência. Omita o campo quando não houver inconsistência.