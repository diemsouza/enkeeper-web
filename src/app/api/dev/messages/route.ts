import { NextRequest, NextResponse } from "next/server";
import { findUserByChannel } from "../../../../repo/users.repo";
import { findMessagesSince } from "../../../../repo/messages.repo";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get("channelId");
  const after = searchParams.get("after");

  if (!channelId || !after) {
    return NextResponse.json(
      { error: "channelId and after are required" },
      { status: 400 },
    );
  }

  const afterDate = new Date(after);
  if (isNaN(afterDate.getTime())) {
    return NextResponse.json({ error: "invalid after date" }, { status: 400 });
  }

  const user = await findUserByChannel("whatsapp", channelId);
  if (!user) return NextResponse.json({ messages: [] });

  const messages = await findMessagesSince(user.id, afterDate);
  return NextResponse.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
