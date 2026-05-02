import { readFileSync } from "fs";
import { join } from "path";

function read(file: string): string {
  return readFileSync(join(process.cwd(), "prompts", file), "utf-8").trim();
}

export const BASE_PROMPT = read("base.md");
export const FEEDBACK_PROMPT = read("feedback.md");

export const APPROACH_PROMPTS: Record<string, string> = {
  memorize: read("approaches/memorize.md"),
  understand: read("approaches/understand.md"),
  practice: read("approaches/practice.md"),
  discuss: read("approaches/discuss.md"),
  reflect: read("approaches/reflect.md"),
};
