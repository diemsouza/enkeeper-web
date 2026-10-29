"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { postJson } from "@/src/lib/api-client";
import { SUPPORT_MESSAGE_MAX_LENGTH } from "@/src/lib/constants";
import { useToast } from "@/src/hooks/use-toast";

export type SupportReplyChannel =
  | { kind: "whatsapp" }
  | { kind: "email"; email: string };

export function SupportModal({
  open,
  onOpenChange,
  replyChannel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyChannel: SupportReplyChannel;
}) {
  const t = useTranslations("app.support");
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText("");
    setHasError(false);
  }, [open]);

  const canSend = text.trim().length > 0 && !isSending;

  async function handleSend(): Promise<void> {
    if (!canSend) return;
    setIsSending(true);
    setHasError(false);
    const { ok } = await postJson("/api/app/support", { message: text.trim() });
    setIsSending(false);
    if (!ok) {
      setHasError(true);
      return;
    }
    toast({
      description:
        replyChannel.kind === "email"
          ? t("sent_email", { email: replyChannel.email })
          : t("sent_whatsapp"),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
            rows={5}
            aria-label={t("field_label")}
            placeholder={t("placeholder")}
            className="w-full resize-none rounded-panel border border-input bg-muted/40 px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          {hasError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {t("send_error")}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={!canSend}
          onClick={() => void handleSend()}
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <Spinner size="xs" className="border-primary-foreground" />
              {t("sending")}
            </span>
          ) : (
            t("send")
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
