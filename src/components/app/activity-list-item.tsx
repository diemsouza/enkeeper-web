"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/src/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import type { Activity } from "@/src/lib/prisma";

export function ActivityListItem({
  activity,
  href,
  isActive,
  highlight,
  showLabel,
}: {
  activity: Activity;
  href?: string;
  isActive: boolean;
  highlight?: boolean;
  showLabel: boolean;
}) {
  const { open, isMobile } = useSidebar();
  const label = activity.title || "Atividade sem título";
  const labelRef = useRef<HTMLSpanElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const collapsed = !open && !isMobile;

  const button = (
    <SidebarMenuButton asChild isActive={isActive}>
      <Link href={href ?? `/app/c/${activity.id}`}>
        {highlight ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        ) : (
          <MessageCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        {showLabel && (
          <span ref={labelRef} className="truncate">
            {label}
          </span>
        )}
      </Link>
    </SidebarMenuButton>
  );

  if (isMobile) return button;

  function handleOpenChange(next: boolean): void {
    if (!next) {
      setTooltipOpen(false);
      return;
    }
    if (collapsed) {
      setTooltipOpen(true);
      return;
    }
    const el = labelRef.current;
    setTooltipOpen(!!el && el.scrollWidth > el.clientWidth);
  }

  return (
    <Tooltip open={tooltipOpen} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
