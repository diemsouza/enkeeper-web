import { NextResponse } from "next/server";
import { SITE_WHATSAPP_MESSAGE } from "@/src/lib/constants";

export function GET(): NextResponse {
  const wabaPhoneNumber = process.env.WABA_PHONE_NUMBER || "";
  const text = encodeURIComponent(SITE_WHATSAPP_MESSAGE);
  const url = `https://wa.me/${wabaPhoneNumber}?text=${text}`;
  const response = NextResponse.redirect(url);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
