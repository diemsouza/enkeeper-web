import { shuffle } from "lodash";
import { TOPIC_SUGGESTIONS_DISPLAY_COUNT } from "../lib/constants";

// A ordem da lista de sugestões é estratégica (relevância definida pelo produto).
// Por isso sorteamos os índices e devolvemos os itens já reordenados de forma
// ascendente, preservando a ordem original em vez de embaralhar o resultado.
export function pickTopicSuggestions(topics: string[]): string[] {
  if (topics.length <= TOPIC_SUGGESTIONS_DISPLAY_COUNT) return topics;
  const indices = shuffle(topics.map((_, i) => i))
    .slice(0, TOPIC_SUGGESTIONS_DISPLAY_COUNT)
    .sort((a, b) => a - b);
  return indices.map((i) => topics[i]);
}
