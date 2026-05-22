import { NextResponse } from "next/server";
import { WHATSAPP_NUMBER } from "@/src/lib/constants";

export function GET(): NextResponse {
  const text = encodeURIComponent("Oi, quero começar a praticar.");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  const response = NextResponse.redirect(url);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
