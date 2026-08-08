import { NextRequest, NextResponse } from "next/server";
import { processWhatsAppStatusEvent } from "../../../../services/message-status-service";

function checkSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-simulate-secret");
  return !!secret && secret === process.env.SIMULATE_SECRET;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { status?: string; id?: string };
  if (!body.status || !body.id) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await processWhatsAppStatusEvent(body.status, body.id);
  return NextResponse.json({ ok: true });
}
