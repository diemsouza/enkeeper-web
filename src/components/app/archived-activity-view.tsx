"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      body: `Esta atividade foi arquivada em ${archivedAtLabel}.`,
      buttons: [
        { id: RESUME_BUTTON_ID, label: "Retomar atividade", type: "reply" },
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
            <AlertDialogTitle>Confirmar</AlertDialogTitle>
            <AlertDialogDescription>
              Ao retomar esta atividade, a atividade atual será arquivada. Deseja
              continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resuming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={resuming}
              onClick={(e) => {
                e.preventDefault();
                void handleResume();
              }}
            >
              {resuming ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary-foreground" />
                  Retomando...
                </span>
              ) : (
                "Retomar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
