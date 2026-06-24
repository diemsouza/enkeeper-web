import { DocType } from "../lib/prisma";

type DocItemValidationResult =
  | { success: true }
  | { success: false; error: string };

const UNSUPPORTED_TYPE_ERROR =
  "Formato incompatível. Envie um texto, imagem ou PDF com conteúdo relevante em inglês para criar uma atividade e começar a praticar.";

const SUPPORTED_TYPES: DocType[] = ["text", "image", "pdf"];

export function validateDocItemInput(
  rawContent: string,
  docType: DocType,
): DocItemValidationResult {
  if (!SUPPORTED_TYPES.includes(docType)) {
    console.warn("[doc-item-service] item rejected", {
      docType,
      reason: "unsupported_type",
    });
    return { success: false, error: UNSUPPORTED_TYPE_ERROR };
  }

  if (!rawContent || rawContent.trim().length === 0) {
    console.warn("[doc-item-service] item rejected", {
      docType,
      reason: "empty_content",
    });
    return { success: false, error: UNSUPPORTED_TYPE_ERROR };
  }

  return { success: true };
}
