"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { ChatThread } from "@/src/components/chat/thread";
import { Spinner } from "@/src/components/ui/spinner";
import type { FormattedMessageButton, Message } from "@/src/components/chat/types";
import { postJson } from "@/src/lib/api-client";

const RESUME_BUTTON_ID = "resume";

export function ArchivedActivityView({
  activityId,
  title,
  summary,
  chartImageUrl,
  archivedAtLabel,
  archivedAtTime,
}: {
  activityId: string;
  title: string;
  summary: string | null;
  chartImageUrl: string | null;
  archivedAtLabel: string;
  archivedAtTime: string;
}) {
  const router = useRouter();
  const t = useTranslations("app.summary");
  const tCommon = useTranslations("app.common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resuming, setResuming] = useState(false);

  const messages: Message[] = [];
  if (summary) {
    messages.push(
      chartImageUrl
        ? {
            id: "summary",
            from: "bot",
            time: archivedAtTime,
            type: "image",
            imageUrl: chartImageUrl,
            caption: summary,
          }
        : { id: "summary", from: "bot", time: archivedAtTime, text: summary },
    );
  }
  messages.push({
    id: "archived-notice",
    from: "bot",
    time: archivedAtTime,
    interactive: {
      body: t("archived_message", { date: archivedAtLabel }),
      buttons: [
        { id: RESUME_BUTTON_ID, label: t("resume_activity"), type: "reply" },
      ],
    },
  });

  function handleButtonClick(button: FormattedMessageButton): void {
    if (button.id === RESUME_BUTTON_ID) setConfirmOpen(true);
  }

  async function handleResume(): Promise<void> {
    setResuming(true);
    const { ok } = await postJson(
      `/api/app/activities/${activityId}/resume`,
      {},
    );
    if (ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    setResuming(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <h1 className="text-sm font-medium break-words text-foreground">
          {title}
        </h1>
      </div>
      <div className="min-h-0 flex-1">
        <ChatThread
          messages={messages}
          showComposer={false}
          onButtonClick={handleButtonClick}
        />
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resume_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resuming}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resuming}
              onClick={(e) => {
                e.preventDefault();
                void handleResume();
              }}
            >
              {resuming ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" className="border-primary-foreground" />
                  {t("resuming")}
                </span>
              ) : (
                t("resume")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
