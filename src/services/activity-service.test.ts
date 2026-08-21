import { beforeEach, describe, expect, it, vi } from "vitest";
import { Activity } from "../lib/prisma";
import { MessageChannel } from "../types/message-channel";

vi.mock("../repo/activities.repo", () => ({
  findActivityForSummary: vi.fn(),
  findCurrentActivityByUser: vi.fn(),
  findLatestArchivedActivityForSummary: vi.fn(),
  updateActivity: vi.fn(),
}));
vi.mock("../repo/questions.repo", () => ({
  findQuestionRevisionStatsByActivity: vi.fn(),
}));
vi.mock("./message-sender-service", () => ({
  sendAndSaveMessage: vi.fn(),
}));
vi.mock("../lib/utils", () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}));

import { updateActivity } from "../repo/activities.repo";
import { findQuestionRevisionStatsByActivity } from "../repo/questions.repo";
import { sendAndSaveMessage } from "./message-sender-service";
import {
  isActivitySuggestionEligible,
  maybeSendActivitySuggestion,
} from "./activity-service";

function buildActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "activity_1",
    userId: "user_1",
    docId: "doc_1",
    date: new Date("2026-01-01"),
    nextMessageAt: null,
    intervalMinutes: 60,
    executionCount: 0,
    waitingUser: false,
    interactionCount: 10,
    lastInteractionAt: null,
    status: "active",
    statusUpdatedAt: new Date("2026-01-01"),
    pausedAt: null,
    completedAt: null,
    intensiveUntil: null,
    questionCount: 25,
    questionLimit: 25,
    sectionCount: 1,
    roundCompleted: true,
    activitySuggestedAt: null,
    lastQuestionId: null,
    summary: null,
    userLevel: "basic",
    title: "Atividade",
    lastNudgeStep: null,
    lastNudgeAt: null,
    metadata: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  } as Activity;
}

const fakeChannel = {} as MessageChannel;

describe("isActivitySuggestionEligible", () => {
  it("sem perguntas, nao elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([]);
    expect(await isActivitySuggestionEligible("activity_1")).toBe(false);
  });

  it("cobertura abaixo do threshold, nao elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([
      { revisionCount: 1, status: "right" },
      { revisionCount: 0, status: null },
      { revisionCount: 0, status: null },
      { revisionCount: 0, status: null },
    ]);
    expect(await isActivitySuggestionEligible("activity_1")).toBe(false);
  });

  it("acerto abaixo do threshold, nao elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "wrong" },
      { revisionCount: 1, status: "wrong" },
      { revisionCount: 1, status: "right" },
    ]);
    expect(await isActivitySuggestionEligible("activity_1")).toBe(false);
  });

  it("cobertura e acerto acima do threshold, elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 0, status: null },
    ]);
    expect(await isActivitySuggestionEligible("activity_1")).toBe(true);
  });
});

describe("maybeSendActivitySuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nao dispara em sessao intensiva", async () => {
    await maybeSendActivitySuggestion({
      activity: buildActivity(),
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: true,
      isLastAnswerCorrect: true,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).not.toHaveBeenCalled();
  });

  it("nao dispara quando a ultima resposta nao foi correta", async () => {
    await maybeSendActivitySuggestion({
      activity: buildActivity(),
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: false,
      isLastAnswerCorrect: false,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).not.toHaveBeenCalled();
  });

  it("nao dispara com roundCompleted falso", async () => {
    await maybeSendActivitySuggestion({
      activity: buildActivity({ roundCompleted: false }),
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: false,
      isLastAnswerCorrect: true,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).not.toHaveBeenCalled();
  });

  it("nao dispara com activitySuggestedAt ja setado", async () => {
    await maybeSendActivitySuggestion({
      activity: buildActivity({ activitySuggestedAt: new Date() }),
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: false,
      isLastAnswerCorrect: true,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).not.toHaveBeenCalled();
  });

  it("nao dispara quando nao elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([
      { revisionCount: 0, status: null },
    ]);
    await maybeSendActivitySuggestion({
      activity: buildActivity(),
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: false,
      isLastAnswerCorrect: true,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).not.toHaveBeenCalled();
    expect(updateActivity).not.toHaveBeenCalled();
  });

  it("dispara e marca activitySuggestedAt quando elegivel", async () => {
    vi.mocked(findQuestionRevisionStatsByActivity).mockResolvedValue([
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 1, status: "right" },
      { revisionCount: 0, status: null },
    ]);
    const activity = buildActivity();
    await maybeSendActivitySuggestion({
      activity,
      userId: "user_1",
      userChannelId: "channel_1",
      isIntensiveMode: false,
      isLastAnswerCorrect: true,
      channel: fakeChannel,
      to: "5511999999999",
      today: new Date(),
    });
    expect(sendAndSaveMessage).toHaveBeenCalledTimes(1);
    expect(sendAndSaveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "activity_suggestion",
        message: expect.objectContaining({
          interactive: expect.objectContaining({
            buttons: [{ id: "new_activity_suggestion", label: "Nova atividade" }],
          }),
        }),
      }),
    );
    expect(updateActivity).toHaveBeenCalledWith(
      activity.id,
      "user_1",
      expect.objectContaining({ activitySuggestedAt: expect.any(Date) }),
    );
  });
});
