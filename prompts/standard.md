# Prompt Standard — Dropuz

Todo prompt segue esta estrutura em inglês. Conteúdo em português.

## Role

Quem é o modelo nesse contexto.

## Context

O que o modelo precisa saber sobre a situação.
Inputs de runtime ficam aqui: {variavel}.

## Rules

Tudo que pode e nao pode. Inclui:

- Restricoes de conteudo
- Tom e linguagem
- Tamanho e formatacao de texto (sem travessao, maximo X frases, etc)
- Quando precisar usar aspas, sempre use aspas duplas "assim".

## Output

Formato esperado da resposta.
Se for JSON: "Retorne APENAS JSON valido, sem markdown, sem explicacao."
Se for texto livre: descreve o padrao esperado.
