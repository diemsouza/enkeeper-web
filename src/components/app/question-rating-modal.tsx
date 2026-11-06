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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { useToast } from "@/src/hooks/use-toast";
import { postJson } from "@/src/lib/api-client";
import { QUESTION_RATING_NOTE_MAX_LENGTH } from "@/src/lib/constants";
import {
  DISLIKE_KINDS,
  QUESTION_LEVEL_KINDS,
  QUESTION_PROBLEM_KINDS,
} from "@/src/core/question-rating";

type DislikeKind = (typeof DISLIKE_KINDS)[number];

const FIELD_CLASS =
  "rounded-panel border border-input bg-muted/40 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
const LABEL_CLASS = "text-sm text-muted-foreground";
// Mais a esquerda que os itens, apagado e sem negrito: nao pode parecer opcao.
const GROUP_LABEL_CLASS = "pl-2 text-caption font-normal text-muted-foreground";

const KIND_GROUPS = [
  { label: "group_problem", kinds: QUESTION_PROBLEM_KINDS },
  { label: "group_level", kinds: QUESTION_LEVEL_KINDS },
] as const;

export function QuestionRatingModal({
  questionId,
  rating,
  onClose,
  onRated,
}: {
  questionId: string;
  rating: boolean | null;
  onClose: () => void;
  onRated: (rating: boolean) => void;
}) {
  const t = useTranslations("app.practice_actions");
  const { toast } = useToast();
  const [kind, setKind] = useState<DislikeKind | null>(null);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isLike = rating === true;

  useEffect(() => {
    if (rating === null) return;
    setKind(null);
    setNote("");
    setHasError(false);
  }, [rating]);

  const canSend = rating !== null && (isLike || !!kind) && !isSending;

  async function handleSend(): Promise<void> {
    if (rating === null || !canSend) return;
    setIsSending(true);
    setHasError(false);
    const { ok } = await postJson("/api/app/practice/rating", {
      questionId,
      rating,
      ratingKind: isLike ? null : kind,
      ratingNote: note.trim(),
    });
    setIsSending(false);
    if (!ok) {
      setHasError(true);
      return;
    }
    onRated(rating);
    toast({ description: t("rating_thanks") });
    onClose();
  }

  return (
    <Dialog
      open={rating !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t(isLike ? "like_title" : "dislike_title")}</DialogTitle>
        </DialogHeader>

        {!isLike && (
          <div className="flex flex-col gap-2">
            <span id="rating-kind-label" className={LABEL_CLASS}>
              {t("kind_label")}
            </span>
            <Select
              value={kind ?? ""}
              onValueChange={(value) => setKind(value as DislikeKind)}
            >
              <SelectTrigger
                aria-labelledby="rating-kind-label"
                className={`h-control px-4 focus:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 ${FIELD_CLASS}`}
              >
                <SelectValue placeholder={t("kind_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {KIND_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className={GROUP_LABEL_CLASS}>
                      {t(group.label)}
                    </SelectLabel>
                    {group.kinds.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`kind_${option}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="rating-note" className={LABEL_CLASS}>
            {t("note_label")}
          </label>
          <textarea
            id="rating-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={QUESTION_RATING_NOTE_MAX_LENGTH}
            rows={3}
            placeholder={t(isLike ? "like_placeholder" : "dislike_placeholder")}
            className={`w-full resize-none px-4 py-3 placeholder:text-muted-foreground ${FIELD_CLASS}`}
          />
          <DialogDescription className="text-caption">
            {t(isLike ? "like_disclaimer" : "dislike_disclaimer")}
          </DialogDescription>
          {hasError && (
            <p role="alert" className="text-sm text-destructive">
              {t("send_error")}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSending} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!canSend} onClick={() => void handleSend()}>
            {isSending ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" className="border-primary-foreground" />
                {t("sending")}
              </span>
            ) : (
              t("send")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
