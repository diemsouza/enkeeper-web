"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarMenuButton, useSidebar } from "@/src/components/ui/sidebar";
import { buttonVariants } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { usePracticePill } from "./practice-pill-provider";

export function PracticePill({
  showLabel = true,
  size = "compact",
  className,
}: {
  showLabel?: boolean;
  size?: "compact" | "mini";
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
      >
        <Play
          className={cn("h-5 w-5 shrink-0", isActive && "text-primary")}
        />
      </SidebarMenuButton>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isActive}
      className={cn(
        buttonVariants({ size }),
        isActive
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "cursor-not-allowed bg-muted text-muted-foreground disabled:opacity-100",
        className,
      )}
    >
      {t("label")}
    </button>
  );
}
