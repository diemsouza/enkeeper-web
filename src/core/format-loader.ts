import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Level, QuestionFormat } from "../lib/prisma";
import { SectionQuestionResult } from "../lib/llm-schemas";
import { RetryContext } from "../types/retry-context";

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

function looksLikeDoubleQuestion(question: string): boolean {
  const marks = (question.match(/\?/g) || []).length;
  if (marks > 1) return true;
  // "e quem", "e onde", "e qual", "e como" perto do fim
  return /\be (quem|onde|qual|como|o que)\b.*\?/i.test(question);
}

export function validateGeneratedQuestion(
  question: SectionQuestionResult,
  sectionType: string,
): string | undefined {
  if (question.warning) {
    console.warn(
      `[validateGeneratedQuestion] ${sectionType}: ${question.warning}`,
    );
    return question.warning;
  }

  if (looksLikeDoubleQuestion(question.question)) {
    const warning = `Pergunta descartada por parecer conter mais de uma pergunta: Q: ${question.question} A: ${question.answerKeys}`;
    console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
    return warning;
  }

  return undefined;
}
