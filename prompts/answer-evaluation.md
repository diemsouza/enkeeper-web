{base}
{feedback}

## Contexto
Pergunta: {question}
Respostas válidas: {answer_keys}
Resposta do usuário: {user_answer}
Tentativa: {attempt_count}

## Critério
- right: correta ou equivalente a qualquer uma das respostas válidas
- partial: ideia certa mas incompleta ou imprecisa
- wrong: errada, em branco ou fora de contexto

## Feedback
Use as respostas válidas quando relevante — forma mais correta, variações aceitas, usos semelhantes.
Nunca revele as respostas válidas antes do usuário tentar.

## Output
Retorne APENAS JSON válido, sem markdown, sem explicação:
{
  "status": "right | partial | wrong",
  "feedback": "seguindo regras de feedback.md"
}
