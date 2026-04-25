import { NoteType } from "@prisma/client";
import { parseMessage } from "../core/parser";
import {
  formatCommandList,
  formatConfirmNotFound,
  formatDeleteNoteHelp,
  formatDeleteTagConfirm,
  formatEditNoteHelp,
  formatEditTagHelp,
  formatInvalidCommand,
  formatInvalidTag,
  formatNoteDeleted,
  formatNoteEdited,
  formatNoteIndexNotFound,
  formatNotesList,
  formatNoteSaved,
  formatPauseStub,
  formatReferralMessage,
  formatSearchResults,
  formatTagDeleted,
  formatTagEdited,
  formatTagList,
  formatTagNotFound,
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
  findNoteByUserIndex,
  findNotesByDateRange,
  findNotesByTag,
  searchNotes,
  softDeleteNote,
  updateNote,
} from "../repo/notes.repo";
import {
  attachTagsToNote,
  countNotesByTag,
  countUserTags,
  decrementTagCount,
  deleteTag,
  detachTagsFromNote,
  findOrCreateTag,
  findTagNamesByNote,
  findTagsByNames,
  findTagsByUser,
  incrementTagCount,
  renameTag,
} from "../repo/tags.repo";
import { incrementDailyUsage, getTodayUsage } from "../repo/daily-usage.repo";
import { saveMessage, findLastUserMessage } from "../repo/messages.repo";
import { findOrCreateUserByChannel } from "./user-service";
import { transcribeAudio } from "../vendors/whisper.vendor";
import { extractTextFromImage } from "../vendors/vision.vendor";
import { IncomingMessage, PlanCode } from "../types/domain";

