import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Level, QuestionFormat } from "@prisma/client";

const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.choice,
];

const FORMAT_FILES: Record<QuestionFormat, string> = {
  [QuestionFormat.gap_fill]: read("gap_fill.md"),
  [QuestionFormat.recall]: read("recall.md"),
  [QuestionFormat.recall_inverted]: read("recall_inverted.md"),
  [QuestionFormat.scenario]: read("scenario.md"),
  [QuestionFormat.choice]: read("choice.md"),
  [QuestionFormat.open_text]: read("open_text.md"),
  [QuestionFormat.open_question]: read("open_question.md"),
};

function read(file: string): string {
  return readFileSync(
    join(process.cwd(), "prompts", "examples", file),
    "utf-8",
  ).trim();
}

export function getFormatsBySectionType(
  sectionType: "vocabulary" | "text" | "exercise",
): QuestionFormat[] {
  if (sectionType === "exercise") return [QuestionFormat.open_question];
  if (sectionType === "text") return [QuestionFormat.open_text];
  return VOCABULARY_FORMATS;
}

function extractSection(
  content: string,
  level: Level,
  section: "question" | "feedback",
): string {
  const levelHeader = `## ${level.toUpperCase()}`;
  const sectionHeader = `### ${section}`;

  const levelStart = content.indexOf(levelHeader);
  if (levelStart === -1) {
    throw new Error(`Level "${level}" not found`);
  }

  const afterLevel = levelStart + levelHeader.length;
  const nextLevel = content.indexOf("\n## ", afterLevel);
  const levelBlock = content.slice(
    afterLevel,
    nextLevel === -1 ? undefined : nextLevel,
  );

  const sectionStart = levelBlock.indexOf(sectionHeader);
  if (sectionStart === -1) {
    throw new Error(`Section "${section}" not found in level "${level}"`);
  }

  const afterSection = sectionStart + sectionHeader.length;
  const nextSection = levelBlock.indexOf("\n### ", afterSection);
  return levelBlock
    .slice(afterSection, nextSection === -1 ? undefined : nextSection)
    .trim();
}

function buildBlock(
  format: QuestionFormat,
  level: Level,
  section: "question" | "feedback",
): string {
  return `${format}:\n${extractSection(FORMAT_FILES[format], level, section)}`;
}

export function getQuestionExamples(
  formats: QuestionFormat[],
  level: Level,
): string {
  return formats.map((f) => buildBlock(f, level, "question")).join("\n\n");
}

export function getFeedbackExamples(
  formats: QuestionFormat[],
  level: Level,
): string {
  return formats.map((f) => buildBlock(f, level, "feedback")).join("\n\n");
}

type VocabItem = { term: string; translation: string };
type GeneratedQuestion = {
  sourceItem?: string;
  question: string;
  answerKeys: string[];
  questionFormat: string;
  questionOptions: string[];
};

export function validateVocabularyGeneration(
  items: VocabItem[],
  questions: GeneratedQuestion[],
) {
  const itemMap = new Map(items.map((i) => [i.term.toLowerCase().trim(), i]));

  const valid = [];
  const invalid = [];

  for (const q of questions) {
    const source = q.sourceItem?.toLowerCase().trim();
    const keys = q.answerKeys.map((k) => k.toLowerCase().trim());

    const itemExists = source && itemMap.has(source);
    const keyMatchesSource = source && keys.includes(source);

    if (itemExists && keyMatchesSource) {
      // remove sourceItem antes de salvar, é só auditoria
      const { sourceItem, ...rest } = q as any;
      valid.push(rest);
    } else {
      invalid.push(q);
      console.warn(
        `[gen-vocabulary] Descartada. sourceItem=${q.sourceItem}, answerKeys=${JSON.stringify(q.answerKeys)}`,
      );
    }
  }

  return { valid, invalid };
}
