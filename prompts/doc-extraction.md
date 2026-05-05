## Context
Conteúdo recebido: {raw_content}

## Rules
Extraia os campos abaixo. Se ambíguo, use "understand" para approach.
isValid é false se o conteúdo for muito curto, vago ou sem sentido pedagógico.

Classificação de approach:
- "memorize": lista de vocabulário, versículos, fórmulas, leis, citações para fixar
- "understand": conteúdo técnico explicativo, regras, sistemas, teorias, processos
- "practice": idioma estrangeiro para fluência, vocabulário técnico em uso real, exercícios para resolver
- "discuss": capítulo de livro, ensaio, artigo, palestra, não-ficção densa
- "reflect": devocional, autoajuda, espiritualidade, leitura introspectiva

approachConfidence: "high" se o sinal é claro, "medium" se material é misto, "low" se muito ambíguo.
invalidReason: null se válido, caso contrário breve explicação em português.
topics: lista de 8 a 12 tópicos principais para praticar (strings curtas).
content: reescreva o conteúdo de forma clara e objetiva, mantendo todas as informações importantes para estudo espaçado.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
{"title": "título curto, máx 8 palavras", "topics": ["tópico 1", "..."], "content": "conteúdo reescrito", "approach": "memorize | understand | practice | discuss | reflect", "approachConfidence": "high | medium | low", "isValid": true, "invalidReason": null}
