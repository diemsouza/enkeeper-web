import { findWaitlistByPhone, createWaitlistEntry } from "@/src/repo/waitlist.repo";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const name: string = (body?.name ?? "").trim();
  const phone: string = (body?.phone ?? "").trim();

  if (!name || !phone) {
    return Response.json({ error: "name and phone are required" }, { status: 400 });
  }

  try {
    const existing = await findWaitlistByPhone(phone);
    if (existing) {
      return Response.json({ success: true, already: true });
    }
    await createWaitlistEntry(name, phone);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
