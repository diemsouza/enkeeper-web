"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarMenuButton, useSidebar } from "@/src/components/ui/sidebar";
import { cn } from "@/src/lib/utils";
import { usePracticePill } from "./practice-pill-provider";

export function PracticePill({
  showLabel = true,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const t = useTranslations("app.practice_pill");
  const { isVisible, isActive, practice } = usePracticePill();
  const { setOpenMobile } = useSidebar();

  function handleClick(): void {
    setOpenMobile(false);
    void practice();
  }

  if (!isVisible) return null;

  if (!showLabel) {
    return (
      <SidebarMenuButton
        onClick={handleClick}
        disabled={!isActive}
        tooltip={t("label")}
        aria-label={t("label")}
        className={
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground hover:opacity-90"
            : "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground"
        }
      >
        <Play className="h-5 w-5 shrink-0" />
      </SidebarMenuButton>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isActive}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "cursor-not-allowed bg-muted text-muted-foreground",
        className,
      )}
    >
      {t("label")}
    </button>
  );
}
