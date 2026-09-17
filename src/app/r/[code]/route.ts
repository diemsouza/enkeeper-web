import { resolveShortLink } from "@/src/repo/shortlinks.repo";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;
  const url = await resolveShortLink(code);
  const location = url ?? new URL("/", request.url).toString();
  return new Response(null, { status: 302, headers: { Location: location } });
}
