import { notFound } from "next/navigation";
import { buildMediaUrl } from "@/src/components/chat/map-messages";
import { ArchivedActivityView } from "@/src/components/app/archived-activity-view";
import { requireAuth } from "@/src/lib/auth/current-user";
import { findActivityById } from "@/src/repo/activities.repo";
import { findClosingSummaryMedia } from "@/src/services/activity-service";

const archivedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const archivedAtTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ArchivedActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const activity = await findActivityById(id, user.id);
  if (!activity || activity.status !== "archived") notFound();

  const chartMedia = activity.summary
    ? await findClosingSummaryMedia(id)
    : null;

  return (
    <ArchivedActivityView
      activityId={activity.id}
      title={activity.title || "Atividade sem título"}
      summary={activity.summary ?? null}
      chartImageUrl={chartMedia ? buildMediaUrl(chartMedia.mediaPath) : null}
      archivedAtLabel={archivedAtFormatter.format(activity.statusUpdatedAt)}
      archivedAtTime={archivedAtTimeFormatter.format(activity.statusUpdatedAt)}
    />
  );
}
