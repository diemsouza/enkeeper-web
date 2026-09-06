import { notFound } from "next/navigation";
import { mapActivityMessages } from "@/src/components/chat/map-messages";
import { ActivitySummaryPanel } from "@/src/components/chat/activity-summary-panel";
import { ArchivedActivityThreadClient } from "@/src/components/app/archived-activity-thread-client";
import { ResumeActivityButton } from "@/src/components/app/resume-activity-button";
import { requireAuth } from "@/src/lib/auth/current-user";
import { findActivityById } from "@/src/repo/activities.repo";
import { findMessagesByActivity } from "@/src/repo/messages.repo";
import { findClosingSummaryMedia } from "@/src/services/activity-service";

export default async function ArchivedActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const activity = await findActivityById(id, user.id);
  if (!activity || activity.status !== "archived") notFound();

  const [messages, chartMedia] = await Promise.all([
    findMessagesByActivity(id, user.id, activity.createdAt),
    activity.summary ? findClosingSummaryMedia(id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h1 className="truncate text-sm font-medium text-foreground">
          {activity.title || "Atividade sem título"}
        </h1>
        <ResumeActivityButton activityId={activity.id} />
      </div>
      {activity.summary && (
        <ActivitySummaryPanel
          summary={activity.summary}
          chartMediaPath={chartMedia?.mediaPath ?? null}
        />
      )}
      <div className="min-h-0 flex-1">
        <ArchivedActivityThreadClient
          messages={mapActivityMessages(messages)}
        />
      </div>
    </div>
  );
}
