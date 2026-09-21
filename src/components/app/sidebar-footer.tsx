"use client";

import { useState } from "react";
import { CalendarPlus, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TAnyEnv } from "@/src/i18n/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { SidebarFooter } from "@/src/components/ui/sidebar";
import { canPractice } from "@/src/core/access";
import { postJson } from "@/src/lib/api-client";
import type { User } from "@/src/lib/prisma";
import { AddToCalendarModal } from "./add-to-calendar-modal";
import { ThemeMenuItems } from "./theme-menu";

function planLabel(user: User, t: TAnyEnv): string {
  if (user.planCode === "pro") {
    return canPractice(user) ? t("plan_pro") : t("plan_subscription_expired");
  }
  const daysLeft = user.planExpiresAt
    ? Math.ceil(
        (user.planExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
    : 0;
  return daysLeft > 0
    ? t("plan_trial_days_left", { days: daysLeft })
    : t("plan_trial_expired");
}

export function SidebarFooterMenu({
  user,
  showLabel,
}: {
  user: User;
  showLabel: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("app.account");
  const tCommon = useTranslations("app.common");
  const initial = user.name?.trim()?.[0]?.toUpperCase();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function handleLogout() {
    await postJson("/api/auth/logout", {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarFooter className="pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.75rem))]">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-11 w-full items-center gap-2 rounded-md px-1.5 text-left hover:bg-sidebar-accent">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>
              {initial ?? <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {showLabel && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name || t("you_fallback")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {planLabel(user, t)}
              </p>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel>{t("theme_label")}</DropdownMenuLabel>
          <ThemeMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCalendarOpen(true);
            }}
            className="gap-2"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("add_to_calendar")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddToCalendarModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        dailyReminderEnabled={user.dailyReminderEnabled}
        dailyReminderTime={user.dailyReminderTime}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logout_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              {t("logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarFooter>
  );
}
