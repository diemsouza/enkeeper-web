"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { usePracticePill } from "./practice-pill-provider";
import { QuestionRatingModal } from "./question-rating-modal";

const RATING_BUTTON_CLASS = "h-8 w-8 text-muted-foreground";
const RATED_CLASS = "disabled:opacity-100";

export function PracticeActionsRow({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations("app.practice_actions");
  const tErrors = useTranslations("app.errors");
  const { practiceActions, hasContinueFailed, continuePractice, markRated } =
    usePracticePill();
  const [modalRating, setModalRating] = useState<boolean | null>(null);

  if (!practiceActions) return null;
  const { questionId, rating, canContinue } = practiceActions;
  const isRated = rating !== null;

  function handleContinue(): void {
    onContinue();
    void continuePractice();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {canContinue && (
          <Button size="compact" onClick={handleContinue}>
            {t("continue")}
          </Button>
        )}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            disabled={isRated}
            aria-label={t("like_aria")}
            aria-pressed={rating === true}
            onClick={() => setModalRating(true)}
            className={cn(RATING_BUTTON_CLASS, rating === true && RATED_CLASS)}
          >
            <ThumbsUp
              className={cn("h-4 w-4", rating === true && "fill-current")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={isRated}
            aria-label={t("dislike_aria")}
            aria-pressed={rating === false}
            onClick={() => setModalRating(false)}
            className={cn(RATING_BUTTON_CLASS, rating === false && RATED_CLASS)}
          >
            <ThumbsDown
              className={cn("h-4 w-4", rating === false && "fill-current")}
            />
          </Button>
        </div>
      </div>
      {hasContinueFailed && (
        <p role="alert" className="px-1 text-sm text-muted-foreground">
          {tErrors("message_failed")}
        </p>
      )}
      <QuestionRatingModal
        questionId={questionId}
        rating={modalRating}
        onClose={() => setModalRating(null)}
        onRated={markRated}
      />
    </div>
  );
}
