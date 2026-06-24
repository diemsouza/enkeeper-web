import {
  findWaitlistByPhone,
  createWaitlistEntry,
} from "@/src/repo/waitlist.repo";
import { sendWhatsAppMessage } from "@/src/vendors/whatsapp.vendor";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const name: string = (body?.name ?? "").trim();
  const phone: string = (body?.phone ?? "").trim();

  if (!name || !phone) {
    return Response.json(
      { error: "name and phone are required" },
      { status: 400 },
    );
  }

  try {
    const existing = await findWaitlistByPhone(phone);
    if (existing) {
      return Response.json({ success: true, already: true });
    }
    await createWaitlistEntry(name, phone);
    const waSupport = process.env.WA_SUPPORT;
    if (waSupport) {
      try {
        await sendWhatsAppMessage(
          waSupport,
          `Novo contato na lista de espera.\nNome: ${name}\nTelefone: +${phone.replace("+", "")}`,
        );
      } catch {
        // falha silenciosa
      }
    }
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
