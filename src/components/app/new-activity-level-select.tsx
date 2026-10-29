"use client";

import { useTranslations } from "next-intl";
import type { Level } from "@/src/lib/prisma";
import { LEVEL_OPTIONS } from "@/src/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/src/components/ui/select";

export function NewActivityLevelSelect({
  value,
  onChange,
  disabled,
}: {
  value: Level;
  onChange: (level: Level) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("app.new_activity");
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as Level)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-touch w-auto min-w-[10rem] shrink-0 gap-2 rounded-control"
        aria-label={t("level_label")}
      >
        <span className="text-muted-foreground">{t("level_label")}</span>
        <span className="flex-1 text-left font-semibold">
          {t(`levels.${value}`)}
        </span>
      </SelectTrigger>
      <SelectContent>
        {LEVEL_OPTIONS.map((option) => (
          <SelectItem key={option.level} value={option.level}>
            {t(`levels.${option.level}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
