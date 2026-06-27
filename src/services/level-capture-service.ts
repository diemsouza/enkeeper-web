import { Level } from "../lib/prisma";
import { parseLevelInput } from "../core/parser";
import {
  formatLevelConfirmed,
  formatLevelCanceled,
  formatLevelQuestion,
} from "../core/formatters";
import { updateUserLevel } from "../repo/users.repo";

export type LevelCaptureResult = {
  outcome: "captured" | "canceled" | "invalid";
  message: string;
};

export async function processLevelResponse(
  text: string,
  userId: string,
): Promise<LevelCaptureResult> {
  const parsed = parseLevelInput(text);
  if (parsed === "cancel")
    return { outcome: "canceled", message: formatLevelCanceled() };
  if (parsed === null)
    return { outcome: "invalid", message: formatLevelQuestion() };
  await updateUserLevel(userId, parsed as Level);
  return { outcome: "captured", message: formatLevelConfirmed() };
}
