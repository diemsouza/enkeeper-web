import { NoteType } from "@prisma/client";
import { parseMessage } from "../core/parser";
import {
  formatCommandList,
  formatDeleteHelp,
  formatEditHelp,
  formatNoteDeleted,
  formatNoteEdited,
  formatNotesList,
  formatNoteSaved,
  formatPauseStub,
  formatReferralMessage,
  formatSearchResults,
  formatTagList,
  formatTagNotes,
  formatUpgradePrompt,
} from "../core/formatters";
import {
  canCreateTag,
  canSaveNote,
  canUseAudio,
  canUseImage,
  canUseSearch,
} from "../core/limits";
import {
  createNote,
  findNoteById,
  findNotesByDateRange,
  findNotesByTag,
  searchNotes,
  softDeleteNote,
  updateNote,
} from "../repo/notes.repo";
import {
  attachTagsToNote,
  countUserTags,
  detachTagsFromNote,
  findOrCreateTag,
  findTagsByUser,
  incrementTagCount,
} from "../repo/tags.repo";
import { incrementDailyUsage, getTodayUsage } from "../repo/daily-usage.repo";
import { findOrCreateUserByChannel } from "./user-service";
import { transcribeAudio } from "../vendors/whisper.vendor";
import { extractTextFromImage } from "../vendors/vision.vendor";
import { IncomingMessage, PlanCode } from "../types/domain";

const userNoteIndexMap = new Map<string, string[]>();

export async function handleIncomingMessage(
  input: IncomingMessage,
): Promise<string> {
  const user = await findOrCreateUserByChannel(
    input.channelType,
    input.channelId,
    input.channelCode,
  );
  const plan = user.planCode as PlanCode;

  let text = input.text ?? "";
  let noteType: NoteType = "text";

  if (input.audioUrl) {
    if (!canUseAudio(plan)) return formatUpgradePrompt("audio");
    text = await transcribeAudio(input.audioUrl);
    noteType = "audio";
  } else if (input.imageUrl) {
    if (!canUseImage(plan)) return formatUpgradePrompt("image");
    text = await extractTextFromImage(input.imageUrl);
    noteType = "image";
  }

  const parsed = parseMessage(text);

  const today = new Date();
  const usage = await getTodayUsage(user.id, today);
  const todayCount = usage?.noteCount ?? 0;

  switch (parsed.intent) {
    case "save_note": {
      if (!canSaveNote(plan, todayCount))
        return formatUpgradePrompt("daily_limit");

      const tags = parsed.tags ?? [];
      if (tags.length > 0) {
        const tagCount = await countUserTags(user.id);
        if (!canCreateTag(plan, tagCount))
          return formatUpgradePrompt("tag_limit");
      }

      const note = await createNote({
        userId: user.id,
        noteType,
        content: parsed.content ?? text,
        rawContent: noteType !== "text" ? text : undefined,
        fileUrl: input.audioUrl ?? input.imageUrl,
      });

      if (tags.length > 0) {
        const tagRecords = await Promise.all(
          tags.map((name) => findOrCreateTag(user.id, name)),
        );
        await attachTagsToNote(
          note.id,
          tagRecords.map((t) => t.id),
        );
        await Promise.all(tagRecords.map((t) => incrementTagCount(t.id)));
      }

      await incrementDailyUsage(user.id, today);
      return formatNoteSaved(tags, todayCount + 1);
    }

    case "list_tags": {
      const tags = await findTagsByUser(user.id);
      return formatTagList(tags);
    }

    case "tag_notes": {
      const tagName = parsed.tagName ?? "";
      const notes = await findNotesByTag(user.id, tagName);
      return formatTagNotes(notes, tagName);
    }

    case "search": {
      if (!canUseSearch(plan)) return formatUpgradePrompt("search");
      const notes = await searchNotes(user.id, parsed.searchQuery ?? "");
      return formatSearchResults(notes, parsed.searchQuery ?? "");
    }

    case "delete_note": {
      if (!parsed.noteId) return formatDeleteHelp();
      const delIdx = parseInt(parsed.noteId, 10);
      const delRealId = userNoteIndexMap.get(user.id)?.[delIdx - 1];
      if (!delRealId) return "Número inválido. Use /notas para ver suas notas.";
      const noteToDelete = await findNoteById(delRealId, user.id);
      if (!noteToDelete) return "Nota não encontrada.";
      await softDeleteNote(delRealId, user.id);
      return formatNoteDeleted(noteToDelete.content);
    }

    case "edit": {
      if (!parsed.noteId) return formatEditHelp();
      const editIdx = parseInt(parsed.noteId, 10);
      const editRealId = userNoteIndexMap.get(user.id)?.[editIdx - 1];
      if (!editRealId)
        return "Número inválido. Use /notas para ver suas notas.";
      const noteToEdit = await findNoteById(editRealId, user.id);
      if (!noteToEdit) return "Nota não encontrada.";
      const editContent = parsed.editContent ?? "";
      await updateNote(editRealId, user.id, { content: editContent });
      await detachTagsFromNote(editRealId);
      const tags = parsed.tags ?? [];
      if (tags.length > 0) {
        const tagRecords = await Promise.all(
          tags.map((name) => findOrCreateTag(user.id, name)),
        );
        await attachTagsToNote(
          editRealId,
          tagRecords.map((t) => t.id),
        );
      }
      return formatNoteEdited(editContent);
    }

    case "list_commands":
      return formatCommandList();

    case "pause_reviews":
      return formatPauseStub();

    case "list_notes": {
      const filter = parsed.notesFilter ?? "today";
      const { from, to } = notesDateRange(filter);
      const raw = await findNotesByDateRange(user.id, from, to);
      userNoteIndexMap.set(
        user.id,
        raw.slice(0, 20).map((n) => n.id),
      );
      const notes = raw.map((n) => ({
        content: n.content,
        noteType: n.noteType as "text" | "audio" | "image",
        createdAt: n.createdAt,
        tags: n.noteTagRelations.map((r) => r.tag.name),
      }));
      return formatNotesList(notes, filter);
    }

    case "referral":
      return formatReferralMessage(user.id);
  }
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

function startOfDayBrazil(date: Date): Date {
  const brazil = new Date(date.getTime() - BRAZIL_OFFSET_MS);
  const midnight = new Date(
    Date.UTC(
      brazil.getUTCFullYear(),
      brazil.getUTCMonth(),
      brazil.getUTCDate(),
    ),
  );
  return new Date(midnight.getTime() + BRAZIL_OFFSET_MS);
}

function notesDateRange(filter: "today" | "yesterday" | "week"): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const todayStart = startOfDayBrazil(now);
  if (filter === "today") return { from: todayStart, to: now };
  if (filter === "yesterday") {
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { from: yesterdayStart, to: todayStart };
  }
  return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
}
