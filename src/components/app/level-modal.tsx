"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Level } from "@/src/lib/prisma";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { SegmentedControl } from "@/src/components/shared/segmented-control";
import { postJson } from "@/src/lib/api-client";
import { LEVEL_OPTIONS } from "@/src/lib/constants";
import { useToast } from "@/src/hooks/use-toast";

export function LevelModal({
  open,
  onOpenChange,
  level,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: Level | null;
  onSaved: (level: Level) => void;
}) {
  const t = useTranslations("app.level");
  const tLevels = useTranslations("app.new_activity.levels");
  const { toast } = useToast();
  const [selected, setSelected] = useState<Level>(level ?? "basic");
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(level ?? "basic");
    setHasError(false);
  }, [open, level]);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setHasError(false);
    const { ok } = await postJson("/api/app/account/level", {
      level: selected,
    });
    setIsSaving(false);
    if (!ok) {
      setHasError(true);
      return;
    }
    onSaved(selected);
    toast({ description: t("saved") });
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
          <SegmentedControl
            options={LEVEL_OPTIONS.map((option) => ({
              value: option.level,
              label: tLevels(option.level),
            }))}
            value={selected}
            onChange={setSelected}
            ariaLabel={t("title")}
            optionClassName="px-1 text-sm"
          />
          <p className="mt-3 text-sm text-muted-foreground">{t("rule")}</p>
          {hasError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {t("save_error")}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={selected === level || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner size="xs" className="border-primary-foreground" />
              {t("saving")}
            </span>
          ) : (
            t("save")
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
