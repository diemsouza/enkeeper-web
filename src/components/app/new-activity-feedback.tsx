"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PLANS_PATH } from "@/src/lib/constants";
import type { NewActivityFeedback } from "./new-activity-outcome";

export function NewActivityFeedbackView({
  feedback,
  onExampleClick,
}: {
  feedback: NewActivityFeedback;
  onExampleClick?: (example: string) => void;
}) {
  const t = useTranslations("app.new_activity");

  if (feedback.kind === "error") {
    return (
      <p role="alert" className="mt-2 text-sm text-destructive">
        {t(`errors.${feedback.messageKey}`)}{" "}
        {feedback.messageKey === "plan_expired" && (
          <Link href={PLANS_PATH} className="font-medium underline">
            {t("plans_link")}
          </Link>
        )}
      </p>
    );
  }

  return (
    <div role="status" className="mt-2 space-y-2">
      <p className="text-sm text-muted-foreground">
        {feedback.hint ?? t("needs_more_default")}
      </p>
      {feedback.examples.length > 0 && onExampleClick && (
        <div className="flex flex-wrap gap-2">
          {feedback.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onExampleClick(example)}
              className="rounded-full border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
            >
              + {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