export async function handleIncomingMessage(
  input: IncomingMessage,
): Promise<string> {
  const user = await findOrCreateUserByChannel(
    input.channelType,
    input.channelId,
    input.channelCode,
  );
  const plan = user.planCode as PlanCode;
  const userChannel = user.channels.find(c => c.channelId === input.channelId)!;

  // Fetch before saving inbound so confirm handler sees the previous message
  const lastUserMessage = await findLastUserMessage(user.id);

  let text = input.text ?? "";
  let noteType: NoteType = "text";

  if (input.audioUrl) {
    if (!canUseAudio(plan)) {
      const reply = formatUpgradePrompt("audio");
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return reply;
    }
    text = await transcribeAudio(input.audioUrl);
    noteType = "audio";
  } else if (input.imageUrl) {
    if (!canUseImage(plan)) {
      const reply = formatUpgradePrompt("image");
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return reply;
    }
    text = await extractTextFromImage(input.imageUrl);
    noteType = "image";
  }

  const parsed = parseMessage(text);

  const hasMedia = !!(input.audioUrl || input.imageUrl);
  const savedMessage = await saveMessage({
    userId: user.id,
    userChannelId: userChannel.id,
    role: "user",
    content: input.text ?? "",
    intent: parsed.intent,
    externalId: input.externalId,
    metadata: hasMedia ? { audioUrl: input.audioUrl ?? null, imageUrl: input.imageUrl ?? null } : undefined,
  });

  const today = new Date();
  const usage = await getTodayUsage(user.id, today);
  const todayCount = usage?.noteCount ?? 0;

  let reply: string;

  switch (parsed.intent) {
    case "save_note": {
      if (!canSaveNote(plan, todayCount)) {
        reply = formatUpgradePrompt("daily_limit");
        break;
      }

      const tags = parsed.tags ?? [];
      if (tags.length > 0) {
        const tagCount = await countUserTags(user.id);
        if (!canCreateTag(plan, tagCount)) {
          reply = formatUpgradePrompt("tag_limit");
          break;
        }
      }

      const note = await createNote({
        userId: user.id,
        noteType,
        content: parsed.content ?? text,
        rawContent: noteType !== "text" ? text : undefined,
        fileUrl: input.audioUrl ?? input.imageUrl,
        messageId: savedMessage.id,
      });

      if (tags.length > 0) {
        const tagRecords = await Promise.all(
          tags.map((name) => findOrCreateTag(user.id, name)),
        );
        await attachTagsToNote(note.id, tagRecords.map((t) => t.id));
        await Promise.all(tagRecords.map((t) => incrementTagCount(t.id)));
      }

      await incrementDailyUsage(user.id, today);
      reply = formatNoteSaved(tags, todayCount + 1);
      break;
    }

    case "list_tags": {
      const tags = await findTagsByUser(user.id);
      reply = formatTagList(tags);
      break;
    }

    case "tag_notes": {
      const tagName = parsed.tagName ?? "";
      const notes = await findNotesByTag(user.id, tagName);
      reply = formatTagNotes(notes, tagName);
      break;
    }

    case "search": {
      if (!canUseSearch(plan)) {
        reply = formatUpgradePrompt("search");
        break;
      }
      const notes = await searchNotes(user.id, parsed.searchQuery ?? "");
      reply = formatSearchResults(notes, parsed.searchQuery ?? "");
      break;
    }

    case "delete_note": {
      if (!parsed.noteId) {
        reply = formatDeleteNoteHelp();
        break;
      }
      const idx = parseInt(parsed.noteId, 10);
      const note = await findNoteByUserIndex(user.id, idx, "today");
      if (!note) {
        reply = formatNoteIndexNotFound();
        break;
      }
      await softDeleteNote(note.id, user.id);
      reply = formatNoteDeleted(note.content);
      break;
    }

    case "edit": {
      if (!parsed.noteId) {
        reply = formatEditNoteHelp();
        break;
      }
      const idx = parseInt(parsed.noteId, 10);
      const note = await findNoteByUserIndex(user.id, idx, "today");
      if (!note) {
        reply = formatNoteIndexNotFound();
        break;
      }
      const editContent = parsed.editContent ?? "";
      await updateNote(note.id, user.id, { content: editContent });

      const oldTagNames = await findTagNamesByNote(note.id);
      await detachTagsFromNote(note.id);

      const editTags = parsed.tags ?? [];
      const oldSet = new Set(oldTagNames);
      const newSet = new Set(editTags);
      const addedNames = editTags.filter(n => !oldSet.has(n));
      const removedNames = oldTagNames.filter(n => !newSet.has(n));

      if (editTags.length > 0) {
        const tagRecords = await Promise.all(editTags.map(name => findOrCreateTag(user.id, name)));
        await attachTagsToNote(note.id, tagRecords.map(t => t.id));
        const addedRecords = tagRecords.filter(t => addedNames.includes(t.name));
        if (addedRecords.length > 0) {
          await Promise.all(addedRecords.map(t => incrementTagCount(t.id)));
        }
      }

      if (removedNames.length > 0) {
        const removedRecords = await findTagsByNames(user.id, removedNames);
        await Promise.all(removedRecords.map(t => decrementTagCount(t.id)));
      }

      reply = formatNoteEdited(editContent);
      break;
    }

    case "delete_tag": {
      const tagName = parsed.tagName ?? "";
      const count = await countNotesByTag(user.id, tagName);
      if (count === null) {
        reply = formatTagNotFound(tagName);
        break;
      }
      reply = formatDeleteTagConfirm(tagName, count);
      break;
    }

    case "edit_tag": {
      const tagName = parsed.tagName ?? "";
      const tagNewName = parsed.tagNewName;
      if (!tagNewName) {
        reply = formatEditTagHelp();
        break;
      }
      const renamed = await renameTag(user.id, tagName, tagNewName);
      if (!renamed) {
        reply = formatTagNotFound(tagName);
        break;
      }
      reply = formatTagEdited(tagName, tagNewName);
      break;
    }

    case "confirm": {
      if (lastUserMessage?.intent === "delete_tag") {
        const prevParsed = parseMessage(lastUserMessage.content);
        const tagName = prevParsed.tagName ?? "";
        await deleteTag(user.id, tagName);
        reply = formatTagDeleted(tagName);
      } else {
        reply = formatConfirmNotFound();
      }
      break;
    }

    case "invalid_command":
      reply = formatInvalidCommand();
      break;

    case "invalid_tag":
      reply = formatInvalidTag();
      break;

    case "list_commands":
      reply = formatCommandList();
      break;

    case "pause_reviews":
      reply = formatPauseStub();
      break;

    case "referral":
      reply = formatReferralMessage(user.id);
      break;

    case "list_notes": {
      const filter = parsed.notesFilter ?? "today";
      const { from, to } = notesDateRange(filter);
      const raw = await findNotesByDateRange(user.id, from, to);
      const notes = raw.map((n) => ({
        content: n.content,
        noteType: n.noteType as "text" | "audio" | "image",
        createdAt: n.createdAt,
        tags: n.noteTagRelations.map((r) => r.tag.name),
      }));
      reply = formatNotesList(notes, filter);
      break;
    }
  }

  await saveMessage({
    userId: user.id,
    userChannelId: userChannel.id,
    role: "assistant",
    content: reply,
  });

  return reply;
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

function startOfDayBrazil(date: Date): Date {
  const brazil = new Date(date.getTime() - BRAZIL_OFFSET_MS);
  const midnight = new Date(
    Date.UTC(brazil.getUTCFullYear(), brazil.getUTCMonth(), brazil.getUTCDate()),
  );
  return new Date(midnight.getTime() + BRAZIL_OFFSET_MS);
}

function notesDateRange(filter: "today" | "yesterday" | "week"): { from: Date; to: Date } {
  const now = new Date();
  const todayStart = startOfDayBrazil(now);
  if (filter === "today") return { from: todayStart, to: now };
  if (filter === "yesterday") {
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { from: yesterdayStart, to: todayStart };
  }
  return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
}
