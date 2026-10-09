import { QuestionFormat } from "../lib/prisma";
import { EVAL_TIP_CLASSES_BY_FORMAT } from "../lib/constants";
import { normalizeForMatch } from "./format-loader";

function toComparable(text: string): string {
  return normalizeForMatch(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Em acerto, a dica só vale se citar uma answerKey diferente do que o usuário
// escreveu: a alternativa vem das respostas esperadas, nunca inventada na avaliação.
export function hasAlternativeKeyInTip(
  answerKeys: string[],
  userAnswer: string,
  evalTip: string,
): boolean {
  const answer = toComparable(userAnswer);
  const tip = ` ${toComparable(evalTip)} `;
  return answerKeys.some((key) => {
    const normalizedKey = toComparable(key);
    return (
      normalizedKey !== "" &&
      normalizedKey !== answer &&
      tip.includes(` ${normalizedKey} `)
    );
  });
}

export function isEvalTipClassAllowed(
  format: QuestionFormat | null,
  tipClass: string | undefined,
): boolean {
  if (!format || !tipClass) return true;
  return EVAL_TIP_CLASSES_BY_FORMAT[format].some((c) => c === tipClass);
}
