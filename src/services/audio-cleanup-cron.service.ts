import { Media } from "../lib/prisma";
import {
  findQuestionsEligibleForAudioCleanup,
  countQuestionsEligibleForAudioCleanup,
} from "../repo/questions.repo";
import { findMediaByParentIds, softDeleteMedia } from "../repo/media.repo";
import { deleteFiles } from "../vendors/storage.vendor";
import {
  MEDIA_PARENT_TYPE,
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
    countQuestionsEligibleForAudioCleanup(threshold),
    findQuestionsEligibleForAudioCleanup(threshold, AUDIO_CLEANUP_BATCH_LIMIT),
  ]);

  const medias = await findMediaByParentIds(
    MEDIA_PARENT_TYPE.QUESTION,
    questions.map((q) => q.id),
  );

  let deleted = 0;
  let failures = 0;

  for (let i = 0; i < medias.length; i += AUDIO_CLEANUP_SUBBATCH_SIZE) {
    const subBatch = medias.slice(i, i + AUDIO_CLEANUP_SUBBATCH_SIZE);
    const result = await deleteSubBatch(subBatch);
    deleted += result.deleted;
    failures += result.failures;
  }

  console.log(
    `[processAudioCleanup] processados ${medias.length} midias de ${questions.length}/${totalEligible} questions elegiveis, deletados: ${deleted}, falhas: ${failures}`,
  );
  if (totalEligible > questions.length) {
    console.warn(
      `[processAudioCleanup] teto de ${AUDIO_CLEANUP_BATCH_LIMIT} atingido, ${totalEligible - questions.length} pendentes para proxima execucao`,
    );
  }

  return { totalEligible, processed: medias.length, deleted, failures };
}

async function deleteSubBatch(
  medias: Media[],
): Promise<{ deleted: number; failures: number }> {
  const filePaths = medias.map((m) => m.mediaPath);

  try {
    const deletedNames = await deleteFiles({ filePaths });
    return markDeleted(medias, deletedNames);
  } catch (err) {
    console.error(
      `[processAudioCleanup] sub-lote falhou, tentando item a item:`,
      err,
    );
    return retryIndividually(medias);
  }
}

async function markDeleted(
  medias: Media[],
  deletedNames: string[],
): Promise<{ deleted: number; failures: number }> {
  const deletedSet = new Set(deletedNames);
  let deleted = 0;
  for (const media of medias) {
    if (deletedSet.has(media.mediaPath)) {
      await softDeleteMedia(media.id);
      deleted++;
    }
  }
  return { deleted, failures: medias.length - deleted };
}

async function retryIndividually(
  medias: Media[],
): Promise<{ deleted: number; failures: number }> {
  let deleted = 0;
  let failures = 0;
  for (const media of medias) {
    try {
      const deletedNames = await deleteFiles({ filePaths: [media.mediaPath] });
      if (deletedNames.length > 0) {
        await softDeleteMedia(media.id);
        deleted++;
      } else {
        failures++;
      }
    } catch (err) {
      console.error(`[processAudioCleanup] media ${media.id} falhou:`, err);
      failures++;
    }
  }
  return { deleted, failures };
}
