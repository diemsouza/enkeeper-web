"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { Level } from "@/src/lib/prisma";
import {
  ACTIVITY_TEXT_MAX_CHARS,
  DOMAINS,
  DomainId,
  TOPIC_SUGGESTIONS,
} from "@/src/lib/constants";
import { postJson } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { DialogDescription, DialogTitle } from "@/src/components/ui/dialog";
import { Spinner } from "@/src/components/ui/spinner";
import {
  NewActivityFocusPanel,
  formatFocusSummary,
} from "./new-activity-focus-panel";
import { NewActivityLevelSelect } from "./new-activity-level-select";
import { NewActivityFeedbackView } from "./new-activity-feedback";
import {
  ActivityOutcomeBody,
  NewActivityFeedback,
  resolveActivityFeedback,
} from "./new-activity-outcome";

// Ordem das abas na modal; DOMAINS segue outra ordem (simulador da home).
const DOMAIN_TAB_ORDER: DomainId[] = [
  "daily_life",
  "travel",
  "education",
  "work",
];

type PickedSuggestion = { domainKey: DomainId; label: string };

export function NewActivityMainStep({
  initialText,
  level,
  onLevelChange,
  onUseMaterial,
  onCreated,
}: {
  initialText: string;
  level: Level;
  onLevelChange: (level: Level) => void;
  onUseMaterial: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("app.new_activity");
  const [text, setText] = useState(() =>
    initialText.slice(0, ACTIVITY_TEXT_MAX_CHARS),
  );
  const [activeDomain, setActiveDomain] = useState<DomainId>(
    DOMAIN_TAB_ORDER[0],
  );
  const [picked, setPicked] = useState<PickedSuggestion | null>(null);
  const [focusKeys, setFocusKeys] = useState<string[]>([]);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<NewActivityFeedback | null>(null);

  const isPickedUnchanged = picked !== null && text.trim() === picked.label;
  const canSubmit = text.trim().length > 0 && !isSubmitting;

  function updateText(next: string): void {
    setText(next.slice(0, ACTIVITY_TEXT_MAX_CHARS));
    setFeedback(null);
  }

  function pickSuggestion(label: string): void {
    setPicked({ domainKey: activeDomain, label });
    updateText(label);
  }

  function appendExample(example: string): void {
    const base = text.trimEnd();
    updateText(base ? `${base} ${example}` : example);
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setFeedback(null);
    const { ok, body } = await postJson<ActivityOutcomeBody>(
      "/api/app/activities",
      {
        source: "text",
        text: text.trim(),
        level,
        domainKey: isPickedUnchanged && picked ? picked.domainKey : activeDomain,
        focusKeys,
      },
    );
    setIsSubmitting(false);
    if (ok) {
      onCreated();
      return;
    }
    setFeedback(resolveActivityFeedback(body));
  }

  return (
    <>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <DialogTitle className="pr-8">{t("title")}</DialogTitle>
        <DialogDescription className="mt-1">
          {t("subtitle")}
        </DialogDescription>
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => updateText(e.target.value)}
            maxLength={ACTIVITY_TEXT_MAX_CHARS}
            rows={3}
            aria-label={t("text_label")}
            placeholder={t("placeholder")}
            className="w-full resize-none rounded-panel border border-input bg-muted/40 px-4 py-3 pb-7 text-base max-sm:h-[90px] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
            {text.length}/{ACTIVITY_TEXT_MAX_CHARS}
          </span>
        </div>
        {feedback && (
          <NewActivityFeedbackView
            feedback={feedback}
            onExampleClick={appendExample}
          />
        )}
      </div>

      <div
        role="tablist"
        aria-label={t("suggestions_label")}
        className="flex shrink-0 gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] sm:px-6"
      >
        {DOMAIN_TAB_ORDER.map((domainKey) => {
          const isActive = domainKey === activeDomain;
          return (
            <button
              key={domainKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDomain(domainKey)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-accent",
              )}
            >
              {DOMAINS.find((domain) => domain.id === domainKey)?.label}
            </button>
          );
        })}
      </div>

      <div
        role="radiogroup"
        aria-label={t("suggestions_label")}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 sm:px-4"
      >
        {TOPIC_SUGGESTIONS[activeDomain].map((label) => {
          const isSelected =
            isPickedUnchanged && picked?.domainKey === activeDomain && picked.label === label;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => pickSuggestion(label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-control px-2 py-2.5 text-left text-base transition-colors",
                isSelected
                  ? "bg-primary/10 font-medium text-primary"
                  : "hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-primary" : "border-muted-foreground/60",
                )}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-border px-5 py-3 [scrollbar-width:none] sm:flex-wrap sm:px-6">
        <NewActivityLevelSelect value={level} onChange={onLevelChange} />
        <button
          type="button"
          onClick={() => setIsFocusOpen(true)}
          className="flex h-touch min-w-0 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border border-input bg-background px-3 text-sm sm:shrink"
        >
          <span className="text-muted-foreground">{t("focus_label")}</span>
          <span className="truncate font-semibold">
            {formatFocusSummary(focusKeys, t("focus_general"))}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <button
          type="button"
          onClick={onUseMaterial}
          className="flex min-h-touch items-center text-sm font-medium underline underline-offset-4 hover:text-primary"
        >
          {t("use_material")}
        </button>
        <Button
          type="button"
          size="lg"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting && <Spinner size="sm" className="mr-2 border-primary-foreground" />}
          {isSubmitting ? t("creating") : t("continue")}
        </Button>
      </div>

      {isFocusOpen && (
        <NewActivityFocusPanel
          value={focusKeys}
          onDone={(next) => {
            setFocusKeys(next);
            setIsFocusOpen(false);
          }}
        />
      )}
    </>
  );
}
