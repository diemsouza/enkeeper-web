"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarMenuButton } from "@/src/components/ui/sidebar";

export function NewActivityButton({
  disabled,
  disabledReason,
  showLabel,
  onClick,
}: {
  disabled: boolean;
  disabledReason?: string;
  showLabel: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("app.sidebar");
  return (
    <SidebarMenuButton
      onClick={onClick}
      disabled={disabled}
      title={showLabel && disabled ? disabledReason : undefined}
      tooltip={
        !showLabel ? (disabled ? disabledReason : t("new_activity")) : undefined
      }
    >
      <Plus className="h-5 w-5 shrink-0" />
      {showLabel && <span>{t("new_activity")}</span>}
    </SidebarMenuButton>
  );
}
