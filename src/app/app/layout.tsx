import { cookies } from "next/headers";
import { startOfDay } from "date-fns";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AppHeader } from "@/src/components/app/app-header";
import { AppSidebar } from "@/src/components/app/app-sidebar";
import { AnalyticsIdentify } from "@/src/components/shared/AnalyticsIdentify";
import { SidebarProvider } from "@/src/components/ui/sidebar";
import { canStartActivity } from "@/src/core/limits";
import { resolvePracticePillState } from "@/src/core/practice-pill";
import { requireAuth } from "@/src/lib/auth/current-user";
import {
  findActivitiesForList,
  findCurrentActivityByUser,
} from "@/src/repo/activities.repo";
import { PracticePillProvider } from "@/src/components/app/practice-pill-provider";
import { getTodayUsage } from "@/src/repo/daily-usage.repo";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const [activities, current, usage, cookieStore, locale, messages] =
    await Promise.all([
      findActivitiesForList(user.id),
      findCurrentActivityByUser(user.id),
      getTodayUsage(user.id, startOfDay(new Date())),
      cookies(),
      getLocale(),
      getMessages(),
    ]);

  const practicePillState = resolvePracticePillState({
    hasActiveActivity: Boolean(current),
    intensiveUntil: current?.intensiveUntil ?? null,
    practiceCount: usage?.practiceCount ?? 0,
    intensiveCount: usage?.intensiveCount ?? 0,
  });
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const scopedMessages = {
    common: messages.common,
    app: messages.app,
  };

  return (
    <NextIntlClientProvider locale={locale} messages={scopedMessages}>
      <AnalyticsIdentify userId={user.id} />
      <PracticePillProvider initialState={practicePillState}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <div className="flex h-[100dvh] w-full overflow-hidden">
            <AppSidebar
              user={user}
              activities={activities}
              currentActivityId={current?.id ?? null}
              canStartActivity={canStartActivity(usage?.activityCount ?? 0)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <main className="min-h-0 flex-1">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </PracticePillProvider>
    </NextIntlClientProvider>
  );
}
