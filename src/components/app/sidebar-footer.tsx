"use client";

import { useState } from "react";
import {
  CalendarPlus,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
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
import { SidebarFooter, useSidebar } from "@/src/components/ui/sidebar";
import { canPractice, getDaysUntil } from "@/src/core/access";
import { formatPhoneForDisplay } from "@/src/core/phone";
import { postJson } from "@/src/lib/api-client";
import { PLANS_PATH } from "@/src/lib/constants";
import type { User } from "@/src/lib/prisma";
import { useReminderFlow } from "./reminder-flow-provider";
import { useProfileLevel } from "./profile-level-provider";
import { useSupportFlow } from "./support-flow-provider";
import { ThemeMenuItems } from "./theme-menu";

function planLabel(user: User, t: TAnyEnv): string {
  if (user.planCode === "pro") {
    return canPractice(user) ? t("plan_pro") : t("plan_subscription_expired");
  }
  const daysLeft = getDaysUntil(user.planExpiresAt, new Date());
  return daysLeft > 0
    ? t("plan_trial_days_left", { days: daysLeft })
    : t("plan_trial_expired");
}

// E-mail só é gravado pelo login com Google; sem ele, a conta entrou pelo WhatsApp.
function loginAccount(user: User, t: TAnyEnv): { method: string; account: string } | null {
  if (user.email) return { method: t("logged_in_google"), account: user.email };
  if (user.phone) {
    return {
      method: t("logged_in_whatsapp"),
      account: formatPhoneForDisplay(user.phone),
    };
  }
  return null;
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
  const login = loginAccount(user, t);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { openReminder } = useReminderFlow();
  const { level, openLevel } = useProfileLevel();
  const { openSupport } = useSupportFlow();
  const tLevels = useTranslations("app.new_activity.levels");
  const { setOpenMobile } = useSidebar();

  async function handleLogout() {
    await postJson("/api/auth/logout", {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarFooter className="pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.75rem))]">
      <DropdownMenu modal={false}>
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
        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel>{t("theme_label")}</DropdownMenuLabel>
          <ThemeMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={openReminder}
            className="gap-2"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("add_to_calendar")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openLevel} className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {t("level")}
            {level && (
              <span className="ml-auto text-xs text-muted-foreground">
                {tLevels(level)}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            onSelect={() => setOpenMobile(false)}
            className="gap-2"
          >
            <Link href={PLANS_PATH}>
              <CreditCard className="h-4 w-4" />
              {t("subscription")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openSupport} className="gap-2">
            <LifeBuoy className="h-4 w-4" />
            {t("support")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {login && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <p>{login.method}</p>
              <p className="truncate font-medium text-foreground">
                {login.account}
              </p>
            </div>
          )}
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {login
                ? t("logout_confirm_account", { account: login.account })
                : t("logout_confirm_message")}
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
