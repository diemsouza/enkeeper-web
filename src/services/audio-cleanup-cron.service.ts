import { Question } from "../lib/prisma";
import {
  findQuestionsWithExpiredAudio,
  countQuestionsWithExpiredAudio,
  updateQuestion,
} from "../repo/questions.repo";
import { deleteFiles } from "../vendors/storage.vendor";
import {
  AUDIO_CLEANUP_TTL_DAYS,
  AUDIO_CLEANUP_BATCH_LIMIT,
  AUDIO_CLEANUP_SUBBATCH_SIZE,
} from "../lib/constants";

type AudioCleanupResult = {
  totalEligible: number;
  processed: number;
  deleted: number;
  failures: number;
};

export async function processAudioCleanup(): Promise<AudioCleanupResult> {
  const threshold = new Date(
    Date.now() - AUDIO_CLEANUP_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const [totalEligible, questions] = await Promise.all([
    countQuestionsWithExpiredAudio(threshold),
    findQuestionsWithExpiredAudio(threshold, AUDIO_CLEANUP_BATCH_LIMIT),
  ]);

  let deleted = 0;
  let failures = 0;

  for (let i = 0; i < questions.length; i += AUDIO_CLEANUP_SUBBATCH_SIZE) {
    const subBatch = questions.slice(i, i + AUDIO_CLEANUP_SUBBATCH_SIZE);
    const result = await deleteSubBatch(subBatch);
    deleted += result.deleted;
    failures += result.failures;
  }

  console.log(
    `[processAudioCleanup] processados ${questions.length}/${totalEligible} elegiveis, deletados: ${deleted}, falhas: ${failures}`,
  );
  if (totalEligible > questions.length) {
    console.warn(
      `[processAudioCleanup] teto de ${AUDIO_CLEANUP_BATCH_LIMIT} atingido, ${totalEligible - questions.length} pendentes para proxima execucao`,
    );
  }

  return { totalEligible, processed: questions.length, deleted, failures };
}

async function deleteSubBatch(
  questions: Question[],
): Promise<{ deleted: number; failures: number }> {
  const filePaths = questions
    .map((q) => q.audioPath)
    .filter((path): path is string => path !== null);

  try {
    const deletedNames = await deleteFiles({ filePaths });
    return markDeleted(questions, deletedNames);
  } catch (err) {
    console.error(
      `[processAudioCleanup] sub-lote falhou, tentando item a item:`,
      err,
    );
    return retryIndividually(questions);
  }
}

async function markDeleted(
  questions: Question[],
  deletedNames: string[],
): Promise<{ deleted: number; failures: number }> {
  const deletedSet = new Set(deletedNames);
  let deleted = 0;
  for (const question of questions) {
    if (question.audioPath && deletedSet.has(question.audioPath)) {
      await updateQuestion(question.id, { audioDeletedAt: new Date() });
      deleted++;
    }
  }
  return { deleted, failures: questions.length - deleted };
}

async function retryIndividually(
  questions: Question[],
): Promise<{ deleted: number; failures: number }> {
  let deleted = 0;
  let failures = 0;
  for (const question of questions) {
    if (!question.audioPath) {
      failures++;
      continue;
    }
    try {
      const deletedNames = await deleteFiles({ filePaths: [question.audioPath] });
      if (deletedNames.length > 0) {
        await updateQuestion(question.id, { audioDeletedAt: new Date() });
        deleted++;
      } else {
        failures++;
      }
    } catch (err) {
      console.error(`[processAudioCleanup] question ${question.id} falhou:`, err);
      failures++;
    }
  }
  return { deleted, failures };
}
