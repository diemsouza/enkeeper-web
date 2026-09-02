import { NextRequest } from "next/server";
import { downloadFile } from "../../../../vendors/storage.vendor";

export async function GET(req: NextRequest): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SIMULATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) return new Response("path required", { status: 400 });

  try {
    const buffer = await downloadFile({ filePath });
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[get/api/dev/image] error:", err);
    return new Response("Not found", { status: 404 });
  }
}
