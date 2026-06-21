import { DocType } from "@prisma/client";
import { validateContent } from "../core/validate-content";

type DocItemValidationResult =
  | { success: true }
  | { success: false; error: string };

const UNSUPPORTED_TYPE_ERROR =
  "Formato não compatível. Envie um texto, imagem ou PDF com texto relevante em inglês para criar uma atividade e começar a praticar.";

const SUPPORTED_TYPES: DocType[] = ["text", "image", "pdf"];

export function validateDocItemInput(
  rawContent: string,
  docType: DocType,
): DocItemValidationResult {
  if (!SUPPORTED_TYPES.includes(docType)) {
    return { success: false, error: UNSUPPORTED_TYPE_ERROR };
  }

  if (!rawContent || rawContent.trim().length === 0) {
    return { success: false, error: UNSUPPORTED_TYPE_ERROR };
  }

  const validation = validateContent(rawContent);
  if (!validation.isValid) {
    return { success: false, error: UNSUPPORTED_TYPE_ERROR };
  }

  return { success: true };
}
