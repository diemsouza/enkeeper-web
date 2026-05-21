import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (process.env.DISABLE_LANDING_PAGE === "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
