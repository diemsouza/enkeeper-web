## Tip
As regras desta seção valem apenas para os campos eval_tip_class e eval_tip. Não afetam o feedback_text nem os demais campos.

eval_tip_class: classifique antes de escrever a dica.

Em wrong ou partial, a causa do erro:

- calque: o usuário traduziu o conceito do PT para o inglês de forma literal, chegando
  na palavra errada para aquele sentido. A palavra pode não existir em inglês, ou existir
  com outro significado. O mecanismo é sempre o mesmo: partiu do português.
  (borracha no lugar de eraser: falso cognato, rubber é material; hot no lugar de warm-up: tradução literal de "quente")
- near_synonym: a palavra existe e tem sentido próximo, mas o escopo de uso não cobre 
  esse contexto. Não é erro de tradução, é escolha errada dentro do inglês.
  (say vs tell, borrow vs lend, hear vs listen)
  Na origem generated, se o termo cabe naturalmente na frase com o sentido pedido, não é near_synonym: o status é right e a classe é alternative.
- structure: a palavra ou ideia está certa, mas falta um elemento gramatical para a 
  frase funcionar em inglês. Quando esse elemento é obrigatório em inglês mas não 
  marcado no português (posse, artigo, preposição), a eval_tip nomeia a regra da língua 
  em linguagem simples, sem termo técnico, dizendo qual elemento o inglês exige e por quê, 
  para o usuário aplicar em outros casos iguais.
  (hot lugar de warm-up não é structure, porque a palavra em si está errada, não a estrutura)
- collocation: as palavras individualmente estão certas, mas a combinação não é usada 
  em inglês nativo. Erro de colocação, não de vocabulário.
  (do a mistake, make a research, assist to a meeting)
- literal_idiom: expressão fixa interpretada pelo significado das palavras individuais.
  (call it a day, under the weather, break a leg)
- register: a palavra existe e é correta em outro contexto, mas o nível de formalidade
  não encaixa no que foi pedido.
  (commence no lugar de start: correto mas formal demais para contexto casual)
- homophone: só em transcrição de áudio. O usuário trocou uma palavra por outra de mesmo
  som ou som quase igual, com grafia e sentido diferentes.
  (their no lugar de there, week no lugar de weak, mourning no lugar de morning)
- connected_speech: só em transcrição de áudio. O usuário omitiu uma forma fraca que some
  na fala rápida (to, of, a, have, the) ou não separou palavras que se ligam na fala.
  (going run no lugar de going to run, should of no lugar de should have, alot no lugar de a lot)
- spelling: a intenção era o termo certo, só a grafia está errada. Obriga eval_tip vazia.
- none: não é possível identificar o mecanismo do erro. Obriga eval_tip vazia.

Em right:

- alternative: answerKeys contém um termo diferente do que o usuário escreveu, não só variação de flexão, artigo ou contração. Vale quando o usuário respondeu uma das answerKeys e existe outra, e também quando a resposta foi aceita por equivalência (incluindo pela regra de origem generated) e a answerKey esperada é outra forma. A alternativa é a primeira answerKey que atenda a isso.
- none: sem alternativa assim. Obriga eval_tip vazia.

eval_tip: dica curta em PT, escrita a partir da classe acima, em frase corrida.
Em wrong ou partial: primeiro o que a forma escrita pelo usuário significa de fato ou o que falta nela, depois onde a forma correta se aplica.
Em right: apresenta a alternativa escrita exatamente como está em answerKeys, em *negrito*, com um uso em inglês. É complemento da resposta dada, nunca correção nem ressalva.

Os usos em inglês mostram o termo correto em contextos diferentes entre si, ou onde a forma que o usuário escreveu de fato se aplica. Nunca o termo correto acrescido de uma palavra colada nele.

Validação da dica:
- Máximo 40 palavras.
- Linguagem de aluno, sem nomenclatura gramatical.
- Descreve, não instrui.
- Não nomeia a classe no texto.
- Não repete a frase do feedback_text.
- Não compara com opção que o usuário não mencionou, exceto a alternativa vinda das answerKeys, citada literalmente.
- Os usos em inglês nunca contêm o termo correto acrescido de uma única palavra.
- Marcação permitida: *negrito* nas formas contrastadas, _itálico_ em termo ou expressão curta em inglês, "aspas duplas" em frase completa em inglês (com sujeito e verbo), ~riscado~ apenas na forma exata que não existe em inglês (palavra inventada ou combinação inexistente). Nunca risca palavra que existe com outro significado ou escopo. Na dúvida, não risca. Nenhuma outra marcação.
- Nunca aplica itálico ou negrito dentro de trecho entre aspas.
- Sem quebra de linha, sem emoji, sem travessão.
- Vazia quando: user_unknown true, eval_tip_class spelling ou none.

## Translation
feedback_translation: tradução natural em português da frase completa em feedback_text, mesmo conteúdo, sem explicar o significado do termo isolado nem funcionar como definição de dicionário. Nunca adiciona informação que não está em feedback_text, nem contexto extra. Texto corrido, sem quebra de linha, sem markdown, sem emoji, sem travessão, sem aspas envolvendo a frase inteira.

Diferente do eval_tip, feedback_translation é sempre preenchida, inclusive quando status é right.
