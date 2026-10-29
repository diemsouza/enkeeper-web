"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FOCUS_ENUM, MAX_ACTIVITY_FOCUS } from "@/src/lib/constants";
import {
  FOCUS_CATEGORY_LABEL,
  FOCUS_CATEGORY_ORDER,
  findFocusLabel,
} from "@/src/core/focus";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export function formatFocusSummary(
  focusKeys: string[],
  generalLabel: string,
): string {
  if (focusKeys.length === 0) return generalLabel;
  const labels = focusKeys.map((key) => findFocusLabel(key) ?? key);
  const shown = labels.slice(0, 2).join(", ");
  return labels.length > 2 ? `${shown} +${labels.length - 2}` : shown;
}

// Painel sobreposto dentro da modal: a escolha so vale ao tocar em Pronto
// ou fora do painel.
export function NewActivityFocusPanel({
  value,
  onDone,
}: {
  value: string[];
  onDone: (focusKeys: string[]) => void;
}) {
  const t = useTranslations("app.new_activity");
  const [draft, setDraft] = useState<string[]>(value);
  const isFull = draft.length >= MAX_ACTIVITY_FOCUS;

  function toggle(key: string): void {
    setDraft((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length < MAX_ACTIVITY_FOCUS
          ? [...prev, key]
          : prev,
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label={t("focus_done")}
        className="absolute inset-0 bg-background/70"
        onClick={() => onDone(draft)}
      />
      <div className="relative flex max-h-[85%] flex-col rounded-t-3xl border-t border-border bg-popover shadow-lg">
        <div className="px-5 pt-5">
          <h3 className="text-lg font-semibold">{t("focus_title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("focus_description", { max: MAX_ACTIVITY_FOCUS })}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {FOCUS_CATEGORY_ORDER.map((category) => (
            <section key={category}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {FOCUS_CATEGORY_LABEL[category]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {FOCUS_ENUM.filter((item) => item.category === category).map(
                  (item) => {
                    const isSelected = draft.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={!isSelected && isFull}
                        onClick={() => toggle(item.key)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40",
                          isSelected
                            ? "border-primary bg-primary/10 font-medium text-primary"
                            : "border-border text-foreground hover:bg-accent",
                        )}
                      >
                        {item.labelPt}
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-sm text-muted-foreground">
            {draft.length === 0
              ? t("focus_general")
              : t("focus_count", {
                  count: draft.length,
                  max: MAX_ACTIVITY_FOCUS,
                })}
          </span>
          <Button type="button" onClick={() => onDone(draft)}>
            {t("focus_done")}
          </Button>
        </div>
      </div>
    </div>
  );
}
