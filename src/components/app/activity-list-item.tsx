"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/src/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import type { Activity } from "@/src/lib/prisma";
import { MarqueeLabel } from "./marquee-label";

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

  const button = (
    <SidebarMenuButton asChild isActive={isActive}>
      <Link href={href ?? `/app/c/${activity.id}`}>
        {highlight && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        )}
        {showLabel && <MarqueeLabel label={label} className="flex-1" />}
      </Link>
    </SidebarMenuButton>
  );

  if (isMobile || open || !highlight) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
