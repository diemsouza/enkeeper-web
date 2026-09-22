import { cookies } from "next/headers";
import { startOfDay } from "date-fns";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AppHeader } from "@/src/components/app/app-header";
import { AppSidebar } from "@/src/components/app/app-sidebar";
import { AnalyticsIdentify } from "@/src/components/shared/AnalyticsIdentify";
import { SidebarProvider } from "@/src/components/ui/sidebar";
import { canStartActivity } from "@/src/core/limits";
import { requireAuth } from "@/src/lib/auth/current-user";
import {
  findActivitiesForList,
  findCurrentActivityByUser,
} from "@/src/repo/activities.repo";
import { getTodayActivityCount } from "@/src/repo/daily-usage.repo";

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
  const [activities, current, activityCount, cookieStore, locale, messages] =
    await Promise.all([
      findActivitiesForList(user.id),
      findCurrentActivityByUser(user.id),
      getTodayActivityCount(user.id, startOfDay(new Date())),
      cookies(),
      getLocale(),
      getMessages(),
    ]);

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const scopedMessages = {
    common: messages.common,
    app: messages.app,
  };

  return (
    <NextIntlClientProvider locale={locale} messages={scopedMessages}>
      <AnalyticsIdentify userId={user.id} />
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex h-[100dvh] w-full overflow-hidden">
          <AppSidebar
            user={user}
            activities={activities}
            currentActivityId={current?.id ?? null}
            canStartActivity={canStartActivity(activityCount)}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="min-h-0 flex-1">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </NextIntlClientProvider>
  );
}
