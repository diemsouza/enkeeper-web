import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findActivityById } from "@/src/repo/activities.repo";
import { findUserChannelByUserId } from "@/src/repo/users.repo";
import { resumeActivityFromWeb } from "@/src/services/activity-service";
import { WebChannel } from "@/src/lib/channels/web-channel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const activity = await findActivityById(id, user.id);
    if (!activity) return Response.json({ error: "not found" }, { status: 404 });
    if (activity.status !== "archived") {
      return Response.json({ error: "activity not archived" }, { status: 409 });
    }

    const userChannel = await findUserChannelByUserId(user.id);
    if (!userChannel) {
      return Response.json({ error: "channel not found" }, { status: 409 });
    }

    await resumeActivityFromWeb(
      user.id,
      activity,
      new WebChannel(),
      userChannel.id,
      userChannel.channelUserId,
    );

    return Response.json({ activityId: activity.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/activities/[id]/resume]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
