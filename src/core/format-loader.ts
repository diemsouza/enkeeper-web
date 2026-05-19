import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Level, QuestionFormat } from "@prisma/client";
import { SectionQuestionResult } from "../lib/llm-schemas";

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
  questions: SectionQuestionResult,
  sectionType: string,
): { questions: SectionQuestionResult; hasWarning: boolean } {
  // Validação anti-vazamento entre itens adjacentes (só vocabulary).
  // sourceItem é o "ponteiro" declarado pelo modelo pro item da lista
  // que ele está cobrindo. Pra ser válido:
  // - recall_inverted: sourceItem deve aparecer na pergunta (ex: "O que significa 'blanket'?")
  // - demais formatos: sourceItem deve estar no answerKeys
  // Se não bater, descarta. sourceItem removido antes de salvar (auditoria).

  let hasWarning = false;
  let valid = [...questions];
  if (!!valid.length && sectionType === "vocabulary") {
    valid = valid
      .filter((q) => {
        const source = q.sourceItem?.toLowerCase().trim();
        if (!source) return false;
        if (q.warning) {
          console.warn(
            `[gen-vocabulary] Pergunta descartada por warning: ${q.warning}. Q: ${q.question} A: ${q.answerKeys}`,
          );
          hasWarning = true;
          return false;
        }

        if (q.questionFormat === "recall_inverted") {
          // sourceItem aparece NA pergunta (entre aspas)
          return q.question.toLowerCase().includes(source);
        }

        // demais formatos: sourceItem está no answerKeys
        const keys = q.answerKeys.map((k) => k.toLowerCase().trim());
        return keys.includes(source);
      })
      .map(({ sourceItem, ...rest }) => rest);

    const discarded = questions.length - valid.length;
    if (discarded > 0) {
      console.warn(
        `[gen-vocabulary] ${discarded}/${questions.length} perguntas descartadas por sourceItem inconsistente`,
      );
    }
  }

  // Cenário: se não tiver conseguido validar por sourceItem, pelo menos tenta filtrar perguntas que parecem conter mais de uma pergunta (só cenário, que é o mais propenso a isso).
  if (!!valid.length && sectionType === "scenario") {
    valid = valid.filter((q) => {
      if (looksLikeDoubleQuestion(q.question)) {
        console.warn(
          `[gen-scenario] Pergunta descartada por parecer conter mais de uma pergunta: Q: ${q.question} A: ${q.answerKeys}`,
        );
        hasWarning = true;
        return false;
      }
      return true;
    });
  }

  return { questions: valid, hasWarning };
}
