import { readFileSync } from "node:fs";
import { join } from "node:path";
import { shuffle } from "lodash";
import { Level, QuestionFormat } from "../lib/prisma";
import { SectionQuestionResult } from "../lib/llm-schemas";
import { sanitizeText } from "../lib/utils";
import { RetryContext } from "../types/retry-context";
import { CreateQuestionData } from "../repo/questions.repo";

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

function stripQuoted(text: string): string {
  // remove trechos entre aspas (retas ou tipográficas) antes de contar "?"
  return text.replace(/["“”][^"“”]*["“”]/g, "");
}

function looksLikeDoubleQuestion(question: string): boolean {
  const stripped = stripQuoted(question);
  const marks = (stripped.match(/\?/g) || []).length;
  if (marks > 1) return true;
  // "e quem", "e onde", "e qual", "e como" perto do fim
  return /\be (quem|onde|qual|como|o que)\b.*\?/i.test(stripped);
}

// Aceita parênteses retos "()" e tipográficos "（）", com pelo menos
// um caractere alfanumérico dentro (evita falso positivo em "(...)"
// vazio ou pontuação solta).
const PARENTHESIZED_TERM_RE = /[\(（][^()\)）]*[a-zA-Z0-9À-ÿ][^()\)）]*[\)）]/;

function missingParenthesizedTerm(question: string): boolean {
  return !PARENTHESIZED_TERM_RE.test(question);
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Verifica se algum item de answerKeys aparece de forma literal na pergunta,
// como palavra ou expressão inteira (não como substring de outra palavra).
function containsAnswerInQuestion(
  question: string,
  answerKeys: string[],
): string | undefined {
  const normalizedQuestion = normalizeForMatch(question);

  for (const answer of answerKeys) {
    const trimmed = answer.trim();
    if (!trimmed) continue;

    const normalizedAnswer = normalizeForMatch(trimmed);
    const pattern = new RegExp(
      `(?<![a-z0-9À-ÿ])${escapeRegExp(normalizedAnswer)}(?![a-z0-9À-ÿ])`,
      "i",
    );

    if (pattern.test(normalizedQuestion)) {
      return trimmed;
    }
  }

  return undefined;
}

// Verifica quantos itens de answerKeys aparecem literalmente na pergunta.
// Só o primeiro deveria aparecer (quando aparecer), nunca mais de um.
function countAnswerKeysInQuestion(
  question: string,
  answerKeys: string[],
): string[] {
  const normalizedQuestion = normalizeForMatch(question);
  const matches: string[] = [];

  for (const answer of answerKeys) {
    const trimmed = answer.trim();
    if (!trimmed) continue;

    const normalizedAnswer = normalizeForMatch(trimmed);
    const pattern = new RegExp(
      `(?<![a-z0-9À-ÿ])${escapeRegExp(normalizedAnswer)}(?![a-z0-9À-ÿ])`,
      "i",
    );

    if (pattern.test(normalizedQuestion)) {
      matches.push(trimmed);
    }
  }

  return matches;
}

function overflowMaxWords(limit: number, question: string) {
  const situationOnly = question
    .replace(/\([^)]*\)/g, "")
    .slice(0, question.lastIndexOf(".") + 1 || question.length)
    .trim();

  const situationWordCount = situationOnly.split(/\s+/).filter(Boolean).length;

  return situationWordCount > limit;
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

  if (
    question.questionFormat === "scenario" &&
    missingParenthesizedTerm(question.question)
  ) {
    const warning = `Pergunta de cenário descartada por não trazer o termo entre parênteses: Q: ${question.question} A: ${question.answerKeys}`;
    console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
    return warning;
  }

  const leakedAnswer = containsAnswerInQuestion(
    question.question,
    question.answerKeys,
  );

  if (leakedAnswer) {
    const warning = `Pergunta descartada por conter a resposta no próprio enunciado ("${leakedAnswer}"): Q: ${question.question} A: ${question.answerKeys}`;
    console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
    return warning;
  }

  if (question.termHint) {
    const leakedAnswerInHint = containsAnswerInQuestion(
      question.termHint,
      question.answerKeys,
    );
    if (leakedAnswerInHint) {
      const warning = `Pergunta descartada por conter a resposta no termHint ("${leakedAnswerInHint}"): Q: ${question.question} A: ${question.answerKeys} Hint: ${question.termHint}`;
      console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
      return warning;
    }
  }

  const matchedAnswerKeys = countAnswerKeysInQuestion(
    question.question,
    question.answerKeys,
  );

  if (matchedAnswerKeys.length > 1) {
    const warning = `Pergunta descartada por referenciar mais de um answerKey ("${matchedAnswerKeys.join(
      '", "',
    )}"): Q: ${question.question} A: ${question.answerKeys}`;
    console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
    return warning;
  }

  const maxWords = 15; // Limite de palavras para perguntas de cenário
  if (
    question.questionFormat === "scenario" &&
    overflowMaxWords(maxWords, question.question)
  ) {
    const warning = `Pergunta descartada por estourar o limite de ${maxWords} palavras da situação, desconsiderando termo em parênteses e pergunta final. Q: ${question.question}`;
    console.warn(`[validateGeneratedQuestion] ${sectionType}: ${warning}`);
    return warning;
  }

  return undefined;
}

export function sanitizeQuestionData(
  data: SectionQuestionResult,
): CreateQuestionData {
  // sanitize termHint to remove leading/trailing non-alphanumeric characters
  const termHing = data.termHint
    ? sanitizeText(
        data.termHint.replace(/^[^a-zA-Z0-9À-ÿ]+|[^a-zA-Z0-9À-ÿ]+$/g, ""),
      )
    : undefined;
  return {
    question: sanitizeText(data.question),
    answerKeys: data.answerKeys.map((k) => sanitizeText(k)),
    questionFormat: data.questionFormat as QuestionFormat,
    questionOptions:
      data.questionFormat === QuestionFormat.choice
        ? shuffle(data.questionOptions.map((o) => sanitizeText(o)))
        : [],
    term: data.term ? sanitizeText(data.term) : undefined,
    termHint: termHing,
    meaning: data.meaning ? sanitizeText(data.meaning) : undefined,
    sourceContent: data.sourceContent
      ? sanitizeText(data.sourceContent)
      : undefined,
  };
}
