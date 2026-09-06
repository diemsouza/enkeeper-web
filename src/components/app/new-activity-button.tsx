"use client";

import { Plus } from "lucide-react";
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
  return (
    <SidebarMenuButton
      onClick={onClick}
      disabled={disabled}
      title={showLabel && disabled ? disabledReason : undefined}
      tooltip={!showLabel ? (disabled ? disabledReason : "Nova atividade") : undefined}
    >
      <Plus className="h-5 w-5 shrink-0" />
      {showLabel && <span>Nova atividade</span>}
    </SidebarMenuButton>
  );
}
