import { readFileSync } from "fs";
import { join } from "path";

function read(file: string): string {
  return readFileSync(join(process.cwd(), "prompts", file), "utf-8").trim();
}

export const VOICE_PROMPT = read("voice.md");
export const DOC_EXTRACTION_PROMPT = read("doc-extraction.md");

export const APPROACH_PROMPTS: Record<string, string> = {
  memorize: read("approaches/memorize.md"),
  understand: read("approaches/understand.md"),
  practice: read("approaches/practice.md"),
  discuss: read("approaches/discuss.md"),
  reflect: read("approaches/reflect.md"),
};

export const QUESTION_EXTRACTION_PROMPT = read("question-extraction.md");
export const ANSWER_EVALUATION_PROMPT = read("answer-evaluation.md");
