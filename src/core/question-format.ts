import { Level, QuestionFormat } from "@prisma/client";
import {
  recall,
  recall_inverted,
  gap_fill,
  scenario,
  choice,
  open_text,
  open_question,
} from "../formats";
import { QuestionFormatData } from "../formats/types";

const FORMAT_MAP: Record<QuestionFormat, QuestionFormatData> = {
  [QuestionFormat.recall]: recall,
  [QuestionFormat.recall_inverted]: recall_inverted,
  [QuestionFormat.gap_fill]: gap_fill,
  [QuestionFormat.scenario]: scenario,
  [QuestionFormat.choice]: choice,
  [QuestionFormat.open_text]: open_text,
  [QuestionFormat.open_question]: open_question,
};

const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.choice,
];

export function getFormatsBySectionType(
  sectionType: "vocabulary" | "text" | "exercise",
): QuestionFormat[] {
  if (sectionType === "exercise") return [QuestionFormat.open_question];
  if (sectionType === "text") return [QuestionFormat.open_text];
  return VOCABULARY_FORMATS;
}

export function getQuestionExamples(
  formats: QuestionFormat[],
  level: Level,
): string {
  const blocks = formats.map((f) => {
    const data = FORMAT_MAP[f];
    const lines = [`- ${data.levels[level].question}`];
    if (data.question_info) {
      lines.push(`- [instrução: ${data.question_info}]`);
    }
    return `${f}:\n${lines.join("\n")}`;
  });
  return blocks.join("\n\n");
}

export function getFeedbackExamples(
  formats: QuestionFormat[],
  level: Level,
): string {
  const blocks = formats.map((f) => {
    const data = FORMAT_MAP[f];
    const fb = data.levels[level].feedback;
    const lines = [`- right: ${fb.right}`];
    if (fb.wrong) lines.push(`- wrong: ${fb.wrong}`);
    if (fb.partial) lines.push(`- partial: ${fb.partial}`);
    if (data.feedback_info) {
      lines.push(`- [instrução: ${data.feedback_info}]`);
    }
    return `${f}:\n${lines.join("\n")}`;
  });
  return blocks.join("\n\n");
}
