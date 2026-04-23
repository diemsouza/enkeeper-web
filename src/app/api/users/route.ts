import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  return Response.json({
    success: true,
  });
}

export async function POST(
  req: Request,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  // Valida entradas do usuário
  const payload = await req.json();

  return NextResponse.json(payload, {
    status: 200,
  });
}
