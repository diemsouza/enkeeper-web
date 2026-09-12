"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/src/components/ui/sidebar";
import { postJson } from "@/src/lib/api-client";
import type { Activity, User } from "@/src/lib/prisma";
import { ActivityListItem } from "./activity-list-item";
import { NewActivityButton } from "./new-activity-button";
import { SidebarFooterMenu } from "./sidebar-footer";

type AppSidebarProps = {
  user: User;
  activities: Activity[];
  currentActivityId: string | null;
  canStartActivity: boolean;
};

export function AppSidebar({
  user,
  activities,
  currentActivityId,
  canStartActivity,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("app.sidebar");
  const { open, isMobile, setOpenMobile } = useSidebar();
  const showLabel = open || isMobile;
  const [starting, setStarting] = useState(false);

  const active = activities.filter(
    (a) => a.status === "active" || a.status === "paused",
  );
  const archived = [...activities]
    .filter((a) => a.status === "archived")
    .sort((a, b) => b.statusUpdatedAt.getTime() - a.statusUpdatedAt.getTime());

  const canClickNewActivity =
    canStartActivity && !!currentActivityId && !starting;
  const disabledReason = !canStartActivity
    ? t("daily_limit_title")
    : !currentActivityId
      ? t("daily_limit_hint")
      : undefined;

  async function handleNewActivity() {
    if (!currentActivityId || starting) return;
    setStarting(true);
    await postJson("/api/app/messages", { text: "nova atividade" });
    setStarting(false);
    setOpenMobile(false);
    router.push("/app");
    router.refresh();
  }

  function handleSelect() {
    setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        {!isMobile && (
          <SidebarTrigger className={showLabel ? "self-end" : "self-center"} />
        )}
        <NewActivityButton
          disabled={!canClickNewActivity}
          disabledReason={disabledReason}
          showLabel={showLabel}
          onClick={handleNewActivity}
        />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-1 px-2 pt-2">
          {showLabel && (
            <h3 className="px-2 text-xs font-medium text-sidebar-foreground/60">
              {t("active_section")}
            </h3>
          )}
          {active.length === 0 ? (
            showLabel && (
              <p className="px-2 py-1 text-xs text-sidebar-foreground/50">
                {t("empty")}
              </p>
            )
          ) : (
            <SidebarMenu>
              {active.map((activity) => (
                <SidebarMenuItem key={activity.id} onClick={handleSelect}>
                  <ActivityListItem
                    activity={activity}
                    href="/app"
                    isActive={pathname === "/app"}
                    highlight
                    showLabel={showLabel}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </div>

        {showLabel && (
          <div className="flex flex-col gap-1 px-2 pt-4">
            <h3 className="px-2 text-xs font-medium text-sidebar-foreground/60">
              {t("history_section")}
            </h3>
            {archived.length === 0 ? (
              <p className="px-2 py-1 text-xs text-sidebar-foreground/50">
                {t("empty")}
              </p>
            ) : (
              <SidebarMenu>
                {archived.map((activity) => (
                  <SidebarMenuItem key={activity.id} onClick={handleSelect}>
                    <ActivityListItem
                      activity={activity}
                      isActive={pathname === `/app/c/${activity.id}`}
                      showLabel={showLabel}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </div>
        )}
      </SidebarContent>
      <SidebarFooterMenu user={user} showLabel={showLabel} />
    </Sidebar>
  );
}
