import { NoteType } from "@prisma/client";
import { extractTrailingTags, parseMessage } from "../core/parser";
import {
  formatAudioNoteSaved,
  formatImageNoteSaved,
  formatCommandList,
  formatConfirmNotFound,
  formatDeleteNoteHelp,
  formatDeleteNotePrompt,
  formatDeleteTagConfirm,
  formatEditNoteHelp,
  formatEditNotePrompt,
  formatEditTagPrompt,
  formatInvalidCommand,
  formatInvalidTag,
  formatNoteEdited,
  formatNoteIndexNotFound,
  formatNotesList,
  formatNoteSaved,
  formatOnboardingMessage,
  formatPauseStub,
  formatReferralMessage,
  formatSearchResults,
  formatSupportReceived,
  formatSupportRequest,
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
  findNoteById,
  findNoteByUserIndex,
  findNotesByDateRange,
  findNotesByTag,
  findRecentNotes,
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
import { saveMessage, findLastUserMessage, findLastOutboundMessageWithNoteIds } from "../repo/messages.repo";
import { markUserOnboarded } from "../repo/users.repo";
import { findOrCreateUserByChannel } from "./user-service";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { sanitizeNoteContent } from "../core/sanitizer";
import { IncomingMessage, PlanCode } from "../types/domain";

export async function handleIncomingMessage(
  input: IncomingMessage,
): Promise<string[]> {
  const user = await findOrCreateUserByChannel(
    input.channelType,
    input.channelId,
    input.channelCode,
  );
  const plan = user.planCode as PlanCode;
  const userChannel = user.channels.find(c => c.channelId === input.channelId)!;

  // Fetch before saving inbound so state lookup sees the previous message
  const lastUserMessage = await findLastUserMessage(user.id);

  let text = input.text ?? "";
  let noteType: NoteType = "text";

  if (input.mediaType === "audio") {
    if (!canUseAudio(plan)) {
      const reply = formatUpgradePrompt("audio");
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }
    noteType = "audio";
  } else if (input.mediaType === "image") {
    if (!canUseImage(plan)) {
      const reply = formatUpgradePrompt("image");
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }
    noteType = "image";
  }

  // Parse early to determine whether this message starts a new flow
  const parsed = parseMessage(text);

  // Commands that initiate a new flow bypass the state machine entirely.
  // /cancelar stays inside the state machine so it can reply "Cancelado." explicitly.
  const isFlowStartingCommand = parsed.intent !== "save_note" && parsed.intent !== "confirm";

  // --- State machine: check pending state from last user message ---
  const pendingIntent = lastUserMessage?.intent;
  const inDeleteState = pendingIntent === "delete_note" || pendingIntent === "delete_tag";
  const inEditNoteState = pendingIntent === "edit_note_prompt";
  const inEditTagState = pendingIntent === "edit_tag_prompt";
  const inSupportState = pendingIntent === "support";
  const hasActiveState = inDeleteState || inEditNoteState || inEditTagState || inSupportState;

  let prefixCancel = false;

  if (hasActiveState && !isFlowStartingCommand) {
    const trimmed = text.trim();

    if (trimmed === "/cancelar") {
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "user", content: text, intent: "cancel", externalId: input.externalId });
      const reply = "Cancelado.";
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }

    if (inDeleteState) {
      if (trimmed === "/confirmar") {
        await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "user", content: text, intent: "confirm", externalId: input.externalId });
        let reply: string;
        if (pendingIntent === "delete_note") {
          const prevParsed = parseMessage(lastUserMessage!.content);
          const idx = parseInt(prevParsed.noteId ?? "0", 10);
          const note = await resolveNoteByIndex(user.id, idx);
          if (note) {
            await softDeleteNote(note.id, user.id);
            reply = "✅ Nota excluída.";
          } else {
            reply = formatNoteIndexNotFound();
          }
        } else {
          const prevParsed = parseMessage(lastUserMessage!.content);
          const tagName = prevParsed.tagName ?? "";
          await deleteTag(user.id, tagName);
          reply = "✅ Tag excluída.";
        }
        await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
        return [reply];
      }
      // Any other message: implicit cancel, fall through to normal processing
      prefixCancel = true;
    }

    if (inEditNoteState) {
      const prevParsed = parseMessage(lastUserMessage!.content);
      const idx = parseInt(prevParsed.noteId ?? "0", 10);
      const note = await resolveNoteByIndex(user.id, idx);
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "user", content: text, externalId: input.externalId });
      if (!note) {
        const reply = formatNoteIndexNotFound();
        await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
        return [reply];
      }
      const { content: rawContent, tags: editTags } = extractTrailingTags(text);
      const sanitizedContent = sanitizeNoteContent(rawContent);

      await updateNote(note.id, user.id, { content: sanitizedContent });

      const oldTagNames = await findTagNamesByNote(note.id);
      await detachTagsFromNote(note.id);
      const oldSet = new Set(oldTagNames);
      const addedNames = editTags.filter(n => !oldSet.has(n));
      const removedNames = oldTagNames.filter(n => !new Set(editTags).has(n));

      if (editTags.length > 0) {
        const tagRecords = await Promise.all(editTags.map(name => findOrCreateTag(user.id, name)));
        await attachTagsToNote(note.id, tagRecords.map(t => t.id));
        const addedRecords = tagRecords.filter(t => addedNames.includes(t.name));
        if (addedRecords.length > 0) await Promise.all(addedRecords.map(t => incrementTagCount(t.id)));
      }
      if (removedNames.length > 0) {
        const removedRecords = await findTagsByNames(user.id, removedNames);
        await Promise.all(removedRecords.map(t => decrementTagCount(t.id)));
      }

      const reply = "✅ Nota atualizada.";
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }

    if (inEditTagState) {
      const prevParsed = parseMessage(lastUserMessage!.content);
      const tagName = prevParsed.tagName ?? "";
      const newName = text.trim().replace(/^#/, "");
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "user", content: text, externalId: input.externalId });
      const renamed = await renameTag(user.id, tagName, newName);
      const reply = renamed ? "✅ Tag atualizada." : formatTagNotFound(tagName);
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }

    if (inSupportState) {
      const channelCode = userChannel.channelCode ?? userChannel.channelId;
      const planLabel = user.planCode === "pro" ? "Pro" : "Free";
      const supportMsg = `📩 Suporte\nUsuário: ${channelCode}\nPlano: ${planLabel}\nMensagem: "${text}"`;
      const supportNumber = process.env.WA_SUPPORT;
      if (supportNumber) await sendWhatsAppMessage(supportNumber, supportMsg);
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "user", content: text, externalId: input.externalId });
      const reply = formatSupportReceived();
      await saveMessage({ userId: user.id, userChannelId: userChannel.id, role: "assistant", content: reply });
      return [reply];
    }
  }
  // --- End state machine ---

  const savedMessage = await saveMessage({
    userId: user.id,
    userChannelId: userChannel.id,
    role: "user",
    content: text,
    intent: parsed.intent,
    externalId: input.externalId,
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    metadata: input.mediaMetadata,
  });

  const today = new Date();
  const usage = await getTodayUsage(user.id, today);
  const todayCount = usage?.noteCount ?? 0;

  let reply: string;
  let listNoteIds: string[] = [];

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

      const needsOnboarding = !user.onboardedAt;
      const sanitizedContent = sanitizeNoteContent(parsed.content ?? text);

      const note = await createNote({
        userId: user.id,
        noteType,
        content: sanitizedContent,
        mediaType: input.mediaType,
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
      const confirmation =
        noteType === "audio" ? formatAudioNoteSaved(todayCount + 1) :
        noteType === "image" ? formatImageNoteSaved(todayCount + 1) :
        formatNoteSaved(tags, todayCount + 1);
      reply = confirmation;

      if (needsOnboarding) {
        await markUserOnboarded(user.id);
        await saveMessage({
          userId: user.id,
          userChannelId: userChannel.id,
          role: "assistant",
          content: confirmation,
        });
        return [formatOnboardingMessage(), confirmation];
      }
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
      const searchResults = await searchNotes(user.id, parsed.searchQuery ?? "");
      listNoteIds = searchResults.map(n => n.id);
      reply = formatSearchResults(searchResults, parsed.searchQuery ?? "");
      break;
    }

    case "delete_note": {
      if (!parsed.noteId) {
        reply = formatDeleteNoteHelp();
        break;
      }
      const idx = parseInt(parsed.noteId, 10);
      const note = await resolveNoteByIndex(user.id, idx);
      if (!note) {
        reply = formatNoteIndexNotFound();
        break;
      }
      reply = formatDeleteNotePrompt(note.content);
      break;
    }

    case "edit_note_prompt": {
      if (!parsed.noteId) {
        reply = formatEditNoteHelp();
        break;
      }
      const idx = parseInt(parsed.noteId, 10);
      const note = await resolveNoteByIndex(user.id, idx);
      if (!note) {
        reply = formatNoteIndexNotFound();
        break;
      }
      reply = formatEditNotePrompt(note.content);
      break;
    }

    case "edit": {
      if (!parsed.noteId) {
        reply = formatEditNoteHelp();
        break;
      }
      const idx = parseInt(parsed.noteId, 10);
      const note = await resolveNoteByIndex(user.id, idx);
      if (!note) {
        reply = formatNoteIndexNotFound();
        break;
      }
      const editContent = sanitizeNoteContent(parsed.editContent ?? "");
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

    case "edit_tag_prompt": {
      const tagName = parsed.tagName ?? "";
      const count = await countNotesByTag(user.id, tagName);
      if (count === null) {
        reply = formatTagNotFound(tagName);
        break;
      }
      reply = formatEditTagPrompt(tagName);
      break;
    }

    case "edit_tag": {
      const tagName = parsed.tagName ?? "";
      const tagNewName = parsed.tagNewName;
      if (!tagNewName) {
        reply = formatEditTagPrompt(tagName);
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
      reply = formatConfirmNotFound();
      break;
    }

    case "cancel": {
      reply = "Nenhuma ação pendente de cancelamento.";
      break;
    }

    case "support": {
      reply = formatSupportRequest();
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
      const filter = parsed.notesFilter ?? "all";
      let raw;
      if (filter === "all") {
        raw = await findRecentNotes(user.id, 10);
      } else {
        const { from, to } = notesDateRange(filter);
        raw = await findNotesByDateRange(user.id, from, to);
      }
      listNoteIds = raw.slice(0, 20).map((n) => n.id);
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
    noteIds: listNoteIds,
  });

  if (prefixCancel) return ["Cancelado.", reply];
  return [reply];
}

async function resolveNoteByIndex(userId: string, idx: number) {
  const msg = await findLastOutboundMessageWithNoteIds(userId);
  const noteId = msg?.noteIds?.[idx - 1];
  if (noteId) return findNoteById(noteId, userId);
  return findNoteByUserIndex(userId, idx, "today");
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
