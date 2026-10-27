"use client";

import { usePathname } from "next/navigation";
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
import type { Activity, User } from "@/src/lib/prisma";
import { ActivityListItem } from "./activity-list-item";
import { NewActivityButton } from "./new-activity-button";
import { PracticePill } from "./practice-pill";
import { usePracticePill } from "./practice-pill-provider";
import { SidebarFooterMenu } from "./sidebar-footer";

type AppSidebarProps = {
  user: User;
  activities: Activity[];
};

export function AppSidebar({
  user,
  activities,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { sendCommand } = usePracticePill();
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

  async function handleNewActivity() {
    if (starting) return;
    setStarting(true);
    setOpenMobile(false);
    await sendCommand("/nova atividade");
    setStarting(false);
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
          disabled={starting}
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
          <PracticePill showLabel={showLabel} className="mt-1 w-full" />
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
