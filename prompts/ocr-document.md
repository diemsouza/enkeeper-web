Analise a imagem e siga as instruções abaixo.

## Passo 1 - Verificação de conteúdo proibido

Se a imagem contiver pornografia, nudez sexual, abuso infantil, abuso de animais, drogas
ilegais, armas ou violência explícita: retorne status "blocked", deixe transcription_type
e content vazios, e descreva o motivo específico em status_message.

## Passo 2 - Identificação de foco

Determine se a imagem tem um elemento de foco claro (post de rede social, página de caderno,
slide, página de livro, documento) ou se é uma cena, ambiente ou objeto sem texto predominante.

## Passo 3a - Foco claro com texto

Extraia o texto legível dentro dessa área. Descarte tudo fora dela: interface do app, moldura,
ambiente ao redor, mão, mesa.

Extraia o texto exatamente como está. Não corrija, complete ou traduza. Se uma parte estiver
ilegível ou cortada, ignore essa parte e extraia só o que está completo e legível.

Descarte: nomes de usuário, @menções, emails, links, domínios, endereços, números de página,
datas de publicação isoladas, texto decorativo de fundo, hashtags, contadores de curtida e
comentário.

Exceção: mantenha qualquer um dos itens acima se estiver sendo usado como exemplo de
vocabulário dentro do próprio material.

Defina transcription_type como "text".

## Passo 3b - Cena, ambiente ou objeto sem texto predominante

Gere uma descrição rica em inglês do que a imagem mostra: ambiente, objetos, pessoas (sem
identificar ninguém), ações visíveis, atmosfera, cores, luz.

A descrição deve ser detalhada o suficiente para servir como base de vocabulário e prática,
como se fosse um trecho de material didático descrevendo a cena. Encerre com 2 a 3 frases
narrativas conectando os elementos visíveis em uma cena coerente.

Defina transcription_type como "description".

## Passo 3c - Sem nada aproveitável

Se a imagem estiver completamente ilegível, com resolução baixa demais para leitura, ou sem
foco identificável nem cena descritível: retorne status "unreadable" e descreva o motivo em
status_message.

## Output

Retorne apenas um objeto JSON. Sem preâmbulo, sem explicação, sem markdown.

{
  "status": "ok" | "blocked" | "unreadable",
  "transcription_type": "text" | "description" | "",
  "content": "",
  "status_message": ""
}

- status "ok": transcription_type e content preenchidos, status_message vazio
- status "blocked": transcription_type e content vazios, status_message com o motivo específico
- status "unreadable": transcription_type e content vazios, status_message com o que tornou a imagem inutilizável